const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class RoomTask extends Model {}

RoomTask.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  room_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '机房ID'
  },
  template_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '任务模板ID'
  },
  phase_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '阶段ID'
  },
  name: {
    type: DataTypes.STRING(200),
    allowNull: false,
    comment: '任务名称'
  },
  planned_days: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: '计划天数'
  },
  status: {
    type: DataTypes.ENUM('not_started', 'in_progress', 'completed'),
    defaultValue: 'not_started',
    comment: '状态：not_started-未开始，in_progress-进行中，completed-已完成'
  },
  planned_start_date: {
    type: DataTypes.DATEONLY,
    comment: '计划开始日期'
  },
  planned_end_date: {
    type: DataTypes.DATEONLY,
    comment: '计划结束日期'
  },
  actual_start_date: {
    type: DataTypes.DATEONLY,
    comment: '实际开始日期'
  },
  actual_end_date: {
    type: DataTypes.DATEONLY,
    comment: '实际完成日期'
  },
  progress: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: '进度百分比 0-100'
  },
  remark: {
    type: DataTypes.TEXT,
    comment: '备注说明'
  }
}, {
  sequelize,
  modelName: 'RoomTask',
  tableName: 'room_tasks'
});

module.exports = RoomTask;