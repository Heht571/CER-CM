const { MachineRoom, User, RoomTask, TaskProgressLog, TaskTemplate, TaskDependency, ConstructionPhase, sequelize } = require('../models');
const { success, fail } = require('../utils/response');
const { Op } = require('sequelize');

/**
 * 根据开始日期、网络图依赖关系和建设方式计算所有任务的计划日期
 * @param {Array} nodes 任务节点列表
 * @param {Array} dependencies 依赖关系列表
 * @param {Date} startDate 项目开始日期
 * @param {String} constructionType 建设方式
 * @returns {Array} 包含日期的任务列表
 */
function calculateTaskDates(nodes, dependencies, startDate, constructionType) {
  const nodeMap = {};
  const depMap = {}; // task_id -> [prev_task_id, ...]

  // 只保留适用于当前建设方式的节点
  const filteredNodes = nodes.filter(node => {
    const types = node.applicable_types || [];
    return types.includes(constructionType);
  });

  // 初始化
  filteredNodes.forEach(node => {
    nodeMap[node.id] = { ...node.toJSON(), planned_start_date: null, planned_end_date: null };
  });

  // 构建依赖关系映射（只保留两个节点都存在且适用于当前建设方式的依赖）
  dependencies.forEach(dep => {
    // 检查依赖是否适用于当前建设方式
    const depTypes = dep.applicable_types || ['purchase', 'lease', 'self_build', 'container', 'reuse'];
    if (!depTypes.includes(constructionType)) {
      return;
    }
    // 只有当两个节点都存在时才添加依赖
    if (nodeMap[dep.task_id] && nodeMap[dep.prev_task_id]) {
      if (!depMap[dep.task_id]) {
        depMap[dep.task_id] = [];
      }
      depMap[dep.task_id].push(dep.prev_task_id);
    }
  });

  // 按拓扑排序计算日期
  const visited = new Set();
  const results = [];

  function processNode(nodeId) {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);

    const node = nodeMap[nodeId];
    if (!node) return;

    const prevIds = depMap[nodeId] || [];

    // 先处理所有前置节点
    prevIds.forEach(prevId => processNode(prevId));

    // 计算当前节点的日期
    if (prevIds.length === 0) {
      // 没有前置节点，使用项目开始日期
      node.planned_start_date = new Date(startDate);
    } else {
      // 取所有前置节点中最晚的结束日期 + 1天
      let latestEndDate = new Date(startDate);
      prevIds.forEach(prevId => {
        const prevNode = nodeMap[prevId];
        if (prevNode && prevNode.planned_end_date) {
          const endDate = new Date(prevNode.planned_end_date);
          if (endDate > latestEndDate) {
            latestEndDate = endDate;
          }
        }
      });
      node.planned_start_date = new Date(latestEndDate);
      node.planned_start_date.setDate(node.planned_start_date.getDate() + 1);
    }

    // 计算结束日期
    node.planned_end_date = new Date(node.planned_start_date);
    if (node.planned_days > 0) {
      node.planned_end_date.setDate(node.planned_end_date.getDate() + node.planned_days);
    }

    results.push(node);
  }

  // 按层级处理所有节点
  const sortedNodes = [...filteredNodes].sort((a, b) => a.graph_level - b.graph_level);
  sortedNodes.forEach(node => processNode(node.id));

  return results;
}

const normalizeOptionalCode = (value) => {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== 'string') {
    return value || null;
  }

  const normalized = value.trim();
  return normalized || null;
};

const calculateTaskSummary = (tasks = []) => {
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(task => task.status === 'completed').length;
  const inProgressTasks = tasks.filter(task => task.status === 'in_progress').length;
  const totalProgress = tasks.reduce((sum, task) => sum + Number(task.progress || 0), 0);

  return {
    totalTasks,
    completedTasks,
    inProgressTasks,
    overallProgress: totalTasks > 0 ? Math.round(totalProgress / totalTasks) : 0
  };
};

/**
 * 获取机房列表
 */
