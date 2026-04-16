const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const MatchResult = sequelize.define('MatchResult', {
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
  totalScore: {
    type: DataTypes.DECIMAL(5, 2),
    comment: '总匹配分(0-100)'
  },
  industryScore: {
    type: DataTypes.DECIMAL(5, 2),
    comment: '行业符合度得分(0-100)'
  },
  scaleScore: {
    type: DataTypes.DECIMAL(5, 2),
    comment: '规模符合度得分(0-100)'
  },
  qualificationScore: {
    type: DataTypes.DECIMAL(5, 2),
    comment: '资质符合度得分(0-100)'
  },
  regionScore: {
    type: DataTypes.DECIMAL(5, 2),
    comment: '地域符合度得分(0-100)'
  },
  matchDetails: {
    type: DataTypes.JSON,
    comment: '匹配详情(包含各项匹配原因)'
  },
  isMatched: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: '是否匹配成功(>=阈值)'
  },
  matchThreshold: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 60.00,
    comment: '匹配阈值'
  },
  reviewedBy: {
    type: DataTypes.UUID,
    comment: '审核人ID'
  },
  reviewedAt: {
    type: DataTypes.DATE,
    comment: '审核时间'
  },
  reviewStatus: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected', 'adjusted'),
    defaultValue: 'pending',
    comment: '审核状态'
  },
  adjustedBy: {
    type: DataTypes.UUID,
    comment: '调整人ID'
  },
  adjustedScore: {
    type: DataTypes.DECIMAL(5, 2),
    comment: '人工调整后的分数'
  },
  adjustmentRemark: {
    type: DataTypes.TEXT,
    comment: '调整原因备注'
  },
  notified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: '是否已通知企业'
  },
  notifiedAt: {
    type: DataTypes.DATE,
    comment: '通知时间'
  },
  notifyChannel: {
    type: DataTypes.ENUM('feishu', 'wechat', 'both', 'none'),
    defaultValue: 'none',
    comment: '通知渠道'
  }
}, {
  tableName: 'match_results',
  indexes: [
    { fields: ['policy_id'] },
    { fields: ['enterprise_id'] },
    { fields: ['is_matched'] },
    { fields: ['total_score'] },
    { fields: ['review_status'] },
    { fields: ['created_at'] },
    { unique: true, fields: ['policy_id', 'enterprise_id'] }
  ]
});

const Policy = require('./Policy.model');
const Enterprise = require('./Enterprise.model');

MatchResult.belongsTo(Policy, { foreignKey: 'policyId', as: 'policy' });
MatchResult.belongsTo(Enterprise, { foreignKey: 'enterpriseId', as: 'enterprise' });

module.exports = MatchResult;
