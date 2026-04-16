const logger = require('../utils/logger');

class WechatService {
  constructor() {
    this.appId = process.env.WECHAT_APPID;
    this.appSecret = process.env.WECHAT_APPSECRET;
    this.templateId = process.env.WECHAT_TEMPLATE_ID;
    this.accessToken = null;
    this.tokenExpireTime = 0;

    if (this.appId && this.appSecret) {
      logger.info('微信服务号初始化成功');
    } else {
      logger.warn('微信服务号未配置，模板消息功能将不可用');
    }
  }

  async getAccessToken() {
    if (this.accessToken && Date.now() < this.tokenExpireTime) {
      return this.accessToken;
    }

    try {
      const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${this.appId}&secret=${this.appSecret}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.errcode) {
        throw new Error(`获取微信Token失败: ${data.errmsg}`);
      }

      this.accessToken = data.access_token;
      this.tokenExpireTime = Date.now() + (data.expires_in - 300) * 1000;

      return this.accessToken;
    } catch (error) {
      logger.error('获取微信Access Token失败:', error);
      throw error;
    }
  }

  async sendTemplateMessage(reminder) {
    if (!this.appId || !this.templateId) {
      throw new Error('微信服务号或模板ID未配置');
    }

    const token = await this.getAccessToken();
    const content = reminder.content;

    const enterprise = await Enterprise.findByPk(reminder.enterpriseId);

    if (!enterprise?.wechatOpenId) {
      throw new Error('企业未配置微信OpenID');
    }

    const templateData = {
      first: {
        value: content.title,
        color: content.urgencyLevel === 'urgent' ? '#FF0000' :
               content.urgencyLevel === 'warning' ? '#FF9800' : '#1890FF'
      },
      keyword1: {
        value: content.policyName
      },
      keyword2: {
        value: content.deadline
      },
      keyword3: {
        value: content.daysRemaining > 0 ? `${content.daysRemaining}天` : '今日截止'
      },
      keyword4: {
        value: content.eligibilitySummary.substring(0, 50)
      },
      remark: {
        value: `\n请及时准备申报材料，点击查看详情>>`,
        color: '#999999'
      }
    };

    try {
      const url = `https://api.weixin.qq.com/cgi-bin/message/template/send?access_token=${token}`;
      const body = {
        touser: enterprise.wechatOpenId,
        template_id: this.templateId,
        url: content.actionUrl,
        data: templateData,
        miniprogram: null
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const result = await response.json();

      if (result.errcode !== 0) {
        throw new Error(`微信模板消息发送失败: ${result.errmsg}`);
      }

      logger.info(`微信模板消息发送成功 - OpenID: ${enterprise.wechatOpenId}, MsgID: ${result.msgid}`);

      return {
        success: true,
        messageId: result.msgid,
        channel: 'wechat'
      };
    } catch (error) {
      logger.error('微信模板消息发送失败:', error);
      throw error;
    }
  }

  async sendPolicyChangeNotification(enterprise, policy, changes) {
    if (!this.appId || !this.templateId || !enterprise?.wechatOpenId) {
      return null;
    }

    const token = await this.getAccessToken();
    const highImpactChanges = changes.filter(c => c.impact === 'high');

    const templateData = {
      first: {
        value: `【政策变更提醒】${policy.policyName}`,
        color: '#FF0000'
      },
      keyword1: {
        value: `${changes.length}处变化 (${highImpactChanges.length}处重大)`
      },
      keyword2: {
        value: new Date().toLocaleDateString()
      },
      remark: {
        value: '\n点击查看详细变更对比>>',
        color: '#1890FF'
      }
    };

    try {
      const url = `https://api.weixin.qq.com/cgi-bin/message/template/send?access_token=${token}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          touser: enterprise.wechatOpenId,
          template_id: this.templateId,
          url: `${process.env.FRONTEND_URL}/policies/${policy.id}/compare`,
          data: templateData
        })
      });

      const result = await response.json();
      
      if (result.errcode === 0) {
        return { messageId: result.msgid };
      }
      
      return null;
    } catch (error) {
      logger.error('微信变更通知发送失败:', error);
      return null;
    }
  }
}

module.exports = new WechatService();
