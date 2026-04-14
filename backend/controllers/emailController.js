const { EmailTask, EmailLog, User } = require('../models');
const { success, fail, paginate } = require('../utils/response');
const { Op } = require('sequelize');
const { scheduleTask, cancelTask, triggerTask } = require('../utils/scheduler');
const { calculateNextSendTime, checkEmailService } = require('../utils/emailService');

/**
 * 获取邮件任务列表
 */
const getList = async (req, res, next) => {
  try {
    const { page = 1, pageSize = 10, status, keyword } = req.query;

    const where = {};
    if (status) where.status = status;
    if (keyword) {
      where.subject = { [Op.like]: `%${keyword}%` };
    }

    const { count, rows } = await EmailTask.findAndCountAll({
      where,
      order: [['created_at', 'DESC']],
      include: [{
        model: User,
        as: 'creator',
        attributes: ['id', 'real_name']
      }],
      offset: (page - 1) * pageSize,
      limit: parseInt(pageSize)
    });

    paginate(res, rows, count, page, pageSize);
  } catch (error) {
    next(error);
  }
};

/**
 * 获取邮件任务详情
 */
const getDetail = async (req, res, next) => {
  try {
    const { id } = req.params;

    const task = await EmailTask.findByPk(id, {
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'real_name']
        },
        {
          model: EmailLog,
          as: 'logs',
          order: [['created_at', 'DESC']]
        }
      ]
    });

    if (!task) {
      return fail(res, '邮件任务不存在', 404);
    }

    success(res, task);
  } catch (error) {
    next(error);
  }
};

/**
 * 创建邮件任务
 */
const create = async (req, res, next) => {
  try {
    const { subject, content, recipients, scheduled_time, repeat_type, status } = req.body;

    if (!subject || !content || !recipients || recipients.length === 0) {
      return fail(res, '邮件主题、内容和接收人不能为空');
    }

    if (!scheduled_time) {
      return fail(res, '请选择发送时间');
    }

    // 验证接收人格式
    for (const r of recipients) {
      if (!r.email) {
        return fail(res, '接收人邮箱不能为空');
      }
    }

    const task = await EmailTask.create({
      subject,
      content,
      recipients,
      scheduled_time,
      repeat_type: repeat_type || 'none',
      status: status || 'draft',
      created_by: req.userId
    });

    // 如果是已调度状态，添加到定时任务
    if (task.status === 'scheduled') {
      scheduleTask(task);
    }

    success(res, { id: task.id }, '创建成功');
  } catch (error) {
    next(error);
  }
};

/**
 * 更新邮件任务
 */
const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { subject, content, recipients, scheduled_time, repeat_type, status } = req.body;

    const task = await EmailTask.findByPk(id);
    if (!task) {
      return fail(res, '邮件任务不存在', 404);
    }

    // 已发送的任务不能修改
    if (task.status === 'sent' || task.status === 'sending') {
      return fail(res, '已发送的任务不能修改');
    }

    // 验证接收人格式
    if (recipients) {
      for (const r of recipients) {
        if (!r.email) {
          return fail(res, '接收人邮箱不能为空');
        }
      }
    }

    const updateData = {
      subject,
      content,
      recipients,
      scheduled_time,
      repeat_type
    };

    // 状态变更
    if (status) {
      updateData.status = status;

      // 从草稿变为已调度
      if (task.status === 'draft' && status === 'scheduled') {
        scheduleTask(task);
      }

      // 从已调度变为草稿，取消定时任务
      if (task.status === 'scheduled' && status === 'draft') {
        cancelTask(task.id);
      }
    }

    await task.update(updateData);

    // 如果修改了发送时间且是已调度状态，重新调度
    if (scheduled_time && task.status === 'scheduled') {
      const updatedTask = await EmailTask.findByPk(id);
      scheduleTask(updatedTask);
    }

    success(res, null, '更新成功');
  } catch (error) {
    next(error);
  }
};

/**
 * 删除邮件任务
 */
const remove = async (req, res, next) => {
  try {
    const { id } = req.params;

    const task = await EmailTask.findByPk(id);
    if (!task) {
      return fail(res, '邮件任务不存在', 404);
    }

    // 正在发送的任务不能删除
    if (task.status === 'sending') {
      return fail(res, '正在发送的任务不能删除');
    }

    // 取消定时任务
    cancelTask(task.id);

    // 删除发送日志
    await EmailLog.destroy({ where: { task_id: id } });

    await task.destroy();

    success(res, null, '删除成功');
  } catch (error) {
    next(error);
  }
};

/**
 * 立即发送邮件任务
 */
const sendNow = async (req, res, next) => {
  try {
    const { id } = req.params;

    const task = await EmailTask.findByPk(id);
    if (!task) {
      return fail(res, '邮件任务不存在', 404);
    }

    if (task.status === 'sending') {
      return fail(res, '任务正在发送中');
    }

    if (task.status === 'sent' && task.repeat_type === 'none') {
      return fail(res, '该任务已发送完成');
    }

    // 取消定时任务
    cancelTask(task.id);

    // 手动触发发送
    const results = await triggerTask(id);

    success(res, results, `发送完成：成功 ${results.success}，失败 ${results.failed}`);
  } catch (error) {
    next(error);
  }
};

/**
 * 获取发送日志
 */
const getLogs = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { page = 1, pageSize = 20 } = req.query;

    const task = await EmailTask.findByPk(id);
    if (!task) {
      return fail(res, '邮件任务不存在', 404);
    }

    const { count, rows } = await EmailLog.findAndCountAll({
      where: { task_id: id },
      order: [['created_at', 'DESC']],
      offset: (page - 1) * pageSize,
      limit: parseInt(pageSize)
    });

    paginate(res, rows, count, page, pageSize);
  } catch (error) {
    next(error);
  }
};

/**
 * 获取邮件服务状态
 */
const getServiceStatus = async (req, res, next) => {
  try {
    const status = await checkEmailService();
    success(res, status);
  } catch (error) {
    next(error);
  }
};

/**
 * 获取可选的接收人列表（用户列表）
 */
const getRecipients = async (req, res, next) => {
  try {
    // 获取负责人列表
    const managers = await User.findAll({
      where: { status: 1, role: 'manager' },
      attributes: ['id', 'real_name', 'email', 'department'],
      order: [['real_name', 'ASC']]
    });

    // 获取所有启用用户
    const users = await User.findAll({
      where: { status: 1 },
      attributes: ['id', 'real_name', 'email', 'department', 'role'],
      order: [['real_name', 'ASC']]
    });

    // 只返回有邮箱的用户
    const validManagers = managers.filter(u => u.email);
    const validUsers = users.filter(u => u.email);

    success(res, {
      managers: validManagers,
      users: validUsers
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
  sendNow,
  getLogs,
  getServiceStatus,
  getRecipients
};