const getList = async (req, res, next) => {
  try {
    const { page = 1, pageSize = 10, keyword, status, manager_id, construction_type } = req.query;

    const where = {};
    if (keyword) {
      where[Op.or] = [
        { name: { [Op.like]: `%${keyword}%` } },
        { code: { [Op.like]: `%${keyword}%` } }
      ];
    }
    if (status) where.status = status;
    if (construction_type) where.construction_type = construction_type;

    if (req.user.role === 'manager') {
      where.manager_id = req.userId;
    } else if (manager_id) {
      where.manager_id = manager_id;
    }

    const { count, rows } = await MachineRoom.findAndCountAll({
      where,
      include: [{
        model: User,
        as: 'manager',
        attributes: ['id', 'real_name', 'phone']
      }],
      order: [['created_at', 'DESC']],
      offset: (page - 1) * pageSize,
      limit: parseInt(pageSize)
    });

    const roomsWithProgress = await Promise.all(rows.map(async (room) => {
      const roomTasks = await RoomTask.findAll({
        where: { room_id: room.id },
        attributes: ['status', 'progress']
      });
      const taskSummary = calculateTaskSummary(roomTasks);

      return {
        ...room.toJSON(),
        progress: taskSummary.overallProgress,
        totalTasks: taskSummary.totalTasks,
        completedTasks: taskSummary.completedTasks
      };
    }));

    const { paginate } = require('../utils/response');
    paginate(res, roomsWithProgress, count, page, pageSize);
  } catch (error) {
    next(error);
  }
};

/**
 * 获取机房详情
 */
const getDetail = async (req, res, next) => {
  try {
    const { id } = req.params;

    const room = await MachineRoom.findByPk(id, {
      include: [{
        model: User,
        as: 'manager',
        attributes: ['id', 'real_name', 'phone', 'department']
      }, {
        model: User,
        as: 'creator',
        attributes: ['id', 'real_name']
      }]
    });

    if (!room) {
      return fail(res, '机房不存在', 404);
    }

    if (req.user.role === 'manager' && room.manager_id !== req.userId) {
      return fail(res, '无权访问该机房', 403);
    }

    success(res, room);
  } catch (error) {
    next(error);
  }
};

/**
 * 创建机房
 */
