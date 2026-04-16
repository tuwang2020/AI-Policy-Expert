<template>
  <div class="advanced-search">
    <el-card>
      <template #header>
        <span>高级搜索</span>
      </template>

      <el-form :model="searchForm" label-width="100px" class="search-form">
        <el-row :gutter="20">
          <el-col :span="16">
            <el-form-item label="关键词">
              <el-input
                v-model="searchForm.keyword"
                placeholder="输入政策名称、条件、补贴内容等关键词"
                prefix-icon="Search"
                size="large"
                clearable
                @keyup.enter="handleSearch"
              />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-button type="primary" size="large" icon="Search" @click="handleSearch" style="height: 40px;">
              搜索
            </el-button>
            <el-button size="large" icon="Refresh" @click="resetForm">重置</el-button>
          </el-col>
        </el-row>

        <el-divider>高级筛选</el-divider>

        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="发布机构">
              <el-select v-model="searchForm.publishOrg" filterable allow-create clearable placeholder="选择或输入" style="width: 100%;">
                <el-option label="科技部" value="科技部" />
                <el-option label="工信部" value="工信部" />
                <el-option label="发改委" value="发改委" />
                <el-option label="财政部" value="财政部" />
                <el-option label="北京市科委" value="北京市科委" />
                <el-option label="上海市科委" value="上海市科委" />
              </el-select>
            </el-form-item>
          </el-col>

          <el-col :span="8">
            <el-form-item label="适用行业">
              <el-select v-model="searchForm.industry" filterable allow-create clearable placeholder="选择行业" style="width: 100%;">
                <el-option label="信息技术" value="信息技术" />
                <el-option label="生物医药" value="生物医药" />
                <el-option label="智能制造" value="智能制造" />
                <el-option label="新能源" value="新能源" />
                <el-option label="新材料" value="新材料" />
              </el-select>
            </el-form-item>
          </el-col>

          <el-col :span="8">
            <el-form-item label="适用地域">
              <el-select v-model="searchForm.region" filterable allow-create clearable placeholder="选择地域" style="width: 100%;">
                <el-option label="全国" value="全国" />
                <el-option label="北京市" value="北京市" />
                <el-option label="上海市" value="上海市" />
                <el-option label="广东省" value="广东省" />
                <el-option label="浙江省" value="浙江省" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="发布时间">
              <el-date-picker
                v-model="searchForm.dateRange"
                type="daterange"
                range-separator="-"
                start-placeholder="开始日期"
                end-placeholder="结束日期"
                format="YYYY-MM-DD"
                value-format="YYYY-MM-DD"
                style="width: 100%;"
              />
            </el-form-item>
          </el-col>

          <el-col :span="8">
            <el-form-item label="截止状态">
              <el-select v-model="searchForm.hasDeadline" clearable placeholder="筛选截止状态" style="width: 100%;">
                <el-option label="有截止日期" value="true" />
                <el-option label="未过期" value="not_expired" />
              </el-select>
            </el-form-item>
          </el-col>

          <el-col :span="8">
            <el-form-item label="排序方式">
              <el-select v-model="searchForm.sortBy" style="width: 100%;">
                <el-option label="相关度最高" value="_score" />
                <el-option label="发布时间最新" value="createdAt" />
                <el-option label="截止时间最近" value="deadline" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>

      <!-- 搜索结果 -->
      <div v-if="hasSearched" class="results-section">
        <el-divider content-position="left">
          <span>搜索结果</span>
          <el-tag v-if="searchResults.total !== undefined" style="margin-left: 10px;">
            共找到 {{ searchResults.total }} 条结果
            <span v-if="searchResults.responseTime" style="color: #999; font-weight: normal;">
              ({{ searchResults.responseTime }})
            </span>
          </el-tag>
        </el-divider>

        <div v-loading="loading">
          <div v-if="searchResults.data?.length > 0" class="result-list">
            <el-card 
              v-for="(item, index) in searchResults.data" 
              :key="item.id" 
              shadow="hover" 
              class="result-item"
              @click="$router.push(`/policies/${item.id}/detail`)"
            >
              <div class="result-header">
                <h3 class="result-title" v-html="highlightText(item.policyName, item.highlight?.policyName)" />
                <el-space>
                  <el-tag size="small" type="info">{{ item.publishOrg }}</el-tag>
                  <el-tag v-if="item.deadline" :type="getDeadlineType(item.deadline)" size="small">
                    截止: {{ formatDate(item.deadline) }}
                  </el-tag>
                  <el-rate 
                    :value="Math.round((item.score || 60) / 20)" 
                    disabled 
                    show-score 
                    text-color="#ff9900"
                    score-template="{value}分"
                  />
                </el-space>
              </div>

              <div class="result-body">
                <p class="result-snippet" v-html="highlightText(item.eligibility, item.highlight?.eligibility)" />
                
                <div v-if="item.subsidyContent" class="subsidy-highlight">
                  <el-icon><Money /></el-icon>
                  <span v-html="highlightText(item.subsidyContent, item.highlight?.subsidyContent)" />
                </div>
              </div>

              <div class="result-footer">
                <el-space>
                  <span><el-icon><Calendar /></el-icon> 发布: {{ formatDate(item.publishDate) }}</span>
                  <span><el-icon><View /></el-icon> 浏览: {{ item.viewCount || 0 }}次</span>
                </el-space>
                <el-space>
                  <el-tag 
                    v-for="(industry, idx) in (item.industryScope || []).slice(0, 3)" 
                    :key="idx" 
                    size="small" 
                    effect="plain"
                  >
                    {{ industry }}
                  </el-tag>
                </el-space>
              </div>
            </el-card>
          </div>

          <el-empty v-else description="未找到匹配的政策，请尝试其他关键词" />

          <div v-if="searchResults.total > searchResults.limit" class="pagination-wrapper">
            <el-pagination
              v-model:current-page="currentPage"
              :page-size="searchResults.limit"
              :total="searchResults.total"
              layout="prev, pager, next"
              @current-change="handlePageChange"
            />
          </div>
        </div>
      </div>

      <!-- 热门搜索 -->
      <div v-if="!hasSearched" class="hot-searches">
        <el-divider content-position="left">热门搜索</el-divider>
        
        <el-space wrap>
          <el-tag 
            v-for="(keyword, index) in hotKeywords" 
            :key="index"
            effect="plain"
            class="hot-keyword"
            @click="searchForm.keyword = keyword; handleSearch()"
          >
            {{ keyword }}
          </el-tag>
        </el-space>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { searchApi } from '@/api'

