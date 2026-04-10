/**
 * 邮件服务配置（环境变量默认值，实际配置从数据库读取）
 * 这些配置仅作为初始化时的默认值
 */

const parseBoolean = (value, defaultValue = false) => {
  if (value === undefined || value === null || value === '') {
    return defaultValue;
  }
  return ['true', '1', 'yes', 'on'].includes(String(value).trim().toLowerCase());
};

module.exports = {
  // 默认配置（从环境变量读取）
  smtp: {
    host: process.env.SMTP_HOST || '',
    port: Number(process.env.SMTP_PORT) || 465,
    secure: parseBoolean(process.env.SMTP_SECURE, true),
    auth: {
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASS || ''
    }
  },
  from: {
    name: process.env.EMAIL_FROM_NAME || '机房建设监控平台',
    address: process.env.EMAIL_FROM_ADDRESS || process.env.SMTP_USER || ''
  },
  enabled: parseBoolean(process.env.EMAIL_ENABLED, false)
};