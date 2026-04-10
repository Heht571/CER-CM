const cron = require('node-cron');
const { EmailTask } = require('../models');
const { sendEmailTask } = require('./emailService');
const logger = require('./logger');

// 存储活跃的定时任务
const activeJobs = new Map();

/**
 * 初始化定时任务调度器
 */
const initScheduler = async () => {
  logger.info('初始化邮件任务调度器...');

  // 加载所有已调度的任务
  const scheduledTasks = await EmailTask.findAll({
    where: { status: 'scheduled' }
  });

  for (const task of scheduledTasks) {
    scheduleTask(task);
  }

  logger.info(`已加载 ${scheduledTasks.length} 个邮件定时任务`);
};

/**
 * 为单个任务创建定时任务
 */
const scheduleTask = (task) => {
  // 如果已有该任务的定时任务，先取消
  if (activeJobs.has(task.id)) {
    cancelTask(task.id);
  }

  const scheduledTime = task.next_send_time || task.scheduled_time;

  if (!scheduledTime) {
    logger.warn(`邮件任务 ${task.id} 没有计划发送时间`);
    return;
  }

  // 计算cron表达式
  const cronExpression = getCronExpression(scheduledTime);

  if (!cronExpression) {
    logger.warn(`邮件任务 ${task.id} 的计划时间已过或无效`);
    return;
  }

  // 创建定时任务
  const job = cron.schedule(cronExpression, async () => {
    logger.info(`执行邮件任务 ${task.id}: ${task.subject}`);

    try {
      await sendEmailTask(task.id);
      logger.info(`邮件任务 ${task.id} 执行完成`);

      // 对于重复任务，重新调度
      const updatedTask = await EmailTask.findByPk(task.id);
      if (updatedTask && updatedTask.status === 'scheduled') {
        scheduleTask(updatedTask);
      } else {
        cancelTask(task.id);
      }
    } catch (error) {
      logger.error(`邮件任务 ${task.id} 执行失败: ${error.message}`);
      cancelTask(task.id);
    }
  }, {
    scheduled: true
  });

  activeJobs.set(task.id, job);
  logger.info(`邮件任务 ${task.id} 已调度，计划时间: ${scheduledTime}`);
};

/**
 * 取消定时任务
 */
const cancelTask = (taskId) => {
  if (activeJobs.has(taskId)) {
    const job = activeJobs.get(taskId);
    job.stop();
    activeJobs.delete(taskId);
    logger.info(`邮件任务 ${taskId} 已取消调度`);
  }
};

/**
 * 根据计划时间生成cron表达式
 * 格式：秒 分 时 日 月 星期
 */
const getCronExpression = (scheduledTime) => {
  const now = new Date();
  const target = new Date(scheduledTime);

  // 如果时间已过，返回null
  if (target <= now) {
    return null;
  }

  const seconds = target.getSeconds();
  const minutes = target.getMinutes();
  const hours = target.getHours();
  const day = target.getDate();
  const month = target.getMonth() + 1;

  return `${seconds} ${minutes} ${hours} ${day} ${month} *`;
};

/**
 * 手动触发邮件任务
 */
const triggerTask = async (taskId) => {
  const task = await EmailTask.findByPk(taskId);

  if (!task) {
    throw new Error('邮件任务不存在');
  }

  if (task.status === 'sending') {
    throw new Error('邮件任务正在发送中');
  }

  logger.info(`手动触发邮件任务 ${taskId}`);
  return await sendEmailTask(taskId);
};

/**
 * 获取活跃的定时任务数量
 */
const getActiveJobCount = () => {
  return activeJobs.size;
};

/**
 * 获取所有活跃任务ID
 */
const getActiveTaskIds = () => {
  return Array.from(activeJobs.keys());
};

module.exports = {
  initScheduler,
  scheduleTask,
  cancelTask,
  triggerTask,
  getActiveJobCount,
  getActiveTaskIds
};