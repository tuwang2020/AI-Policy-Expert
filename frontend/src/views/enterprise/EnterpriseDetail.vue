<template>
  <div class="enterprise-detail" v-loading="loading">
    <el-card v-if="enterprise">
      <!-- 头部信息 -->
      <div class="detail-header">
        <div class="header-left">
          <el-button @click="$router.back()" :icon="ArrowLeft">返回</el-button>
          <el-tag :type="getStatusType(enterprise.status)" size="large">{{ getStatusText(enterprise.status) }}</el-tag>
        </div>
        
        <div class="header-right">
          <el-button type="primary" @click="showEditDialog = true">
            <el-icon><Edit /></el-icon>编辑信息
          </el-button>
          <el-button 
            type="success" 
            @click="handleMatch"
            :disabled="!enterprise.id"
          >
            <el-icon><Connection /></el-icon>执行匹配
          </el-button>
        </div>
      </div>

      <!-- 基本信息 -->
      <h2 class="detail-title">{{ enterprise.enterpriseName }}</h2>
      
      <el-descriptions :column="3" border class="info-section">
        <el-descriptions-item label="统一社会信用代码">
          {{ enterprise.unifiedSocialCreditCode }}
        </el-descriptions-item>
        <el-descriptions-item label="企业规模">
          <el-tag>{{ getScaleText(enterprise.enterpriseScale) }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="成立日期">
          {{ formatDate(enterprise.establishmentDate) }} ({{ enterprise.establishmentYears || 0 }}年)
        </el-descriptions-item>
        <el-descriptions-item label="注册资本">
          {{ enterprise.registeredCapital ? `${enterprise.registeredCapital}万元` : '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="员工人数">
          {{ enterprise.employeeCount || '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="研发投入占比">
          {{ enterprise.rdInvestmentRatio ? `${enterprise.rdInvestmentRatio}%` : '-' }}
        </el-descriptions-item>
      </el-descriptions>

      <!-- 行业与资质 -->
      <h3 class="section-title">行业与资质信息</h3>
      <el-descriptions :column="2" border>
        <el-descriptions-item label="行业分类(一级)">
          {{ enterprise.industryCategory || '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="行业分类(二级)">
          {{ enterprise.industrySubcategory || '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="资质标签" :span="2">
          <div class="tag-group">
            <el-tag 
              v-for="(qual, index) in qualificationsList" 
              :key="index" 
              type="success"
              style="margin-right: 8px; margin-bottom: 4px;"
            >
              {{ qual }}
            </el-tag>
            <span v-if="!qualificationsList.length">暂无资质标签</span>
          </div>
        </el-descriptions-item>
        <el-descriptions-item label="专利数量">
          {{ enterprise.patentCount || 0 }}
        </el-descriptions-item>
        <el-descriptions-item label="软件著作权数">
          {{ enterprise.softwareCopyrightCount || 0 }}
        </el-descriptions-item>
      </el-descriptions>

      <!-- 经营数据 -->
      <h3 class="section-title">经营数据</h3>
      <el-descriptions :column="2" border>
        <el-descriptions-item label="去年营收">
          {{ enterprise.revenueLastYear ? `${enterprise.revenueLastYear}万元` : '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="最后匹配时间">
          {{ formatDateTime(enterprise.lastMatchTime) || '从未匹配' }}
        </el-descriptions-item>
      </el-descriptions>

      <!-- 注册地址 -->
      <h3 class="section-title">注册地址</h3>
      <el-descriptions :column="1" border>
        <el-descriptions-item label="地址">
          {{ [enterprise.registeredProvince, enterprise.registeredCity, enterprise.registeredDistrict, enterprise.registeredAddress].filter(Boolean).join('') || '-' }}
        </el-descriptions-item>
      </el-descriptions>

      <!-- 联系方式 -->
      <h3 class="section-title">联系方式</h3>
      <el-descriptions :column="3" border>
        <el-descriptions-item label="法定代表人">
          {{ enterprise.legalRepresentative || '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="联系人">
          {{ enterprise.contactPerson || '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="联系电话">
          {{ enterprise.contactPhone || '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="联系邮箱">
          {{ enterprise.contactEmail || '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="飞书用户ID">
          {{ enterprise.feishuUserId || '未配置' }}
        </el-descriptions-item>
        <el-descriptions-item label="微信OpenID">
          {{ enterprise.wechatOpenId || '未配置' }}
        </el-descriptions-item>
      </el-descriptions>

      <!-- 匹配记录 -->
      <h3 class="section-title">最近匹配记录</h3>
      <el-table :data="matchHistory" stripe style="width: 100%" v-if="matchHistory.length">
        <el-table-column prop="policyName" label="政策名称" min-width="200" />
        <el-table-column prop="totalScore" label="总评分" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="getScoreType(row.totalScore)">{{ row.totalScore }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="isMatched" label="是否匹配" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="row.isMatched ? 'success' : 'info'">
              {{ row.isMatched ? '是' : '否' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="reviewStatus" label="审核状态" width="120" align="center">
          <template #default="{ row }">
            <el-tag :type="getReviewStatusType(row.reviewStatus)">
              {{ getReviewStatusText(row.reviewStatus) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="匹配时间" width="180" align="center">
          <template #default="{ row }">
            {{ formatDateTime(row.createdAt) }}
          </template>
        </el-table-column>
      </el-table>
      <el-empty v-else description="暂无匹配记录" />

      <!-- 备注 -->
      <h3 class="section-title">备注</h3>
      <p class="remark-text">{{ enterprise.remark || '暂无备注' }}</p>
    </el-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { ArrowLeft, Edit, Connection } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import dayjs from 'dayjs'
import request from '@/utils/request'

const route = useRoute()

const loading = ref(false)
const enterprise = ref(null)
const matchHistory = ref([])

const qualificationsList = computed(() => {
  if (!enterprise.value?.qualifications) return []
  try {
    return typeof enterprise.value.qualifications === 'string' 
      ? JSON.parse(enterprise.value.qualifications)
      : enterprise.value.qualifications
  } catch {
    return []
  }
})

onMounted(async () => {
  if (route.params.id) {
    await fetchEnterpriseDetail()
    await fetchMatchHistory()
  }
})

const fetchEnterpriseDetail = async () => {
  loading.value = true
  try {
    const res = await request.get(`/enterprises/${route.params.id}`)
    console.log(res)
    if (res.success) {
      enterprise.value = res.data
    } else {
      console.log(res.data)
      ElMessage.error(res.message || '获取企业详情失败')
    }
  } catch (error) {
    console.error('获取企业详情失败:', error)
    ElMessage.error('获取企业详情失败')
  } finally {
    loading.value = false
  }
}

const fetchMatchHistory = async () => {
  try {
    const res = await request.get('/matches/results', {
      params: { enterpriseId: route.params.id, limit: 10 }
    })
    if (res.data.success) {
      matchHistory.value = res.data.data.results || []
    }
  } catch (error) {
    console.error('获取匹配记录失败:', error)
  }
}

const handleMatch = async () => {
  try {
    ElMessage.info('请在匹配中心执行匹配操作')
  } catch (error) {
    console.error(error)
  }
}

const formatDate = (date) => {
  if (!date) return '-'
  return dayjs(date).format('YYYY-MM-DD')
}

const formatDateTime = (dateTime) => {
  if (!dateTime) return '-'
  return dayjs(dateTime).format('YYYY-MM-DD HH:mm:ss')
}

const getStatusType = (status) => {
  const map = { active: 'success', inactive: 'warning', graduated: 'info' }
  return map[status] || 'info'
}

const getStatusText = (status) => {
  const map = { active: '在孵', inactive: '退出', graduated: '毕业' }
  return map[status] || status
}

const getScaleText = (scale) => {
  const map = { micro: '微型', small: '小型', medium: '中型', large: '大型' }
  return map[scale] || scale
}

const getScoreType = (score) => {
  if (score >= 80) return 'success'
  if (score >= 60) return 'warning'
  return 'danger'
}

const getReviewStatusType = (status) => {
  const map = { pending: 'info', approved: 'success', rejected: 'danger', adjusted: 'warning' }
  return map[status] || 'info'
}

const getReviewStatusText = (status) => {
  const map = { pending: '待审核', approved: '已通过', rejected: '已拒绝', adjusted: '已调整' }
  return map[status] || status
}
</script>

<style scoped>
.enterprise-detail {
  padding: 20px;
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.header-left {
  display: flex;
  gap: 12px;
  align-items: center;
}

.header-right {
  display: flex;
  gap: 8px;
}

.detail-title {
  font-size: 22px;
  font-weight: 600;
  color: #303133;
  margin: 20px 0 24px;
}

.section-title {
  margin: 28px 0 16px;
  padding-left: 10px;
  border-left: 4px solid #409eff;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.info-section {
  margin-bottom: 16px;
}

.tag-group {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.remark-text {
  color: #606266;
  line-height: 1.6;
  padding: 12px;
  background: #f5f7fa;
  border-radius: 4px;
}
</style>
