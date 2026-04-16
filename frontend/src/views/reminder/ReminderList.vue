<template>
  <div class="reminder-list">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>申报提醒管理</span>
          <el-space>
            <el-button icon="Refresh" @click="fetchData">刷新</el-button>
          </el-space>
        </div>
      </template>

      <!-- 统计概览 -->
      <el-row :gutter="16" class="stats-row">
        <el-col :span="6" v-for="stat in statsData" :key="stat.label">
          <el-card shadow="hover" :class="`stat-card ${stat.type}`">
            <div class="stat-value">{{ stat.value }}</div>
            <div class="stat-label">{{ stat.label }}</div>
          </el-card>
        </el-col>
      </el-row>

      <!-- 筛选区 -->
      <div class="filter-section">
        <el-row :gutter="16">
          <el-col :span="4">
            <el-select v-model="filters.status" placeholder="状态" clearable>
              <el-option label="待发送" value="pending" />
              <el-option label="已发送" value="sent" />
              <el-option label="发送失败" value="failed" />
              <el-option label="已取消" value="cancelled" />
            </el-select>
          </el-col>
          <el-col :span="4">
            <el-select v-model="filters.reminderType" placeholder="提醒类型" clearable>
              <el-option label="30天前" value="deadline_30" />
              <el-option label="15天前" value="deadline_15" />
              <el-option label="7天前" value="deadline_7" />
              <el-option label="3天前" value="deadline_3" />
              <el-option label="1天前" value="deadline_1" />
            </el-select>
          </el-col>
          <el-col :span="6">
            <el-date-picker
              v-model="dateRange"
              type="daterange"
              range-separator="-"
              start-placeholder="开始日期"
              end-placeholder="结束日期"
              format="YYYY-MM-DD"
              value-format="YYYY-MM-DD"
            />
          </el-col>
          <el-col :span="6">
            <el-button type="primary" icon="Search" @click="handleSearch">筛选</el-button>
            <el-button icon="Refresh" @click="resetFilters">重置</el-button>
          </el-col>
        </el-row>
      </div>

      <!-- 数据表格 -->
      <el-table v-loading="loading" :data="tableData" stripe>
        <el-table-column label="政策信息" min-width="220">
          <template #default="{ row }">
            <div>
              <el-link type="primary" @click="$router.push(`/policies/${row.policy.id}/detail`)">
                {{ row.policy?.policyName }}
              </el-link>
              <div style="font-size: 12px; color: #999; margin-top: 4px;">
                截止: {{ formatDate(row.policy?.deadline) }}
              </div>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="目标企业" width="180">
          <template #default="{ row }">
            <el-link @click="$router.push(`/enterprises/${row.enterprise.id}`)">
              {{ row.enterprise?.enterpriseName }}
            </el-link>
          </template>
        </el-table-column>

        <el-table-column label="提醒类型" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="getReminderTypeTag(row.reminderType)" size="small">
              {{ getReminderTypeText(row.reminderType) }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="scheduledTime" label="计划时间" width="160">
          <template #default="{ row }">
            {{ formatDateTime(row.scheduledTime) }}
          </template>
        </el-table-column>

        <el-table-column label="状态" width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)" size="small" effect="dark">
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="渠道" width="80" align="center">
          <template #default="{ row }">
            <el-icon v-if="row.channel === 'feishu' || row.channel === 'both'" color="#1890ff"><ChatDotRound /></el-icon>
            <el-icon v-if="row.channel === 'wechat' || row.channel === 'both'" color="#07c160" style="margin-left: 4px;"><ChatLineSquare /></el-icon>
            <span v-if="row.channel === 'none'" style="color: #999;">-</span>
          </template>
        </el-table-column>

        <el-table-column prop="sentTime" label="实际发送" width="160">
          <template #default="{ row }">
            {{ row.sentTime ? formatDateTime(row.sentTime) : '-' }}
          </template>
        </el-table-column>

        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button 
              v-if="row.status === 'pending'" 
              link type="warning" 
              size="small"
              @click="handleManualSend(row)"
            >
              立即发送
            </el-button>
            <el-button 
              v-if="row.status === 'pending'" 
              link type="danger" 
              size="small"
              @click="handleCancel(row)"
            >
              取消
            </el-button>
            <el-popconfirm title="确定删除该提醒记录？" @confirm="handleDelete(row)">
              <template #reference>
                <el-button link type="info" size="small">删除</el-button>
              </template>
            </el-popconfirm>
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
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { reminderApi } from '@/api'
import { ElMessage, ElMessageBox } from 'element-plus'

