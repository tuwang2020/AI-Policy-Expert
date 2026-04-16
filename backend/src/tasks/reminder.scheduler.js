const cron = require('node-cron');
const dayjs = require('dayjs');
const { Op } = require('sequelize');
const Reminder = require('../models/Reminder.model');
const Policy = require('../models/Policy.model');
const MatchResult = require('../models/MatchResult.model');
const Enterprise = require('../models/Enterprise.model');
const ReminderService = require('../services/reminder.service');
const logger = require('../utils/logger');

let isInitialized = false;

function initReminderScheduler() {
  if (isInitialized) {
    logger.warn('定时任务调度器已初始化，跳过重复初始化');
    return;
  }

  isInitialized = true;

  cron.schedule('0 * * * *', async () => {
    logger.info('执行每小时提醒检查任务...');
    await checkAndSendDueReminders();
  });

  cron.schedule('0 9 * * *', async () => {
    logger.info('执行每日9:00提醒汇总检查...');
    await sendDailySummary();
  });

  cron.schedule('0 0 * * *', async () => {
    logger.info('执行每日午夜数据清理...');
    await cleanupExpiredReminders();
    await checkUpcomingDeadlines();
  });

  logger.info('✅ 定时任务调度器启动成功');
  logger.info('   - 每小时检查待发送提醒');
  logger.info('   - 每日9:00发送提醒汇总');
  logger.info('   - 每日午夜清理过期数据 + 检查即将到期政策');
}

async function checkAndSendDueReminders() {
  try {
    const now = new Date();
    
    const dueReminders = await Reminder.findAll({
      where: {
        status: 'pending',
        scheduledTime: { [Op.lte]: now }
      },
      limit: 100,
      order: [['scheduledTime', 'ASC']]
    });

    if (dueReminders.length === 0) {
      return;
    }

    logger.info(`发现 ${dueReminders.length} 条待发送提醒`);

    for (const reminder of dueReminders) {
      try {
        await ReminderService.executeReminder(reminder.id);
      } catch (error) {
        logger.error(`发送提醒失败 ID:${reminder.id}`, error);
      }
    }
  } catch (error) {
    logger.error('检查待发送提醒任务失败:', error);
  }
}

async function sendDailySummary() {
  try {
    const tomorrow = dayjs().add(1, 'day').startOf('day');
    const next3Days = dayjs().add(3, 'day').endOf('day');

    const upcomingDeadlines = await MatchResult.findAll({
      where: {
        isMatched: true,
        notified: false
      },
      include: [
        {
          model: Policy,
          as: 'policy',
          where: {
            deadline: { [Op.between]: [tomorrow.toDate(), next3Days.toDate()] },
            status: 'published'
          }
        },
        {
          model: Enterprise,
          as: 'enterprise',
          where: { status: 'active' }
        }
      ],
      limit: 50
    });

    if (upcomingDeadlines.length > 0) {
      logger.info(`即将到期的匹配结果: ${upcomingDeadlines.length} 条`);
      
      for (const match of upcomingDeadlines) {
        try {
          await ReminderService.scheduleRemindersForMatch(match.id);
          await match.update({ notified: true });
        } catch (error) {
          logger.error(`安排提醒失败 - 匹配ID: ${match.id}`, error);
        }
      }
    }
  } catch (error) {
    logger.error('每日汇总任务失败:', error);
  }
}

async function cleanupExpiredReminders() {
  try {
    const result = await Reminder.update(
      { status: 'cancelled' },
      {
        where: {
          status: 'pending',
          scheduledTime: { [Op.lt]: new Date() }
        }
      }
    );

    if (result[0] > 0) {
      logger.info(`清理过期提醒: ${result[0]} 条`);
    }
  } catch (error) {
    logger.error('清理过期提醒失败:', error);
  }
}

async function checkUpcomingDeadlines() {
  try {
    const policies = await Policy.findAll({
      where: {
        status: 'published',
        deadline: { [Op.gte]: new Date(), [Op.lte]: dayjs().add(30, 'day').toDate() }
      }
    });

    for (const policy of policies) {
      const existingMatches = await MatchResult.count({
        where: { policyId: policy.id, isMatched: true }
      });

      if (existingMatches === 0) {
        logger.info(`检测到即将到期但未匹配的政策: ${policy.policyName}`);
      }
    }
  } catch (error) {
    logger.error('检查即将到期政策失败:', error);
  }
}

module.exports = { initReminderScheduler };
