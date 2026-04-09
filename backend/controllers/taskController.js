const { RoomTask, MachineRoom, ConstructionPhase, TaskProgressLog, TaskTemplate, TaskDependency, User, sequelize } = require('../models');
const { success, fail, paginate } = require('../utils/response');
const { Op } = require('sequelize');

const DEFAULT_CONSTRUCTION_TYPES = ['purchase', 'lease', 'self_build', 'container', 'reuse'];
const DATE_ONLY_REGEX = /^(\d{4})-(\d{2})-(\d{2})$/;

const getApplicableTypes = (types) => {
  if (Array.isArray(types) && types.length > 0) {
    return types;
  }
  return DEFAULT_CONSTRUCTION_TYPES;
};

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

const getTodayDateOnly = () => parseDateOnly(new Date());

const isDateBefore = (source, target) => {
  const sourceDate = parseDateOnly(source);
  const targetDate = parseDateOnly(target);
  return Boolean(sourceDate && targetDate && sourceDate < targetDate);
};

const normalizeTemplatePayload = (payload = {}, { requireApplicableTypes = false } = {}) => {
  const normalized = {};

  if (Object.prototype.hasOwnProperty.call(payload, 'planned_days')) {
    const plannedDays = Number(payload.planned_days);
    if (!Number.isInteger(plannedDays) || plannedDays < 0) {
      return { error: '计划天数必须为大于等于0的整数' };
    }
    normalized.planned_days = plannedDays;
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'sort_order')) {
    const sortOrder = Number(payload.sort_order);
    if (!Number.isInteger(sortOrder) || sortOrder < 0) {
      return { error: '排序值必须为大于等于0的整数' };
    }
    normalized.sort_order = sortOrder;
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'graph_level')) {
    const graphLevel = Number(payload.graph_level);
    if (!Number.isInteger(graphLevel) || graphLevel < 0) {
      return { error: '网络图层级必须为大于等于0的整数' };
    }
    normalized.graph_level = graphLevel;
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'graph_row')) {
    const graphRow = Number(payload.graph_row);
    if (!Number.isInteger(graphRow) || graphRow < 0) {
      return { error: '网络图行号必须为大于等于0的整数' };
    }
    normalized.graph_row = graphRow;
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'applicable_types')) {
    if (!Array.isArray(payload.applicable_types) || payload.applicable_types.length === 0) {
      return { error: '适用建设方式不能为空' };
    }

    const invalidTypes = payload.applicable_types.filter(type => !DEFAULT_CONSTRUCTION_TYPES.includes(type));
    if (invalidTypes.length > 0) {
      return { error: `存在无效的建设方式：${invalidTypes.join('、')}` };
    }

    normalized.applicable_types = [...new Set(payload.applicable_types)];
  } else if (requireApplicableTypes) {
    normalized.applicable_types = [...DEFAULT_CONSTRUCTION_TYPES];
  }

  return { normalized };
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

async function validateTaskDependencies(task) {
  const dependencies = await TaskDependency.findAll({
    where: { task_id: task.template_id }
  });

  const activeDependencies = dependencies.filter(dep => {
    const applicableTypes = getApplicableTypes(dep.applicable_types);
    return applicableTypes.includes(task.room.construction_type);
  });

  if (activeDependencies.length === 0) {
    return { valid: true };
  }

  const predecessorTasks = await RoomTask.findAll({
    where: {
      room_id: task.room_id,
      template_id: { [Op.in]: activeDependencies.map(dep => dep.prev_task_id) }
    },
    attributes: ['template_id', 'name', 'status']
  });

  const predecessorMap = new Map(predecessorTasks.map(item => [item.template_id, item]));
  const blockedTasks = activeDependencies.filter(dep => {
    const predecessorTask = predecessorMap.get(dep.prev_task_id);
    return !predecessorTask || predecessorTask.status !== 'completed';
  });

  if (blockedTasks.length === 0) {
    return { valid: true };
  }

  const blockedTaskNames = blockedTasks.map(dep => {
    const predecessorTask = predecessorMap.get(dep.prev_task_id);
    return predecessorTask?.name || `模板任务#${dep.prev_task_id}`;
  });

  return {
    valid: false,
    message: `前置任务未完成：${blockedTaskNames.join('、')}`
  };
}