const loading = ref(false)
const tableData = ref([])
const dateRange = ref(null)

const statsData = ref([
  { label: '总提醒数', value: 0, type: 'primary' },
  { label: '待发送', value: 0, type: 'warning' },
  { label: '已发送', value: 0, type: 'success' },
  { label: '发送失败', value: 0, type: 'danger' }
])

const filters = reactive({
  status: '',
  reminderType: ''
})

const pagination = reactive({
  page: 1,
  limit: 20,
  total: 0
})

onMounted(async () => {
  await Promise.all([fetchData(), fetchStatistics()])
})

async function fetchData() {
  loading.value = true
  
  try {
    const params = { ...filters, page: pagination.page, limit: pagination.limit }
    
    if (dateRange.value?.length === 2) {
      params.startDate = dateRange.value[0]
      params.endDate = dateRange.value[1]
    }

    const res = await reminderApi.getList(params)
    tableData.value = res.data || []
    pagination.total = res.total || 0
  } catch (error) {
    console.error('获取提醒列表失败:', error)
  } finally {
    loading.value = false
  }
}

async function fetchStatistics() {
  try {
    const res = await reminderApi.getStatistics()
    if (res.data) {
      statsData.value[0].value = res.data.total || 0
      statsData.value[1].value = res.data.pending || 0
      statsData.value[2].value = res.data.sent || 0
      statsData.value[3].value = res.data.failed || 0
    }
  } catch (error) {
    console.error('获取统计失败:', error)
  }
}

function handleSearch() {
  pagination.page = 1
  fetchData()
}

function resetFilters() {
  Object.assign(filters, { status: '', reminderType: '' })
  dateRange.value = null
  handleSearch()
}

async function handleManualSend(row) {
  try {
    await ElMessageBox.confirm('确定立即发送该提醒？', '确认操作')
    await reminderApi.manualSend(row.id)
    ElMessage.success('已手动发送')
    fetchData()
    fetchStatistics()
  } catch (error) {
    if (error !== 'cancel') console.error('手动发送失败:', error)
  }
}

async function handleCancel(row) {
  try {
    await reminderApi.cancel(row.id)
    ElMessage.success('已取消提醒')
    fetchData()
    fetchStatistics()
  } catch (error) {
    console.error('取消失败:', error)
  }
}

function formatDate(date) {
  return date ? new Date(date).toLocaleDateString('zh-CN') : '-'
}

function formatDateTime(date) {
  return date ? new Date(date).toLocaleString('zh-CN') : '-'
}

function getReminderTypeText(type) {
  const map = {
    deadline_30: '30天',
    deadline_15: '15天',
    deadline_7: '7天',
    deadline_3: '3天',
    deadline_1: '1天'
  }
  return map[type] || type
}

function getReminderTypeTag(type) {
  const map = {
    deadline_30: 'info',
    deadline_15: '',
    deadline_7: 'warning',
    deadline_3: 'danger',
    deadline_1: 'danger'
  }
  return map[type] || ''
}

function getStatusType(status) {
  const map = { pending: 'warning', sent: 'success', failed: 'danger', cancelled: 'info' }
  return map[status] || 'info'
}

function getStatusText(status) {
  const map = { pending: '待发送', sent: '已发送', failed: '失败', cancelled: '已取消' }
  return map[status] || status
}
</script>

<style lang="scss" scoped>
.reminder-list {
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .stats-row {
    margin-bottom: 20px;

    .stat-card {
      text-align: center;
      
      &.primary { border-left: 4px solid #1890ff; }
      &.warning { border-left: 4px solid #faad14; }
      &.success { border-left: 4px solid #52c41a; }
      &.danger { border-left: 4px solid #f5222d; }

      .stat-value {
        font-size: 28px;
        font-weight: bold;
        color: #333;
      }

      .stat-label {
        font-size: 13px;
        color: #999;
        margin-top: 4px;
      }
    }
  }

  .filter-section {
    margin-bottom: 20px;
  }

  .pagination-wrapper {
    margin-top: 20px;
    display: flex;
    justify-content: flex-end;
  }
}
</style>
