const { SystemConfig, User } = require('../models');
const { success, fail } = require('../utils/response');
const { reloadEmailConfig, checkEmailService, testEmailSend } = require('../utils/emailService');
const logger = require('../utils/logger');

/**
 * 获取邮件配置
 */
const getEmailConfig = async (req, res, next) => {
  try {
    const config = await SystemConfig.findOne({
      where: { config_key: 'email_settings' },
      include: [{
        model: User,
        as: 'updater',
        attributes: ['id', 'real_name']
      }]
    });

    if (!config) {
      // 返回默认配置
      return success(res, {
        enabled: false,
        host: '',
        port: 465,
        secure: true,
        user: '',
        pass: '',
        from_name: '机房建设监控平台',
        from_address: ''
      });
    }

    // 不返回密码
    const configValue = config.config_value;
    success(res, {
      enabled: configValue.enabled || false,
      host: configValue.host || '',
      port: configValue.port || 465,
      secure: configValue.secure !== false,
      user: configValue.user || '',
      pass: '', // 不返回密码
      from_name: configValue.from_name || '机房建设监控平台',
      from_address: configValue.from_address || '',
      updated_at: config.updated_at,
      updater: config.updater
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 更新邮件配置
 */
const updateEmailConfig = async (req, res, next) => {
  try {
    const { enabled, host, port, secure, user, pass, from_name, from_address } = req.body;

    // 验证必填字段（如果启用邮件服务）
    if (enabled) {
      if (!host || !user || !pass) {
        return fail(res, '启用邮件服务需要填写SMTP服务器、用户名和密码');
      }
    }

    // 获取现有配置
    let config = await SystemConfig.findOne({
      where: { config_key: 'email_settings' }
    });

    // 如果没有传密码，保留原有密码
    let finalPass = pass;
    if (!pass && config && config.config_value && config.config_value.pass) {
      finalPass = config.config_value.pass;
    }

    const configValue = {
      enabled: enabled || false,
      host: host || '',
      port: port || 465,
      secure: secure !== false,
      user: user || '',
      pass: finalPass || '',
      from_name: from_name || '机房建设监控平台',
      from_address: from_address || user || ''
    };

    if (config) {
      await config.update({
        config_value: configValue,
        updated_by: req.userId
      });
    } else {
      config = await SystemConfig.create({
        config_key: 'email_settings',
        config_value: configValue,
        description: '邮件服务SMTP配置',
        updated_by: req.userId
      });
    }

    // 重新加载邮件服务配置
    await reloadEmailConfig();

    logger.info(`邮件配置已更新，操作人: ${req.userId}`);
    success(res, null, '邮件配置已保存');
  } catch (error) {
    next(error);
  }
};

/**
 * 获取邮件服务状态
 */
const getEmailStatus = async (req, res, next) => {
  try {
    const status = await checkEmailService();
    success(res, status);
  } catch (error) {
    next(error);
  }
};

/**
 * 测试邮件发送
 */
const testEmail = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return fail(res, '请输入测试邮箱地址');
    }

    const result = await testEmailSend(email);

    if (result.success) {
      success(res, null, '测试邮件已发送，请检查邮箱');
    } else {
      fail(res, result.message || '发送失败');
    }
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getEmailConfig,
  updateEmailConfig,
  getEmailStatus,
  testEmail
};