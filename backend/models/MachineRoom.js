const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class MachineRoom extends Model {}

MachineRoom.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: '机房名称'
  },
  code: {
    type: DataTypes.STRING(50),
    unique: true,
    comment: '机房编码'
  },
  location: {
    type: DataTypes.STRING(255),
    comment: '地理位置'
  },
  description: {
    type: DataTypes.TEXT,
    comment: '描述'
  },
  manager_id: {
    type: DataTypes.INTEGER,
    comment: '负责人ID'
  },
  status: {
    type: DataTypes.ENUM('planning', 'in_progress', 'completed', 'paused'),
    defaultValue: 'planning',
    comment: '状态：planning-规划中，in_progress-建设中，completed-已完成，paused-暂停'
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
    comment: '实际结束日期'
  },
  created_by: {
    type: DataTypes.INTEGER,
    comment: '创建人ID'
  },
  construction_type: {
    type: DataTypes.ENUM('purchase', 'lease', 'self_build', 'container'),
    defaultValue: 'purchase',
    comment: '建设方式：purchase-购置，lease-租赁，self_build-自建，container-一体化集装箱'
  }
}, {
  sequelize,
  modelName: 'MachineRoom',
  tableName: 'machine_rooms'
});

module.exports = MachineRoom;