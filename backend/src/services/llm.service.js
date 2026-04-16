const OpenAI = require('openai');
const logger = require('../utils/logger');

class LLMService {
  constructor() {
    this.client = null;
    this.provider = process.env.LLM_PROVIDER || 'GLM';
    this.initializeClient();
  }

  initializeClient() {
    try {
      switch (this.provider) {
        case 'qwen':
          this.client = new OpenAI({
            apiKey: process.env.QWEN_API_KEY,
            baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1'
          });
          this.model = 'qwen-plus';
          break;
        case 'deepseek':
          this.client = new OpenAI({
            apiKey: process.env.DEEPSEEK_API_KEY,
            baseURL: 'https://api.deepseek.com'
          });
          this.model = 'deepseek-chat';
          break;
        default: // GLM默认模型
          this.client = new OpenAI({
            apiKey: process.env.GLM_API_KEY,
            baseURL: process.env.GLM_BASE_URL || 'https://open.bigmodel.cn/api/paas/v4'
          });
          this.model = 'glm-4.7';
      }
      logger.info(`LLM服务初始化成功 - Provider: ${this.provider}, Model: ${this.model}`);
    } catch (error) {
      logger.error('LLM服务初始化失败:', error);
      throw error;
    }
  }

  async extractPolicyFields(rawText, fileType = 'pdf') {
    const prompt = `你是一个专业的政策文档分析专家。请从以下政策文本中提取结构化信息，并以严格的JSON格式返回。

【原始文本】
${rawText.substring(0, 8000)}

【输出要求】
请提取以下字段，如果某项信息不存在，填null：
{
  "policyName": "政策完整名称",
  "policyNumber": "文号(如: 国发〔2024〕1号)",
  "publishOrg": "发布机构全称",
  "publishDate": "发布日期(YYYY-MM-DD格式，如无法确定填null)",
  "effectiveDate": "生效日期(YYYY-MM-DD格式)",
  "deadline": "申报截止日期(YYYY-MM-DD HH:mm:ss格式，如无明确截止日期填null)",
  "eligibility": "申报对象条件的详细描述",
  "subsidyContent": "补贴或支持内容的具体描述，包括金额、比例等",
  "materialsList": ["材料1", "材料2", "..."],
  "contactInfo": {
    "department": "联系部门",
    "phone": "联系电话",
    "email": "联系邮箱",
    "address": "办公地址"
  },
  "industryScope": ["适用行业1", "适用行业2"],
  "regionScope": ["适用地区1", "适用地区2"],
  "confidence": 0.95,
  "extractionNotes": "提取过程中的注意事项"
}

【重要】
1. 只返回JSON，不要包含任何其他文字
2. 日期必须符合指定格式
3. materialsList必须是字符串数组
4. confidence表示提取置信度(0-1)
5. 确保JSON格式正确，可以被解析`;

    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: '你是专业的政策文档分析助手，擅长从政府文件中提取关键信息。只输出有效的JSON格式。' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.1,
        max_tokens: 65536,
        response_format: { type: 'json_object' }
      });

      const content = response.choices[0].message.content;
      const result = JSON.parse(content);
      
      logger.info(`政策字段提取完成 - 置信度: ${result.confidence}`);
      return result;
    } catch (error) {
      logger.error('政策字段提取失败:', error);
      throw new Error(`LLM提取失败: ${error.message}`);
    }
  }

  async comparePolicyVersions(oldContent, newContent) {
    const prompt = `请对比以下两个版本的政策内容，找出所有实质性变化：

【旧版本内容】
${oldContent.substring(0, 6000)}

【新版本内容】
${newContent.substring(0, 6000)}

【输出要求】
以JSON数组形式返回变化列表：
[
  {
    "type": "added|removed|modified",  // 变化类型
    "category": "eligibility|subsidy|materials|deadline|other",  // 变化类别
    "content": "变化的详细内容描述",
    "impact": "high|medium|low",  // 影响程度
    "oldValue": "旧值(仅modified类型)",
    "newValue": "新值(仅modified类型)"
  }
]

【注意】
- 重点识别对申报企业有实质影响的变化
- 忽略格式调整、措辞微调等非实质性变化
- impact根据对企业申报的影响程度判断`;

    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: '你是专业的政策对比分析师，能够准确识别政策变更的关键点。' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.2,
        max_tokens: 3000,
        response_format: { type: 'json_object' }
      });

      const changes = JSON.parse(response.choices[0].message.content);
      logger.info(`政策对比完成 - 发现 ${changes.length} 处变化`);
      return Array.isArray(changes) ? changes : [];
    } catch (error) {
      logger.error('政策对比失败:', error);
      throw new Error(`政策对比失败: ${error.message}`);
    }
  }

  async generateEmbedding(text) {
    try {
      const response = await this.client.embeddings.create({
        model: this.provider === 'qwen' ? 'text-embedding-v2' : 'text-embedding-3-small',
        input: text.substring(0, 8000)
      });

      return response.data[0].embedding;
    } catch (error) {
      logger.error('生成向量嵌入失败:', error);
      throw error;
    }
  }

  async generateMatchExplanation(policy, enterprise, scores) {
    const prompt = `基于以下政策和企业信息，生成一段匹配说明（100字以内）：

【政策信息】
名称: ${policy.policyName}
条件: ${policy.eligibility}
补贴: ${policy.subsidyContent}

【企业信息】
名称: ${enterprise.enterpriseName}
行业: ${enterprise.industryCategory}/${enterprise.industrySubcategory}
规模: ${enterprise.enterpriseScale}
资质: ${enterprise.qualifications?.join(', ') || '无'}
地域: ${enterprise.registeredProvince}${enterprise.registeredCity}

【匹配得分】
总分: ${scores.totalScore}/100
行业: ${scores.industryScore}/100
规模: ${scores.scaleScore}/100
资质: ${scores.qualificationScore}/100
地域: ${scores.regionScore}/100

请用简洁的语言解释为什么该企业匹配此政策。`;

    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 300
      });

      return response.choices[0].message.content.trim();
    } catch (error) {
      logger.error('生成匹配说明失败:', error);
      return '系统正在生成匹配说明...';
    }
  }
}

module.exports = new LLMService();
