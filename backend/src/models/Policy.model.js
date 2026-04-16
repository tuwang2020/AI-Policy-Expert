const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Policy = sequelize.define('Policy', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  policyName: {
    type: DataTypes.STRING(500),
    allowNull: false,
    comment: '政策名称'
  },
  policyNumber: {
    type: DataTypes.STRING(100),
    comment: '政策文号'
  },
  publishOrg: {
    type: DataTypes.STRING(200),
    allowNull: false,
    comment: '发布机构'
  },
  publishDate: {
    type: DataTypes.DATEONLY,
    comment: '发布日期'
  },
  effectiveDate: {
    type: DataTypes.DATEONLY,
    comment: '生效日期'
  },
  deadline: {
    type: DataTypes.DATE,
    comment: '申报截止日期'
  },
  eligibility: {
    type: DataTypes.TEXT,
    comment: '申报对象条件'
  },
  subsidyContent: {
    type: DataTypes.TEXT,
    comment: '补贴/支持内容'
  },
  materialsList: {
    type: DataTypes.JSON,
    comment: '申报材料清单(JSON数组)'
  },
  contactInfo: {
    type: DataTypes.JSON,
    comment: '联系方式(JSON对象)'
  },
  industryScope: {
    type: DataTypes.JSON,
    comment: '适用行业范围(JSON数组)'
  },
  regionScope: {
    type: DataTypes.JSON,
    comment: '适用地域范围(JSON数组)'
  },
  rawContent: {
    type: DataTypes.TEXT('long'),
    comment: '原文内容(纯文本)'
  },
  filePath: {
    type: DataTypes.STRING(500),
    comment: '原始文件路径'
  },
  fileType: {
    type: DataTypes.ENUM('pdf', 'doc', 'docx'),
    comment: '文件类型'
  },
  fileSize: {
    type: DataTypes.INTEGER,
    comment: '文件大小(字节)'
  },
  status: {
    type: DataTypes.ENUM('draft', 'pending_review', 'published', 'archived'),
    defaultValue: 'draft',
    comment: '状态: 草稿-待审核-已发布-已归档'
  },
  extractStatus: {
    type: DataTypes.ENUM('pending', 'extracting', 'success', 'failed', 'manual'),
    defaultValue: 'pending',
    comment: '提取状态'
  },
  extractionConfidence: {
    type: DataTypes.DECIMAL(5, 2),
    comment: 'AI提取置信度(0-100)'
  },
  version: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
    comment: '版本号'
  },
  previousVersionId: {
    type: DataTypes.UUID,
    comment: '上一版本ID(用于对比)'
  },
  sourceUrl: {
    type: DataTypes.STRING(1000),
    comment: '来源链接'
  },
  tags: {
    type: DataTypes.JSON,
    comment: '标签(JSON数组)'
  },
  viewCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: '浏览次数'
  }
}, {
  tableName: 'policies',
  indexes: [
    { fields: ['policy_name'], type: 'FULLTEXT' },
    { fields: ['publish_org'] },
    { fields: ['deadline'] },
    { fields: ['status'] },
    { fields: ['publish_date'] },
    { fields: ['extract_status'] },
    { fields: ['created_at'] }
  ]
});

const PolicyVersion = require('./PolicyVersion.model');

Policy.hasMany(PolicyVersion, { foreignKey: 'policyId', as: 'versions' });
PolicyVersion.belongsTo(Policy, { foreignKey: 'policyId' });

module.exports = Policy;
