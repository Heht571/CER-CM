require('dotenv').config();
const { sequelize } = require('./models');
const logger = require('./utils/logger');

const startServer = async () => {
  try {
    // 测试数据库连接
    await sequelize.authenticate();
    logger.info('数据库连接成功');

    // 启动应用（数据库已通过 init-db 初始化）
    require('./app.js');
  } catch (error) {
    logger.error('服务器启动失败:', error);
    process.exit(1);
  }
};

startServer();