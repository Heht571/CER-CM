require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const { sequelize, EmailTask, EmailLog, SystemConfig, Project, RoomChangeLog, MachineRoom } = require('../models');

const syncNewTables = async () => {
  try {
    console.log('开始同步新表...');

    // 使用 sync({ alter: true }) 会检测模型变化并更新表结构
    // alter: true 会自动添加/修改列，但不会删除数据
    await sequelize.sync({ alter: true });

    console.log('\n数据库同步完成！');
    console.log('已创建/更新以下表：');
    console.log('- projects (项目表)');
    console.log('- room_change_logs (机房变更记录表)');
    console.log('- machine_rooms (已添加 project_id 列)');
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