async function validateTaskSuccessors(task, nextStatus) {
  if (nextStatus === 'completed') {
    return { valid: true };
  }

  const dependencies = await TaskDependency.findAll({
    where: { prev_task_id: task.template_id }
  });

  const activeSuccessors = dependencies.filter(dep => {
    const applicableTypes = getApplicableTypes(dep.applicable_types);
    return applicableTypes.includes(task.room.construction_type);
  });

  if (activeSuccessors.length === 0) {
    return { valid: true };
  }

  const successorTasks = await RoomTask.findAll({
    where: {
      room_id: task.room_id,
      template_id: { [Op.in]: activeSuccessors.map(dep => dep.task_id) },
      status: { [Op.ne]: 'not_started' }
    },
    attributes: ['name']
  });

  if (successorTasks.length === 0) {
    return { valid: true };
  }

  const successorNames = [...new Set(successorTasks.map(item => item.name))];

  return {
    valid: false,
    message: `后置任务已开始，当前任务不可回退：${successorNames.join('、')}`
  };
}

async function validateTaskTransition(task, updateData) {
  if (updateData.status !== 'not_started') {
    const dependencyCheck = await validateTaskDependencies(task);
    if (!dependencyCheck.valid) {
      return dependencyCheck;
    }
  }

  return validateTaskSuccessors(task, updateData.status);
}

/**
 * 获取我的机房任务（按机房分组，只显示当前待处理任务）
 */
const getMyRoomTasks = async (req, res, next) => {
  try {
    // 获取用户负责的机房（管理员看所有）
    let rooms;
    if (req.user.role === 'admin') {
      rooms = await MachineRoom.findAll({
        include: [{
          model: User,
          as: 'manager',
          attributes: ['id', 'real_name', 'phone']
        }],
        order: [['created_at', 'DESC']]
      });
    } else {
      rooms = await MachineRoom.findAll({
        where: { manager_id: req.userId },
        include: [{
          model: User,
          as: 'manager',
          attributes: ['id', 'real_name', 'phone']
        }],
        order: [['created_at', 'DESC']]
      });
    }

    // 获取每个机房的当前任务
    const result = await Promise.all(rooms.map(async (room) => {
      // 获取该机房所有任务
      const tasks = await RoomTask.findAll({
        where: { room_id: room.id },
        include: [{
          model: ConstructionPhase,
          as: 'phase',
          attributes: ['id', 'name', 'phase_number']
        }],
        order: [['id', 'ASC']]
      });

      if (tasks.length === 0) {
        return {
          room: room.toJSON(),
          currentTasks: [],
          totalTasks: 0,
          completedTasks: 0,
          inProgressTasks: 0,
          delayedTasks: 0,
          overallProgress: 0
        };
      }

      // 获取所有任务的模板ID
      const templateIds = tasks.map(t => t.template_id);

      // 获取任务模板的依赖关系（前置任务）
      const dependencies = await TaskDependency.findAll({
        where: { task_id: { [Op.in]: templateIds } }
      });

      // 构建依赖映射：template_id -> [prev_template_ids]
      const dependencyMap = {};
      dependencies.forEach(dep => {
        // 过滤适用类型
        const applicableTypes = dep.applicable_types || ['purchase', 'lease', 'self_build', 'container', 'reuse'];
        if (applicableTypes.includes(room.construction_type)) {
          if (!dependencyMap[dep.task_id]) {
            dependencyMap[dep.task_id] = [];
          }
          dependencyMap[dep.task_id].push(dep.prev_task_id);
        }
      });

      // 构建模板ID到任务的映射
      const templateToTask = {};
      tasks.forEach(t => {
        templateToTask[t.template_id] = t;
      });

      // 找到所有当前待处理任务（未完成且所有前置任务已完成的任务）
      const currentTasks = [];
      for (const task of tasks) {
        if (task.status === 'completed') continue;

        // 检查所有前置任务是否已完成
        const prevTemplateIds = dependencyMap[task.template_id] || [];
        const allDepsCompleted = prevTemplateIds.every(prevId => {
          const prevTask = templateToTask[prevId];
          return prevTask && prevTask.status === 'completed';
        });

        if (allDepsCompleted) {
          currentTasks.push({
            ...task.toJSON(),
            room: room.toJSON()
          });
        }
      }

      const taskSummary = calculateTaskSummary(tasks);

      // 延期任务
      const today = getTodayDateOnly();
      const delayedTasks = tasks.filter(t =>
        t.status !== 'completed' &&
        t.planned_end_date &&
        isDateBefore(t.planned_end_date, today)
      ).length;

      return {
        room: room.toJSON(),
        currentTasks,
        totalTasks: taskSummary.totalTasks,
        completedTasks: taskSummary.completedTasks,
        inProgressTasks: taskSummary.inProgressTasks,
        delayedTasks,
        overallProgress: taskSummary.overallProgress
      };
    }));

    success(res, result);
  } catch (error) {
    next(error);
  }
};

