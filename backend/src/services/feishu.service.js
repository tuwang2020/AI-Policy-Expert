const logger = require('../utils/logger');

class FeishuService {
  constructor() {
    this.client = null;
    this.appId = process.env.FEISHU_APP_ID;
    this.appSecret = process.env.FEISHU_APP_SECRET;
    this.accessToken = null;
    this.tokenExpireTime = 0;
    
    if (this.appId && this.appSecret) {
      this.initialize();
    } else {
      logger.warn('飞书Bot未配置，相关功能将不可用');
    }
  }

  initialize() {
    try {
      const lark = require('@larksuiteoapi/node-sdk');
      
      this.client = new lark.Client({
        appId: this.appId,
        appSecret: this.appSecret,
        domain: lark.Domain.Feishu,
        loggerLevel: lark.LogLevel.Warn
      });

      logger.info('飞书Bot初始化成功');
    } catch (error) {
      logger.error('飞书Bot初始化失败:', error.message);
      this.client = null;
    }
  }

  async getAccessToken() {
    if (!this.client) {
      throw new Error('飞书客户端未初始化');
    }

    if (this.accessToken && Date.now() < this.tokenExpireTime) {
      return this.accessToken;
    }

    try {
      const response = await this.client.auth.tenantAccessToken.internal({});
      
      this.accessToken = response.tenant_access_token;
      this.tokenExpireTime = Date.now() + (response.expire - 60) * 1000;
      
      return this.accessToken;
    } catch (error) {
      logger.error('获取飞书Access Token失败:', error);
      throw error;
    }
  }

  async sendReminderMessage(reminder) {
    if (!this.client) {
      throw new Error('飞书客户端未配置');
    }

    const content = reminder.content;
    
    const cardContent = {
      config: { wide_screen_mode: true },
      header: {
        title: { tag: 'plain_text', content: content.title },
        template: content.urgencyLevel === 'urgent' ? 'red' : 
                  content.urgencyLevel === 'warning' ? 'orange' : 'blue'
      },
      elements: [
        {
          tag: 'div',
          text: {
            tag: 'lark_md',
            content: `**政策名称：** ${content.policyName}\n` +
                     `**截止日期：** ${content.deadline}\n` +
                     `**剩余天数：** ${content.daysRemaining > 0 ? `${content.daysRemaining}天` : '今日截止'}\n`
          }
        },
        {
          tag: 'hr'
        },
        {
          tag: 'div',
          text: {
            tag: 'lark_md',
            content: `**申报条件摘要：**\n${content.eligibilitySummary}`
          }
        },
        {
          tag: 'div',
          text: {
            tag: 'lark_md',
            content: `**支持内容：**\n${content.subsidyHighlight}`
          }
        },
        {
          tag: 'action',
          actions: [
            {
              tag: 'button',
              text: { tag: 'plain_text', content: '查看详情' },
              url: content.actionUrl,
              type: 'primary'
            }
          ]
        }
      ]
    };

    try {
      const enterprise = await Enterprise.findByPk(reminder.enterpriseId);
      
      if (!enterprise?.feishuUserId) {
        throw new Error('企业未配置飞书用户ID');
      }

      const response = await this.client.im.message.create({
        params: {
          receive_id_type: 'user_id'
        },
        data: {
          receive_id: enterprise.feishuUserId,
          msg_type: 'interactive',
          content: JSON.stringify(cardContent)
        }
      });

      logger.info(`飞书消息发送成功 - 用户: ${enterprise.feishuUserId}, 消息ID: ${response.data.message_id}`);
      
      return {
        success: true,
        messageId: response.data.message_id,
        channel: 'feishu'
      };
    } catch (error) {
      logger.error('飞书消息发送失败:', error);
      throw error;
    }
  }

  async sendPolicyChangeNotification(enterprise, policy, changes) {
    if (!this.client || !enterprise?.feishuUserId) {
      return null;
    }

    const highImpactChanges = changes.filter(c => c.impact === 'high');
    const changeSummary = highImpactChanges.slice(0, 3).map(c => 
      `• [${c.type === 'added' ? '新增' : c.type === 'removed' ? '删除' : '修改'}] ${c.content}`
    ).join('\n');

    const cardContent = {
      header: {
        title: { tag: 'plain_text', content: `【政策变更通知】${policy.policyName}` },
        template: 'red'
      },
      elements: [
        {
          tag: 'div',
          text: {
            tag: 'lark_md',
            content: `该政策已更新，发现 **${changes.length}** 处变化，其中 **${highImpactChanges.length}** 处重大变更：\n\n${changeSummary}`
          }
        },
        {
          tag: 'action',
          actions: [
            {
              tag: 'button',
              text: { tag: 'plain_text', content: '查看对比详情' },
              url: `${process.env.FRONTEND_URL}/policies/${policy.id}/compare`,
              type: 'danger'
            }
          ]
        }
      ]
    };

    try {
      const response = await this.client.im.message.create({
        params: { receive_id_type: 'user_id' },
        data: {
          receive_id: enterprise.feishuUserId,
          msg_type: 'interactive',
          content: JSON.stringify(cardContent)
        }
      });

      return { messageId: response.data.message_id };
    } catch (error) {
      logger.error('飞书变更通知发送失败:', error);
      return null;
    }
  }
}

module.exports = new FeishuService();
