<template>
  <div class="enterprise-list">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>企业管理</span>
          <div class="header-actions">
            <el-button @click="handleDownloadTemplate">
              <el-icon><Download /></el-icon>下载模板
            </el-button>
            <el-button type="success" @click="showImportDialog = true">
              <el-icon><Upload /></el-icon>批量导入
            </el-button>
            <el-button type="primary" @click="showAddDialog = true">
              <el-icon><Plus /></el-icon>添加企业
            </el-button>
          </div>
        </div>
      </template>

      <!-- 统计卡片 -->
      <el-row :gutter="16" class="stats-row">
        <el-col :span="6" v-for="stat in statsData" :key="stat.label">
          <div class="stat-item">
            <div class="stat-value">{{ stat.value }}</div>
            <div class="stat-label">{{ stat.label }}</div>
          </div>
        </el-col>
      </el-row>

      <!-- 搜索筛选 -->
      <div class="filter-section">
        <el-row :gutter="16">
          <el-col :span="6">
            <el-input v-model="queryParams.keyword" placeholder="搜索企业名称/信用代码" clearable prefix-icon="Search" @keyup.enter="fetchData" />
          </el-col>
          <el-col :span="4">
            <el-select v-model="queryParams.industryCategory" placeholder="行业分类" clearable>
              <el-option label="信息技术" value="信息技术" />
              <el-option label="生物医药" value="生物医药" />
              <el-option label="智能制造" value="智能制造" />
              <el-option label="新能源" value="新能源" />
              <el-option label="现代服务业" value="现代服务业" />
            </el-select>
          </el-col>
          <el-col :span="4">
            <el-select v-model="queryParams.enterpriseScale" placeholder="企业规模" clearable>
              <el-option label="微型" value="micro" />
              <el-option label="小型" value="small" />
              <el-option label="中型" value="medium" />
              <el-option label="大型" value="large" />
            </el-select>
          </el-col>
          <el-col :span="4">
            <el-select v-model="queryParams.status" placeholder="状态" clearable>
              <el-option label="在孵" value="active" />
              <el-option label="毕业" value="graduated" />
              <el-option label="退出" value="inactive" />
            </el-select>
          </el-col>
          <el-col :span="6">
            <el-button type="primary" icon="Search" @click="fetchData">搜索</el-button>
            <el-button icon="Refresh" @click="resetQuery">重置</el-button>
          </el-col>
        </el-row>
      </div>

      <!-- 数据表格 -->
      <el-table v-loading="loading" :data="tableData" stripe @row-click="handleRowClick">
        <el-table-column prop="enterpriseName" label="企业名称" min-width="200" show-overflow-tooltip>
          <template #default="{ row }">
            <el-link type="primary">{{ row.enterpriseName }}</el-link>
          </template>
        </el-table-column>
        
        <el-table-column prop="unifiedSocialCreditCode" label="统一社会信用代码" width="200" show-overflow-tooltip />
        
        <el-table-column prop="industryCategory" label="行业" width="120" />

        <el-table-column prop="enterpriseScale" label="规模" width="80">
          <template #default="{ row }">
            <el-tag size="small">{{ getScaleText(row.enterpriseScale) }}</el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="registeredCity" label="注册地" width="100" />

        <el-table-column label="资质" width="180" show-overflow-tooltip>
          <template #default="{ row }">
            <el-tag 
              v-for="(qual, idx) in (row.qualifications || []).slice(0, 2)" 
              :key="idx"
              size="small"
              effect="plain"
              style="margin: 2px;"
            >
              {{ qual }}
            </el-tag>
            <span v-if="(row.qualifications || []).length > 2">+{{ row.qualifications.length - 2 }}</span>
          </template>
        </el-table-column>

        <el-table-column prop="contactPerson" label="联系人" width="90" />

        <el-table-column prop="contactPhone" label="联系电话" width="120" />

        <el-table-column prop="status" label="状态" width="80">
          <template #default="{ row }">
            <el-tag :type="row.status === 'active' ? 'success' : 'info'" size="small">
              {{ row.status === 'active' ? '在孵' : row.status === 'graduated' ? '毕业' : '退出' }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click.stop="handleEdit(row)">编辑</el-button>
            <el-popconfirm title="确定删除该企业？" @confirm="handleDelete(row)">
              <template #reference>
                <el-button link type="danger" size="small" @click.stop>删除</el-button>
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

    <!-- 添加/编辑对话框 -->
    <el-dialog 
      v-model="showAddDialog" 
      :title="editingId ? '编辑企业' : '添加企业'" 
      width="800px"
      destroy-on-close
    >
      <el-form ref="formRef" :model="formData" :rules="formRules" label-width="120px">
        <el-tabs v-model="activeTab">
          <el-tab-pane label="基本信息" name="basic">
            <el-row :gutter="16">
              <el-col :span="12">
                <el-form-item label="企业名称" prop="enterpriseName">
                  <el-input v-model="formData.enterpriseName" placeholder="请输入企业全称" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="统一信用代码" prop="unifiedSocialCreditCode">
                  <el-input v-model="formData.unifiedSocialCreditCode" placeholder="18位统一社会信用代码" />
                </el-form-item>
              </el-col>
            </el-row>

            <el-row :gutter="16">
              <el-col :span="12">
                <el-form-item label="行业分类" prop="industryCategory">
                  <el-cascader 
                    v-model="industryPath"
                    :options="industryOptions"
                    clearable
                    style="width: 100%;"
                  />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="企业规模" prop="enterpriseScale">
                  <el-radio-group v-model="formData.enterpriseScale">
                    <el-radio value="micro">微型</el-radio>
                    <el-radio value="small">小型</el-radio>
                    <el-radio value="medium">中型</el-radio>
                    <el-radio value="large">大型</el-radio>
                  </el-radio-group>
                </el-form-item>
              </el-col>
            </el-row>

            <el-row :gutter="16">
              <el-col :span="12">
                <el-form-item label="注册资本(万)">
                  <el-input-number v-model="formData.registeredCapital" :min="0" style="width: 100%;" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="成立日期">
                  <el-date-picker v-model="formData.establishmentDate" type="date" value-format="YYYY-MM-DD" style="width: 100%;" />
                </el-form-item>
              </el-col>
            </el-row>

            <el-form-item label="注册地址">
              <el-input v-model="formData.registeredAddress" placeholder="详细地址" />
            </el-form-item>
          </el-tab-pane>

          <el-tab-pane label="联系方式" name="contact">
            <el-row :gutter="16">
              <el-col :span="12">
                <el-form-item label="法定代表人">
                  <el-input v-model="formData.legalRepresentative" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="联系人">
                  <el-input v-model="formData.contactPerson" />
                </el-form-item>
              </el-col>
            </el-row>

            <el-row :gutter="16">
              <el-col :span="12">
                <el-form-item label="联系电话">
                  <el-input v-model="formData.contactPhone" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="联系邮箱">
                  <el-input v-model="formData.contactEmail" />
                </el-form-item>
              </el-col>
            </el-row>

            <el-row :gutter="16">
              <el-col :span="12">
                <el-form-item label="飞书用户ID">
                  <el-input v-model="formData.feishuUserId" placeholder="用于飞书@提醒" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="微信OpenID">
                  <el-input v-model="formData.wechatOpenId" placeholder="用于微信模板消息" />
                </el-form-item>
              </el-col>
            </el-row>
          </el-tab-pane>

          <el-tab-pane label="资质标签" name="qualifications">
            <el-form-item label="已有资质">
              <el-select 
                v-model="formData.qualifications" 
                multiple 
                filterable 
                allow-create 
                default-first-option
                placeholder="选择或输入企业资质"
                style="width: 100%;"
              >
                <el-option label="高新技术企业" value="高新技术企业" />
                <el-option label="专精特新中小企业" value="专精特新中小企业" />
                <el-option label="科技型中小企业" value="科技型中小企业" />
                <el-option label="软件企业" value="软件企业" />
                <el-option label="瞪羚企业" value="瞪羚企业" />
                <el-option label="独角兽企业" value="独角兽企业" />
              </el-select>
            </el-form-item>

            <el-row :gutter="16">
              <el-col :span="8">
                <el-form-item label="去年营收(万)">
                  <el-input-number v-model="formData.revenueLastYear" :min="0" style="width: 100%;" />
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="员工人数">
                  <el-input-number v-model="formData.employeeCount" :min="0" style="width: 100%;" />
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="研发投入占比(%)">
                  <el-input-number v-model="formData.rdInvestmentRatio" :min="0" :max="100" :precision="2" style="width: 100%;" />
                </el-form-item>
              </el-col>
            </el-row>

            <el-row :gutter="16">
              <el-col :span="12">
                <el-form-item label="专利数量">
                  <el-input-number v-model="formData.patentCount" :min="0" style="width: 100%;" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="软著数量">
                  <el-input-number v-model="formData.softwareCopyrightCount" :min="0" style="width: 100%;" />
                </el-form-item>
              </el-col>
            </el-row>
          </el-tab-pane>
        </el-tabs>
      </el-form>

      <template #footer>
        <el-button @click="showAddDialog = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit">保存</el-button>
      </template>
    </el-dialog>

    <!-- 导入对话框 -->
    <el-dialog v-model="showImportDialog" title="批量导入企业" width="500px">
      <el-upload
        drag
        action=""
        :auto-upload="false"
        accept=".xlsx,.xls"
        :limit="1"
        :on-change="handleImportFileChange"
      >
        <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
        <div class="el-upload__text">
          拖拽Excel文件到此处，或<em>点击上传</em>
        </div>
        <template #tip>
          <div class="el-upload__tip">
            仅支持 .xlsx/.xls 格式，请先<a href="javascript:void(0)" @click="handleDownloadTemplate">下载模板</a>
          </div>
        </template>
      </el-upload>

      <template #footer>
        <el-button @click="showImportDialog = false">取消</el-button>
        <el-button type="primary" :disabled="!importFile" :loading="importing" @click="handleImport">
          开始导入
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { enterpriseApi } from '@/api'
import { ElMessage } from 'element-plus'

const router = useRouter()
const loading = ref(false)
const tableData = ref([])
const showAddDialog = ref(false)
const showImportDialog = ref(false)
const editingId = ref(null)
const activeTab = ref('basic')
const importFile = ref(null)
const importing = ref(false)
const industryPath = ref([])

const statsData = ref([
  { label: '企业总数', value: 0 },
  { label: '在孵企业', value: 0 },
  { label: '已毕业', value: 0 },
  { label: '本月新增', value: 0 }
])

const queryParams = reactive({
  keyword: '',
  industryCategory: '',
  enterpriseScale: '',
  status: ''
})

const pagination = reactive({
  page: 1,
  limit: 20,
  total: 0
})

const formData = reactive({
  enterpriseName: '',
  unifiedSocialCreditCode: '',
  industryCategory: '',
  industrySubcategory: '',
  enterpriseScale: 'small',
  registeredCapital: null,
  establishmentDate: '',
  registeredProvince: '',
  registeredCity: '',
  registeredDistrict: '',
  registeredAddress: '',
  legalRepresentative: '',
  contactPerson: '',
  contactPhone: '',
  contactEmail: '',
  feishuUserId: '',
  wechatOpenId: '',
  qualifications: [],
  revenueLastYear: null,
  employeeCount: null,
  rdInvestmentRatio: null,
  patentCount: 0,
  softwareCopyrightCount: 0
})

const formRules = {
  enterpriseName: [{ required: true, message: '请输入企业名称', trigger: 'blur' }],
  unifiedSocialCreditCode: [{ required: true, message: '请输入统一社会信用代码', trigger: 'blur' }]
}

const industryOptions = [
  {
    value: '信息技术',
    children: ['软件开发', '人工智能', '大数据', '云计算', '物联网']
  },
  {
    value: '生物医药',
    children: ['生物制药', '医疗器械', '医疗服务']
  },
  {
    value: '智能制造',
    children: ['工业自动化', '机器人', '智能装备']
  },
  {
    value: '新能源',
    children: ['太阳能', '风能', '储能技术']
  },
  {
    value: '现代服务业',
    children: ['科技服务', '金融服务', '文化创意']
  }
]

onMounted(() => {
  fetchData()
  fetchStatistics()
})

async function fetchData() {
  loading.value = true
  
  try {
    const res = await enterpriseApi.getList({
      ...queryParams,
      page: pagination.page,
      limit: pagination.limit
    })

    tableData.value = res.data || []
    pagination.total = res.total || 0
  } catch (error) {
    console.error('获取企业列表失败:', error)
  } finally {
    loading.value = false
  }
}

async function fetchStatistics() {
  try {
    const res = await enterpriseApi.getStatistics()
    if (res.data) {
      statsData.value[0].value = res.data.total || 0
      statsData.value[1].value = res.data.active || 0
      statsData.value[2].value = res.data.graduated || 0
    }
  } catch (error) {
    console.error('获取统计失败:', error)
  }
}

function resetQuery() {
  Object.assign(queryParams, { keyword: '', industryCategory: '', enterpriseScale: '', status: '' })
  fetchData()
}

function handleRowClick(row) {
  router.push(`/enterprises/${row.id}`)
}

async function handleEdit(row) {
  editingId.value = row.id
  Object.assign(formData, row)
  
  if (row.industryCategory) {
    industryPath.value = [row.industryCategory]
    if (row.industrySubcategory) {
      industryPath.value.push(row.industrySubcategory)
    }
  }
  
  showAddDialog.value = true
}

async function handleSubmit() {
  try {
    if (editingId.value) {
      await enterpriseApi.update(editingId.value, formData)
      ElMessage.success('更新成功')
    } else {
      await enterpriseApi.create(formData)
      ElMessage.success('创建成功')
    }
    
    showAddDialog.value = false
    resetForm()
    fetchData()
    fetchStatistics()
  } catch (error) {
    console.error('保存失败:', error)
  }
}

async function handleDelete(row) {
  try {
    await enterpriseApi.delete(row.id)
    ElMessage.success('删除成功')
    fetchData()
    fetchStatistics()
  } catch (error) {
    console.error('删除失败:', error)
  }
}

function resetForm() {
  editingId.value = null
  activeTab.value = 'basic'
  industryPath.value = []
  
  Object.assign(formData, {
    enterpriseName: '', unifiedSocialCreditCode: '', industryCategory: '',
    industrySubcategory: '', enterpriseScale: 'small', registeredCapital: null,
    establishmentDate: '', qualifications: [], revenueLastYear: null,
    employeeCount: null, rdInvestmentRatio: null, patentCount: 0,
    softwareCopyrightCount: 0
  })
}

function handleImportFileChange(file) {
  importFile.value = file.raw
}

async function handleImport() {
  if (!importFile.value) return

  importing.value = true
  
  try {
    const res = await enterpriseApi.importExcel(importFile.value)
    
    ElMessage.success(res.message)
    showImportDialog.value = false
    importFile.value = null
    fetchData()
    fetchStatistics()
  } catch (error) {
    console.error('导入失败:', error)
  } finally {
    importing.value = false
  }
}

async function handleDownloadTemplate() {
  try {
    const res = await enterpriseApi.downloadTemplate()
    const blob = new Blob([res], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = '企业信息导入模板.xlsx'
    a.click()
    window.URL.revokeObjectURL(url)
  } catch (error) {
    console.error('下载模板失败:', error)
  }
}

function getScaleText(scale) {
  const map = { micro: '微型', small: '小型', medium: '中型', large: '大型' }
  return map[scale] || scale
}
</script>

<style lang="scss" scoped>
.enterprise-list {
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;

    .header-actions {
      display: flex;
      gap: 10px;
    }
  }

  .stats-row {
    margin-bottom: 20px;

    .stat-item {
      text-align: center;
      padding: 20px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 8px;
      color: #fff;

      .stat-value {
        font-size: 28px;
        font-weight: bold;
      }

      .stat-label {
        font-size: 13px;
        opacity: 0.9;
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
