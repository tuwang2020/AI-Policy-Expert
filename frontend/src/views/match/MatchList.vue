<template>
  <div class="match-list">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>智能匹配中心</span>
          <el-button type="primary" icon="Refresh" @click="showMatchDialog = true">
            新建匹配任务
          </el-button>
        </div>
      </template>

      <!-- 筛选区 -->
      <div class="filter-section">
        <el-row :gutter="16">
          <el-col :span="6">
            <el-select v-model="filters.policyId" placeholder="选择政策" filterable clearable>
              <el-option 
                v-for="policy in policyOptions" 
                :key="policy.id" 
                :label="policy.policyName" 
                :value="policy.id"
              />
            </el-select>
          </el-col>
          <el-col :span="4">
            <el-select v-model="filters.isMatched" placeholder="匹配状态" clearable>
              <el-option label="已匹配" value="true" />
              <el-option label="未匹配" value="false" />
            </el-select>
          </el-col>
          <el-col :span="4">
            <el-select v-model="filters.reviewStatus" placeholder="审核状态" clearable>
              <el-option label="待审核" value="pending" />
              <el-option label="已通过" value="approved" />
              <el-option label="已拒绝" value="rejected" />
              <el-option label="已调整" value="adjusted" />
            </el-select>
          </el-col>
          <el-col :span="4">
            <el-input-number v-model="filters.minScore" :min="0" :max="100" placeholder="最低分" style="width: 100%;" />
          </el-col>
          <el-col :span="6">
            <el-button type="primary" icon="Search" @click="fetchData">筛选</el-button>
            <el-button icon="Refresh" @click="resetFilters">重置</el-button>
          </el-col>
        </el-row>
      </div>

      <!-- 统计概览 -->
      <el-row :gutter="16" class="stats-overview">
        <el-col :span="6">
          <div class="stat-box primary">
            <div class="stat-num">{{ statistics.total || 0 }}</div>
            <div class="stat-label">总匹配记录</div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="stat-box success">
            <div class="stat-num">{{ statistics.matched || 0 }}</div>
            <div class="stat-label">成功匹配</div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="stat-box warning">
            <div class="stat-num">{{ statistics.pendingReview || 0 }}</div>
            <div class="stat-label">待审核</div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="stat-box info">
            <div class="stat-num">{{ statistics.avgScore || 0 }}</div>
            <div class="stat-label">平均分</div>
          </div>
        </el-col>
      </el-row>

      <!-- 匹配结果表格 -->
      <el-table v-loading="loading" :data="tableData" stripe>
        <el-table-column label="政策" min-width="220" show-overflow-tooltip>
          <template #default="{ row }">
            <div class="policy-cell">
              <el-link type="primary" @click="$router.push(`/policies/${row.policy.id}/detail`)">
                {{ row.policy?.policyName }}
              </el-link>
              <div class="org-text">{{ row.policy?.publishOrg }}</div>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="企业" min-width="180" show-overflow-tooltip>
          <template #default="{ row }">
            <div class="enterprise-cell">
              <el-link @click="$router.push(`/enterprises/${row.enterprise.id}`)">
                {{ row.enterprise?.enterpriseName }}
              </el-link>
              <el-tag size="small" type="info" style="margin-left: 8px;">
                {{ getScaleText(row.enterprise?.enterpriseScale) }}
              </el-tag>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="总分" width="100" sortable>
          <template #default="{ row }">
            <div class="score-cell">
              <el-progress 
                :percentage="parseFloat(row.totalScore)" 
                :color="getScoreColor(parseFloat(row.totalScore))"
                :stroke-width="15"
                :text-inside="true"
              />
            </div>
          </template>
        </el-table-column>

        <el-table-column label="维度得分" width="280">
          <template #default="{ row }">
            <div class="dimension-scores">
              <el-tooltip content="行业符合度" placement="top">
                <div class="dim-item">
                  <span class="dim-label">行业</span>
                  <el-progress 
                    :percentage="parseFloat(row.industryScore)" 
                    :stroke-width="6"
                    :show-text="false"
                    color="#1890ff"
                  />
                  <span class="dim-value">{{ row.industryScore }}</span>
                </div>
              </el-tooltip>
              
              <el-tooltip content="规模符合度" placement="top">
                <div class="dim-item">
                  <span class="dim-label">规模</span>
                  <el-progress 
                    :percentage="parseFloat(row.scaleScore)" 
                    :stroke-width="6"
                    :show-text="false"
                    color="#52c41a"
                  />
                  <span class="dim-value">{{ row.scaleScore }}</span>
                </div>
              </el-tooltip>

              <el-tooltip content="资质符合度" placement="top">
                <div class="dim-item">
                  <span class="dim-label">资质</span>
                  <el-progress 
                    :percentage="parseFloat(row.qualificationScore)" 
                    :stroke-width="6"
                    :show-text="false"
                    color="#faad14"
                  />
                  <span class="dim-value">{{ row.qualificationScore }}</span>
                </div>
              </el-tooltip>

              <el-tooltip content="地域符合度" placement="top">
                <div class="dim-item">
                  <span class="dim-label">地域</span>
                  <el-progress 
                    :percentage="parseFloat(row.regionScore)" 
                    :stroke-width="6"
                    :show-text="false"
                    color="#722ed1"
                  />
                  <span class="dim-value">{{ row.regionScore }}</span>
                </div>
              </el-tooltip>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag v-if="row.isMatched" type="success" size="small">已匹配</el-tag>
            <el-tag v-else type="info" size="small">未匹配</el-tag>
            
            <el-tag 
              v-if="row.reviewStatus !== 'pending'" 
              :type="getReviewType(row.reviewStatus)" 
              size="small" 
              style="margin-left: 4px;"
            >
              {{ getReviewText(row.reviewStatus) }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="操作" width="240" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="showDetail(row)">详情</el-button>
            <el-button 
              v-if="row.reviewStatus === 'pending' && row.isMatched" 
              link type="success" 
              size="small"
              @click="handleApprove(row)"
            >
              通过
            </el-button>
            <el-button 
              v-if="row.reviewStatus === 'pending'" 
              link type="danger" 
              size="small"
              @click="handleReject(row)"
            >
              拒绝
            </el-button>
            <el-button 
              link type="warning" 
              size="small"
              @click="showAdjustDialog(row)"
            >
              调整分数
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.limit"
          :total="pagination.total"
          layout="total, sizes, prev, pager, next"
          @size-change="fetchData"
          @current-change="fetchData"
        />
      </div>
    </el-card>

    <!-- 新建匹配任务对话框 -->
    <el-dialog v-model="showMatchDialog" title="新建匹配任务" width="500px">
      <el-form label-width="100px">
        <el-form-item label="选择政策">
          <el-select v-model="selectedPolicyId" placeholder="请选择要匹配的政策" filterable style="width: 100%;">
            <el-option 
              v-for="policy in publishedPolicies" 
              :key="policy.id" 
              :label="`${policy.policyName} (${policy.publishOrg})`" 
              :value="policy.id"
            />
          </el-select>
        </el-form-item>
        <el-alert title="匹配将自动与所有在孵企业进行比对，并生成匹配结果和提醒计划" type="info" :closable="false" />
      </el-form>
      <template #footer>
        <el-button @click="showMatchDialog = false">取消</el-button>
        <el-button type="primary" :disabled="!selectedPolicyId" :loading="matching" @click="executeMatch">
          开始匹配
        </el-button>
      </template>
    </el-dialog>

    <!-- 分数调整对话框 -->
    <el-dialog v-model="showAdjustDialogVisible" title="调整匹配分数" width="450px">
      <el-form label-width="100px">
        <el-form-item label="当前分数">
          <el-tag size="large">{{ adjustingRow?.totalScore }}分</el-tag>
        </el-form-item>
        <el-form-item label="调整后分数">
          <el-slider v-model="adjustedScore" :min="0" :max="100" :step="1" show-input />
        </el-form-item>
        <el-form-item label="调整原因">
          <el-input v-model="adjustRemark" type="textarea" :rows="3" placeholder="请说明调整原因" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAdjustDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmAdjust">确认调整</el-button>
      </template>
    </el-dialog>

    <!-- 详情抽屉 -->
    <el-drawer v-model="showDetailDrawer" title="匹配详情" size="550px">
      <template v-if="detailData">
        <el-descriptions :column="1" border>
          <el-descriptions-item label="政策名称">{{ detailData.policy?.policyName }}</el-descriptions-item>
          <el-descriptions-item label="企业名称">{{ detailData.enterprise?.enterpriseName }}</el-descriptions-item>
          <el-descriptions-item label="总匹配分">
            <el-rate :model-value="Math.round(detailData.totalScore / 20)" disabled />
            <span style="margin-left: 10px; font-weight: bold; font-size: 18px;">{{ detailData.totalScore }}分</span>
          </el-descriptions-item>
        </el-descriptions>

        <el-divider>各维度详情</el-divider>
        
        <div v-if="detailData.matchDetails" class="detail-scores">
          <div v-for="(detail, key) in detailData.matchDetails" :key="key" class="score-detail-card">
            <div class="detail-header">
              <span class="detail-title">{{ detail.dimension }}</span>
              <el-tag :type="detail.level === 'high' ? 'success' : detail.level === 'medium' ? 'warning' : 'danger'">
                {{ detail.score }}分
              </el-tag>
            </div>
            <div class="detail-reason">{{ detail.reason }}</div>
          </div>
        </div>
      </template>
    </el-drawer>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { matchApi, policyApi } from '@/api'
import { ElMessage, ElMessageBox } from 'element-plus'

const loading = ref(false)
const tableData = ref([])
const policyOptions = ref([])
const publishedPolicies = ref([])
const showMatchDialog = ref(false)
const showDetailDrawer = ref(false)
const showAdjustDialogVisible = ref(false)
const selectedPolicyId = ref(null)
const matching = ref(false)
const detailData = ref(null)
const adjustingRow = ref(null)
const adjustedScore = ref(60)
const adjustRemark = ref('')

const filters = reactive({
  policyId: '',
  isMatched: '',
  reviewStatus: '',
  minScore: undefined
})

const pagination = reactive({
  page: 1,
  limit: 20,
  total: 0
})

const statistics = reactive({
  total: 0,
  matched: 0,
  pendingReview: 0,
  avgScore: 0
})

onMounted(async () => {
  await Promise.all([fetchData(), fetchPolicyOptions()])
})

async function fetchData() {
  loading.value = true
  
  try {
    const res = await matchApi.getResults({
      ...filters,
      page: pagination.page,
      limit: pagination.limit
    })

    tableData.value = res.data || []
    pagination.total = res.total || 0
    
    statistics.total = res.total || 0
    statistics.matched = (res.data || []).filter(r => r.isMatched).length
    statistics.pendingReview = (res.data || []).filter(r => r.reviewStatus === 'pending').length
    const scores = (res.data || []).map(r => parseFloat(r.totalScore))
    statistics.avgScore = scores.length ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : 0
  } catch (error) {
    console.error('获取匹配结果失败:', error)
  } finally {
    loading.value = false
  }
}

async function fetchPolicyOptions() {
  try {
    const res = await policyApi.getList({ status: 'published', limit: 100 })
    policyOptions.value = res.data || []
    publishedPolicies.value = res.data || []
  } catch (error) {
    console.error('获取政策列表失败:', error)
  }
}

function resetFilters() {
  Object.assign(filters, { policyId: '', isMatched: '', reviewStatus: '', minScore: undefined })
  fetchData()
}

async function executeMatch() {
  if (!selectedPolicyId.value) return

  matching.value = true
  
  try {
    const res = await matchApi.matchPolicy(selectedPolicyId.value)
    
    ElMessage.success(res.message)
    showMatchDialog.value = false
    selectedPolicyId.value = null
    fetchData()
  } catch (error) {
    console.error('匹配失败:', error)
  } finally {
    matching.value = false
  }
}

function showDetail(row) {
  detailData.value = row
  showDetailDrawer.value = true
}

async function handleApprove(row) {
  try {
    await matchApi.approve(row.id)
    ElMessage.success('已通过')
    fetchData()
  } catch (error) {
    console.error('审批失败:', error)
  }
}

async function handleReject(row) {
  try {
    await matchApi.reject(row.id)
    ElMessage.success('已拒绝')
    fetchData()
  } catch (error) {
    console.error('拒绝失败:', error)
  }
}

function showAdjustDialog(row) {
  adjustingRow.value = row
  adjustedScore.value = parseFloat(row.totalScore)
  adjustRemark.value = ''
  showAdjustDialogVisible.value = true
}

async function confirmAdjust() {
  try {
    await matchApi.adjustScore(adjustingRow.value.id, {
      adjustedScore: adjustedScore.value,
      remark: adjustRemark.value
    })
    
    ElMessage.success('分数调整成功')
    showAdjustDialogVisible.value = false
    fetchData()
  } catch (error) {
    console.error('调整失败:', error)
  }
}

function getScoreColor(score) {
  if (score >= 80) return '#52c41a'
  if (score >= 60) return '#1890ff'
  if (score >= 40) return '#faad14'
  return '#f5222d'
}

function getScaleText(scale) {
  const map = { micro: '微型', small: '小型', medium: '中型', large: '大型' }
  return map[scale] || scale
}

function getReviewType(status) {
  const map = { approved: 'success', rejected: 'danger', adjusted: 'warning' }
  return map[status] || 'info'
}

function getReviewText(status) {
  const map = { approved: '已通过', rejected: '已拒绝', adjusted: '已调整' }
  return map[status] || status
}
</script>

<style lang="scss" scoped>
.match-list {
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .filter-section {
    margin-bottom: 20px;
  }

  .stats-overview {
    margin-bottom: 20px;

    .stat-box {
      text-align: center;
      padding: 20px;
      border-radius: 8px;
      
      &.primary { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
      &.success { background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%); }
      &.warning { background: linear-gradient(135deg, #f6d365 0%, #fda085 100%); }
      &.info { background: linear-gradient(135deg, #89f7fe 0%, #66a6ff 100%); }

      .stat-num {
        font-size: 32px;
        font-weight: bold;
        color: #fff;
      }

      .stat-label {
        color: rgba(255,255,255,0.9);
        margin-top: 4px;
        font-size: 14px;
      }
    }
  }

  .policy-cell {
    .org-text {
      font-size: 12px;
      color: #999;
      margin-top: 2px;
    }
  }

  .enterprise-cell {
    display: flex;
    align-items: center;
  }

  .dimension-scores {
    .dim-item {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 6px;

      .dim-label {
        font-size: 11px;
        color: #999;
        width: 28px;
      }

      .el-progress {
        flex: 1;
      }

      .dim-value {
        font-size: 12px;
        font-weight: bold;
        width: 35px;
        text-align: right;
      }
    }
  }

  .pagination-wrapper {
    margin-top: 20px;
    display: flex;
    justify-content: flex-end;
  }

  .detail-scores {
    .score-detail-card {
      margin-bottom: 16px;
      padding: 16px;
      background: #fafafa;
      border-radius: 8px;

      .detail-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;

        .detail-title {
          font-weight: bold;
          color: #333;
        }
      }

      .detail-reason {
        font-size: 13px;
        color: #666;
        line-height: 1.6;
      }
    }
  }
}
</style>