const create = async (req, res, next) => {
  try {
    const { name, code, location, description, manager_id, planned_start_date, construction_type = 'purchase' } = req.body;
    const normalizedCode = normalizeOptionalCode(code);

    if (!name) {
      return fail(res, '机房名称不能为空');
    }

    if (!planned_start_date) {
      return fail(res, '请选择项目开始日期');
    }

    if (normalizedCode) {
      const existRoom = await MachineRoom.findOne({ where: { code: normalizedCode } });
      if (existRoom) {
        return fail(res, '机房编码已存在');
      }
    }

    const transaction = await sequelize.transaction();

    try {
      if (manager_id) {
        const manager = await User.findByPk(manager_id, { transaction });
        if (!manager || manager.role !== 'manager' || Number(manager.status) !== 1) {
          await transaction.rollback();
          return fail(res, '负责人不存在、未启用或角色不正确');
        }
      }

      // 创建机房
      const room = await MachineRoom.create({
        name,
        code: normalizedCode,
        location,
        description,
        manager_id,
        planned_start_date,
        construction_type,
        created_by: req.userId,
        status: 'planning'
      }, { transaction });

      // 获取所有任务节点
      const nodes = await TaskTemplate.findAll({
        order: [['graph_level', 'ASC'], ['graph_row', 'ASC']],
        transaction
      });

      // 获取所有依赖关系
      const dependencies = await TaskDependency.findAll({ transaction });

      // 根据建设方式计算任务日期
      const tasksWithDates = calculateTaskDates(nodes, dependencies, planned_start_date, construction_type);

      // 创建任务
      const tasksToCreate = tasksWithDates.map(task => ({
        room_id: room.id,
        template_id: task.id,
        phase_id: task.phase_id,
        name: task.name,
        planned_days: task.planned_days,
        planned_start_date: task.planned_start_date,
        planned_end_date: task.planned_end_date,
        status: 'not_started',
        progress: 0
      }));

      await RoomTask.bulkCreate(tasksToCreate, { transaction });

      // 计算项目结束日期
      const lastTask = tasksWithDates.reduce((latest, task) => {
        if (!latest || new Date(task.planned_end_date) > new Date(latest.planned_end_date)) {
          return task;
        }
        return latest;
      }, null);

      if (lastTask) {
        await room.update({ planned_end_date: lastTask.planned_end_date }, { transaction });
      }

      await transaction.commit();
      success(res, { id: room.id }, '创建成功');
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    next(error);
  }
};

/**
 * 更新机房
 */
const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, code, location, description, planned_start_date, construction_type, manager_id } = req.body;
    const normalizedCode = normalizeOptionalCode(code);
    const transaction = await sequelize.transaction();

    try {
      const room = await MachineRoom.findByPk(id, { transaction });
      if (!room) {
        await transaction.rollback();
        return fail(res, '机房不存在', 404);
      }

      const hasCode = Object.prototype.hasOwnProperty.call(req.body, 'code');
      if (hasCode && normalizedCode && normalizedCode !== room.code) {
        const existRoom = await MachineRoom.findOne({ where: { code: normalizedCode }, transaction });
        if (existRoom) {
          await transaction.rollback();
          return fail(res, '机房编码已存在');
        }
      }

      const hasManagerId = Object.prototype.hasOwnProperty.call(req.body, 'manager_id');
      if (hasManagerId && manager_id) {
        const manager = await User.findByPk(manager_id, { transaction });
        if (!manager || manager.role !== 'manager' || Number(manager.status) !== 1) {
          await transaction.rollback();
          return fail(res, '负责人不存在、未启用或角色不正确');
        }
      }

      const hasPlannedStartDate = Object.prototype.hasOwnProperty.call(req.body, 'planned_start_date');
      const hasConstructionType = Object.prototype.hasOwnProperty.call(req.body, 'construction_type');
      const shouldRecalculateTasks = (
        (hasPlannedStartDate && planned_start_date !== room.planned_start_date) ||
        (hasConstructionType && construction_type !== room.construction_type)
      );
      const effectiveType = hasConstructionType ? construction_type : room.construction_type;
      const effectiveDate = hasPlannedStartDate ? planned_start_date : room.planned_start_date;

      if (shouldRecalculateTasks) {
        const startedTaskCount = await RoomTask.count({
          where: {
            room_id: id,
            status: { [Op.ne]: 'not_started' }
          },
          transaction
        });

        if (startedTaskCount > 0) {
          await transaction.rollback();
          return fail(res, '已有已开始或已完成的任务，暂不支持直接重算计划');
        }
      }

      const roomUpdateData = {
        name,
        location,
        description,
        planned_start_date,
        construction_type
      };

      if (hasCode) {
        roomUpdateData.code = normalizedCode;
      }

      if (hasManagerId) {
        roomUpdateData.manager_id = manager_id || null;
      }

      await room.update(roomUpdateData, { transaction });

      if (shouldRecalculateTasks) {
        const nodes = await TaskTemplate.findAll({
          order: [['graph_level', 'ASC'], ['graph_row', 'ASC']],
          transaction
        });
        const dependencies = await TaskDependency.findAll({ transaction });
        const tasksWithDates = calculateTaskDates(nodes, dependencies, effectiveDate, effectiveType);
        const existingTasks = await RoomTask.findAll({
          where: { room_id: id },
          transaction
        });
        const existingTaskMap = new Map(existingTasks.map(task => [task.template_id, task]));
        const nextTemplateIds = new Set();

        for (const task of tasksWithDates) {
          nextTemplateIds.add(task.id);

          const taskData = {
            phase_id: task.phase_id,
            name: task.name,
            planned_days: task.planned_days,
            planned_start_date: task.planned_start_date,
            planned_end_date: task.planned_end_date
          };

          const existingTask = existingTaskMap.get(task.id);
          if (existingTask) {
            await existingTask.update(taskData, { transaction });
          } else {
            await RoomTask.create({
              room_id: room.id,
              template_id: task.id,
              ...taskData,
              status: 'not_started',
              progress: 0
            }, { transaction });
          }
        }

        const removableTaskIds = existingTasks
          .filter(task => !nextTemplateIds.has(task.template_id))
          .map(task => task.id);

        if (removableTaskIds.length > 0) {
          await TaskProgressLog.destroy({
            where: { task_id: { [Op.in]: removableTaskIds } },
            transaction
          });
          await RoomTask.destroy({
            where: { id: { [Op.in]: removableTaskIds } },
            transaction
          });
        }

        const lastTask = tasksWithDates.reduce((latest, task) => {
          if (!latest || new Date(task.planned_end_date) > new Date(latest.planned_end_date)) {
            return task;
          }
          return latest;
        }, null);

        await room.update({
          planned_end_date: lastTask ? lastTask.planned_end_date : null
        }, { transaction });
      }

      await transaction.commit();
      success(res, null, '更新成功');
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    next(error);
  }
};