/**
 * 获取任务列表
 */
const getList = async (req, res, next) => {
  try {
    const { page = 1, pageSize = 20, room_id, phase_id, status } = req.query;

    const where = {};
    if (status) where.status = status;
    if (phase_id) where.phase_id = phase_id;

    let managedRoomIds = [];
    if (req.user.role === 'manager') {
      const managedRooms = await MachineRoom.findAll({
        where: { manager_id: req.userId },
        attributes: ['id']
      });
      managedRoomIds = managedRooms.map(room => room.id);
    }

    // 机房筛选
    if (room_id) {
      if (req.user.role === 'manager' && !managedRoomIds.some(id => String(id) === String(room_id))) {
        return fail(res, '无权查看该机房任务', 403);
      }
      where.room_id = room_id;
    } else if (req.user.role === 'manager') {
      // 负责人只能看自己负责的机房任务
      where.room_id = { [Op.in]: managedRoomIds };
    }

    const { count, rows } = await RoomTask.findAndCountAll({
      where,
      include: [
        {
          model: MachineRoom,
          as: 'room',
          attributes: ['id', 'name', 'status']
        },
        {
          model: ConstructionPhase,
          as: 'phase',
          attributes: ['id', 'name', 'phase_number']
        }
      ],
      order: [['room_id', 'ASC'], ['phase_id', 'ASC'], ['id', 'ASC']],
      offset: (page - 1) * pageSize,
      limit: parseInt(pageSize)
    });

    paginate(res, rows, count, page, pageSize);
  } catch (error) {
    next(error);
  }
};

/**
 * 获取任务详情
 */
const getDetail = async (req, res, next) => {
  try {
    const { id } = req.params;

    const task = await RoomTask.findByPk(id, {
      include: [
        {
          model: MachineRoom,
          as: 'room',
          attributes: ['id', 'name', 'status', 'manager_id']
        },
        {
          model: ConstructionPhase,
          as: 'phase',
          attributes: ['id', 'name', 'phase_number']
        }
      ]
    });

    if (!task) {
      return fail(res, '任务不存在', 404);
    }

    // 权限检查
    if (req.user.role === 'manager' && task.room.manager_id !== req.userId) {
      return fail(res, '无权访问该任务', 403);
    }

    // 获取进度日志
    const logs = await TaskProgressLog.findAll({
      where: { task_id: id },
      order: [['created_at', 'DESC']],
      limit: 10
    });

    success(res, { ...task.toJSON(), logs });
  } catch (error) {
    next(error);
  }
};

/**
 * 构建任务更新数据，确保状态与进度一致
 */