const loading = ref(false)
const hasSearched = ref(false)
const currentPage = ref(1)

const searchForm = reactive({
  keyword: '',
  publishOrg: '',
  industry: '',
  region: '',
  dateRange: null,
  hasDeadline: '',
  sortBy: '_score'
})

const searchResults = reactive({
  data: [],
  total: 0,
  limit: 20,
  responseTime: ''
})

const hotKeywords = [
  '高新技术企业认定',
  '专精特新',
  '研发费用加计扣除',
  '人才引进补贴',
  '数字化转型',
  '知识产权奖励',
  '绿色制造',
  '中小企业贷款贴息'
]

async function handleSearch() {
  if (!searchForm.keyword && !searchForm.publishOrg && !searchForm.industry) {
    return
  }

  loading.value = true
  hasSearched.value = true

  try {
    const params = {
      keyword: searchForm.keyword,
      publishOrg: searchForm.publishOrg,
      industry: searchForm.industry,
      region: searchForm.region,
      sortBy: searchForm.sortBy,
      page: currentPage.value,
      limit: 20
    }

    if (searchForm.dateRange?.length === 2) {
      params.startDate = searchForm.dateRange[0]
      params.endDate = searchForm.dateRange[1]
    }

    if (searchForm.hasDeadline) {
      params.hasDeadline = searchForm.hasDeadline
    }

    const res = await searchApi.search(params)
    
    Object.assign(searchResults, res)
  } catch (error) {
    console.error('搜索失败:', error)
  } finally {
    loading.value = false
  }
}

function resetForm() {
  Object.assign(searchForm, {
    keyword: '',
    publishOrg: '',
    industry: '',
    region: '',
    dateRange: null,
    hasDeadline: '',
    sortBy: '_score'
  })
  
  hasSearched.value = false
  currentPage.value = 1
  
  Object.assign(searchResults, {
    data: [],
    total: 0,
    limit: 20,
    responseTime: ''
  })
}

function handlePageChange(page) {
  currentPage.value = page
  handleSearch()
}

function highlightText(text, highlights) {
  if (!text) return ''
  if (!highlights?.length) return escapeHtml(text)

  let result = text
  highlights.forEach(highlight => {
    result = result.replace(
      new RegExp(escapeRegex(highlight), 'gi'),
      '<mark>$&</mark>'
    )
  })

  return result
}

function escapeHtml(text) {
  if (!text) return ''
  return text.replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[char])
}

function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function formatDate(date) {
  return date ? new Date(date).toLocaleDateString('zh-CN') : '-'
}

function getDeadlineType(deadline) {
  const days = Math.ceil((new Date(deadline) - new Date()) / (1000 * 60 * 60 * 24))
  if (days <= 7) return 'danger'
  if (days <= 30) return 'warning'
  return 'info'
}
</script>

<style lang="scss" scoped>
.advanced-search {
  .search-form {
    max-width: 1200px;
  }

  .results-section {
    margin-top: 20px;
  }

  .result-list {
    display: flex;
    flex-direction: column;
    gap: 16px;

    .result-item {
      cursor: pointer;
      transition: all 0.3s;

      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
      }

      .result-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 12px;

        .result-title {
          margin: 0;
          font-size: 18px;
          color: #1890ff;
          
          :deep(mark) {
            background-color: #ffe58f;
            padding: 0 2px;
            border-radius: 2px;
          }
        }
      }

      .result-body {
        color: #666;
        line-height: 1.8;
        margin-bottom: 12px;

        .result-snippet {
          margin: 0;
          
          :deep(mark) {
            background-color: #ffe58f;
            padding: 0 2px;
            border-radius: 2px;
          }
        }

        .subsidy-highlight {
          background: #fff7e6;
          padding: 10px 12px;
          border-radius: 6px;
          border-left: 3px solid #faad14;
          margin-top: 10px;
          font-size: 14px;
          color: #d48806;

          :deep(mark) {
            background-color: #ffd591;
            color: #ad6800;
          }

          .el-icon {
            margin-right: 6px;
          }
        }
      }

      .result-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding-top: 10px;
        border-top: 1px solid #f0f0f0;
        font-size: 13px;
        color: #999;

        span {
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }
      }
    }
  }

  .pagination-wrapper {
    margin-top: 24px;
    display: flex;
    justify-content: center;
  }

  .hot-searches {
    .hot-keyword {
      cursor: pointer;
      margin: 4px;
      padding: 6px 14px;
      font-size: 14px;
      transition: all 0.2s;

      &:hover {
        color: #1890ff;
        border-color: #1890ff;
      }
    }
  }
}
</style>
