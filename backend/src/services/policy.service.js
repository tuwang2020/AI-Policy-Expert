const { v4: uuidv4 } = require('uuid');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const fsPromises = fs.promises;
const { Op } = require('sequelize');
const Policy = require('../models/Policy.model');
const PolicyVersion = require('../models/PolicyVersion.model');
const FileParseService = require('./fileParse.service');
const LLMService = require('./llm.service');
const logger = require('../utils/logger');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = process.env.UPLOAD_DIR || './uploads/policies';
    const datePath = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const finalDir = path.join(uploadDir, datePath);
    
    if (!fs.existsSync(finalDir)) {
      fs.mkdirSync(finalDir, { recursive: true });
    }
    cb(null, finalDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.pdf', '.doc', '.docx'];
    const ext = path.extname(file.originalname).toLowerCase();
    
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`不支持的文件格式: ${ext}`));
    }
  }
});

class PolicyService {
  async uploadAndParse(req) {
    if (!req.file) {
      throw new Error('请上传文件');
    }

    const fileInfo = FileParseService.getFileInfo(req.file);
    const filePath = req.file.path;

    try {
      const policy = await Policy.create({
        policyName: req.file.originalname.replace(/\.(pdf|doc|docx)$/i, ''),
        filePath: filePath,
        fileType: fileInfo.type,
        fileSize: req.file.size,
        status: 'draft',
        extractStatus: 'extracting',
        publishOrg: '未知发布单位'
      });

      const parsedContent = await FileParseService.parseFile(filePath, fileInfo.type);

      const extractedData = await LLMService.extractPolicyFields(
        parsedContent.text,
        fileInfo.type
      );

      // ======================
      // ✅ 修复在这里！！！
      // ======================
      await policy.update({
        ...extractedData,
        // 兜底：如果模型没提取到，给默认值，避免 null
        policyName: extractedData.policyName || policy.policyName || '未命名政策',
        publishOrg: extractedData.publishOrg || '未知发布单位',
        
        rawContent: parsedContent.text,
        extractStatus: 'success',
        extractionConfidence: extractedData.confidence 
          ? parseFloat((extractedData.confidence * 100).toFixed(2)) 
          : 0,
        status: 'pending_review'
      });

      logger.info(`政策解析成功: ${policy.id} - ${extractedData.policyName}`);

      return {
        success: true,
        policyId: policy.id,
        extractedData,
        confidence: extractedData.confidence,
        message: '政策文件上传并解析成功'
      };
    } catch (error) {
      logger.error('政策上传解析失败:', error);
      
      if (req.file && fs.existsSync(filePath)) {
        try {
          await fsPromises.unlink(filePath);
        } catch {}
      }
      
      throw error;
    }
  }

  async updateExtractedFields(policyId, fields) {
    const policy = await Policy.findByPk(policyId);
    
    if (!policy) {
      throw new Error('政策不存在');
    }

    const updatedPolicy = await policy.update({
      ...fields,
      extractStatus: 'manual',
      extractionConfidence: 100.00
    });

    logger.info(`政策人工校正完成: ${policyId}`);
    return updatedPolicy;
  }

  async publishPolicy(policyId) {
    const policy = await Policy.findByPk(policyId);
    
    if (!policy) {
      throw new Error('政策不存在');
    }

    if (policy.status === 'published') {
      throw new Error('该政策已发布');
    }

    const previousVersion = policy.version;

    await PolicyVersion.create({
      policyId: policy.id,
      versionNumber: policy.version,
      policyName: policy.policyName,
      publishOrg: policy.publishOrg,
      eligibility: policy.eligibility,
      subsidyContent: policy.subsidyContent,
      materialsList: policy.materialsList,
      deadline: policy.deadline,
      rawContent: policy.rawContent
    });

    await policy.update({
      version: previousVersion + 1,
      status: 'published',
      publishedAt: new Date()
    });

    logger.info(`政策已发布: ${policyId} - 版本: ${previousVersion + 1}`);
    return policy;
  }

  async compareVersions(policyId, version1, version2) {
    const [v1, v2] = await Promise.all([
      PolicyVersion.findOne({
        where: { policyId, versionNumber: version1 }
      }),
      PolicyVersion.findOne({
        where: { policyId, versionNumber: version2 }
      })
    ]);

    if (!v1 || !v2) {
      throw new Error('指定的版本不存在');
    }

    const semanticChanges = await LLMService.comparePolicyVersions(
      v1.rawContent,
      v2.rawContent
    );

    return {
      version1: v1.versionNumber,
      version2: v2.versionNumber,
      semanticChanges,
      summary: {
        totalChanges: semanticChanges.length,
        added: semanticChanges.filter(c => c.type === 'added').length,
        removed: semanticChanges.filter(c => c.type === 'removed').length,
        modified: semanticChanges.filter(c => c.type === 'modified').length,
        highImpact: semanticChanges.filter(c => c.impact === 'high').length
      }
    };
  }

  async getPolicies(query) {
    const {
      page = 1,
      limit = 20,
      keyword,
      status,
      publishOrg,
      startDate,
      endDate,
      sortBy = 'createdAt',
      sortOrder = 'DESC'
    } = query;

    const where = {};
    const offset = (page - 1) * limit;

    if (keyword) {
      where[Op.or] = [
        { policyName: { [Op.like]: `%${keyword}%` } },
        { eligibility: { [Op.like]: `%${keyword}%` } },
        { publishOrg: { [Op.like]: `%${keyword}%` } }
      ];
    }

    if (status) where.status = status;
    if (publishOrg) where.publishOrg = { [Op.like]: `%${publishOrg}%` };
    if (startDate && endDate) {
      where.publishDate = { [Op.between]: [startDate, endDate] };
    }

    const { count, rows } = await Policy.findAndCountAll({
      where,
      offset,
      limit: parseInt(limit),
      order: [[sortBy, sortOrder]],
      include: [{
        model: PolicyVersion,
        as: 'versions',
        attributes: ['id', 'versionNumber', 'createdAt'],
        limit: 5,
        order: [['versionNumber', 'DESC']]
      }]
    });

    return {
      total: count,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(count / limit),
      data: rows
    };
  }

  async getPolicyById(id) {
    const policy = await Policy.findByPk(id, {
      include: [{
        model: PolicyVersion,
        as: 'versions',
        order: [['versionNumber', 'DESC']]
      }]
    });

    if (!policy) {
      throw new Error('政策不存在');
    }

    await policy.increment('viewCount');

    return policy;
  }

  async deletePolicy(id) {
    const policy = await Policy.findByPk(id);
    
    if (!policy) {
      throw new Error('政策不存在');
    }

    if (policy.filePath && fs.existsSync(policy.filePath)) {
      try {
        await fsPromises.unlink(policy.filePath);
      } catch {}
    }

    await policy.destroy();

    logger.info(`政策已删除: ${id}`);
    return { success: true, message: '删除成功' };
  }
}

const service = new PolicyService();
module.exports = service;