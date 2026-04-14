const { MachineRoom, User, RoomTask, TaskProgressLog, TaskTemplate, TaskDependency, ConstructionPhase, RoomChangeLog, Project, sequelize } = require('../models');
const { success, fail } = require('../utils/response');
const { Op } = require('sequelize');

// 变更类型映射
const CHANGE_TYPE_MAP = {
  name: 'name_change',
  code: 'code_change',
  location: 'location_change',
  construction_type: 'type_change',
  manager_id: 'manager_change',
  project_id: 'project_change',
  planned_start_date: 'date_change',
  description: 'desc_change'
};

// 记录变更日志
const recordChange = async (roomId, changeType, oldValue, newValue, changedBy, reason, transaction) => {
  await RoomChangeLog.create({
    room_id: roomId,
    change_type: changeType,
    old_value: oldValue ? String(oldValue) : null,
    new_value: newValue ? String(newValue) : null,
    change_reason: reason,
    changed_by: changedBy
  }, { transaction });
};

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
    const { page = 1, pageSize = 10, keyword, status, manager_id, construction_type, project_id } = req.query;

    const where = {};
    if (keyword) {
      where[Op.or] = [
        { name: { [Op.like]: `%${keyword}%` } },
        { code: { [Op.like]: `%${keyword}%` } }
      ];
    }
    if (status) where.status = status;
    if (construction_type) where.construction_type = construction_type;
    if (project_id) where.project_id = project_id;

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
      }, {
        model: Project,
        as: 'project',
        attributes: ['id', 'name', 'code']
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
      }, {
        model: Project,
        as: 'project',
        attributes: ['id', 'name', 'code']
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
    const { name, code, location, description, planned_start_date, construction_type, manager_id, project_id, change_reason } = req.body;
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

      const hasProjectId = Object.prototype.hasOwnProperty.call(req.body, 'project_id');
      if (hasProjectId && project_id) {
        const project = await Project.findByPk(project_id, { transaction });
        if (!project || project.status !== 'active') {
          await transaction.rollback();
          return fail(res, '项目不存在或已归档');
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

      // 记录变更日志
      const changes = [];

      // 检查并记录每个字段的变更
      if (name && name !== room.name) {
        changes.push({ type: 'name_change', old: room.name, new: name });
      }
      if (hasCode && normalizedCode !== room.code) {
        changes.push({ type: 'code_change', old: room.code, new: normalizedCode });
      }
      if (location !== undefined && location !== room.location) {
        changes.push({ type: 'location_change', old: room.location, new: location });
      }
      if (hasConstructionType && construction_type !== room.construction_type) {
        changes.push({ type: 'type_change', old: room.construction_type, new: construction_type });
      }
      if (hasManagerId && manager_id !== room.manager_id) {
        // 获取原负责人和新负责人姓名用于记录
        const oldManager = room.manager_id ? await User.findByPk(room.manager_id, { attributes: ['real_name'], transaction }) : null;
        const newManager = manager_id ? await User.findByPk(manager_id, { attributes: ['real_name'], transaction }) : null;
        changes.push({ type: 'manager_change', old: oldManager?.real_name || '未分配', new: newManager?.real_name || '未分配' });
      }
      if (hasProjectId && project_id !== room.project_id) {
        const oldProject = room.project_id ? await Project.findByPk(room.project_id, { attributes: ['name'], transaction }) : null;
        const newProject = project_id ? await Project.findByPk(project_id, { attributes: ['name'], transaction }) : null;
        changes.push({ type: 'project_change', old: oldProject?.name || '未分配', new: newProject?.name || '未分配' });
      }
      if (hasPlannedStartDate && planned_start_date !== room.planned_start_date) {
        changes.push({ type: 'date_change', old: room.planned_start_date, new: planned_start_date });
      }

      // 保存变更记录
      for (const change of changes) {
        await recordChange(id, change.type, change.old, change.new, req.userId, change_reason, transaction);
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

      if (hasProjectId) {
        roomUpdateData.project_id = project_id || null;
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
 * 批量删除机房
 */
const batchRemove = async (req, res, next) => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return fail(res, '请选择要删除的机房');
    }

    const transaction = await sequelize.transaction();

    try {
      // 检查所有机房是否存在
      const rooms = await MachineRoom.findAll({
        where: { id: { [Op.in]: ids } },
        transaction
      });

      if (rooms.length !== ids.length) {
        await transaction.rollback();
        return fail(res, '部分机房不存在');
      }

      // 获取所有关联的任务ID
      const tasks = await RoomTask.findAll({
        where: { room_id: { [Op.in]: ids } },
        attributes: ['id'],
        transaction
      });
      const taskIds = tasks.map(task => task.id);

      // 删除进度日志
      if (taskIds.length > 0) {
        await TaskProgressLog.destroy({
          where: { task_id: { [Op.in]: taskIds } },
          transaction
        });
      }

      // 删除变更记录
      await RoomChangeLog.destroy({
        where: { room_id: { [Op.in]: ids } },
        transaction
      });

      // 删除任务
      await RoomTask.destroy({
        where: { room_id: { [Op.in]: ids } },
        transaction
      });

      // 删除机房
      await MachineRoom.destroy({
        where: { id: { [Op.in]: ids } },
        transaction
      });

      await transaction.commit();
      success(res, { deleted: ids.length }, `成功删除 ${ids.length} 个机房`);
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

/**
 * 下载导入模板
 */
const downloadTemplate = async (req, res, next) => {
  try {
    const csvContent = `机房名称,机房编码,位置,建设方式,负责人姓名,所属项目,计划开始日期,描述
示例机房1,JF001,北京市朝阳区,购置,张三,默认项目,2024-01-15,示例描述
示例机房2,JF002,上海市浦东新区,租赁,李四,默认项目,2024-02-01,`;

    res.setHeader('Content-Type', 'text/csv;charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=room_import_template.csv');
    res.send('\uFEFF' + csvContent);
  } catch (error) {
    next(error);
  }
};

/**
 * 批量导入机房
 */
const batchImport = async (req, res, next) => {
  try {
    const { data } = req.body;

    if (!data || !Array.isArray(data) || data.length === 0) {
      return fail(res, '导入数据不能为空');
    }

    // 建设方式映射
    const constructionTypeMap = {
      '购置': 'purchase',
      '租赁': 'lease',
      '自建': 'self_build',
      '一体化集装箱': 'container',
      '集装箱': 'container',
      '利旧': 'reuse'
    };

    // 获取所有负责人
    const managers = await User.findAll({
      where: { role: 'manager', status: 1 },
      attributes: ['id', 'real_name']
    });
    const managerMap = {};
    managers.forEach(m => {
      managerMap[m.real_name] = m.id;
    });

    // 获取所有活跃项目
    const projects = await Project.findAll({
      where: { status: 'active' },
      attributes: ['id', 'name', 'code']
    });
    const projectMap = {};
    projects.forEach(p => {
      projectMap[p.name] = p.id;
      projectMap[p.code] = p.id; // 也支持用项目编码匹配
    });

    // 获取所有任务节点和依赖关系
    const nodes = await TaskTemplate.findAll({
      order: [['graph_level', 'ASC'], ['graph_row', 'ASC']]
    });
    const dependencies = await TaskDependency.findAll();

    const results = {
      success: 0,
      failed: 0,
      errors: []
    };

    const transaction = await sequelize.transaction();

    try {
      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        const rowNum = i + 2; // Excel行号从2开始（第1行是表头）

        try {
          const name = row['机房名称'] || row['name'];
          const code = row['机房编码'] || row['code'];
          const location = row['位置'] || row['location'];
          const constructionTypeText = row['建设方式'] || row['construction_type'];
          const managerName = row['负责人姓名'] || row['manager_name'];
          const projectName = row['所属项目'] || row['project_name'] || row['项目'];
          const plannedStartDate = row['计划开始日期'] || row['planned_start_date'];
          const description = row['描述'] || row['description'];

          // 验证必填字段
          if (!name) {
            results.failed++;
            results.errors.push(`第${rowNum}行: 机房名称不能为空`);
            continue;
          }

          if (!plannedStartDate) {
            results.failed++;
            results.errors.push(`第${rowNum}行: 计划开始日期不能为空`);
            continue;
          }

          // 解析建设方式
          let constructionType = 'purchase';
          if (constructionTypeText) {
            constructionType = constructionTypeMap[constructionTypeText] || constructionTypeText;
            if (!['purchase', 'lease', 'self_build', 'container', 'reuse'].includes(constructionType)) {
              results.failed++;
              results.errors.push(`第${rowNum}行: 建设方式"${constructionTypeText}"无效，有效值：购置、租赁、自建、一体化集装箱、利旧`);
              continue;
            }
          }

          // 检查编码是否重复
          const normalizedCode = code ? code.trim() : null;
          if (normalizedCode) {
            const existRoom = await MachineRoom.findOne({ where: { code: normalizedCode }, transaction });
            if (existRoom) {
              results.failed++;
              results.errors.push(`第${rowNum}行: 机房编码"${normalizedCode}"已存在`);
              continue;
            }
          }

          // 解析负责人
          let managerId = null;
          if (managerName) {
            managerId = managerMap[managerName];
            if (!managerId) {
              results.failed++;
              results.errors.push(`第${rowNum}行: 负责人"${managerName}"不存在或未启用`);
              continue;
            }
          }

          // 解析项目
          let projectId = null;
          if (projectName) {
            projectId = projectMap[projectName];
            if (!projectId) {
              results.failed++;
              results.errors.push(`第${rowNum}行: 所属项目"${projectName}"不存在或已归档`);
              continue;
            }
          }

          // 解析日期
          const startDate = new Date(plannedStartDate);
          if (isNaN(startDate.getTime())) {
            results.failed++;
            results.errors.push(`第${rowNum}行: 计划开始日期格式无效`);
            continue;
          }

          // 创建机房
          const room = await MachineRoom.create({
            name,
            code: normalizedCode,
            location,
            description,
            manager_id: managerId,
            project_id: projectId,
            planned_start_date: startDate,
            construction_type: constructionType,
            created_by: req.userId,
            status: 'planning'
          }, { transaction });

          // 根据建设方式计算任务日期
          const tasksWithDates = calculateTaskDates(nodes, dependencies, startDate, constructionType);

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

          // 更新项目结束日期
          const lastTask = tasksWithDates.reduce((latest, task) => {
            if (!latest || new Date(task.planned_end_date) > new Date(latest.planned_end_date)) {
              return task;
            }
            return latest;
          }, null);

          if (lastTask) {
            await room.update({ planned_end_date: lastTask.planned_end_date }, { transaction });
          }

          results.success++;
        } catch (error) {
          results.failed++;
          results.errors.push(`第${rowNum}行: ${error.message}`);
        }
      }

      await transaction.commit();

      let message = `导入完成：成功 ${results.success} 条`;
      if (results.failed > 0) {
        message += `，失败 ${results.failed} 条`;
      }

      success(res, results, message);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    next(error);
  }
};

/**
 * 获取机房变更历史
 */
const getChangeHistory = async (req, res, next) => {
  try {
    const { id } = req.params;

    const room = await MachineRoom.findByPk(id);
    if (!room) {
      return fail(res, '机房不存在', 404);
    }

    const changeLogs = await RoomChangeLog.findAll({
      where: { room_id: id },
      include: [{
        model: User,
        as: 'changer',
        attributes: ['id', 'real_name']
      }],
      order: [['created_at', 'DESC']]
    });

    // 变更类型中文映射
    const changeTypeText = {
      name_change: '名称变更',
      code_change: '编码变更',
      location_change: '地点变更',
      type_change: '建设方式变更',
      manager_change: '负责人变更',
      project_change: '所属项目变更',
      date_change: '计划日期变更',
      desc_change: '描述变更'
    };

    const result = changeLogs.map(log => ({
      id: log.id,
      changeType: log.change_type,
      changeTypeText: changeTypeText[log.change_type] || log.change_type,
      oldValue: log.old_value,
      newValue: log.new_value,
      changeReason: log.change_reason,
      changer: log.changer,
      createdAt: log.created_at
    }));

    success(res, result);
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
  batchRemove,
  assignManager,
  updateStatus,
  getTasks,
  getProgress,
  downloadTemplate,
  batchImport,
  getChangeHistory
};