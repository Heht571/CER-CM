const { MachineRoom, User, RoomTask, TaskTemplate, TaskDependency, ConstructionPhase, sequelize } = require('../models');
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

  // 构建依赖关系映射（只保留两个节点都存在的依赖）
  dependencies.forEach(dep => {
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
      const totalTasks = await RoomTask.count({ where: { room_id: room.id } });
      const completedTasks = await RoomTask.count({
        where: { room_id: room.id, status: 'completed' }
      });
      return {
        ...room.toJSON(),
        progress: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
        totalTasks,
        completedTasks
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

    if (!name) {
      return fail(res, '机房名称不能为空');
    }

    if (!planned_start_date) {
      return fail(res, '请选择项目开始日期');
    }

    if (code) {
      const existRoom = await MachineRoom.findOne({ where: { code } });
      if (existRoom) {
        return fail(res, '机房编码已存在');
      }
    }

    const transaction = await sequelize.transaction();

    try {
      // 创建机房
      const room = await MachineRoom.create({
        name,
        code,
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
    const { name, code, location, description, planned_start_date, construction_type } = req.body;

    const room = await MachineRoom.findByPk(id);
    if (!room) {
      return fail(res, '机房不存在', 404);
    }

    if (code && code !== room.code) {
      const existRoom = await MachineRoom.findOne({ where: { code } });
      if (existRoom) {
        return fail(res, '机房编码已存在');
      }
    }

    await room.update({
      name,
      code,
      location,
      description,
      planned_start_date,
      construction_type
    });

    // 如果更新了开始日期或建设方式，重新计算所有任务日期
    if (planned_start_date || construction_type) {
      const nodes = await TaskTemplate.findAll();
      const dependencies = await TaskDependency.findAll();

      const effectiveType = construction_type || room.construction_type;
      const effectiveDate = planned_start_date || room.planned_start_date;

      const tasksWithDates = calculateTaskDates(nodes, dependencies, effectiveDate, effectiveType);

      // 删除旧任务，创建新任务
      await RoomTask.destroy({ where: { room_id: id } });

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

      await RoomTask.bulkCreate(tasksToCreate);

      // 更新项目结束日期
      const lastTask = tasksWithDates.reduce((latest, task) => {
        if (!latest || new Date(task.planned_end_date) > new Date(latest.planned_end_date)) {
          return task;
        }
        return latest;
      }, null);

      if (lastTask) {
        await room.update({ planned_end_date: lastTask.planned_end_date });
      }
    }

    success(res, null, '更新成功');
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
      if (!manager || manager.role !== 'manager') {
        return fail(res, '负责人不存在或角色不正确');
      }
    }

    await room.update({ manager_id });
    success(res, null, '分配成功');
  } catch (error) {
    next(error);
  }
};

/**
 * 更新机房状态
 */
const updateStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const room = await MachineRoom.findByPk(id);
    if (!room) {
      return fail(res, '机房不存在', 404);
    }

    await room.update({ status });

    if (status === 'in_progress' && !room.actual_start_date) {
      await room.update({ actual_start_date: new Date() });
    }

    if (status === 'completed') {
      await room.update({ actual_end_date: new Date() });
    }

    success(res, null, '状态更新成功');
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

    // 获取依赖关系（只保留实际存在的任务之间的依赖）
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

    const edges = dependencies
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

    const tasks = await RoomTask.findAll({ where: { room_id: id } });

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'completed').length;
    const inProgressTasks = tasks.filter(t => t.status === 'in_progress').length;

    success(res, {
      overall: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
      totalTasks,
      completedTasks,
      inProgressTasks
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