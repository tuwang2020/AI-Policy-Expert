const ExcelJS = require('exceljs');
const { v4: uuidv4 } = require('uuid');
const { Op, Sequelize } = require('sequelize');
const Enterprise = require('../models/Enterprise.model');
const logger = require('../utils/logger');

class EnterpriseService {
  async create(enterpriseData) {
    if (enterpriseData.establishmentDate) {
      const date = new Date(enterpriseData.establishmentDate);
      enterpriseData.establishmentDate = isNaN(date.getTime()) ? null : date.toISOString().split('T')[0];
    }

    const existing = await Enterprise.findOne({
      where: {
        unifiedSocialCreditCode: enterpriseData.unifiedSocialCreditCode
      }
    });

    if (existing) {
      throw new Error('该统一社会信用代码的企业已存在');
    }

    const enterprise = await Enterprise.create({
      id: uuidv4(),
      ...enterpriseData
    });

    logger.info(`企业创建成功: ${enterprise.id} - ${enterprise.enterpriseName}`);
    return enterprise;
  }

  async update(id, updateData) {
    const enterprise = await Enterprise.findByPk(id);
    
    if (!enterprise) {
      throw new Error('企业不存在');
    }

    const updated = await enterprise.update(updateData);
    
    logger.info(`企业更新成功: ${id}`);
    return updated;
  }

  async delete(id) {
    const enterprise = await Enterprise.findByPk(id);
    
    if (!enterprise) {
      throw new Error('企业不存在');
    }

    await enterprise.destroy();
    
    logger.info(`企业已删除: ${id}`);
    return { success: true };
  }

  async getById(id) {
    const enterprise = await Enterprise.findByPk(id);
    
    if (!enterprise) {
      throw new Error('企业不存在');
    }

    return enterprise;
  }

  async getList(query) {
    const {
      page = 1,
      limit = 20,
      keyword,
      industryCategory,
      enterpriseScale,
      registeredCity,
      status,
      hasQualification
    } = query;

    const where = {};
    const offset = (page - 1) * limit;

    if (keyword) {
      where[Op.or] = [
        { enterpriseName: { [Op.like]: `%${keyword}%` } },
        { unifiedSocialCreditCode: { [Op.like]: `%${keyword}%` } },
        { contactPerson: { [Op.like]: `%${keyword}%` } }
      ];
    }

    if (industryCategory) where.industryCategory = industryCategory;
    if (enterpriseScale) where.enterpriseScale = enterpriseScale;
    if (registeredCity) where.registeredCity = registeredCity;
    if (status) where.status = status;
    
    if (hasQualification) {
      where.qualifications = { [Op.like]: `%${hasQualification}%` };
    }

    const { count, rows } = await Enterprise.findAndCountAll({
      where,
      offset,
      limit: parseInt(limit),
      order: [['createdAt', 'DESC']]
    });

    return {
      total: count,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(count / limit),
      data: rows
    };
  }