const buildTaskUpdateData = (task, { status, progress }) => {
  const hasStatus = status !== undefined;
  const hasProgress = progress !== undefined;
  const numericProgress = hasProgress ? Number(progress) : Number(task.progress || 0);
  const nextStatus = hasStatus
    ? status
    : (numericProgress === 100 ? 'completed' : numericProgress > 0 ? 'in_progress' : 'not_started');

  if (!['not_started', 'in_progress', 'completed'].includes(nextStatus)) {
    return { error: '状态值无效' };
  }

  if (!Number.isInteger(numericProgress) || numericProgress < 0 || numericProgress > 100) {
    return { error: '进度值必须为0-100之间的整数' };
  }

  const today = formatDateOnly(new Date());
  const updateData = { status: nextStatus, progress: numericProgress };

  if (nextStatus === 'not_started') {
    updateData.progress = 0;
    updateData.actual_start_date = null;
    updateData.actual_end_date = null;
    return { updateData };
  }

  if (nextStatus === 'completed') {
    updateData.progress = 100;
    updateData.actual_start_date = task.actual_start_date || today;
    updateData.actual_end_date = task.status === 'completed' && task.actual_end_date
      ? task.actual_end_date
      : today;
    return { updateData };
  }

  updateData.progress = numericProgress > 0 && numericProgress < 100
    ? numericProgress
    : (task.progress > 0 && task.progress < 100 ? task.progress : 1);
  updateData.actual_start_date = task.actual_start_date || today;
  updateData.actual_end_date = null;

  return { updateData };
};

const buildTaskUpdateRemark = (task, updateData, remark) => {
  if (remark) {
    return remark;
  }

  const changes = [];
  if (task.status !== updateData.status) {
    changes.push(`状态从"${getStatusLabel(task.status)}"变为"${getStatusLabel(updateData.status)}"`);
  }
  if (Number(task.progress) !== Number(updateData.progress)) {
    changes.push(`进度从${task.progress}%更新为${updateData.progress}%`);
  }

  return changes.join('；') || '任务信息已更新';
};

const ensureRoomTaskEditable = (room) => {
  if (room.status === 'paused') {
    return '机房已暂停，请先恢复机房状态后再更新任务';
  }
  if (room.status === 'completed') {
    return '机房已完成，请先调整机房状态后再更新任务';
  }
  return null;
};

const syncRoomStatusByTasks = async (roomId, transaction) => {
  const room = await MachineRoom.findByPk(roomId, {
    attributes: ['id', 'status', 'actual_start_date'],
    transaction
  });

  if (!room || room.status === 'paused') {
    return;
  }

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

  let nextStatus = 'planning';
  let actualStartDate = null;
  let actualEndDate = null;

  if (tasks.length > 0 && completedTasks.length === tasks.length) {
    nextStatus = 'completed';
    actualStartDate = earliestStartDate || room.actual_start_date || new Date();
    actualEndDate = latestEndDate || new Date();
  } else if (startedTasks.length > 0) {
    nextStatus = 'in_progress';
    actualStartDate = earliestStartDate || room.actual_start_date || new Date();
  }

  await room.update({
    status: nextStatus,
    actual_start_date: actualStartDate,
    actual_end_date: actualEndDate
  }, { transaction });
};

/**
 * 同时更新任务状态与进度
 */
const updateTask = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, progress, remark } = req.body;

    if (status === undefined && progress === undefined && !remark) {
      return fail(res, '请至少提供状态、进度或备注中的一项');
    }

    const task = await RoomTask.findByPk(id, {
      include: [{ model: MachineRoom, as: 'room' }]
    });

    if (!task) {
      return fail(res, '任务不存在', 404);
    }

    if (req.user.role === 'manager' && task.room.manager_id !== req.userId) {
      return fail(res, '无权操作该任务', 403);
    }

    const roomEditError = ensureRoomTaskEditable(task.room);
    if (roomEditError) {
      return fail(res, roomEditError);
    }

    const { updateData, error: validationError } = buildTaskUpdateData(task, { status, progress });
    if (validationError) {
      return fail(res, validationError);
    }

    const hasStateChange = task.status !== updateData.status || Number(task.progress) !== Number(updateData.progress);
    if (hasStateChange) {
      const transitionCheck = await validateTaskTransition(task, updateData);
      if (!transitionCheck.valid) {
        return fail(res, transitionCheck.message);
      }
    }

    const previousState = {
      status: task.status,
      progress: task.progress
    };
    const transaction = await sequelize.transaction();

    try {
      await task.update(updateData, { transaction });
      await syncRoomStatusByTasks(task.room_id, transaction);

      await TaskProgressLog.create({
        task_id: id,
        user_id: req.userId,
        old_status: previousState.status,
        new_status: updateData.status,
        old_progress: previousState.progress,
        new_progress: updateData.progress,
        remark: buildTaskUpdateRemark(previousState, updateData, remark)
      }, { transaction });

      await transaction.commit();
      success(res, null, '任务更新成功');
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    next(error);
  }
};

