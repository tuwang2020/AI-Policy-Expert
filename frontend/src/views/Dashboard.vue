<template>
  <div class="dashboard">
    <el-row :gutter="20" class="stat-cards">
      <el-col :xs="24" :sm="12" :md="6" v-for="stat in statsData" :key="stat.title">
        <el-card shadow="hover" class="stat-card" :class="stat.type">
          <div class="stat-icon">
            <el-icon :size="32"><component :is="stat.icon" /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ stat.value }}</div>
            <div class="stat-title">{{ stat.title }}</div>
          </div>
          <div class="stat-trend" :class="stat.trend > 0 ? 'up' : 'down'">
            <el-icon><Top v-if="stat.trend > 0" /><Bottom v-else /></el-icon>
            {{ Math.abs(stat.trend) }}%
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" class="content-row">
      <el-col :span="16">
        <el-card class="chart-card">
          <template #header>
            <div class="card-header">
              <span>政策发布趋势</span>
              <el-radio-group v-model="chartPeriod" size="small">
                <el-radio-button label="week">近7天</el-radio-button>
                <el-radio-button label="month">近30天</el-radio-button>
                <el-radio-button label="year">近一年</el-radio-button>
              </el-radio-group>
            </div>
          </template>
          <div ref="trendChartRef" class="chart-container"></div>
        </el-card>
      </el-col>

      <el-col :span="8">
        <el-card class="chart-card">
          <template #header>
            <span>企业行业分布</span>
          </template>
          <div ref="industryChartRef" class="chart-container"></div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" class="content-row">
      <el-col :span="12">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>最近上传的政策</span>
              <el-button type="text" @click="$router.push('/policies')">查看全部</el-button>
            </div>
          </template>
          <el-table :data="recentPolicies" size="small">
            <el-table-column prop="policyName" label="政策名称" show-overflow-tooltip />
            <el-table-column prop="publishOrg" label="发布机构" width="150" />
            <el-table-column prop="status" label="状态" width="100">
              <template #default="{ row }">
                <el-tag :type="getStatusType(row.status)" size="small">
                  {{ getStatusText(row.status) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="createdAt" label="时间" width="160">
              <template #default="{ row }">
                {{ formatDate(row.createdAt) }}
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>

      <el-col :span="12">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>即将到期的提醒</span>
              <el-button type="text" @click="$router.push('/reminders')">查看全部</el-button>
            </div>
          </template>
          <el-table :data="upcomingReminders" size="small">
            <el-table-column prop="policyName" label="政策名称" show-overflow-tooltip />
            <el-table-column prop="enterpriseName" label="企业" width="120" />
            <el-table-column prop="daysLeft" label="剩余天数" width="90" align="center">
              <template #default="{ row }">
                <el-tag 
                  :type="row.daysLeft <= 3 ? 'danger' : row.daysLeft <= 7 ? 'warning' : 'info'" 
                  size="small"
                >
                  {{ row.daysLeft }}天
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="scheduledTime" label="提醒时间" width="160">
              <template #default="{ row }">
                {{ formatDate(row.scheduledTime) }}
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import * as echarts from 'echarts'
import { policyApi, reminderApi, enterpriseApi } from '@/api'

const trendChartRef = ref(null)
const industryChartRef = ref(null)
const chartPeriod = ref('month')

const statsData = ref([
  { title: '政策总数', value: 128, icon: 'Document', type: 'primary', trend: 12.5 },
  { title: '在孵企业', value: 56, icon: 'OfficeBuilding', type: 'success', trend: 8.3 },
  { title: '今日匹配', value: 23, icon: 'Connection', type: 'warning', trend: -2.1 },
  { title: '待发送提醒', value: 15, icon: 'Bell', type: 'danger', trend: 25.0 }
])

const recentPolicies = ref([])
const upcomingReminders = ref([])

let trendChart = null
let industryChart = null

onMounted(async () => {
  initCharts()
  await fetchData()
})

watch(chartPeriod, () => {
  updateTrendChart()
})

async function fetchData() {
  try {
    const [policyRes, reminderRes] = await Promise.all([
      policyApi.getList({ limit: 5 }),
      reminderApi.getList({ status: 'pending', limit: 5 })
    ])
    
    recentPolicies.value = policyRes.data || []
    upcomingReminders.value = reminderRes.data || []
  } catch (error) {
    console.error('获取数据失败:', error)
  }
}

function initCharts() {
  if (trendChartRef.value) {
    trendChart = echarts.init(trendChartRef.value)
    updateTrendChart()
  }

  if (industryChartRef.value) {
    industryChart = echarts.init(industryChartRef.value)
    updateIndustryChart()
  }

  window.addEventListener('resize', () => {
    trendChart?.resize()
    industryChart?.resize()
  })
}

function updateTrendChart() {
  const option = {
    tooltip: { trigger: 'axis' },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
    },
    yAxis: { type: 'value' },
    series: [{
      name: '新增政策',
      type: 'line',
      smooth: true,
      areaStyle: { opacity: 0.3 },
      data: [8, 12, 15, 10, 18, 9, 11],
      itemStyle: { color: '#1890ff' }
    }]
  }
  
  trendChart.setOption(option)
}

function updateIndustryChart() {
  const option = {
    tooltip: { trigger: 'item' },
    legend: { orient: 'vertical', right: '5%', top: 'center' },
    series: [{
      type: 'pie',
      radius: ['40%', '70%'],
      avoidLabelOverlap: false,
      itemStyle: { borderRadius: 10, borderColor: '#fff', borderWidth: 2 },
      label: { show: false },
      emphasis: { label: { show: true, fontSize: 14, fontWeight: 'bold' } },
      data: [
        { value: 35, name: '信息技术', itemStyle: { color: '#1890ff' } },
        { value: 28, name: '生物医药', itemStyle: { color: '#52c41a' } },
        { value: 22, name: '智能制造', itemStyle: { color: '#faad14' } },
        { value: 15, name: '新能源', itemStyle: { color: '#f5222d' } },
        { value: 10, name: '其他', itemStyle: { color: '#999' } }
      ]
    }]
  }
  
  industryChart.setOption(option)
}

function formatDate(date) {
  if (!date) return '-'
  return new Date(date).toLocaleString('zh-CN')
}

function getStatusType(status) {
  const map = { published: 'success', pending_review: 'warning', draft: 'info', archived: 'info' }
  return map[status] || 'info'
}

function getStatusText(status) {
  const map = { published: '已发布', pending_review: '待审核', draft: '草稿', archived: '已归档' }
  return map[status] || status
}
</script>

<style lang="scss" scoped>
.dashboard {
  .stat-cards {
    margin-bottom: 20px;

    .stat-card {
      position: relative;

      &.primary { border-left: 4px solid #1890ff; }
      &.success { border-left: 4px solid #52c41a; }
      &.warning { border-left: 4px solid #faad14; }
      &.danger { border-left: 4px solid #f5222d; }

      .stat-icon {
        position: absolute;
        top: 20px;
        right: 20px;
        opacity: 0.15;
        color: inherit;
      }

      .stat-value {
        font-size: 32px;
        font-weight: bold;
        color: #333;
      }

      .stat-title {
        font-size: 14px;
        color: #999;
        margin-top: 4px;
      }

      .stat-trend {
        position: absolute;
        bottom: 20px;
        right: 20px;
        font-size: 13px;
        
        &.up { color: #52c41a; }
        &.down { color: #f5222d; }
      }
    }
  }

  .content-row {
    margin-bottom: 20px;
  }

  .chart-card {
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .chart-container {
      height: 350px;
    }
  }
}
</style>