  async importFromExcel(filePath) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);

    const worksheet = workbook.getWorksheet(1);
    if (!worksheet) {
      throw new Error('Excel文件为空或无法读取');
    }

    const results = {
      total: 0,
      success: 0,
      failed: 0,
      errors: [],
      data: []
    };

    const headerMap = this.getHeaderMapping(worksheet.getRow(1));
    
    for (let i = 2; i <= worksheet.rowCount; i++) {
      const row = worksheet.getRow(i);
      results.total++;

      try {
        const enterpriseData = this.mapRowToEnterprise(row, headerMap);

        if (!enterpriseData.unifiedSocialCreditCode) {
          throw new Error('统一社会信用代码不能为空');
        }

        const existing = await Enterprise.findOne({
          where: {
            unifiedSocialCreditCode: enterpriseData.unifiedSocialCreditCode
          }
        });

        let saved;
        if (existing) {
          saved = await existing.update(enterpriseData);
        } else {
          saved = await Enterprise.create({ ...enterpriseData, id: uuidv4() });
        }

        results.success++;
        results.data.push(saved);
      } catch (error) {
        results.failed++;
        results.errors.push({
          row: i,
          error: error.message,
          data: row.values
        });
      }
    }

    logger.info(`Excel导入完成 - 成功: ${results.success}, 失败: ${results.failed}`);
    return results;
  }

  getHeaderMapping(headerRow) {
    const headers = {};
    const mapping = {
      '企业名称': 'enterpriseName',
      '统一社会信用代码': 'unifiedSocialCreditCode',
      '行业分类': 'industryCategory',
      '子分类': 'industrySubcategory',
      '企业规模': 'enterpriseScale',
      '注册资本(万元)': 'registeredCapital',
      '成立日期': 'establishmentDate',
      '注册省份': 'registeredProvince',
      '注册城市': 'registeredCity',
      '注册区县': 'registeredDistrict',
      '详细地址': 'registeredAddress',
      '法定代表人': 'legalRepresentative',
      '联系人': 'contactPerson',
      '联系电话': 'contactPhone',
      '联系邮箱': 'contactEmail',
      '飞书用户ID': 'feishuUserId',
      '微信OpenID': 'wechatOpenId',
      '资质列表': 'qualifications',
      '去年营收(万元)': 'revenueLastYear',
      '员工人数': 'employeeCount',
      '研发投入占比(%)': 'rdInvestmentRatio',
      '专利数量': 'patentCount',
      '软件著作权数': 'softwareCopyrightCount'
    };

    headerRow.eachCell((cell, colNumber) => {
      const value = cell.value?.toString().trim();
      if (mapping[value]) {
        headers[colNumber] = mapping[value];
      }
    });

    return headers;
  }

  mapRowToEnterprise(row, headerMap) {
    const data = {};

    row.eachCell((cell, colNumber) => {
      const field = headerMap[colNumber];
      if (field && cell.value) {
        let value = cell.value;

        if (field === 'qualifications' || field === 'tags') {
          if (typeof value === 'string') {
            value = value.split(/[,，、]/).map(s => s.trim()).filter(Boolean);
          }
        } else if (['registeredCapital', 'revenueLastYear'].includes(field)) {
          value = parseFloat(value) || null;
        } else if (field === 'employeeCount' || field === 'patentCount' || field === 'softwareCopyrightCount') {
          value = parseInt(value) || 0;
        } else if (field === 'rdInvestmentRatio') {
          value = parseFloat(value) || null;
        } else if (['establishmentDate', 'publishDate'].includes(field)) {
          if (value instanceof Date) {
            value = value.toISOString().split('T')[0];
          } else if (typeof value === 'string' && value.trim()) {
            const parsed = new Date(value);
            value = isNaN(parsed.getTime()) ? null : parsed.toISOString().split('T')[0];
          } else if (typeof value === 'number') {
            const date = new Date((value - 25569) * 86400 * 1000);
            value = date.toISOString().split('T')[0];
          } else {
            value = null;
          }
        }

        data[field] = value;
      }
    });

    if (!data.enterpriseName) {
      throw new Error('企业名称不能为空');
    }

    return data;
  }

  async exportToTemplate() {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('企业信息导入模板');

    const headers = [
      '企业名称*', '统一社会信用代码*', '行业分类', '子分类', '企业规模*',
      '注册资本(万元)', '成立日期', '注册省份', '注册城市', '注册区县',
      '详细地址', '法定代表人', '联系人', '联系电话', '联系邮箱',
      '飞书用户ID', '微信OpenID', '资质列表(逗号分隔)', '去年营收(万元)',
      '员工人数', '研发投入占比(%)', '专利数量', '软件著作权数'
    ];

    worksheet.addRow(headers);

    const exampleRow = [
      '示例科技有限公司', '91110000MA01XXXXX2', '信息技术', '软件开发',
      'small', '500', '2020-01-15', '北京市', '北京市', '海淀区',
      '中关村大街1号', '张三', '李四', '13800138000', 'contact@example.com',
      'ou_xxx', 'oXXXX', '高新技术企业,专精特新', '2000',
      '50', '15', '10', '5'
    ];
    worksheet.addRow(exampleRow);

    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE6F3FF' }
    };

    return workbook.xlsx.writeBuffer();
  }

  async getStatistics() {
    const stats = await Enterprise.findAll({
      attributes: [
        [Sequelize.fn('COUNT', Sequelize.col('*')), 'total'],
        [Sequelize.fn('COUNT', Sequelize.literal("CASE WHEN status='active' THEN 1 END")), 'active'],
        [Sequelize.fn('COUNT', Sequelize.literal("CASE WHEN enterprise_scale='micro' THEN 1 END")), 'micro'],
        [Sequelize.fn('COUNT', Sequelize.literal("CASE WHEN enterprise_scale='small' THEN 1 END")), 'small'],
        [Sequelize.fn('COUNT', Sequelize.literal("CASE WHEN enterprise_scale='medium' THEN 1 END")), 'medium'],
        [Sequelize.fn('COUNT', Sequelize.literal("CASE WHEN enterprise_scale='large' THEN 1 END")), 'large']
      ],
      raw: true
    });

    return stats[0];
  }
}

module.exports = new EnterpriseService();
