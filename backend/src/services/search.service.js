const { Client } = require('@elastic/elasticsearch');
const Policy = require('../models/Policy.model');
const { Op, Sequelize } = require('sequelize');
const logger = require('../utils/logger');

class SearchService {
  constructor() {
    this.client = null;
    this.indexName = 'policies';
    this.esAvailable = false;
    this.initialize();
  }

  initialize() {
    try {
      this.client = new Client({
        node: process.env.ES_NODE || 'http://localhost:9200',
        auth: process.env.ES_USERNAME ? {
          username: process.env.ES_USERNAME,
          password: process.env.ES_PASSWORD
        } : undefined,
        maxRetries: 3,
        requestTimeout: 30000
      });

      this.client.ping().then(() => {
        this.esAvailable = true;
        logger.info('Elasticsearch客户端初始化成功');
      }).catch(() => {
        this.esAvailable = false;
        logger.warn('Elasticsearch不可用，将使用MySQL降级搜索');
      });
    } catch (error) {
      logger.error('Elasticsearch初始化失败:', error.message);
      this.client = null;
      this.esAvailable = false;
    }
  }

  async createIndex() {
    if (!this.client) {
      throw new Error('Elasticsearch未连接');
    }

    const exists = await this.client.indices.exists({ index: this.indexName });
    
    if (exists) {
      await this.client.indices.delete({ index: this.indexName });
    }

    await this.client.indices.create({
      index: this.indexName,
      body: {
        settings: {
          number_of_shards: 1,
          number_of_replicas: 0,
          analysis: {
            analyzer: {
              ik_smart_synonym: {
                type: 'custom',
                tokenizer: 'ik_smart',
                filter: ['synonym_filter']
              }
            },
            filter: {
              synonym_filter: {
                type: 'synonym',
                synonyms: [
                  '高新技术企业,高企,高新企业',
                  '专精特新,小巨人,专精特新中小企业',
                  '补贴,补助,资金支持',
                  '申报,申请,项目申报'
                ]
              }
            }
          }
        },
        mappings: {
          properties: {
            policyName: {
              type: 'text',
              analyzer: 'ik_max_word',
              fields: {
                keyword: { type: 'keyword' }
              }
            },
            publishOrg: {
              type: 'text',
              analyzer: 'ik_max_word',
              fields: {
                keyword: { type: 'keyword' }
              }
            },
            eligibility: {
              type: 'text',
              analyzer: 'ik_max_word'
            },
            subsidyContent: {
              type: 'text',
              analyzer: 'ik_max_word'
            },
            industryScope: {
              type: 'keyword'
            },
            regionScope: {
              type: 'keyword'
            },
            publishDate: { type: 'date' },
            deadline: { type: 'date' },
            status: { type: 'keyword' },
            extractStatus: { type: 'keyword' },
            createdAt: { type: 'date' },
            viewCount: { type: 'integer' }
          }
        }
      }
    });

    logger.info(`ES索引创建成功: ${this.indexName}`);
  }

  async indexPolicy(policy) {
    if (!this.client || !policy) return;

    try {
      await this.client.index({
        index: this.indexName,
        id: policy.id,
        body: {
          policyName: policy.policyName,
          policyNumber: policy.policyNumber,
          publishOrg: policy.publishOrg,
          eligibility: policy.eligibility,
          subsidyContent: policy.subsidyContent,
          materialsList: policy.materialsList || [],
          industryScope: policy.industryScope || [],
          regionScope: policy.regionScope || [],
          publishDate: policy.publishDate,
          deadline: policy.deadline,
          status: policy.status,
          extractStatus: policy.extractStatus,
          createdAt: policy.createdAt,
          viewCount: policy.viewCount || 0
        }
      });
    } catch (error) {
      logger.error(`索引政策失败: ${policy.id}`, error);
    }
  }

