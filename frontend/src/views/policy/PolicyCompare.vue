<template>
  <div class="policy-compare" v-loading="loading">
    <el-card v-if="compareResult">
      <template #header>
        <div class="card-header">
          <span>政策版本对比</span>
          <el-button @click="$router.back()" :icon="ArrowLeft">返回</el-button>
        </div>
      </template>

      <!-- 版本选择 -->
      <div class="version-selector">
        <el-space :size="40">
          <div class="version-box old-version">
            <div class="version-label">旧版本 V{{ compareResult.version1 }}</div>
          </div>
          
          <div class="vs-badge">VS</div>
          
          <div class="version-box new-version">
            <div class="version-label">新版本 V{{ compareResult.version2 }}</div>
          </div>
        </el-space>
      </div>

      <!-- 变更统计 -->
      <el-row :gutter="16" class="change-stats">
        <el-col :span="6">
          <div class="stat-card total">
            <div class="stat-num">{{ compareResult.summary?.totalChanges || 0 }}</div>
            <div class="stat-text">总变更数</div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="stat-card added">
            <div class="stat-num">{{ compareResult.summary?.added || 0 }}</div>
            <div class="stat-text">新增内容</div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="stat-card removed">
            <div class="stat-num">{{ compareResult.summary?.removed || 0 }}</div>
            <div class="stat-text">删除内容</div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="stat-card modified">
            <div class="stat-num">{{ compareResult.summary?.modified || 0 }}</div>
            <div class="stat-text">修改内容</div>
          </div>
        </el-col>
      </el-row>

      <!-- 高影响变更提示 -->
      <el-alert 
        v-if="compareResult.summary?.highImpact > 0"
        :title="`发现 ${compareResult.summary.highImpact} 处重大变更，请重点关注！`"
        type="error"
        :closable="false"
        show-icon
        style="margin-bottom: 20px;"
      />

      <!-- 变更详情列表 -->
      <div class="changes-detail">
        <h3>变更详情</h3>

        <el-timeline>
          <el-timeline-item
            v-for="(change, index) in compareResult.changes"
            :key="index"
            :timestamp="change.category"
            placement="top"
            :type="change.type === 'added' ? 'success' : change.type === 'removed' ? 'danger' : 'warning'"
            :size="change.impact === 'large' ? 'large' : 'normal'"
          >
            <el-card :class="`change-card ${change.type}`">
              <div class="change-header">
                <el-tag 
                  :type="change.type === 'added' ? 'success' : change.type === 'removed' ? 'danger' : 'warning'"
                  effect="dark"
                  size="small"
                >
                  {{ getTypeLabel(change.type) }}
                </el-tag>
                <el-tag 
                  :type="change.impact === 'high' ? 'danger' : change.impact === 'medium' ? 'warning' : 'info'"
                  size="small"
                >
                  {{ getImpactLabel(change.impact) }}影响
                </el-tag>
                <el-tag size="small" type="info">{{ getCategoryLabel(change.category) }}</el-tag>
              </div>

              <div class="change-content">
                <p class="main-content">{{ change.content }}</p>
                
                <div v-if="change.type === 'modified'" class="diff-content">
                  <div class="old-value">
                    <span class="label">旧值:</span>
                    <del>{{ change.oldValue }}</del>
                  </div>
                  <div class="new-value">
                    <span class="label">新值:</span>
                    <ins>{{ change.newValue }}</ins>
                  </div>
                </div>
              </div>
            </el-card>
          </el-timeline-item>
        </el-timeline>

        <el-empty v-if="!compareResult.changes?.length" description="两个版本之间没有差异" />
      </div>

      <!-- 操作按钮 -->
      <div class="action-buttons">
        <el-button type="primary" @click="$router.push(`/policies/${policyId}/detail`)">
          查看当前版本详情
        </el-button>
        <el-button @click="$router.push('/policies')">返回政策库</el-button>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { policyApi } from '@/api'

const route = useRoute()

