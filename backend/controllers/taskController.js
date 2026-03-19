const { RoomTask, MachineRoom, ConstructionPhase, TaskProgressLog, TaskTemplate, User, sequelize } = require('../models');
const { success, fail, paginate } = require('../utils/response');
const { Op } = require('sequelize');

/**
 * 获取任务列表
 */
const getList = async (req, res, next) => {
  try {
    const { page = 1, pageSize = 20, room_id, phase_id, status } = req.query;

    const where = {};
    if (status) where.status = status;
    if (phase_id) where.phase_id = phase_id;

    // 机房筛选
    if (room_id) {
      where.room_id = room_id;
    } else if (req.user.role === 'manager') {
      // 负责人只能看自己负责的机房任务
      const managedRooms = await MachineRoom.findAll({
        where: { manager_id: req.userId },
        attributes: ['id']
      });
      where.room_id = { [Op.in]: managedRooms.map(r => r.id) };
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
      order: [['room_id', 'ASC'], ['phase_id', 'ASC'], ['sort_order', 'ASC']],
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

    // 权限检查
    if (req.user.role === 'manager' && task.room.manager_id !== req.userId) {
      return fail(res, '无权操作该任务', 403);
    }

    const oldStatus = task.status;
    const now = new Date();

    const updateData = { status };

    // 自动设置日期
    if (status === 'in_progress' && !task.actual_start_date) {
      updateData.actual_start_date = now;
    }
    if (status === 'completed') {
      updateData.actual_end_date = now;
      updateData.progress = 100;
    }

    await task.update(updateData);

    // 记录日志
    await TaskProgressLog.create({
      task_id: id,
      user_id: req.userId,
      old_status: oldStatus,
      new_status: status,
      remark: remark || `状态从"${getStatusLabel(oldStatus)}"变为"${getStatusLabel(status)}"`
    });

    success(res, null, '状态更新成功');
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

    if (progress < 0 || progress > 100) {
      return fail(res, '进度值必须在0-100之间');
    }

    const task = await RoomTask.findByPk(id, {
      include: [{ model: MachineRoom, as: 'room' }]
    });

    if (!task) {
      return fail(res, '任务不存在', 404);
    }

    // 权限检查
    if (req.user.role === 'manager' && task.room.manager_id !== req.userId) {
      return fail(res, '无权操作该任务', 403);
    }

    const oldProgress = task.progress;

    // 如果进度大于0但状态是未开始，自动变为进行中
    const updateData = { progress };
    if (progress > 0 && task.status === 'not_started') {
      updateData.status = 'in_progress';
      updateData.actual_start_date = new Date();
    }
    if (progress === 100) {
      updateData.status = 'completed';
      updateData.actual_end_date = new Date();
    }

    await task.update(updateData);

    // 记录日志
    await TaskProgressLog.create({
      task_id: id,
      user_id: req.userId,
      old_progress: oldProgress,
      new_progress: progress,
      remark: remark || `进度从${oldProgress}%更新为${progress}%`
    });

    success(res, null, '进度更新成功');
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
    const { phase_id, name, responsible_department, planned_days, description, sort_order } = req.body;

    if (!phase_id || !name) {
      return fail(res, '阶段和任务名称不能为空');
    }

    const template = await TaskTemplate.create({
      phase_id,
      name,
      responsible_department,
      planned_days,
      description,
      sort_order: sort_order || 0
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
    const { name, responsible_department, planned_days, description, sort_order } = req.body;

    const template = await TaskTemplate.findByPk(id);
    if (!template) {
      return fail(res, '模板不存在', 404);
    }

    await template.update({
      name,
      responsible_department,
      planned_days,
      description,
      sort_order
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

    // 获取该机房所有任务ID
    const tasks = await RoomTask.findAll({
      where: { room_id: id },
      attributes: ['id', 'name']
    });

    const taskIds = tasks.map(t => t.id);
    const taskNameMap = {};
    tasks.forEach(t => taskNameMap[t.id] = t.name);

    if (taskIds.length === 0) {
      return success(res, []);
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

    // 添加任务名称
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
  getList,
  getDetail,
  updateStatus,
  updateProgress,
  getTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  getTaskLogs,
  getRoomLogs
};