const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Reminder = sequelize.define('Reminder', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  policyId: {
    type: DataTypes.UUID,
    allowNull: false,
    comment: '政策ID',
    references: { model: 'policies', key: 'id' }
  },
  enterpriseId: {
    type: DataTypes.UUID,
    allowNull: false,
    comment: '企业ID',
    references: { model: 'enterprises', key: 'id' }
  },
  matchResultId: {
    type: DataTypes.UUID,
    comment: '匹配结果ID'
  },
  reminderType: {
    type: DataTypes.ENUM('deadline_30', 'deadline_15', 'deadline_7', 'deadline_3', 'deadline_1', 'custom'),
    comment: '提醒类型'
  },
  scheduledTime: {
    type: DataTypes.DATE,
    allowNull: false,
    comment: '计划发送时间'
  },
  sentTime: {
    type: DataTypes.DATE,
    comment: '实际发送时间'
  },
  status: {
    type: DataTypes.ENUM('pending', 'sent', 'failed', 'cancelled'),
    defaultValue: 'pending',
    comment: '状态'
  },
  channel: {
    type: DataTypes.ENUM('feishu', 'wechat', 'both'),
    comment: '发送渠道'
  },
  feishuMessageId: {
    type: DataTypes.STRING(100),
    comment: '飞书消息ID'
  },
  wechatMessageId: {
    type: DataTypes.STRING(100),
    comment: '微信消息ID'
  },
  errorMessage: {
    type: DataTypes.TEXT,
    comment: '错误信息'
  },
  retryCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: '重试次数'
  },
  content: {
    type: DataTypes.JSON,
    comment: '提醒内容(JSON对象)'
  }
}, {
  tableName: 'reminders',
  indexes: [
    { fields: ['policy_id'] },
    { fields: ['enterprise_id'] },
    { fields: ['scheduled_time'] },
    { fields: ['status'] },
    { fields: ['reminder_type'] }
  ]
});

const Policy = require('./Policy.model');
const Enterprise = require('./Enterprise.model');

Reminder.belongsTo(Policy, { foreignKey: 'policyId', as: 'policy' });
Reminder.belongsTo(Enterprise, { foreignKey: 'enterpriseId', as: 'enterprise' });

module.exports = Reminder;
