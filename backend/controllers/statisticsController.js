const { MachineRoom, RoomTask, ConstructionPhase, User, sequelize } = require('../models');
const { success, fail } = require('../utils/response');
const { Op } = require('sequelize');

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

    // 延期任务统计
    const today = new Date();
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
      overallProgress: taskCounts.total > 0 ? Math.round((taskCounts.completed / taskCounts.total) * 100) : 0,
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
              SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as "inProgress"
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
        inProgress: parseInt(stat.inProgress) || 0
      };
    });

    const result = allPhases.map(phase => {
      const stats = statsMap[phase.id] || { total: 0, completed: 0, inProgress: 0 };
      return {
        id: phase.id,
        name: phase.name,
        phaseNumber: phase.phase_number,
        total: stats.total,
        completed: stats.completed,
        inProgress: stats.inProgress,
        percentage: stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0
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
    const today = new Date();

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
      delayDays: Math.ceil((today - new Date(task.planned_end_date)) / (1000 * 60 * 60 * 24))
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
              SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
       FROM room_tasks
       GROUP BY room_id`,
      { type: sequelize.QueryTypes.SELECT }
    );

    // 构建统计映射
    const statsMap = {};
    taskStats.forEach(stat => {
      statsMap[stat.room_id] = {
        total: parseInt(stat.total) || 0,
        completed: parseInt(stat.completed) || 0
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
      const stats = statsMap[room.id] || { total: 0, completed: 0 };
      return {
        id: room.id,
        name: room.name,
        status: room.status,
        manager: room.manager,
        total: stats.total,
        completed: stats.completed,
        progress: stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0
      };
    });

    // 按进度排序
    result.sort((a, b) => b.progress - a.progress);

    success(res, result);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getOverview,
  getByPhase,
  getDelayed,
  getRoomRanking
};