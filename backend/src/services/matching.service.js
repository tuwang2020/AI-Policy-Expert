const { Op } = require('sequelize');
const Policy = require('../models/Policy.model');
const Enterprise = require('../models/Enterprise.model');
const MatchResult = require('../models/MatchResult.model');
const LLMService = require('./llm.service');
const logger = require('../utils/logger');

class MatchingEngine {
  constructor() {
    this.weights = {
      industry: 0.30,
      scale: 0.25,
      qualification: 0.25,
      region: 0.20
    };
    this.defaultThreshold = 60;
  }

  async matchPolicyToEnterprises(policyId, options = {}) {
    const policy = await Policy.findByPk(policyId);
    
    if (!policy) {
      throw new Error('政策不存在');
    }

    if (policy.status !== 'published') {
      throw new Error('只能对已发布的政策进行匹配');
    }

    const enterprises = await Enterprise.findAll({
      where: { status: 'active' },
      ...(options.limit ? { limit: options.limit } : {})
    });

    logger.info(`开始匹配政策: ${policy.policyName}, 企业数量: ${enterprises.length}`);

    const matchResults = [];

    for (const enterprise of enterprises) {
      try {
        const result = await this.calculateMatchScore(policy, enterprise);
        
        const existingMatch = await MatchResult.findOne({
          where: {
            policyId: policy.id,
            enterpriseId: enterprise.id
          }
        });

        const matchData = {
          policyId: policy.id,
          enterpriseId: enterprise.id,
          totalScore: result.totalScore,
          industryScore: result.scores.industry,
          scaleScore: result.scores.scale,
          qualificationScore: result.scores.qualification,
          regionScore: result.scores.region,
          matchDetails: result.details,
          isMatched: result.totalScore >= this.defaultThreshold,
          matchThreshold: this.defaultThreshold
        };

        let savedMatch;
        if (existingMatch) {
          savedMatch = await existingMatch.update(matchData);
        } else {
          savedMatch = await MatchResult.create(matchData);
        }

        if (savedMatch.isMatched) {
          matchResults.push(savedMatch);
        }
      } catch (error) {
        logger.error(`匹配失败 - 企业: ${enterprise.enterpriseName}`, error);
      }
    }

    logger.info(`匹配完成 - 匹配成功: ${matchResults.length}/${enterprises.length}`);
    
    return {
      policyId: policy.id,
      policyName: policy.policyName,
      totalEnterprises: enterprises.length,
      matchedCount: matchResults.length,
      matchRate: ((matchResults.length / enterprises.length) * 100).toFixed(2) + '%',
      results: matchResults.sort((a, b) => b.totalScore - a.totalScore)
    };
  }

  async calculateMatchScore(policy, enterprise) {
    const scores = {
      industry: await this.calcIndustryScore(policy, enterprise),
      scale: await this.calcScaleScore(policy, enterprise),
      qualification: await this.calcQualificationScore(policy, enterprise),
      region: await this.calcRegionScore(policy, enterprise)
    };

    const details = {
      industry: this.getScoreDetail('industry', scores.industry, policy, enterprise),
      scale: this.getScoreDetail('scale', scores.scale, policy, enterprise),
      qualification: this.getScoreDetail('qualification', scores.qualification, policy, enterprise),
      region: this.getScoreDetail('region', scores.region, policy, enterprise)
    };

    const totalScore = 
      scores.industry * this.weights.industry +
      scores.scale * this.weights.scale +
      scores.qualification * this.weights.qualification +
      scores.region * this.weights.region;

    return {
      totalScore: Math.round(totalScore * 100) / 100,
      scores,
      details
    };
  }

  async calcIndustryScore(policy, enterprise) {
    if (!policy.industryScope || !Array.isArray(policy.industryScope) || policy.industryScope.length === 0) {
      return 80;
    }

    const enterpriseIndustries = [
      enterprise.industryCategory,
      enterprise.industrySubcategory
    ].filter(Boolean);

    if (enterpriseIndustries.length === 0) {
      return 50;
    }

    let maxScore = 0;
    for (const policyIndustry of policy.industryScope) {
      for (const entIndustry of enterpriseIndustries) {
        if (entIndustry.includes(policyIndustry) || policyIndustry.includes(entIndustry)) {
          maxScore = Math.max(maxScore, 95);
        } else if (this.similarity(entIndustry, policyIndustry) > 0.6) {
          maxScore = Math.max(maxScore, 75);
        }
      }
    }

    return maxScore || 30;
  }

  async calcScaleScore(policy, enterprise) {
    if (!enterprise.enterpriseScale) {
      return 50;
    }

    const eligibilityText = policy.eligibility || '';
    const subsidyText = policy.subsidyContent || '';

    const scaleKeywords = {
      micro: ['微型', '小微企业', '初创', '个体工商户', '10人以下'],
      small: ['小型', '中小企业', '小型企业', '100人以下', '500万以下'],
      medium: ['中型', '中型企业', '500人以下', '中型企业'],
      large: ['大型', '大型企业', '规模以上', '龙头企业']
    };

    const keywords = scaleKeywords[enterprise.enterpriseScale] || [];
    let score = 40;

    for (const keyword of keywords) {
      if (eligibilityText.includes(keyword) || subsidyText.includes(keyword)) {
        score = Math.max(score, 90);
        break;
      } else if (this.similarity(eligibilityText, keyword) > 0.5) {
        score = Math.max(score, 70);
      }
    }

    if (eligibilityText.includes('不限规模') || eligibilityText.includes('所有企业')) {
      score = 85;
    }

    return score;
  }

