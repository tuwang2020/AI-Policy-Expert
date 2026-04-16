const SearchService = require('../services/search.service');
const logger = require('../utils/logger');

class SearchController {
  async search(req, res) {
    try {
      const startTime = Date.now();
      const result = await SearchService.search(req.query);
      const responseTime = Date.now() - startTime;

      res.json({
        ...result,
        responseTime: `${responseTime}ms`,
        performance: responseTime < 2000 ? 'good' : 'slow'
      });
    } catch (error) {
      logger.error('搜索失败:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async suggestions(req, res) {
    try {
      const { keyword } = req.query;
      const suggestions = await SearchService.getSuggestions(keyword);
      res.json({ data: suggestions });
    } catch (error) {
      res.json({ data: [] });
    }
  }

  async health(req, res) {
    try {
      const health = await SearchService.getHealth();
      res.json({ service: 'elasticsearch', ...health });
    } catch (error) {
      res.json({ service: 'elasticsearch', status: 'error', message: error.message });
    }
  }

  async syncIndex(req, res) {
    try {
      const Policy = require('../models/Policy.model');
      const { count } = await Policy.findAndCountAll({
        where: { status: 'published' },
        limit: 1000
      });

      const policies = await Policy.findAll({
        where: { status: 'published' },
        limit: 1000
      });

      await SearchService.bulkIndexPolicies(policies);

      res.json({
        success: true,
        message: `索引同步完成 - 共 ${policies.length} 条政策`
      });
    } catch (error) {
      logger.error('同步索引失败:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
}

module.exports = new SearchController();
