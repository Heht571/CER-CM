const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class RoomChangeLog extends Model {}

RoomChangeLog.init({
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
  change_type: {
    type: DataTypes.STRING(50),
    allowNull: false,
    comment: '变更类型：name_change, location_change, type_change, manager_change, project_change'
  },
  old_value: {
    type: DataTypes.TEXT,
    comment: '原值'
  },
  new_value: {
    type: DataTypes.TEXT,
    comment: '新值'
  },
  change_reason: {
    type: DataTypes.TEXT,
    comment: '变更原因'
  },
  changed_by: {
    type: DataTypes.INTEGER,
    comment: '变更操作人ID'
  },
  remark: {
    type: DataTypes.TEXT,
    comment: '备注'
  }
}, {
  sequelize,
  modelName: 'RoomChangeLog',
  tableName: 'room_change_logs',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false
});

module.exports = RoomChangeLog;