const Bull = require('bull');
const IORedis = require('ioredis');
const dayjs = require('dayjs');
const { Op, Sequelize } = require('sequelize');
const Reminder = require('../models/Reminder.model');
const MatchResult = require('../models/MatchResult.model');
const Enterprise = require('../models/Enterprise.model');
const Policy = require('../models/Policy.model');
const FeishuService = require('./feishu.service');
const WechatService = require('./wechat.service');
const logger = require('../utils/logger');

class ReminderService {
  constructor() {
    this.redisConfig = {
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD || undefined,
      maxRetriesPerRequest: null
    };

    this.reminderQueue = new Bull('reminder-queue', {
      redis: this.redisConfig,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000
        },
        removeOnComplete: 100,
        removeOnFail: 50
      }
    });

    this.setupQueueProcessors();
    logger.info('提醒队列初始化成功');
  }

  setupQueueProcessors() {
    this.reminderQueue.process('send-reminder', async (job) => {
      const { reminderId } = job.data;
      return await this.executeReminder(reminderId);
    });

    this.reminderQueue.on('completed', (job, result) => {
      logger.info(`提醒任务完成: ${job.id} - ${result.channel}`);
    });

    this.reminderQueue.on('failed', (job, err) => {
      logger.error(`提醒任务失败: ${job.id}`, err);
    });
  }

  async scheduleRemindersForMatch(matchResultId) {
    const match = await MatchResult.findByPk(matchResultId, {
      include: [
        { model: Policy, as: 'policy' },
        { model: Enterprise, as: 'enterprise' }
      ]
    });

    if (!match || !match.isMatched || !match.policy.deadline) {
      return [];
    }

    const deadline = dayjs(match.policy.deadline);
    const now = dayjs();

    if (deadline.isBefore(now)) {
      logger.warn(`政策已过期，无法创建提醒: ${match.policy.id}`);
      return [];
    }

    const reminderTypes = [
      { type: 'deadline_30', daysBefore: 30 },
      { type: 'deadline_15', daysBefore: 15 },
      { type: 'deadline_7', daysBefore: 7 },
      { type: 'deadline_3', daysBefore: 3 },
      { type: 'deadline_1', daysBefore: 1 }
    ];

    const createdReminders = [];

    for (const reminderType of reminderTypes) {
      const scheduledTime = deadline.subtract(reminderType.daysBefore, 'day');

      if (scheduledTime.isAfter(now)) {
        const content = this.generateReminderContent(
          match.policy,
          match.enterprise,
          reminderType.daysBefore
        );

        const reminder = await Reminder.create({
          policyId: match.policyId,
          enterpriseId: match.enterpriseId,
          matchResultId: match.id,
          reminderType: reminderType.type,
          scheduledTime: scheduledTime.toDate(),
          channel: this.determineChannel(match.enterprise),
          content
        });

        await this.reminderQueue.add(
          'send-reminder',
          { reminderId: reminder.id },
          {
            delay: scheduledTime.diff(now),
            jobId: `reminder-${reminder.id}`
          }
        );

        createdReminders.push(reminder);
        
        logger.info(`已安排提醒 - 政策: ${match.policy.policyName}, 企业: ${match.enterprise.enterpriseName}, 时间: ${scheduledTime.format('YYYY-MM-DD HH:mm')}`);
      }
    }

    return createdReminders;
  }

  determineChannel(enterprise) {
    let channel = [];

    if (enterprise.feishuUserId) channel.push('feishu');
    if (enterprise.wechatOpenId) channel.push('wechat');

    if (channel.length === 0) return 'none';
    if (channel.length === 2) return 'both';
    return channel[0];
  }

  generateReminderContent(policy, enterprise, daysBefore) {
    const urgencyLevel = daysBefore <= 3 ? 'urgent' : daysBefore <= 7 ? 'warning' : 'info';
    
    return {
      title: `${daysBefore > 0 ? `【距离截止还有${daysBefore}天】` : '【今日截止】'}${policy.policyName}`,
      policyName: policy.policyName,
      deadline: dayjs(policy.deadline).format('YYYY年MM月DD日'),
      daysRemaining: daysBefore,
      eligibilitySummary: (policy.eligibility || '').substring(0, 150) + '...',
      subsidyHighlight: (policy.subsidyContent || '').substring(0, 100) + '...',
      contactInfo: policy.contactInfo,
      enterpriseName: enterprise.enterpriseName,
      urgencyLevel,
      actionUrl: `${process.env.FRONTEND_URL || 'http://localhost:8080'}/policies/${policy.id}`,
      generatedAt: new Date().toISOString()
    };
  }

  async executeReminder(reminderId) {
    const reminder = await Reminder.findByPk(reminderId);

    if (!reminder || reminder.status !== 'pending') {
      return { success: false, reason: '提醒不存在或已处理' };
    }

    const results = { feishu: null, wechat: null };
    const errors = [];

    try {
      if (['feishu', 'both'].includes(reminder.channel)) {
        results.feishu = await FeishuService.sendReminderMessage(reminder);
      }

      if (['wechat', 'both'].includes(reminder.channel)) {
        results.wechat = await WechatService.sendTemplateMessage(reminder);
      }

      await reminder.update({
        status: 'sent',
        sentTime: new Date(),
        notifyChannel: reminder.channel,
        ...(results.feishu?.messageId && { feishuMessageId: results.feishu.messageId }),
        ...(results.wechat?.messageId && { wechatMessageId: results.wechat.messageId })
      });

      logger.info(`提醒发送成功: ${reminderId} - 渠道: ${reminder.channel}`);

      return {
        success: true,
        channel: reminder.channel,
        messageId: results.feishu?.messageId || results.wechat?.messageId
      };
    } catch (error) {
      await reminder.update({
        status: 'failed',
        errorMessage: error.message,
        retryCount: Sequelize.literal('retry_count + 1')
      });

      logger.error(`提醒发送失败: ${reminderId}`, error);
      throw error;
    }
  }

  async cancelReminder(reminderId) {
    const reminder = await Reminder.findByPk(reminderId);
    
    if (!reminder) {
      throw new Error('提醒不存在');
    }

    const job = await this.reminderQueue.getJob(`reminder-${reminderId}`);
    if (job && (await job.getState()) !== 'completed') {
      await job.remove();
    }

    await reminder.update({ status: 'cancelled' });

    return { success: true, message: '提醒已取消' };
  }

  async getReminders(query) {
    const {
      page = 1,
      limit = 20,
      policyId,
      enterpriseId,
      status,
      reminderType,
      startDate,
      endDate
    } = query;

    const where = {};
    const offset = (page - 1) * limit;

    if (policyId) where.policyId = policyId;
    if (enterpriseId) where.enterpriseId = enterpriseId;
    if (status) where.status = status;
    if (reminderType) where.reminderType = reminderType;
    if (startDate && endDate) {
      where.scheduledTime = { [Op.between]: [startDate, endDate] };
    }

    const { count, rows } = await Reminder.findAndCountAll({
      where,
      offset,
      limit: parseInt(limit),
      order: [['scheduledTime', 'ASC']],
      include: [
        { model: Policy, as: 'policy', attributes: ['id', 'policyName', 'deadline'] },
        { model: Enterprise, as: 'enterprise', attributes: ['id', 'enterpriseName'] }
      ]
    });

    return {
      total: count,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(count / limit),
      data: rows
    };
  }

  async getStatistics() {
    const stats = await Reminder.findAll({
      attributes: [
        [sequelize.fn('COUNT', sequelize.col('*')), 'total'],
        [sequelize.fn('COUNT', sequelize.literal("CASE WHEN status='pending' THEN 1 END")), 'pending'],
        [sequelize.fn('COUNT', sequelize.literal("CASE WHEN status='sent' THEN 1 END")), 'sent'],
        [sequelize.fn('COUNT', sequelize.literal("CASE WHEN status='failed' THEN 1 END")), 'failed']
      ],
      raw: true
    });

    return stats[0];
  }
}

module.exports = new ReminderService();
