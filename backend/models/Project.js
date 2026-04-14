const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class Project extends Model {}

Project.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: '项目名称'
  },
  code: {
    type: DataTypes.STRING(50),
    unique: true,
    comment: '项目编码'
  },
  description: {
    type: DataTypes.TEXT,
    comment: '项目描述'
  },
  status: {
    type: DataTypes.ENUM('active', 'archived'),
    defaultValue: 'active',
    comment: '状态：active-进行中，archived-已归档'
  },
  created_by: {
    type: DataTypes.INTEGER,
    comment: '创建人ID'
  }
}, {
  sequelize,
  modelName: 'Project',
  tableName: 'projects'
});

module.exports = Project;