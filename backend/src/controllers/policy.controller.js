const PolicyService = require('../services/policy.service');
const Policy = require('../models/Policy.model');
const logger = require('../utils/logger');

class PolicyController {
  async upload(req, res) {
    try {
      const result = await PolicyService.uploadAndParse(req);
      res.json({ success: true, data: result });
    } catch (error) {
      logger.error('政策上传失败:', error);
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async updateFields(req, res) {
    try {
      const { id } = req.params;
      const fields = req.body;
      
      const policy = await PolicyService.updateExtractedFields(id, fields);
      res.json({ success: true, data: policy });
    } catch (error) {
      logger.error('更新政策字段失败:', error);
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async publish(req, res) {
    try {
      const { id } = req.params;
      const policy = await PolicyService.publishPolicy(id);
      res.json({ success: true, data: policy, message: '政策发布成功' });
    } catch (error) {
      logger.error('发布政策失败:', error);
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async getList(req, res) {
    try {
      const result = await PolicyService.getPolicies(req.query);
      res.json(result);
    } catch (error) {
      logger.error('获取政策列表失败:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async getById(req, res) {
    try {
      const { id } = req.params;
      const policy = await PolicyService.getPolicyById(id);
      res.json({ success: true, data: policy });
    } catch (error) {
      logger.error('获取政策详情失败:', error);
      res.status(404).json({ success: false, message: error.message });
    }
  }

  async compareVersions(req, res) {
    try {
      const { id } = req.params;
      const { v1, v2 } = req.query;
      
      if (!v1 || !v2) {
        return res.status(400).json({ success: false, message: '请指定版本号' });
      }

      const result = await PolicyService.compareVersions(id, parseInt(v1), parseInt(v2));
      res.json({ success: true, data: result });
    } catch (error) {
      logger.error('版本对比失败:', error);
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async delete(req, res) {
    try {
      const { id } = req.params;
      await PolicyService.deletePolicy(id);
      res.json({ success: true, message: '删除成功' });
    } catch (error) {
      logger.error('删除政策失败:', error);
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async downloadFile(req, res) {
    try {
      const { id } = req.params;
      const policy = await Policy.findByPk(id);

      if (!policy || !policy.filePath) {
        return res.status(404).json({ success: false, message: '文件不存在' });
      }

      const fs = require('fs');
      if (!fs.existsSync(policy.filePath)) {
        return res.status(404).json({ success: false, message: '原始文件已丢失' });
      }

      res.download(policy.filePath, `${policy.policyName}.${policy.fileType}`);
    } catch (error) {
      logger.error('下载文件失败:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
}

module.exports = new PolicyController();
