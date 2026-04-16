const EnterpriseService = require('../services/enterprise.service');
const multer = require('multer');
const path = require('path');

const upload = multer({
  dest: './uploads/temp/',
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedExts = ['.xlsx', '.xls'];
    const ext = path.extname(file.originalname).toLowerCase();
    
    if (allowedExts.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('仅支持Excel文件(.xlsx/.xls)'));
    }
  }
});

class EnterpriseController {
  async create(req, res) {
    try {
      const enterprise = await EnterpriseService.create(req.body);
      res.status(201).json({ success: true, data: enterprise });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async update(req, res) {
    try {
      const { id } = req.params;
      const enterprise = await EnterpriseService.update(id, req.body);
      res.json({ success: true, data: enterprise });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async delete(req, res) {
    try {
      const { id } = req.params;
      await EnterpriseService.delete(id);
      res.json({ success: true, message: '删除成功' });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async getById(req, res) {
    try {
      const { id } = req.params;
      const enterprise = await EnterpriseService.getById(id);
      res.json({ success: true, data: enterprise });
    } catch (error) {
      res.status(404).json({ success: false, message: error.message });
    }
  }

  async getList(req, res) {
    try {
      const result = await EnterpriseService.getList(req.query);
      res.json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async importExcel(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: '请上传Excel文件' });
      }

      const result = await EnterpriseService.importFromExcel(req.file.path);

      const fs = require('fs').promises;
      await fs.unlink(req.file.path).catch(() => {});

      res.json({
        success: true,
        ...result,
        message: `导入完成 - 成功: ${result.success}, 失败: ${result.failed}`
      });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async downloadTemplate(req, res) {
    try {
      const buffer = await EnterpriseService.exportToTemplate();
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=enterprise_template.xlsx');
      res.send(buffer);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async getStatistics(req, res) {
    try {
      const stats = await EnterpriseService.getStatistics();
      res.json({ success: true, data: stats });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}

module.exports = new EnterpriseController();
module.exports.upload = upload.single('file');
