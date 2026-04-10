const { MachineRoom, RoomTask, ConstructionPhase, User, sequelize } = require('../models');
const { success, fail } = require('../utils/response');
const { Op } = require('sequelize');

const DATE_ONLY_REGEX = /^(\d{4})-(\d{2})-(\d{2})$/;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

const parseDateOnly = (value) => {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }

  if (typeof value === 'string') {
    const matched = value.match(DATE_ONLY_REGEX);
    if (matched) {
      const [, year, month, day] = matched;
      return new Date(Number(year), Number(month) - 1, Number(day));
    }
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
};

const formatDateOnly = (value = new Date()) => {
  const date = parseDateOnly(value);
  if (!date) {
    return null;
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const diffCalendarDays = (start, end) => {
  const startDate = parseDateOnly(start);
  const endDate = parseDateOnly(end);
  if (!startDate || !endDate) {
    return 0;
  }
  return Math.round((endDate - startDate) / MS_PER_DAY);
};

/**
 * 总体概览统计
 */
const getOverview = async (req, res, next) => {
  try {
    // 机房统计 - 使用原生SQL
    const roomStats = await sequelize.query(
      `SELECT status, COUNT(*) as count FROM machine_rooms GROUP BY status`,
      { type: sequelize.QueryTypes.SELECT }
    );

    const roomCounts = {
      total: 0,
      planning: 0,
      in_progress: 0,
      completed: 0,
      paused: 0
    };
    roomStats.forEach(stat => {
      roomCounts.total += parseInt(stat.count);
      if (stat.status) {
        roomCounts[stat.status] = parseInt(stat.count);
      }
    });

    // 任务统计 - 使用原生SQL
    const taskStats = await sequelize.query(
      `SELECT status, COUNT(*) as count FROM room_tasks GROUP BY status`,
      { type: sequelize.QueryTypes.SELECT }
    );

    const taskCounts = {
      total: 0,
      completed: 0,
      in_progress: 0,
      not_started: 0
    };
    taskStats.forEach(stat => {
      taskCounts.total += parseInt(stat.count);
      if (stat.status) {
        taskCounts[stat.status] = parseInt(stat.count);
      }
    });

    const overallProgressResult = await sequelize.query(
      `SELECT COALESCE(ROUND(AVG(progress)), 0) as progress FROM room_tasks`,
      { type: sequelize.QueryTypes.SELECT }
    );
    const overallProgress = parseInt(overallProgressResult[0]?.progress) || 0;

    // 延期任务统计
    const today = formatDateOnly(new Date());
    const delayedResult = await sequelize.query(
      `SELECT COUNT(*) as count FROM room_tasks
       WHERE status != 'completed' AND planned_end_date < $1 AND planned_end_date IS NOT NULL`,
      { bind: [today], type: sequelize.QueryTypes.SELECT }
    );
    const delayedTasks = parseInt(delayedResult[0]?.count) || 0;

    // 负责人统计
    const totalManagers = await User.count({ where: { role: 'manager', status: 1 } });

    // 建设方式统计 - 使用原生SQL
    const constructionStats = await sequelize.query(
      `SELECT construction_type, COUNT(*) as count FROM machine_rooms GROUP BY construction_type`,
      { type: sequelize.QueryTypes.SELECT }
    );

    const constructionCounts = {
      purchase: 0,
      lease: 0,
      self_build: 0,
      container: 0,
      reuse: 0
    };
    constructionStats.forEach(stat => {
      if (stat.construction_type && constructionCounts.hasOwnProperty(stat.construction_type)) {
        constructionCounts[stat.construction_type] = parseInt(stat.count);
      }
    });

    success(res, {
      rooms: roomCounts,
      tasks: {
        ...taskCounts,
        delayed: delayedTasks
      },
      managers: totalManagers,
      overallProgress,
      constructionTypes: constructionCounts
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 按阶段统计 - 优化版，避免N+1查询
 */
const getByPhase = async (req, res, next) => {
  try {
    // 获取所有阶段
    const allPhases = await ConstructionPhase.findAll({
      order: [['phase_number', 'ASC']],
      raw: true
    });

    // 使用原生SQL查询避免歧义
    const phaseStats = await sequelize.query(
      `SELECT phase_id,
              COUNT(*) as total,
              SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
              SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as "inProgress",
              COALESCE(ROUND(AVG(progress)), 0) as progress
       FROM room_tasks
       GROUP BY phase_id`,
      { type: sequelize.QueryTypes.SELECT }
    );

    // 合并数据
    const statsMap = {};
    phaseStats.forEach(stat => {
      statsMap[stat.phase_id] = {
        total: parseInt(stat.total) || 0,
        completed: parseInt(stat.completed) || 0,
        inProgress: parseInt(stat.inProgress) || 0,
        progress: parseInt(stat.progress) || 0
      };
    });

    const result = allPhases.map(phase => {
      const stats = statsMap[phase.id] || { total: 0, completed: 0, inProgress: 0, progress: 0 };
      return {
        id: phase.id,
        name: phase.name,
        phaseNumber: phase.phase_number,
        total: stats.total,
        completed: stats.completed,
        inProgress: stats.inProgress,
        percentage: stats.progress
      };
    });

    success(res, result);
  } catch (error) {
    next(error);
  }
};

/**
 * 延期预警
 */
const getDelayed = async (req, res, next) => {
  try {
    const today = formatDateOnly(new Date());

    const delayedTasks = await RoomTask.findAll({
      where: {
        status: { [Op.ne]: 'completed' },
        planned_end_date: { [Op.lt]: today, [Op.ne]: null }
      },
      include: [
        {
          model: MachineRoom,
          as: 'room',
          attributes: ['id', 'name', 'status'],
          include: [{
            model: User,
            as: 'manager',
            attributes: ['id', 'real_name', 'phone']
          }]
        },
        {
          model: ConstructionPhase,
          as: 'phase',
          attributes: ['id', 'name']
        }
      ],
      order: [['planned_end_date', 'ASC']]
    });

    const result = delayedTasks.map(task => ({
      ...task.toJSON(),
      delayDays: Math.max(0, diffCalendarDays(task.planned_end_date, today))
    }));

    success(res, result);
  } catch (error) {
    next(error);
  }
};

/**
 * 机房进度排行 - 优化版，避免N+1查询
 */
const getRoomRanking = async (req, res, next) => {
  try {
    // 使用原生SQL获取所有机房的任务统计
    const taskStats = await sequelize.query(
      `SELECT room_id, COUNT(*) as total,
              SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
              COALESCE(ROUND(AVG(progress)), 0) as progress
       FROM room_tasks
       GROUP BY room_id`,
      { type: sequelize.QueryTypes.SELECT }
    );

    // 构建统计映射
    const statsMap = {};
    taskStats.forEach(stat => {
      statsMap[stat.room_id] = {
        total: parseInt(stat.total) || 0,
        completed: parseInt(stat.completed) || 0,
        progress: parseInt(stat.progress) || 0
      };
    });

    // 获取机房信息
    const rooms = await MachineRoom.findAll({
      include: [{
        model: User,
        as: 'manager',
        attributes: ['id', 'real_name']
      }],
      order: [['created_at', 'DESC']],
      raw: true,
      nest: true
    });

    const result = rooms.map(room => {
      const stats = statsMap[room.id] || { total: 0, completed: 0, progress: 0 };
      return {
        id: room.id,
        name: room.name,
        status: room.status,
        manager: room.manager,
        total: stats.total,
        completed: stats.completed,
        progress: stats.progress
      };
    });

    // 按进度排序
    result.sort((a, b) => b.progress - a.progress);

    success(res, result);
  } catch (error) {
    next(error);
  }
};

/**
 * 按负责人分组统计机房建设情况
 */
const getByManager = async (req, res, next) => {
  try {
    // 获取所有启用的负责人
    const managers = await User.findAll({
      where: { role: 'manager', status: 1 },
      attributes: ['id', 'real_name', 'department', 'phone'],
      order: [['real_name', 'ASC']],
      raw: true
    });

    // 获取每个机房的任务统计
    const taskStats = await sequelize.query(
      `SELECT room_id, COUNT(*) as total,
              SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
              COALESCE(ROUND(AVG(progress)), 0) as progress
       FROM room_tasks
       GROUP BY room_id`,
      { type: sequelize.QueryTypes.SELECT }
    );

    // 构建机房统计映射
    const roomStatsMap = {};
    taskStats.forEach(stat => {
      roomStatsMap[stat.room_id] = {
        total: parseInt(stat.total) || 0,
        completed: parseInt(stat.completed) || 0,
        progress: parseInt(stat.progress) || 0
      };
    });

    // 获取每个机房最后更新时间（通过 task_progress_logs 关联 room_tasks）
    const lastUpdateStats = await sequelize.query(
      `SELECT rt.room_id, MAX(tpl.created_at) as last_update
       FROM task_progress_logs tpl
       JOIN room_tasks rt ON tpl.task_id = rt.id
       GROUP BY rt.room_id`,
      { type: sequelize.QueryTypes.SELECT }
    );

    const lastUpdateMap = {};
    lastUpdateStats.forEach(stat => {
      lastUpdateMap[stat.room_id] = stat.last_update;
    });

    // 获取所有机房信息
    const rooms = await MachineRoom.findAll({
      attributes: ['id', 'name', 'code', 'status', 'manager_id', 'updated_at'],
      order: [['manager_id', 'ASC'], ['name', 'ASC']],
      raw: true
    });

    // 按负责人分组
    const managerMap = {};
    managers.forEach(m => {
      managerMap[m.id] = {
        id: m.id,
        name: m.real_name,
        department: m.department,
        phone: m.phone,
        rooms: [],
        stats: {
          total: 0,
          completed: 0,
          in_progress: 0,
          planning: 0,
          paused: 0,
          avgProgress: 0
        },
        lastUpdate: null,
        idleDays: null
      };
    });

    // 未分配负责人的机房
    const unassigned = {
      id: null,
      name: '未分配',
      department: '',
      phone: '',
      rooms: [],
      stats: {
        total: 0,
        completed: 0,
        in_progress: 0,
        planning: 0,
        paused: 0,
        avgProgress: 0
      },
      lastUpdate: null,
      idleDays: null
    };

    const now = new Date();

    // 分配机房到负责人
    rooms.forEach(room => {
      const taskStats = roomStatsMap[room.id] || { total: 0, completed: 0, progress: 0 };
      const lastUpdate = lastUpdateMap[room.id] || room.updated_at;

      const roomData = {
        id: room.id,
        name: room.name,
        code: room.code,
        status: room.status,
        progress: taskStats.progress,
        totalTasks: taskStats.total,
        completedTasks: taskStats.completed,
        lastUpdate: lastUpdate
      };

      const targetManager = room.manager_id && managerMap[room.manager_id] ? managerMap[room.manager_id] : unassigned;
      targetManager.rooms.push(roomData);
      targetManager.stats.total++;

      if (room.status === 'completed') {
        targetManager.stats.completed++;
      } else if (room.status === 'in_progress') {
        targetManager.stats.in_progress++;
      } else if (room.status === 'planning') {
        targetManager.stats.planning++;
      } else if (room.status === 'paused') {
        targetManager.stats.paused++;
      }

      // 更新负责人的最后更新时间
      if (lastUpdate) {
        const updateTime = new Date(lastUpdate);
        if (!targetManager.lastUpdate || updateTime > new Date(targetManager.lastUpdate)) {
          targetManager.lastUpdate = lastUpdate;
        }
      }
    });

    // 计算平均进度和闲置天数
    const result = Object.values(managerMap).map(manager => {
      const progressSum = manager.rooms.reduce((sum, room) => sum + room.progress, 0);
      manager.stats.avgProgress = manager.rooms.length > 0
        ? Math.round(progressSum / manager.rooms.length)
        : 0;

      // 计算闲置天数
      if (manager.lastUpdate) {
        const diff = now - new Date(manager.lastUpdate);
        manager.idleDays = Math.floor(diff / (1000 * 60 * 60 * 24));
      }

      return manager;
    });

    // 只返回有负责机房的负责人
    const finalResult = result.filter(m => m.stats.total > 0);

    // 如果有未分配的机房，添加到最后
    if (unassigned.rooms.length > 0) {
      const progressSum = unassigned.rooms.reduce((sum, room) => sum + room.progress, 0);
      unassigned.stats.avgProgress = Math.round(progressSum / unassigned.rooms.length);

      if (unassigned.lastUpdate) {
        const diff = now - new Date(unassigned.lastUpdate);
        unassigned.idleDays = Math.floor(diff / (1000 * 60 * 60 * 24));
      }

      finalResult.push(unassigned);
    }

    success(res, finalResult);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getOverview,
  getByPhase,
  getDelayed,
  getRoomRanking,
  getByManager
};