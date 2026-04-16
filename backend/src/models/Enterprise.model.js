const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Enterprise = sequelize.define('Enterprise', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  enterpriseName: {
    type: DataTypes.STRING(200),
    allowNull: false,
    comment: '企业名称'
  },
  unifiedSocialCreditCode: {
    type: DataTypes.STRING(50),
    unique: true,
    comment: '统一社会信用代码'
  },
  industryCategory: {
    type: DataTypes.STRING(100),
    comment: '行业分类(一级)'
  },
  industrySubcategory: {
    type: DataTypes.STRING(100),
    comment: '行业分类(二级)'
  },
  enterpriseScale: {
    type: DataTypes.ENUM('micro', 'small', 'medium', 'large'),
    comment: '企业规模: 微型-小型-中型-大型'
  },
  registeredCapital: {
    type: DataTypes.DECIMAL(15, 2),
    comment: '注册资本(万元)'
  },
  establishmentDate: {
    type: DataTypes.DATEONLY,
    comment: '成立日期'
  },
  establishmentYears: {
    type: DataTypes.VIRTUAL,
    get() {
      if (!this.establishmentDate) return null;
      const now = new Date();
      const est = new Date(this.establishmentDate);
      return Math.floor((now - est) / (365.25 * 24 * 60 * 60 * 1000));
    }
  },
  registeredProvince: {
    type: DataTypes.STRING(50),
    comment: '注册省份'
  },
  registeredCity: {
    type: DataTypes.STRING(50),
    comment: '注册城市'
  },
  registeredDistrict: {
    type: DataTypes.STRING(50),
    comment: '注册区县'
  },
  registeredAddress: {
    type: DataTypes.STRING(500),
    comment: '详细地址'
  },
  legalRepresentative: {
    type: DataTypes.STRING(100),
    comment: '法定代表人'
  },
  contactPerson: {
    type: DataTypes.STRING(100),
    comment: '联系人'
  },
  contactPhone: {
    type: DataTypes.STRING(20),
    comment: '联系电话'
  },
  contactEmail: {
    type: DataTypes.STRING(200),
    comment: '联系邮箱'
  },
  feishuUserId: {
    type: DataTypes.STRING(100),
    comment: '飞书用户ID(用于@提醒)'
  },
  wechatOpenId: {
    type: DataTypes.STRING(100),
    comment: '微信OpenID(用于模板消息)'
  },
  qualifications: {
    type: DataTypes.JSON,
    comment: '资质列表(JSON数组): ["高新技术企业", "专精特新"]'
  },
  revenueLastYear: {
    type: DataTypes.DECIMAL(15, 2),
    comment: '去年营收(万元)'
  },
  employeeCount: {
    type: DataTypes.INTEGER,
    comment: '员工人数'
  },
  rdInvestmentRatio: {
    type: DataTypes.DECIMAL(5, 2),
    comment: '研发投入占比(%)'
  },
  patentCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: '专利数量'
  },
  softwareCopyrightCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: '软件著作权数'
  },
  tags: {
    type: DataTypes.JSON,
    comment: '自定义标签(JSON数组)'
  },
  remark: {
    type: DataTypes.TEXT,
    comment: '备注'
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive', 'graduated'),
    defaultValue: 'active',
    comment: '状态: 在孵-毕业-退出'
  },
  lastMatchTime: {
    type: DataTypes.DATE,
    comment: '最后匹配时间'
  }
}, {
  tableName: 'enterprises',
  indexes: [
    { fields: ['enterprise_name'], type: 'FULLTEXT' },
    { fields: ['industry_category'] },
    { fields: ['enterprise_scale'] },
    { fields: ['registered_city'] },
    { fields: ['unified_social_credit_code'], unique: true },
    { fields: ['status'] }
  ]
});

module.exports = Enterprise;
