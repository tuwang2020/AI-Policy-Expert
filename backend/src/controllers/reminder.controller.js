const ReminderService = require('../services/reminder.service');
const logger = require('../utils/logger');

class ReminderController {
  async getList(req, res) {
    try {
      const result = await ReminderService.getReminders(req.query);
      res.json(result);
    } catch (error) {
      logger.error('获取提醒列表失败:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async cancel(req, res) {
    try {
      const { id } = req.params;
      await ReminderService.cancelReminder(id);
      res.json({ success: true, message: '提醒已取消' });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async getStatistics(req, res) {
    try {
      const stats = await ReminderService.getStatistics();
      res.json({ success: true, data: stats });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async manualSend(req, res) {
    try {
      const { id } = req.params;
      const reminder = await Reminder.findByPk(id);
      
      if (!reminder) {
        return res.status(404).json({ success: false, message: '提醒不存在' });
      }

      if (reminder.status === 'sent') {
        return res.status(400).json({ success: false, message: '该提醒已发送' });
      }

      await ReminderService.executeReminder(id);
      res.json({ success: true, message: '手动发送成功' });
    } catch (error) {
      logger.error('手动发送提醒失败:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
}

module.exports = new ReminderController();
