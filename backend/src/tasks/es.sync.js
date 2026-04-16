const SearchService = require('../services/search.service');
const Policy = require('../models/Policy.model');
const logger = require('../utils/logger');

async function syncPoliciesToES(force = false) {
  try {
    const searchHealth = await SearchService.getHealth();
    
    if (searchHealth.status === 'disconnected') {
      logger.warn('Elasticsearch未连接，跳过同步');
      return;
    }

    if (force) {
      await SearchService.createIndex();
      logger.info('已重建Elasticsearch索引');
    }

    const { count } = await Policy.findAndCountAll({
      where: { status: 'published' }
    });

    const batchSize = 100;
    let syncedCount = 0;

    for (let offset = 0; offset < count; offset += batchSize) {
      const policies = await Policy.findAll({
        where: { status: 'published' },
        limit: batchSize,
        offset,
        order: [['updatedAt', 'DESC']]
      });

      await SearchService.bulkIndexPolicies(policies);
      syncedCount += policies.length;

      logger.info(`ES同步进度: ${syncedCount}/${count}`);
    }

    logger.info(`✅ Elasticsearch同步完成 - 共 ${syncedCount} 条政策`);

    return { success: true, totalSynced: syncedCount };
  } catch (error) {
    logger.error('ES同步失败:', error);
    return { success: false, error: error.message };
  }
}

async function syncSinglePolicyToES(policyId) {
  try {
    const policy = await Policy.findByPk(policyId);

    if (!policy || policy.status !== 'published') {
      return;
    }

    await SearchService.indexPolicy(policy);
    logger.info(`单条政策索引成功: ${policyId}`);
  } catch (error) {
    logger.error(`单条政策索引失败: ${policyId}`, error);
  }
}

async function removeFromES(policyId) {
  try {
    await SearchService.deleteFromIndex(policyId);
    logger.info(`从ES删除成功: ${policyId}`);
  } catch (error) {
    logger.error(`从ES删除失败: ${policyId}`, error);
  }
}

module.exports = {
  syncPoliciesToES,
  syncSinglePolicyToES,
  removeFromES
};