/**
 * 更新任务状态
 */
const updateStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, remark } = req.body;

    const task = await RoomTask.findByPk(id, {
      include: [{ model: MachineRoom, as: 'room' }]
    });

    if (!task) {
      return fail(res, '任务不存在', 404);
    }

    if (req.user.role === 'manager' && task.room.manager_id !== req.userId) {
      return fail(res, '无权操作该任务', 403);
    }

    const roomEditError = ensureRoomTaskEditable(task.room);
    if (roomEditError) {
      return fail(res, roomEditError);
    }

    const { updateData, error: validationError } = buildTaskUpdateData(task, { status });
    if (validationError) {
      return fail(res, validationError);
    }

    const hasStateChange = task.status !== updateData.status || Number(task.progress) !== Number(updateData.progress);
    if (hasStateChange) {
      const transitionCheck = await validateTaskTransition(task, updateData);
      if (!transitionCheck.valid) {
        return fail(res, transitionCheck.message);
      }
    }

    const previousState = {
      status: task.status,
      progress: task.progress
    };
    const transaction = await sequelize.transaction();

    try {
      await task.update(updateData, { transaction });
      await syncRoomStatusByTasks(task.room_id, transaction);

      await TaskProgressLog.create({
        task_id: id,
        user_id: req.userId,
        old_status: previousState.status,
        new_status: updateData.status,
        old_progress: previousState.progress,
        new_progress: updateData.progress,
        remark: buildTaskUpdateRemark(previousState, updateData, remark)
      }, { transaction });

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
 * 更新任务进度
 */
const updateProgress = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { progress, remark } = req.body;

    const task = await RoomTask.findByPk(id, {
      include: [{ model: MachineRoom, as: 'room' }]
    });

    if (!task) {
      return fail(res, '任务不存在', 404);
    }

    if (req.user.role === 'manager' && task.room.manager_id !== req.userId) {
      return fail(res, '无权操作该任务', 403);
    }

    const roomEditError = ensureRoomTaskEditable(task.room);
    if (roomEditError) {
      return fail(res, roomEditError);
    }

    const { updateData, error: validationError } = buildTaskUpdateData(task, { progress });
    if (validationError) {
      return fail(res, validationError);
    }

    const hasStateChange = task.status !== updateData.status || Number(task.progress) !== Number(updateData.progress);
    if (hasStateChange) {
      const transitionCheck = await validateTaskTransition(task, updateData);
      if (!transitionCheck.valid) {
        return fail(res, transitionCheck.message);
      }
    }

    const previousState = {
      status: task.status,
      progress: task.progress
    };
    const transaction = await sequelize.transaction();

    try {
      await task.update(updateData, { transaction });
      await syncRoomStatusByTasks(task.room_id, transaction);

      await TaskProgressLog.create({
        task_id: id,
        user_id: req.userId,
        old_status: previousState.status,
        new_status: updateData.status,
        old_progress: previousState.progress,
        new_progress: updateData.progress,
        remark: buildTaskUpdateRemark(previousState, updateData, remark)
      }, { transaction });

      await transaction.commit();
      success(res, null, '进度更新成功');
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    next(error);
  }
};

/**
 * 获取任务模板列表
 */
const getTemplates = async (req, res, next) => {
  try {
    const { phase_id } = req.query;

    const where = {};
    if (phase_id) where.phase_id = phase_id;

    const templates = await TaskTemplate.findAll({
      where,
      include: [{
        model: ConstructionPhase,
        as: 'phase',
        attributes: ['id', 'name', 'phase_number']
      }],
      order: [['phase_id', 'ASC'], ['sort_order', 'ASC']]
    });

    success(res, templates);
  } catch (error) {
    next(error);
  }
};

/**
 * 创建任务模板
 */
