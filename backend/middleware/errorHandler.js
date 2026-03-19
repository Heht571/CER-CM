/**
 * 错误处理中间件
 */
const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
  logger.error(`${req.method} ${req.url}`, {
    error: err.message,
    stack: err.stack,
    body: req.body,
    query: req.query,
    params: req.params
  });

  // Sequelize 验证错误
  if (err.name === 'SequelizeValidationError') {
    const messages = err.errors.map(e => e.message);
    return res.status(400).json({
      success: false,
      message: messages.join(', ')
    });
  }

  // Sequelize 唯一约束错误
  if (err.name === 'SequelizeUniqueConstraintError') {
    const field = err.errors[0]?.path || '字段';
    return res.status(400).json({
      success: false,
      message: `${field}已存在`
    });
  }

  // Sequelize 外键约束错误
  if (err.name === 'SequelizeForeignKeyConstraintError') {
    return res.status(400).json({
      success: false,
      message: '关联数据不存在或存在依赖关系'
    });
  }

  // JWT 错误
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Token无效'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token已过期'
    });
  }

  // 默认错误
  res.status(err.status || 500).json({
    success: false,
    message: err.message || '服务器内部错误'
  });
};

module.exports = errorHandler;