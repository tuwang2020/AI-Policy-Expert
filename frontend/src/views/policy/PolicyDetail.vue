<template>
  <div class="policy-detail" v-loading="loading">
    <el-card v-if="policy">
      <!-- 头部信息 -->
      <div class="detail-header">
        <div class="header-left">
          <el-button @click="$router.back()" :icon="ArrowLeft">返回</el-button>
          <el-tag :type="getStatusType(policy.status)" size="large">{{ getStatusText(policy.status) }}</el-tag>
        </div>
        
        <div class="header-right">
          <el-button v-if="policy.filePath" @click="handleDownload">
            <el-icon><Download /></el-icon>下载原文
          </el-button>
          <el-button 
            v-if="policy.status === 'pending_review'" 
            type="primary"
            @click="$router.push(`/policies/${policy.id}/edit`)"
          >
            编辑政策
          </el-button>
          <el-button 
            v-if="policy.status === 'published'"
            type="success"
            @click="handleMatch"
          >
            <el-icon><Connection /></el-icon>开始匹配
          </el-button>
        </div>
      </div>

      <!-- 基本信息 -->
      <h2 class="policy-title">{{ policy.policyName }}</h2>
      
      <el-descriptions :column="3" border class="info-section">
        <el-descriptions-item label="政策文号">{{ policy.policyNumber || '-' }}</el-descriptions-item>
        <el-descriptions-item label="发布机构">{{ policy.publishOrg }}</el-descriptions-item>
        <el-descriptions-item label="发布日期">{{ formatDate(policy.publishDate) }}</el-descriptions-item>
        <el-descriptions-item label="生效日期">{{ formatDate(policy.effectiveDate) }}</el-descriptions-item>
        <el-descriptions-item label="截止日期">
          <span v-if="policy.deadline" :class="getDeadlineClass(policy.deadline)">
            {{ formatDateTime(policy.deadline) }}
            <el-tag v-if="getDaysLeft(policy.deadline) <= 30" size="small" type="danger" style="margin-left: 8px;">
              剩余 {{ getDaysLeft(policy.deadline) }} 天
            </el-tag>
          </span>
          <span v-else>-</span>
        </el-descriptions-item>
        <el-descriptions-item label="当前版本">V{{ policy.version }}</el-descriptions-item>
      </el-descriptions>

      <!-- 申报条件 -->
      <el-divider content-position="left"><el-icon><List /></el-icon> 申报对象条件</el-divider>
      <div class="content-block">
        {{ policy.eligibility || '暂无信息' }}
      </div>

      <!-- 补贴内容 -->
      <el-divider content-position="left"><el-icon><Money /></el-icon> 补贴/支持内容</el-divider>
      <div class="content-block highlight">
        {{ policy.subsidyContent || '暂无信息' }}
      </div>

      <!-- 申报材料 -->
      <el-divider content-position="left"><el-icon><Document /></el-icon> 申报材料清单</el-divider>
      <div class="content-block">
        <el-table 
          v-if="policy.materialsList?.length > 0" 
          :data="formatMaterials(policy.materialsList)" 
          border
          size="small"
          style="max-width: 600px;"
        >
          <el-table-column prop="index" label="#" width="50" align="center" />
          <el-table-column prop="name" label="材料名称" />
        </el-table>
        <el-empty v-else description="暂无材料清单" />
      </div>

      <!-- 联系方式 -->
      <el-divider content-position="left"><el-icon><Phone /></el-icon> 联系方式</el-divider>
      <el-descriptions :column="2" border v-if="policy.contactInfo">
        <el-descriptions-item label="联系部门">{{ policy.contactInfo.department || '-' }}</el-descriptions-item>
        <el-descriptions-item label="联系电话">{{ policy.contactInfo.phone || '-' }}</el-descriptions-item>
        <el-descriptions-item label="联系邮箱">{{ policy.contactInfo.email || '-' }}</el-descriptions-item>
        <el-descriptions-item label="办公地址">{{ policy.contactInfo.address || '-' }}</el-descriptions-item>
      </el-descriptions>

      <!-- 适用范围 -->
      <el-row :gutter="20" style="margin-top: 20px;">
        <el-col :span="12">
          <el-card shadow="never">
            <template #header>适用行业</template>
            <div class="scope-tags">
              <el-tag 
                v-for="(industry, index) in (policy.industryScope || [])" 
                :key="index"
                effect="plain"
              >
                {{ industry }}
              </el-tag>
              <el-empty v-if="!policy.industryScope?.length" description="未指定" :image-size="60" />
            </div>
          </el-card>
        </el-col>
        <el-col :span="12">
          <el-card shadow="never">
            <template #header>适用地域</template>
            <div class="scope-tags">
              <el-tag 
                v-for="(region, index) in (policy.regionScope || [])" 
                :key="index"
                type="success"
                effect="plain"
              >
                {{ region }}
              </el-tag>
              <el-empty v-if="!policy.regionScope?.length" description="未指定" :image-size="60" />
            </div>
          </el-card>
        </el-col>
      </el-row>

      <!-- 版本历史 -->
      <el-divider content-position="left"><el-icon><Clock /></el-icon> 版本历史</el-divider>
      <el-timeline v-if="policy.versions?.length > 0">
        <el-timeline-item
          v-for="version in policy.versions"
          :key="version.id"
          :timestamp="formatDateTime(version.createdAt)"
          placement="top"
        >
          <el-card>
            <div class="version-info">
              <strong>V{{ version.versionNumber }}</strong>
              <el-tag v-if="version.changeType" :type="version.changeType === 'major' ? 'danger' : 'warning'" size="small">
                {{ version.changeType === 'major' ? '重大变更' : version.changeType === 'minor' ? '轻微变更' : '修订' }}
              </el-tag>
            </div>
            <p>{{ version.remark || '版本更新' }}</p>
            <el-button 
              v-if="policy.versions.length > 1 && version.versionNumber < policy.version"
              link 
              type="primary" 
              size="small"
              @click="$router.push(`/policies/${policy.id}/compare?v1=${version.versionNumber}&v2=${policy.version}`)"
            >
              与当前版本对比
            </el-button>
          </el-card>
        </el-timeline-item>
      </el-timeline>

      <!-- 统计信息 -->
      <div class="detail-footer">
        <el-space>
          <span><el-icon><View /></el-icon> 浏览量: {{ policy.viewCount || 0 }}</span>
          <span><el-icon><Clock /></el-icon> 创建时间: {{ formatDateTime(policy.createdAt) }}</span>
          <span><el-icon><EditPen /></el-icon> 更新时间: {{ formatDateTime(policy.updatedAt) }}</span>
        </el-space>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { policyApi, matchApi } from '@/api'