  async calcQualificationScore(policy, enterprise) {
    if (!enterprise.qualifications || !Array.isArray(enterprise.qualifications) || enterprise.qualifications.length === 0) {
      return 40;
    }

    const allText = `${policy.eligibility || ''} ${policy.materialsList?.join(' ') || ''}`;
    let matchedCount = 0;
    let totalRelevance = 0;

    for (const qual of enterprise.qualifications) {
      if (allText.includes(qual)) {
        matchedCount++;
        totalRelevance += 100;
      } else {
        const words = qual.split('');
        const matchRate = words.filter(w => allText.includes(w)).length / words.length;
        totalRelevance += matchRate * 80;
      }
    }

    const baseScore = (matchedCount / enterprise.qualifications.length) * 70;
    const relevanceBonus = (totalRelevance / enterprise.qualifications.length) * 0.3;

    return Math.min(Math.round(baseScore + relevanceBonus), 100);
  }

  async calcRegionScore(policy, enterprise) {
    if (!policy.regionScope || !Array.isArray(policy.regionScope) || policy.regionScope.length === 0) {
      return 85;
    }

    const enterpriseRegions = [
      enterprise.registeredProvince,
      enterprise.registeredCity,
      enterprise.registeredDistrict
    ].filter(Boolean);

    if (enterpriseRegions.length === 0) {
      return 50;
    }

    let maxScore = 0;
    for (const policyRegion of policy.regionScope) {
      for (const entRegion of enterpriseRegions) {
        if (entRegion.includes(policyRegion) || policyRegion.includes(entRegion)) {
          maxScore = Math.max(maxScore, 100);
        } else if (this.similarity(entRegion, policyRegion) > 0.7) {
          maxScore = Math.max(maxScore, 75);
        }
      }
    }

    if (policy.regionScope.some(r => r.includes('全国') || r.includes('不限地域'))) {
      maxScore = Math.max(maxScore, 90);
    }

    return maxScore || 35;
  }

  similarity(str1, str2) {
    if (!str1 || !str2) return 0;
    
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  levenshteinDistance(str1, str2) {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  getScoreDetail(dimension, score, policy, enterprise) {
    const dimensionNames = {
      industry: '行业符合度',
      scale: '规模符合度',
      qualification: '资质符合度',
      region: '地域符合度'
    };

    let reason = '';
    switch (dimension) {
      case 'industry':
        reason = `企业行业: ${enterprise.industryCategory}/${enterprise.industrySubcategory || '未指定'}`;
        break;
      case 'scale':
        reason = `企业规模: ${enterprise.enterpriseScale || '未指定'}`;
        break;
      case 'qualification':
        reason = `企业资质: ${(enterprise.qualifications || []).join(', ') || '无'}`;
        break;
      case 'region':
        reason = `企业地域: ${enterprise.registeredProvince}${enterprise.registeredCity || ''}${enterprise.registeredDistrict || ''}`;
        break;
    }

    return {
      dimension: dimensionNames[dimension],
      score,
      reason,
      level: score >= 80 ? 'high' : score >= 60 ? 'medium' : 'low'
    };
  }

  async adjustMatchScore(matchResultId, adjustedScore, remark, userId) {
    const match = await MatchResult.findByPk(matchResultId);
    
    if (!match) {
      throw new Error('匹配记录不存在');
    }

    await match.update({
      adjustedScore: adjustedScore,
      adjustmentRemark: remark,
      adjustedBy: userId,
      reviewStatus: 'adjusted',
      reviewedAt: new Date(),
      isMatched: adjustedScore >= this.defaultThreshold
    });

    logger.info(`匹配分数已调整: ${matchResultId} -> ${adjustedScore}`);
    return match;
  }

  async getMatchResults(query) {
    const {
      page = 1,
      limit = 20,
      policyId,
      enterpriseId,
      isMatched,
      minScore,
      reviewStatus
    } = query;

    const where = {};
    const offset = (page - 1) * limit;

    if (policyId) where.policyId = policyId;
    if (enterpriseId) where.enterpriseId = enterpriseId;
    if (isMatched !== undefined) where.isMatched = isMatched === 'true';
    if (minScore) where.totalScore = { [Op.gte]: parseFloat(minScore) };
    if (reviewStatus) where.reviewStatus = reviewStatus;

    const { count, rows } = await MatchResult.findAndCountAll({
      where,
      offset,
      limit: parseInt(limit),
      order: [['totalScore', 'DESC']],
      include: [
        {
          model: Policy,
          as: 'policy',
          attributes: ['id', 'policyName', 'publishOrg', 'deadline', 'status']
        },
        {
          model: Enterprise,
          as: 'enterprise',
          attributes: ['id', 'enterpriseName', 'industryCategory', 'enterpriseScale', 'registeredCity']
        }
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
}

module.exports = new MatchingEngine();
