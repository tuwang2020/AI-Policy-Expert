const pdf = require('pdf-parse');
const mammoth = require('mammoth');
const fs = require('fs').promises;
const path = require('path');
const logger = require('../utils/logger');

class FileParseService {
  async parsePDF(filePath) {
    try {
      const dataBuffer = await fs.readFile(filePath);
      const data = await pdf(dataBuffer);
      
      return {
        text: data.text,
        pageCount: data.numpages,
        info: data.info
      };
    } catch (error) {
      logger.error(`PDF解析失败: ${filePath}`, error);
      throw new Error(`PDF解析失败: ${error.message}`);
    }
  }

  async parseWord(filePath) {
    try {
      const result = await mammoth.extractRawText({ path: filePath });
      
      return {
        text: result.value,
        messages: result.messages
      };
    } catch (error) {
      logger.error(`Word解析失败: ${filePath}`, error);
      throw new Error(`Word解析失败: ${error.message}`);
    }
  }

  async parseFile(filePath, fileType) {
    const ext = path.extname(filePath).toLowerCase();
    
    if (ext === '.pdf' || fileType === 'pdf') {
      return await this.parsePDF(filePath);
    } else if (['.doc', '.docx'].includes(ext) || ['doc', 'docx'].includes(fileType)) {
      return await this.parseWord(filePath);
    } else {
      throw new Error(`不支持的文件类型: ${ext || fileType}`);
    }
  }

  validateFile(file) {
    const allowedTypes = ['.pdf', '.doc', '.docx'];
    const maxSize = 50 * 1024 * 1024; // 50MB
    
    const ext = path.extname(file.originalname).toLowerCase();
    
    if (!allowedTypes.includes(ext)) {
      throw new Error(`不支持的文件格式: ${ext}，仅支持 PDF、DOC、DOCX`);
    }
    
    if (file.size > maxSize) {
      throw new Error(`文件过大: ${(file.size / 1024 / 1024).toFixed(2)}MB，最大允许 50MB`);
    }
    
    return true;
  }

  getFileInfo(file) {
    const ext = path.extname(file.originalname).toLowerCase();
    const typeMap = {
      '.pdf': 'pdf',
      '.doc': 'doc',
      '.docx': 'docx'
    };

    return {
      originalName: file.originalname,
      type: typeMap[ext],
      size: file.size,
      mimeType: file.mimetype
    };
  }
}

module.exports = new FileParseService();
