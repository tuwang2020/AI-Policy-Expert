const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const PolicyVersion = sequelize.define('PolicyVersion', {
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
  versionNumber: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '版本号'
  },
  policyName: {
    type: DataTypes.STRING(500),
    comment: '政策名称'
  },
  publishOrg: {
    type: DataTypes.STRING(200),
    comment: '发布机构'
  },
  eligibility: {
    type: DataTypes.TEXT,
    comment: '申报条件'
  },
  subsidyContent: {
    type: DataTypes.TEXT,
    comment: '补贴内容'
  },
  materialsList: {
    type: DataTypes.JSON,
    comment: '材料清单'
  },
  deadline: {
    type: DataTypes.DATE,
    comment: '截止日期'
  },
  rawContent: {
    type: DataTypes.TEXT('long'),
    comment: '原文快照'
  },
  changeSummary: {
    type: DataTypes.JSON,
    comment: '变更摘要(JSON数组)'
  },
  changeType: {
    type: DataTypes.ENUM('major', 'minor', 'revision'),
    comment: '变更类型: 重大-轻微-修订'
  },
  createdBy: {
    type: DataTypes.UUID,
    comment: '创建人'
  },
  remark: {
    type: DataTypes.TEXT,
    comment: '版本备注'
  }
}, {
  tableName: 'policy_versions',
  indexes: [
    { fields: ['policy_id'] },
    { fields: ['version_number'] },
    { fields: ['created_at'] }
  ]
});

module.exports = PolicyVersion;
