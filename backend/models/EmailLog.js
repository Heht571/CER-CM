const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

/**
 * 邮件发送日志模型
 */
class EmailLog extends Model {}

EmailLog.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  task_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '邮件任务ID'
  },
  recipient_email: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: '接收人邮箱'
  },
  recipient_name: {
    type: DataTypes.STRING(50),
    comment: '接收人姓名'
  },
  status: {
    type: DataTypes.ENUM('pending', 'success', 'failed'),
    defaultValue: 'pending',
    comment: '发送状态：pending-待发送，success-成功，failed-失败'
  },
  error_message: {
    type: DataTypes.TEXT,
    comment: '错误信息'
  },
  sent_at: {
    type: DataTypes.DATE,
    comment: '发送时间'
  }
}, {
  sequelize,
  modelName: 'EmailLog',
  tableName: 'email_logs',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false
});

module.exports = EmailLog;