const createTemplate = async (req, res, next) => {
  try {
    const {
      phase_id,
      name,
      planned_days,
      description,
      sort_order,
      graph_level,
      graph_row,
      applicable_types
    } = req.body;

    if (!phase_id || !name) {
      return fail(res, '阶段和任务名称不能为空');
    }

    const { normalized, error: payloadError } = normalizeTemplatePayload({
      planned_days,
      sort_order,
      graph_level,
      graph_row,
      applicable_types
    }, { requireApplicableTypes: true });
    if (payloadError) {
      return fail(res, payloadError);
    }

    const template = await TaskTemplate.create({
      phase_id,
      name,
      description,
      ...normalized
    });

    success(res, { id: template.id }, '创建成功');
  } catch (error) {
    next(error);
  }
};

/**
 * 更新任务模板
 */
const updateTemplate = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      name,
      planned_days,
      description,
      sort_order,
      graph_level,
      graph_row,
      applicable_types
    } = req.body;

    const template = await TaskTemplate.findByPk(id);
    if (!template) {
      return fail(res, '模板不存在', 404);
    }

    const { normalized, error: payloadError } = normalizeTemplatePayload({
      planned_days,
      sort_order,
      graph_level,
      graph_row,
      applicable_types
    });
    if (payloadError) {
      return fail(res, payloadError);
    }

    await template.update({
      name,
      description,
      ...normalized
    });

    success(res, null, '更新成功');
  } catch (error) {
    next(error);
  }
};

/**
 * 删除任务模板
 */
const deleteTemplate = async (req, res, next) => {
  try {
    const { id } = req.params;

    const template = await TaskTemplate.findByPk(id);
    if (!template) {
      return fail(res, '模板不存在', 404);
    }

    await template.destroy();
    success(res, null, '删除成功');
  } catch (error) {
    next(error);
  }
};

/**
 * 获取任务进度日志
 */
const getTaskLogs = async (req, res, next) => {
  try {
    const { id } = req.params;

    const task = await RoomTask.findByPk(id, {
      include: [{
        model: MachineRoom,
        as: 'room',
        attributes: ['id', 'manager_id']
      }]
    });

    if (!task) {
      return fail(res, '任务不存在', 404);
    }

    if (req.user.role === 'manager' && task.room.manager_id !== req.userId) {
      return fail(res, '无权访问该任务日志', 403);
    }

    const logs = await TaskProgressLog.findAll({
      where: { task_id: id },
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'real_name', 'username', 'role']
      }],
      order: [['created_at', 'DESC']]
    });

    success(res, logs);
  } catch (error) {
    next(error);
  }
};

/**
 * 获取机房所有任务的进度日志
 */
const getRoomLogs = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { page = 1, pageSize = 20 } = req.query;

    const room = await MachineRoom.findByPk(id, {
      attributes: ['id', 'manager_id']
    });

    if (!room) {
      return fail(res, '机房不存在', 404);
    }

    if (req.user.role === 'manager' && room.manager_id !== req.userId) {
      return fail(res, '无权访问该机房日志', 403);
    }

    const tasks = await RoomTask.findAll({
      where: { room_id: id },
      attributes: ['id', 'name']
    });

    const taskIds = tasks.map(t => t.id);
    const taskNameMap = {};
    tasks.forEach(t => taskNameMap[t.id] = t.name);

    if (taskIds.length === 0) {
      return paginate(res, [], 0, page, pageSize);
    }

    const { count, rows } = await TaskProgressLog.findAndCountAll({
      where: { task_id: { [Op.in]: taskIds } },
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'real_name', 'username', 'role']
      }],
      order: [['created_at', 'DESC']],
      offset: (page - 1) * pageSize,
      limit: parseInt(pageSize)
    });

    const logsWithTaskName = rows.map(log => ({
      ...log.toJSON(),
      task_name: taskNameMap[log.task_id]
    }));

    paginate(res, logsWithTaskName, count, page, pageSize);
  } catch (error) {
    next(error);
  }
};

// 状态标签映射
function getStatusLabel(status) {
  const labels = {
    not_started: '未开始',
    in_progress: '进行中',
    completed: '已完成'
  };
  return labels[status] || status;
}

module.exports = {
  getMyRoomTasks,
  getList,
  getDetail,
  updateTask,
  updateStatus,
  updateProgress,
  getTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  getTaskLogs,
  getRoomLogs
};