const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class ConstructionPhase extends Model {}

ConstructionPhase.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  phase_number: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '阶段序号 1-6'
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: '阶段名称'
  },
  description: {
    type: DataTypes.TEXT,
    comment: '阶段描述'
  },
  sort_order: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: '排序'
  }
}, {
  sequelize,
  modelName: 'ConstructionPhase',
  tableName: 'construction_phases'
});

module.exports = ConstructionPhase;