require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const { sequelize } = require('../models');

const syncNewTables = async () => {
  try {
    console.log('开始同步数据库表结构...');

    // 使用 sync({ alter: true }) 会检测模型变化并更新表结构
    // alter: true 会自动添加/修改列，但不会删除数据
    await sequelize.sync({ alter: true });

    console.log('\n数据库同步完成！');
    console.log('已同步以下表：');
    console.log('- users (用户表)');
    console.log('- projects (项目表)');
    console.log('- machine_rooms (机房表)');
    console.log('- room_change_logs (机房变更记录表)');
    console.log('- construction_phases (建设阶段表)');
    console.log('- task_templates (任务模板表)');
    console.log('- task_dependencies (任务依赖表)');
    console.log('- room_tasks (机房任务表)');
    console.log('- task_progress_logs (进度日志表)');
    console.log('- operation_logs (操作日志表)');
    console.log('- email_tasks (邮件任务表)');
    console.log('- email_logs (邮件日志表)');
    console.log('- system_configs (系统配置表)');
    console.log('\n注意：此操作不会删除已有数据，只会添加/修改列。');

    process.exit(0);
  } catch (error) {
    console.error('同步失败:', error);
    process.exit(1);
  }
};

syncNewTables();