const loading = ref(false)
const policyId = ref(route.params.id)
const compareResult = ref(null)

onMounted(() => {
  fetchComparison()
})

async function fetchComparison() {
  const v1 = route.query.v1
  const v2 = route.query.v2

  if (!v1 || !v2) {
    // 默认对比最新两个版本
    // 这里可以根据实际情况处理
    return
  }

  loading.value = true

  try {
    const res = await policyApi.compareVersions(policyId.value, parseInt(v1), parseInt(v2))
    compareResult.value = res.data
  } catch (error) {
    console.error('获取对比结果失败:', error)
  } finally {
    loading.value = false
  }
}

function getTypeLabel(type) {
  const map = { added: '新增', removed: '删除', modified: '修改' }
  return map[type] || type
}

function getImpactLabel(impact) {
  const map = { high: '高', medium: '中', low: '低' }
  return map[impact] || impact
}

function getCategoryLabel(category) {
  const map = {
    eligibility: '申报条件',
    subsidy: '补贴内容',
    materials: '材料清单',
    deadline: '截止日期',
    other: '其他'
  }
  return map[category] || category
}
</script>

<style lang="scss" scoped>
.policy-compare {
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .version-selector {
    text-align: center;
    margin: 30px 0;

    .version-box {
      display: inline-block;
      padding: 20px 40px;
      border-radius: 8px;
      min-width: 200px;

      &.old-version {
        background: linear-gradient(135deg, #ff6b6b 0%, #ee5a52 100%);
        color: #fff;
      }

      &.new-version {
        background: linear-gradient(135deg, #51cf66 0%, #37b24d 100%);
        color: #fff;
      }

      .version-label {
        font-size: 18px;
        font-weight: bold;
      }
    }

    .vs-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 50px;
      height: 50px;
      border-radius: 50%;
      background: #333;
      color: #fff;
      font-weight: bold;
      font-size: 16px;
    }
  }

  .change-stats {
    margin-bottom: 30px;

    .stat-card {
      text-align: center;
      padding: 20px;
      border-radius: 8px;

      &.total {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: #fff;
      }
      &.added {
        background: linear-gradient(135deg, #51cf66 0%, #37b24d 100%);
        color: #fff;
      }
      &.removed {
        background: linear-gradient(135deg, #ff6b6b 0%, #ee5a52 100%);
        color: #fff;
      }
      &.modified {
        background: linear-gradient(135deg, #fcc419 0%, #fab005 100%);
        color: #fff;
      }

      .stat-num {
        font-size: 36px;
        font-weight: bold;
      }

      .stat-text {
        font-size: 14px;
        opacity: 0.9;
        margin-top: 4px;
      }
    }
  }

  .changes-detail {
    h3 {
      margin-bottom: 20px;
      color: #333;
    }

    .change-card {
      &.added {
        border-left: 4px solid #52c41a;
      }
      &.removed {
        border-left: 4px solid #f5222d;
      }
      &.modified {
        border-left: 4px solid #faad14;
      }

      .change-header {
        display: flex;
        gap: 8px;
        margin-bottom: 12px;
      }

      .change-content {
        .main-content {
          margin: 0 0 12px;
          line-height: 1.6;
          color: #555;
        }

        .diff-content {
          background: #fafafa;
          padding: 12px;
          border-radius: 6px;

          .old-value, .new-value {
            margin: 6px 0;

            .label {
              font-weight: bold;
              margin-right: 8px;
              color: #999;
              font-size: 13px;
            }

            del {
              color: #f5222d;
              text-decoration: line-through;
              background: #fff1f0;
              padding: 2px 4px;
              border-radius: 2px;
            }

            ins {
              color: #52c41a;
              text-decoration: none;
              background: #f6ffed;
              padding: 2px 4px;
              border-radius: 2px;
            }
          }
        }
      }
    }
  }

  .action-buttons {
    text-align: center;
    margin-top: 40px;
    padding-top: 20px;
    border-top: 1px solid #eee;
  }
}
</style>