  async bulkIndexPolicies(policies) {
    if (!this.client || !policies?.length) return;

    const body = policies.flatMap(policy => [
      { index: { _index: this.indexName, _id: policy.id } },
      {
        policyName: policy.policyName,
        policyNumber: policy.policyNumber,
        publishOrg: policy.publishOrg,
        eligibility: policy.eligibility,
        subsidyContent: policy.subsidyContent,
        industryScope: policy.industryScope || [],
        regionScope: policy.regionScope || [],
        publishDate: policy.publishDate,
        deadline: policy.deadline,
        status: policy.status,
        extractStatus: policy.extractStatus,
        createdAt: policy.createdAt,
        viewCount: policy.viewCount || 0
      }
    ]);

    try {
      const response = await this.client.bulk({ refresh: true, body });
      
      if (response.errors) {
        const failedItems = response.items.filter(item => item.error);
        logger.warn(`批量索引完成 - 成功: ${body.length / 2 - failedItems.length}, 失败: ${failedItems.length}`);
      } else {
        logger.info(`批量索引成功: ${policies.length} 条政策`);
      }
    } catch (error) {
      logger.error('批量索引失败:', error);
    }
  }

  async deleteFromIndex(policyId) {
    if (!this.client) return;

    try {
      await this.client.delete({
        index: this.indexName,
        id: policyId
      });
    } catch (error) {
      logger.error(`从索引删除失败: ${policyId}`, error);
    }
  }

  async search(query) {
    if (this.esAvailable && this.client) {
      try {
        return await this.searchWithES(query);
      } catch (error) {
        logger.warn('ES搜索失败，降级到MySQL:', error.message);
        this.esAvailable = false;
      }
    }

    return await this.searchWithMySQL(query);
  }

  async searchWithES(query) {

    const {
      keyword,
      industry,
      region,
      publishOrg,
      status,
      startDate,
      endDate,
      hasDeadline,
      sortBy = '_score',
      sortOrder = 'desc',
      page = 1,
      limit = 20
    } = query;

    const must = [];
    const filters = [];

    if (keyword) {
      must.push({
        multi_match: {
          query: keyword,
          fields: ['policyName^3', 'eligibility^2', 'subsidyContent^2', 'publishOrg^1.5'],
          type: 'best_fields',
          fuzziness: 'AUTO'
        }
      });
    }

    if (industry) {
      filters.push({ term: { industryScope: industry } });
    }

    if (region) {
      filters.push({ term: { regionScope: region } });
    }

    if (publishOrg) {
      filters.push({ term: { 'publishOrg.keyword': publishOrg } });
    }

    if (status) {
      filters.push({ term: { status } });
    }

    if (startDate && endDate) {
      filters.push({
        range: {
          publishDate: {
            gte: startDate,
            lte: endDate
          }
        }
      });
    }

    if (hasDeadline === 'true') {
      filters.push({
        exists: { field: 'deadline' }
      });
      filters.push({
        range: {
          deadline: {
            gte: new Date().toISOString()
          }
        }
      });
    }

    const body = {
      from: (page - 1) * limit,
      size: parseInt(limit),
      query: {
        bool: {
          must: must.length > 0 ? must : [{ match_all: {} }],
          filter: filters
        }
      },
      sort: [{ [sortBy]: { order: sortOrder } }],
      highlight: {
        pre_tags: ['<mark>'],
        post_tags: ['</mark>'],
        fields: {
          policyName: { fragment_size: 200, number_of_fragments: 3 },
          eligibility: { fragment_size: 300, number_of_fragments: 2 },
          subsidyContent: { fragment_size: 300, number_of_fragments: 2 }
        }
      },
      aggs: {
        industries: { terms: { field: 'industryScope', size: 20 } },
        regions: { terms: { field: 'regionScope', size: 20 } },
        orgs: { terms: { field: 'publishOrg.keyword', size: 15 } },
        status_count: { terms: { field: 'status' } }
      }
    };

    try {
      const response = await this.client.search({ index: this.indexName, body });

      return {
        total: response.hits.total.value,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(response.hits.total.value / limit),
        took: response.took,
        data: response.hits.hits.map(hit => ({
          id: hit._id,
          ...hit._source,
          highlight: hit.highlight,
          score: hit._score
        })),
        aggregations: response.aggregations
      };
    } catch (error) {
      logger.error('ES搜索失败:', error);
      throw error;
    }
  }