import { ElMessage } from 'element-plus'

const route = useRoute()
const router = useRouter()

const loading = ref(false)
const policy = ref(null)

onMounted(() => {
  fetchPolicy()
})

async function fetchPolicy() {
  loading.value = true
  
  try {
    const res = await policyApi.getById(route.params.id)
    policy.value = res.data
  } catch (error) {
    console.error('获取政策详情失败:', error)
  } finally {
    loading.value = false
  }
}

function handleDownload() {
  window.open(`/api/policies/${route.params.id}/download`, '_blank')
}

async function handleMatch() {
  try {
    const res = await matchApi.matchPolicy(route.params.id)
    
    ElMessage.success(`匹配完成！共匹配 ${res.data.matchedCount} 家企业`)
    router.push('/matches')
  } catch (error) {
    console.error('匹配失败:', error)
  }
}

function getDaysLeft(deadline) {
  if (!deadline) return Infinity
  return Math.ceil((new Date(deadline) - new Date()) / (1000 * 60 * 60 * 24))
}

function formatDate(date) {
  return date ? new Date(date).toLocaleDateString('zh-CN') : '-'
}

function formatDateTime(date) {
  return date ? new Date(date).toLocaleString('zh-CN') : '-'
}

function getDeadlineClass(deadline) {
  const days = getDaysLeft(deadline)
  if (days <= 7) return 'deadline-danger'
  if (days <= 30) return 'deadline-warning'
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

function formatMaterials(materials) {
  return (materials || []).map((item, index) => ({ index: index + 1, name: item }))
}
</script>

<style lang="scss" scoped>
.policy-detail {
  .detail-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;

    .header-left {
      display: flex;
      gap: 10px;
      align-items: center;
    }

    .header-right {
      display: flex;
      gap: 10px;
    }
  }

  .policy-title {
    font-size: 24px;
    color: #333;
    margin-bottom: 20px;
  }

  .info-section {
    margin-bottom: 20px;
  }

  .content-block {
    padding: 16px;
    background: #fafafa;
    border-radius: 8px;
    line-height: 1.8;
    color: #555;

    &.highlight {
      background: #fff7e6;
      border: 1px solid #ffd591;
    }
  }

  .scope-tags {
    min-height: 80px;

    .el-tag {
      margin: 4px;
    }
  }

  .version-info {
    display: flex;
    gap: 10px;
    align-items: center;
    margin-bottom: 8px;
  }

  .detail-footer {
    margin-top: 30px;
    padding-top: 20px;
    border-top: 1px solid #eee;
    color: #999;
    font-size: 13px;

    span {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      margin-right: 24px;
    }
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
