<template>
  <div class="policy-list">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>政策库</span>
          <el-button type="primary" @click="$router.push('/policies/upload')">
            <el-icon><Plus /></el-icon>上传政策
          </el-button>
        </div>
      </template>

      <!-- 搜索筛选区 -->
      <div class="filter-section">
        <el-row :gutter="16">
          <el-col :span="6">
            <el-input 
              v-model="queryParams.keyword" 
              placeholder="搜索政策名称/条件" 
              clearable
              prefix-icon="Search"
              @keyup.enter="handleSearch"
            />
          </el-col>
          <el-col :span="4">
            <el-select v-model="queryParams.status" placeholder="状态" clearable>
              <el-option label="已发布" value="published" />
              <el-option label="待审核" value="pending_review" />
              <el-option label="草稿" value="draft" />
            </el-select>
          </el-col>
          <el-col :span="4">
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
            <el-button type="primary" icon="Search" @click="handleSearch">搜索</el-button>
            <el-button icon="Refresh" @click="resetQuery">重置</el-button>
          </el-col>
        </el-row>
      </div>

      <!-- 数据表格 -->
      <el-table 
        v-loading="loading" 
        :data="tableData" 
        stripe
        @sort-change="handleSortChange"
      >
        <el-table-column prop="policyName" label="政策名称" min-width="250" show-overflow-tooltip>
          <template #default="{ row }">
            <el-link type="primary" @click="$router.push(`/policies/${row.id}/detail`)">
              {{ row.policyName }}
            </el-link>
          </template>
        </el-table-column>
        
        <el-table-column prop="publishOrg" label="发布机构" width="150" show-overflow-tooltip />
        
        <el-table-column prop="deadline" label="截止日期" width="120" sortable="custom">
          <template #default="{ row }">
            <span v-if="row.deadline" :class="getDeadlineClass(row.deadline)">
              {{ formatDate(row.deadline) }}
            </span>
            <span v-else>-</span>
          </template>
        </el-table-column>

        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)" size="small">
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="extractStatus" label="提取状态" width="100">
          <template #default="{ row }">
            <el-tag 
              :type="row.extractStatus === 'success' ? 'success' : row.extractStatus === 'failed' ? 'danger' : 'warning'" 
              size="small"
            >
              {{ getExtractStatusText(row.extractStatus) }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="viewCount" label="浏览量" width="80" align="center" />

        <el-table-column prop="createdAt" label="创建时间" width="160" sortable="custom">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>

        <el-table-column label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="$router.push(`/policies/${row.id}/detail`)">
              查看
            </el-button>
            <el-button 
              v-if="row.status === 'pending_review' || row.status === 'draft'"
              link type="warning" 
              size="small" 
              @click="$router.push(`/policies/${row.id}/edit`)"
            >
              编辑
            </el-button>
            <el-button 
              v-if="row.status === 'pending_review'"
              link type="success" 
              size="small" 
              @click="handlePublish(row)"
            >
              发布
            </el-button>
            <el-popconfirm title="确定删除该政策吗？" @confirm="handleDelete(row)">
              <template #reference>
                <el-button link type="danger" size="small">删除</el-button>
              </template>
            </el-popconfirm>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.limit"
          :total="pagination.total"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="fetchData"
          @current-change="fetchData"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { policyApi } from '@/api'
import { ElMessage, ElMessageBox } from 'element-plus'

const loading = ref(false)
const tableData = ref([])
const dateRange = ref(null)

const queryParams = reactive({
  keyword: '',
  status: '',
  startDate: '',
  endDate: ''
})

const pagination = reactive({
  page: 1,
  limit: 20,
  total: 0
})

onMounted(() => {
  fetchData()
})

async function fetchData() {
  loading.value = true
  
  try {
    if (dateRange.value && dateRange.value.length === 2) {
      queryParams.startDate = dateRange.value[0]
      queryParams.endDate = dateRange.value[1]
    }

    const res = await policyApi.getList({
      ...queryParams,
      page: pagination.page,
      limit: pagination.limit
    })

    tableData.value = res.data || []
    pagination.total = res.total || 0
  } catch (error) {
    console.error('获取政策列表失败:', error)
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  pagination.page = 1
  fetchData()
}

function resetQuery() {
  Object.assign(queryParams, { keyword: '', status: '', startDate: '', endDate: '' })
  dateRange.value = null
  handleSearch()
}

function handleSortChange({ prop, order }) {
  queryParams.sortBy = prop
  queryParams.sortOrder = order === 'ascending' ? 'ASC' : 'DESC'
  fetchData()
}

async function handlePublish(row) {
  try {
    await ElMessageBox.confirm(`确定发布政策「${row.policyName}」吗？`, '确认发布', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'info'
    })

    await policyApi.publish(row.id)
    ElMessage.success('发布成功')
    fetchData()
  } catch (error) {
    if (error !== 'cancel') console.error('发布失败:', error)
  }
}

async function handleDelete(row) {
  try {
    await policyApi.delete(row.id)
    ElMessage.success('删除成功')
    fetchData()
  } catch (error) {
    console.error('删除失败:', error)
  }
}

function formatDate(date) {
  return date ? new Date(date).toLocaleDateString('zh-CN') : '-'
}

function getDeadlineClass(deadline) {
  const days = Math.ceil((new Date(deadline) - new Date()) / (1000 * 60 * 60 * 24))
  if (days <= 3) return 'deadline-danger'
  if (days <= 7) return 'deadline-warning'
  return ''
}

function getStatusType(status) {
  const map = { published: 'success', pending_review: 'warning', draft: 'info' }
  return map[status] || 'info'
}

function getStatusText(status) {
  const map = { published: '已发布', pending_review: '待审核', draft: '草稿' }
  return map[status] || status
}

function getExtractStatusText(status) {
  const map = { success: '成功', failed: '失败', extracting: '提取中', manual: '人工' }
  return map[status] || status
}
</script>

<style lang="scss" scoped>
.policy-list {
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .filter-section {
    margin-bottom: 20px;
  }

  .pagination-wrapper {
    margin-top: 20px;
    display: flex;
    justify-content: flex-end;
  }

  .deadline-danger {
    color: #f5222d;
    font-weight: bold;
  }

  .deadline-warning {
    color: #faad14;
    font-weight: bold;
  }
}
</style>
