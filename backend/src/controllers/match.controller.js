const MatchingEngine = require('../services/matching.service');
const ReminderService = require('../services/reminder.service');
const MatchResult = require('../models/MatchResult.model');
const logger = require('../utils/logger');

class MatchController {
  async matchPolicy(req, res) {
    try {
      const { policyId } = req.body;
      
      if (!policyId) {
        return res.status(400).json({ success: false, message: '请提供政策ID' });
      }

      const result = await MatchingEngine.matchPolicyToEnterprises(policyId);
      
      for (const match of result.results) {
        await ReminderService.scheduleRemindersForMatch(match.id);
      }

      res.json({
        success: true,
        data: result,
        message: `匹配完成 - 共匹配 ${result.matchedCount} 家企业`
      });
    } catch (error) {
      logger.error('政策匹配失败:', error);
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async getResults(req, res) {
    try {
      const results = await MatchingEngine.getMatchResults(req.query);
      res.json(results);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async adjustScore(req, res) {
    try {
      const { id } = req.params;
      const { adjustedScore, remark } = req.body;

      if (!adjustedScore || adjustedScore < 0 || adjustedScore > 100) {
        return res.status(400).json({ success: false, message: '分数必须在0-100之间' });
      }

      const result = await MatchingEngine.adjustMatchScore(
        id,
        parseFloat(adjustedScore),
        remark,
        req.user?.id
      );

      res.json({ success: true, data: result, message: '分数调整成功' });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async approveMatch(req, res) {
    try {
      const { id } = req.params;
      const match = await MatchResult.findByPk(id);
      
      if (!match) {
        return res.status(404).json({ success: false, message: '匹配记录不存在' });
      }

      await match.update({
        reviewStatus: 'approved',
        reviewedBy: req.user?.id,
        reviewedAt: new Date()
      });

      res.json({ success: true, message: '已审核通过' });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async rejectMatch(req, res) {
    try {
      const { id } = req.params;
      const match = await MatchResult.findByPk(id);
      
      if (!match) {
        return res.status(404).json({ success: false, message: '匹配记录不存在' });
      }

      await match.update({
        reviewStatus: 'rejected',
        reviewedBy: req.user?.id,
        reviewedAt: new Date(),
        isMatched: false
      });

      res.json({ success: true, message: '已拒绝' });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
}

module.exports = new MatchController();
