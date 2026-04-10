const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

/**
 * 系统配置模型
 */
class SystemConfig extends Model {}

SystemConfig.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  config_key: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    comment: '配置键名'
  },
  config_value: {
    type: DataTypes.JSON,
    comment: '配置值（JSON格式）'
  },
  description: {
    type: DataTypes.STRING(200),
    comment: '配置说明'
  },
  updated_by: {
    type: DataTypes.INTEGER,
    comment: '最后修改人ID'
  }
}, {
  sequelize,
  modelName: 'SystemConfig',
  tableName: 'system_configs',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = SystemConfig;