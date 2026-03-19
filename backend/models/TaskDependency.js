const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class TaskDependency extends Model {}

TaskDependency.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  task_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '任务节点ID'
  },
  prev_task_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '前置任务节点ID'
  }
}, {
  sequelize,
  modelName: 'TaskDependency',
  tableName: 'task_dependencies'
});

module.exports = TaskDependency;