  async searchWithMySQL(query) {
    const {
      keyword,
      industry,
      region,
      publishOrg,
      status,
      startDate,
      endDate,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
      page = 1,
      limit = 20
    } = query;

    const where = { status: 'published' };
    const offset = (page - 1) * limit;

    if (keyword) {
      where[Op.or] = [
        { policyName: { [Op.like]: `%${keyword}%` } },
        { eligibility: { [Op.like]: `%${keyword}%` } },
        { subsidyContent: { [Op.like]: `%${keyword}%` } },
        { publishOrg: { [Op.like]: `%${keyword}%` } }
      ];
    }

    if (industry) where.industryScope = { [Op.like]: `%${industry}%` };
    if (region) where.regionScope = { [Op.like]: `%${region}%` };
    if (publishOrg) where.publishOrg = { [Op.like]: `%${publishOrg}%` };
    if (status) where.status = status;
    if (startDate && endDate) {
      where.publishDate = { [Op.between]: [startDate, endDate] };
    }

    try {
      const { count, rows } = await Policy.findAndCountAll({
        where,
        offset,
        limit: parseInt(limit),
        order: [[sortBy, sortOrder]]
      });

      return {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit),
        took: 0,
        data: rows.map(policy => ({
          id: policy.id,
          policyName: policy.policyName,
          policyNumber: policy.policyNumber,
          publishOrg: policy.publishOrg,
          eligibility: policy.eligibility,
          subsidyContent: policy.subsidyContent,
          industryScope: policy.industryScope || [],
          regionScope: policy.regionScope || [],
          publishDate: policy.publishDate,
          deadline: policy.deadline,
          status: policy.status,
          createdAt: policy.createdAt,
          viewCount: policy.viewCount || 0,
          score: keyword ? this.calculateRelevanceScore(policy, keyword) : null
        })),
        aggregations: {}
      };
    } catch (error) {
      logger.error('MySQL搜索失败:', error);
      throw new Error(`搜索失败: ${error.message}`);
    }
  }

  calculateRelevanceScore(policy, keyword) {
    let score = 0;
    const lowerKeyword = keyword.toLowerCase();

    if (policy.policyName?.toLowerCase().includes(lowerKeyword)) score += 3;
    if (policy.eligibility?.toLowerCase().includes(lowerKeyword)) score += 2;
    if (policy.subsidyContent?.toLowerCase().includes(lowerKeyword)) score += 2;
    if (policy.publishOrg?.toLowerCase().includes(lowerKeyword)) score += 1.5;

    return parseFloat((score * 10).toFixed(1));
  }

  async getSuggestions(keyword, size = 10) {
    if (!this.client || !keyword) return [];

    try {
      const response = await this.client.search({
        index: this.indexName,
        body: {
          size,
          _source: ['id', 'policyName', 'publishOrg'],
          query: {
            multi_match: {
              query: keyword,
              fields: ['policyName^5', 'publishOrg^2'],
              type: 'phrase_prefix',
              max_expansions: 10
            }
          }
        }
      });

      return response.hits.hits.map(hit => ({
        id: hit._id,
        text: hit._source.policyName,
        org: hit._source.publishOrg
      }));
    } catch (error) {
      logger.error('获取搜索建议失败:', error);
      return [];
    }
  }

  async getHealth() {
    if (!this.client) return { status: 'disconnected' };

    try {
      const health = await this.client.cluster.health();
      return {
        status: health.status,
        cluster_name: health.cluster_name,
        number_of_nodes: health.number_of_nodes
      };
    } catch (error) {
      return { status: 'error', message: error.message };
    }
  }
}

module.exports = new SearchService();
