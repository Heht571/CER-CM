require('dotenv').config();
const { sequelize, EmailTask, EmailLog, SystemConfig } = require('../models');

const syncNewTables = async () => {
  try {
    console.log('开始同步新表...');

    // 使用 sync({ alter: false }) 只创建不存在的表，不会删除现有数据
    await sequelize.sync();

    console.log('\n数据库同步完成！');
    console.log('已创建/更新以下表：');
    console.log('- email_tasks (邮件任务表)');
    console.log('- email_logs (邮件日志表)');
    console.log('- system_configs (系统配置表)');

    process.exit(0);
  } catch (error) {
    console.error('同步失败:', error);
    process.exit(1);
  }
};

syncNewTables();