/**
 * 删除机房
 */
const remove = async (req, res, next) => {
  try {
    const { id } = req.params;

    const room = await MachineRoom.findByPk(id);
    if (!room) {
      return fail(res, '机房不存在', 404);
    }

    const transaction = await sequelize.transaction();

    try {
      const tasks = await RoomTask.findAll({
        where: { room_id: id },
        attributes: ['id'],
        transaction
      });
      const taskIds = tasks.map(task => task.id);

      if (taskIds.length > 0) {
        await TaskProgressLog.destroy({
          where: { task_id: { [Op.in]: taskIds } },
          transaction
        });
      }

      await RoomTask.destroy({ where: { room_id: id }, transaction });
      await room.destroy({ transaction });
      await transaction.commit();
      success(res, null, '删除成功');
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    next(error);
  }
};

/**
 * 分配负责人
 */
const assignManager = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { manager_id } = req.body;

    const room = await MachineRoom.findByPk(id);
    if (!room) {
      return fail(res, '机房不存在', 404);
    }

    if (manager_id) {
      const manager = await User.findByPk(manager_id);
      if (!manager || manager.role !== 'manager' || Number(manager.status) !== 1) {
        return fail(res, '负责人不存在、未启用或角色不正确');
      }
    }

    await room.update({ manager_id });
    success(res, null, '分配成功');
  } catch (error) {
    next(error);
  }
};

const getRoomTaskStats = async (roomId, transaction) => {
  const tasks = await RoomTask.findAll({
    where: { room_id: roomId },
    attributes: ['status', 'actual_start_date', 'actual_end_date'],
    transaction
  });

  const startedTasks = tasks.filter(task => task.status !== 'not_started');
  const completedTasks = tasks.filter(task => task.status === 'completed');
  const earliestStartDate = startedTasks
    .map(task => task.actual_start_date)
    .filter(Boolean)
    .sort((a, b) => new Date(a) - new Date(b))[0] || null;
  const latestEndDate = completedTasks
    .map(task => task.actual_end_date)
    .filter(Boolean)
    .sort((a, b) => new Date(b) - new Date(a))[0] || null;

  return {
    totalCount: tasks.length,
    startedCount: startedTasks.length,
    completedCount: completedTasks.length,
    earliestStartDate,
    latestEndDate
  };
};

const buildRoomStatusUpdateData = (room, status, taskStats) => {
  if (!['planning', 'in_progress', 'completed', 'paused'].includes(status)) {
    return { error: '机房状态无效' };
  }

  if (status === 'completed') {
    if (taskStats.totalCount === 0) {
      return { error: '当前机房暂无任务，无法标记为已完成' };
    }
    if (taskStats.completedCount !== taskStats.totalCount) {
      return { error: '所有任务完成后才能将机房标记为已完成' };
    }

    return {
      updateData: {
        status,
        actual_start_date: taskStats.earliestStartDate || room.actual_start_date || new Date(),
        actual_end_date: taskStats.latestEndDate || new Date()
      }
    };
  }

  if (status === 'planning') {
    if (taskStats.startedCount > 0) {
      return { error: '已有进行中或已完成的任务，不能将机房设为规划中' };
    }

    return {
      updateData: {
        status,
        actual_start_date: null,
        actual_end_date: null
      }
    };
  }

  if (status === 'in_progress') {
    return {
      updateData: {
        status,
        actual_start_date: taskStats.earliestStartDate || room.actual_start_date || new Date(),
        actual_end_date: null
      }
    };
  }

  return {
    updateData: {
      status,
      actual_start_date: taskStats.earliestStartDate || room.actual_start_date || null,
      actual_end_date: null
    }
  };
};

