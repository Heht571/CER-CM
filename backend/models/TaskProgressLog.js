const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class TaskProgressLog extends Model {}

TaskProgressLog.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  task_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '任务ID'
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '操作人ID'
  },
  old_status: {
    type: DataTypes.STRING(20),
    comment: '原状态'
  },
  new_status: {
    type: DataTypes.STRING(20),
    comment: '新状态'
  },
  old_progress: {
    type: DataTypes.INTEGER,
    comment: '原进度'
  },
  new_progress: {
    type: DataTypes.INTEGER,
    comment: '新进度'
  },
  remark: {
    type: DataTypes.TEXT,
    comment: '备注'
  }
}, {
  sequelize,
  modelName: 'TaskProgressLog',
  tableName: 'task_progress_logs',
  updatedAt: false
});

module.exports = TaskProgressLog;