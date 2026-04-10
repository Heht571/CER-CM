const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

/**
 * 邮件任务模型
 */
class EmailTask extends Model {}

EmailTask.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  subject: {
    type: DataTypes.STRING(200),
    allowNull: false,
    comment: '邮件主题'
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: '邮件内容'
  },
  recipients: {
    type: DataTypes.JSON,
    allowNull: false,
    comment: '接收人列表，格式：[{id, email, name}]'
  },
  scheduled_time: {
    type: DataTypes.DATE,
    allowNull: false,
    comment: '计划发送时间'
  },
  status: {
    type: DataTypes.ENUM('draft', 'scheduled', 'sending', 'sent', 'failed'),
    defaultValue: 'draft',
    comment: '状态：draft-草稿，scheduled-已调度，sending-发送中，sent-已发送，failed-发送失败'
  },
  repeat_type: {
    type: DataTypes.ENUM('none', 'daily', 'weekly', 'monthly'),
    defaultValue: 'none',
    comment: '重复类型：none-单次，daily-每日，weekly-每周，monthly-每月'
  },
  next_send_time: {
    type: DataTypes.DATE,
    comment: '下一次发送时间（用于重复任务）'
  },
  sent_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: '已发送次数'
  },
  created_by: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '创建人ID'
  }
}, {
  sequelize,
  modelName: 'EmailTask',
  tableName: 'email_tasks',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = EmailTask;