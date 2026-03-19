const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class OperationLog extends Model {}

OperationLog.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    comment: '操作用户ID'
  },
  action: {
    type: DataTypes.STRING(50),
    allowNull: false,
    comment: '操作类型'
  },
  target_type: {
    type: DataTypes.STRING(50),
    comment: '操作对象类型'
  },
  target_id: {
    type: DataTypes.INTEGER,
    comment: '操作对象ID'
  },
  detail: {
    type: DataTypes.TEXT,
    comment: '操作详情JSON'
  },
  ip: {
    type: DataTypes.STRING(50),
    comment: 'IP地址'
  }
}, {
  sequelize,
  modelName: 'OperationLog',
  tableName: 'operation_logs',
  updatedAt: false
});

module.exports = OperationLog;