/**
 * 更新机房状态
 */
const updateStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const transaction = await sequelize.transaction();

    try {
      const room = await MachineRoom.findByPk(id, { transaction });
      if (!room) {
        await transaction.rollback();
        return fail(res, '机房不存在', 404);
      }

      const taskStats = await getRoomTaskStats(id, transaction);
      const { updateData, error: validationError } = buildRoomStatusUpdateData(room, status, taskStats);
      if (validationError) {
        await transaction.rollback();
        return fail(res, validationError);
      }

      await room.update(updateData, { transaction });
      await transaction.commit();
      success(res, null, '状态更新成功');
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    next(error);
  }
};

/**
 * 获取机房任务网络图数据
 */
const getTasks = async (req, res, next) => {
  try {
    const { id } = req.params;

    const room = await MachineRoom.findByPk(id);
    if (!room) {
      return fail(res, '机房不存在', 404);
    }

    if (req.user.role === 'manager' && room.manager_id !== req.userId) {
      return fail(res, '无权访问该机房', 403);
    }

    // 获取任务及模板信息
    const tasks = await RoomTask.findAll({
      where: { room_id: id },
      include: [{
        model: TaskTemplate,
        as: 'template',
        attributes: ['graph_level', 'graph_row']
      }],
      order: [['template_id', 'ASC']]
    });

    // 获取依赖关系
    const dependencies = await TaskDependency.findAll();

    // 构建节点列表
    const nodes = tasks.map(task => ({
      id: task.id,
      template_id: task.template_id,
      name: task.name,
      status: task.status,
      progress: task.progress,
      planned_start_date: task.planned_start_date,
      planned_end_date: task.planned_end_date,
      planned_days: task.planned_days,
      graph_level: task.template?.graph_level || 0,
      graph_row: task.template?.graph_row || 0
    }));

    // 构建边列表（根据模板ID映射到实际任务ID）
    const templateToTask = {};
    tasks.forEach(task => {
      templateToTask[task.template_id] = task.id;
    });

    const constructionType = room.construction_type;
    const edges = dependencies
      .filter(dep => {
        // 只保留适用于当前建设方式的依赖
        const depTypes = dep.applicable_types || ['purchase', 'lease', 'self_build', 'container', 'reuse'];
        return depTypes.includes(constructionType);
      })
      .map(dep => ({
        source: templateToTask[dep.prev_task_id],
        target: templateToTask[dep.task_id]
      }))
      .filter(edge => edge.source && edge.target);

    success(res, { room, nodes, edges });
  } catch (error) {
    next(error);
  }
};

/**
 * 获取机房进度统计
 */
const getProgress = async (req, res, next) => {
  try {
    const { id } = req.params;

    const room = await MachineRoom.findByPk(id);
    if (!room) {
      return fail(res, '机房不存在', 404);
    }

    if (req.user.role === 'manager' && room.manager_id !== req.userId) {
      return fail(res, '无权访问该机房', 403);
    }

    const tasks = await RoomTask.findAll({
      where: { room_id: id },
      attributes: ['status', 'progress']
    });
    const taskSummary = calculateTaskSummary(tasks);

    success(res, {
      overall: taskSummary.overallProgress,
      totalTasks: taskSummary.totalTasks,
      completedTasks: taskSummary.completedTasks,
      inProgressTasks: taskSummary.inProgressTasks
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getList,
  getDetail,
  create,
  update,
  remove,
  assignManager,
  updateStatus,
  getTasks,
  getProgress
};