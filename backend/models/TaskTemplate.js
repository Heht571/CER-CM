const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class TaskTemplate extends Model {}

TaskTemplate.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  phase_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '所属阶段ID'
  },
  name: {
    type: DataTypes.STRING(200),
    allowNull: false,
    comment: '任务节点名称'
  },
  planned_days: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: '计划天数'
  },
  description: {
    type: DataTypes.TEXT,
    comment: '任务描述'
  },
  sort_order: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: '排序'
  },
  // 网络图位置
  graph_level: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: '网络图层级（从左到右）'
  },
  graph_row: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: '网络图行号（从上到下）'
  },
  // 适用的建设方式（JSON数组）
  // purchase-购置, lease-租赁, self_build-自建, container-一体化集装箱
  applicable_types: {
    type: DataTypes.JSON,
    defaultValue: ['purchase', 'lease', 'self_build', 'container'],
    comment: '适用的建设方式'
  }
}, {
  sequelize,
  modelName: 'TaskTemplate',
  tableName: 'task_templates'
});

module.exports = TaskTemplate;