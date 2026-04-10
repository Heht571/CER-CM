const nodemailer = require('nodemailer');
const { EmailTask, EmailLog, SystemConfig } = require('../models');
const logger = require('./logger');

// 邮件配置缓存
let emailConfig = null;
let transporter = null;

/**
 * 从数据库获取邮件配置
 */
const getEmailConfigFromDB = async () => {
  try {
    const config = await SystemConfig.findOne({
      where: { config_key: 'email_settings' }
    });

    if (config && config.config_value) {
      return {
        enabled: config.config_value.enabled || false,
        smtp: {
          host: config.config_value.host || '',
          port: config.config_value.port || 465,
          secure: config.config_value.secure !== false,
          auth: {
            user: config.config_value.user || '',
            pass: config.config_value.pass || ''
          }
        },
        from: {
          name: config.config_value.from_name || '机房建设监控平台',
          address: config.config_value.from_address || config.config_value.user || ''
        }
      };
    }
  } catch (error) {
    logger.error('获取邮件配置失败:', error);
  }

  return {
    enabled: false,
    smtp: { host: '', port: 465, secure: true, auth: { user: '', pass: '' } },
    from: { name: '机房建设监控平台', address: '' }
  };
};

/**
 * 创建邮件传输器
 */
const createTransporter = (config) => {
  if (!config.smtp.auth.user || !config.smtp.auth.pass) {
    logger.warn('邮件服务未配置 SMTP 认证信息');
    return null;
  }

  return nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.secure,
    auth: config.smtp.auth
  });
};

/**
 * 初始化邮件服务
 */
const initEmailService = async () => {
  emailConfig = await getEmailConfigFromDB();

  if (!emailConfig.enabled) {
    logger.info('邮件服务已禁用');
    transporter = null;
    return false;
  }

  transporter = createTransporter(emailConfig);

  if (transporter) {
    logger.info('邮件服务初始化成功');
    return true;
  } else {
    logger.warn('邮件服务初始化失败，请检查配置');
    return false;
  }
};

/**
 * 重新加载邮件配置
 */
const reloadEmailConfig = async () => {
  return await initEmailService();
};

/**
 * 获取当前邮件配置
 */
const getCurrentConfig = () => {
  return emailConfig;
};

/**
 * 发送单封邮件
 */
const sendMail = async (to, subject, content, recipientName = '') => {
  // 确保配置是最新的
  if (!emailConfig) {
    await initEmailService();
  }

  if (!emailConfig || !emailConfig.enabled) {
    throw new Error('邮件服务未启用');
  }

  if (!transporter) {
    // 尝试重新创建传输器
    transporter = createTransporter(emailConfig);
    if (!transporter) {
      throw new Error('邮件服务未初始化');
    }
  }

  const mailOptions = {
    from: `${emailConfig.from.name} <${emailConfig.from.address}>`,
    to,
    subject,
    html: content
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    logger.info(`邮件发送成功: ${to}, messageId: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    logger.error(`邮件发送失败: ${to}, error: ${error.message}`);
    return { success: false, error: error.message };
  }
};

/**
 * 发送邮件任务
 */
const sendEmailTask = async (taskId) => {
  const task = await EmailTask.findByPk(taskId);

  if (!task) {
    throw new Error('邮件任务不存在');
  }

  if (task.status !== 'scheduled' && task.status !== 'sending') {
    throw new Error('邮件任务状态不正确');
  }

  // 更新状态为发送中
  await task.update({ status: 'sending' });

  const results = {
    success: 0,
    failed: 0,
    logs: []
  };

  // 发送给每个接收人
  for (const recipient of task.recipients) {
    try {
      const result = await sendMail(recipient.email, task.subject, task.content, recipient.name);

      // 记录发送日志
      const log = await EmailLog.create({
        task_id: taskId,
        recipient_email: recipient.email,
        recipient_name: recipient.name || '',
        status: result.success ? 'success' : 'failed',
        error_message: result.error || null,
        sent_at: new Date()
      });

      results.logs.push(log);

      if (result.success) {
        results.success++;
      } else {
        results.failed++;
      }
    } catch (error) {
      // 邮件服务不可用等情况
      const log = await EmailLog.create({
        task_id: taskId,
        recipient_email: recipient.email,
        recipient_name: recipient.name || '',
        status: 'failed',
        error_message: error.message,
        sent_at: new Date()
      });
      results.logs.push(log);
      results.failed++;
    }
  }

  // 更新任务状态
  if (results.failed === 0) {
    // 全部成功
    if (task.repeat_type === 'none') {
      await task.update({ status: 'sent' });
    } else {
      // 重复任务，更新下次发送时间
      const nextTime = calculateNextSendTime(task.repeat_type);
      await task.update({
        status: 'scheduled',
        next_send_time: nextTime,
        sent_count: task.sent_count + 1
      });
    }
  } else if (results.success === 0) {
    // 全部失败
    await task.update({ status: 'failed' });
  } else {
    // 部分成功
    if (task.repeat_type === 'none') {
      await task.update({ status: 'sent' });
    } else {
      const nextTime = calculateNextSendTime(task.repeat_type);
      await task.update({
        status: 'scheduled',
        next_send_time: nextTime,
        sent_count: task.sent_count + 1
      });
    }
  }

  return results;
};

/**
 * 计算下一次发送时间
 */
const calculateNextSendTime = (repeatType) => {
  const now = new Date();

  switch (repeatType) {
    case 'daily':
      return new Date(now.getTime() + 24 * 60 * 60 * 1000);
    case 'weekly':
      return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    case 'monthly':
      const nextMonth = new Date(now);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      return nextMonth;
    default:
      return null;
  }
};

/**
 * 检查邮件服务状态
 */
const checkEmailService = async () => {
  if (!emailConfig) {
    await initEmailService();
  }

  if (!emailConfig || !emailConfig.enabled) {
    return { connected: false, enabled: false, message: '邮件服务未启用' };
  }

  if (!transporter) {
    transporter = createTransporter(emailConfig);
  }

  if (!transporter) {
    return { connected: false, enabled: true, message: '邮件服务配置不完整' };
  }

  try {
    await transporter.verify();
    return {
      connected: true,
      enabled: true,
      message: '邮件服务连接正常',
      config: {
        host: emailConfig.smtp.host,
        user: emailConfig.smtp.auth.user,
        from_name: emailConfig.from.name
      }
    };
  } catch (error) {
    return { connected: false, enabled: true, message: error.message };
  }
};

/**
 * 测试邮件发送
 */
const testEmailSend = async (testEmail) => {
  if (!emailConfig) {
    await initEmailService();
  }

  if (!emailConfig || !emailConfig.enabled) {
    return { success: false, message: '邮件服务未启用' };
  }

  try {
    const result = await sendMail(
      testEmail,
      '【机房建设监控平台】邮件测试',
      '<p>这是一封测试邮件，如果您收到此邮件，说明邮件服务配置正确。</p><p>发送时间：' + new Date().toLocaleString('zh-CN') + '</p>'
    );
    return result;
  } catch (error) {
    return { success: false, message: error.message };
  }
};

module.exports = {
  initEmailService,
  reloadEmailConfig,
  getCurrentConfig,
  sendMail,
  sendEmailTask,
  checkEmailService,
  testEmailSend,
  calculateNextSendTime
};