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
            <el-cascader
              v-model="queryParams.industryCategory"
              :options="industryOptions"
              placeholder="行业分类"
              clearable
              collapse-tags
              collapse-tags-tooltip
              :props="{
                value: 'value',
                label: 'label',
                children: 'children',
                checkStrictly: true
              }"
              @change="handleIndustryChange"
            />
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
        
        <el-table-column prop="industryCategory" label="行业" width="180" show-overflow-tooltip>
          <template #default="{ row }">
            <span>{{ row.industryCategoryLabel || row.industryCategory || '-' }}</span>
          </template>
        </el-table-column>

        <el-table-column prop="enterpriseScale" label="规模" width="80">
          <template #default="{ row }">
            <el-tag size="small">{{ getScaleText(row.enterpriseScale) }}</el-tag>
          </template>
        </el-table-column>

        <el-table-column label="注册地" width="200" show-overflow-tooltip>
  <template #default="{ row }">
    <span>{{ [row.registeredProvince, row.registeredCity, row.registeredDistrict, row.registeredAddress].filter(Boolean).join('') || '-' }}</span>
  </template>
</el-table-column>

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
  industryCategoryLabel: '',
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
  industryCategoryLabel: '',
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
    value: 'A',
    label: '农、林、牧、渔业',
    children: [
      { value: 'A01', label: '农业' },
      { value: 'A02', label: '林业' },
      { value: 'A03', label: '畜牧业' },
      { value: 'A04', label: '渔业' },
      { value: 'A05', label: '农、林、牧、渔专业及辅助性活动' }
    ]
  },
  {
    value: 'B',
    label: '采矿业',
    children: [
      { value: 'B06', label: '煤炭开采和洗选业' },
      { value: 'B07', label: '石油和天然气开采业' },
      { value: 'B08', label: '黑色金属矿采选业' },
      { value: 'B09', label: '有色金属矿采选业' },
      { value: 'B10', label: '非金属矿采选业' },
      { value: 'B11', label: '开采辅助活动' },
      { value: 'B12', label: '其他采矿业' }
    ]
  },
  {
    value: 'C',
    label: '制造业',
    children: [
      { value: 'C13', label: '农副食品加工业' },
      { value: 'C14', label: '食品制造业' },
      { value: 'C15', label: '酒、饮料和精制茶制造业' },
      { value: 'C16', label: '烟草制品业' },
      { value: 'C17', label: '纺织业' },
      { value: 'C18', label: '纺织服装、服饰业' },
      { value: 'C19', label: '皮革、毛皮、羽毛及其制品和制鞋业' },
      { value: 'C20', label: '木材加工和木、竹、藤、棕、草制品业' },
      { value: 'C21', label: '家具制造业' },
      { value: 'C22', label: '造纸和纸制品业' },
      { value: 'C23', label: '印刷和记录媒介复制业' },
      { value: 'C24', label: '文教、工美、体育和娱乐用品制造业' },
      { value: 'C25', label: '石油加工、炼焦和核燃料加工业' },
      { value: 'C26', label: '化学原料和化学制品制造业' },
      { value: 'C27', label: '医药制造业' },
      { value: 'C28', label: '化学纤维制造业' },
      { value: 'C29', label: '橡胶和塑料制品业' },
      { value: 'C30', label: '非金属矿物制品业' },
      { value: 'C31', label: '黑色金属冶炼和压延加工业' },
      { value: 'C32', label: '有色金属冶炼和压延加工业' },
      { value: 'C33', label: '金属制品业' },
      { value: 'C34', label: '通用设备制造业' },
      { value: 'C35', label: '专用设备制造业' },
      { value: 'C36', label: '汽车制造业' },
      { value: 'C37', label: '铁路、船舶、航空航天和其他运输设备制造业' },
      { value: 'C38', label: '电气机械和器材制造业' },
      { value: 'C39', label: '计算机、通信和其他电子设备制造业' },
      { value: 'C40', label: '仪器仪表制造业' },
      { value: 'C41', label: '其他制造业' },
      { value: 'C42', label: '废弃资源综合利用业' },
      { value: 'C43', label: '金属制品、机械和设备修理业' }
    ]
  },
  {
    value: 'D',
    label: '电力、热力、燃气及水生产和供应业',
    children: [
      { value: 'D44', label: '电力、热力生产和供应业' },
      { value: 'D45', label: '燃气生产和供应业' },
      { value: 'D46', label: '水的生产和供应业' }
    ]
  },
  {
    value: 'E',
    label: '建筑业',
    children: [
      { value: 'E47', label: '房屋建筑业' },
      { value: 'E48', label: '土木工程建筑业' },
      { value: 'E49', label: '建筑安装业' },
      { value: 'E50', label: '建筑装饰、装修和其他建筑业' }
    ]
  },
  {
    value: 'F',
    label: '批发和零售业',
    children: [
      { value: 'F51', label: '批发业' },
      { value: 'F52', label: '零售业' }
    ]
  },
  {
    value: 'G',
    label: '交通运输、仓储和邮政业',
    children: [
      { value: 'G53', label: '铁路运输业' },
      { value: 'G54', label: '道路运输业' },
      { value: 'G55', label: '水上运输业' },
      { value: 'G56', label: '航空运输业' },
      { value: 'G57', label: '管道运输业' },
      { value: 'G58', label: '装卸搬运和运输代理业' },
      { value: 'G59', label: '仓储业' },
      { value: 'G60', label: '邮政业' }
    ]
  },
  {
    value: 'H',
    label: '住宿和餐饮业',
    children: [
      { value: 'H61', label: '住宿业' },
      { value: 'H62', label: '餐饮业' }
    ]
  },
  {
    value: 'I',
    label: '信息传输、软件和信息技术服务业',
    children: [
      { value: 'I63', label: '电信、广播电视和卫星传输服务' },
      { value: 'I64', label: '互联网和相关服务' },
      { value: 'I65', label: '软件和信息技术服务业' },
      { value: 'I66', label: '信息传输、软件和信息技术服务业' }
    ]
  },
  {
    value: 'J',
    label: '金融业',
    children: [
      { value: 'J68', label: '货币金融服务' },
      { value: 'J69', label: '资本市场服务' },
      { value: 'J70', label: '保险业' },
      { value: 'J71', label: '其他金融业' }
    ]
  },
  {
    value: 'K',
    label: '房地产业',
    children: [
      { value: 'K72', label: '房地产开发经营' },
      { value: 'K73', label: '物业管理' },
      { value: 'K74', label: '房地产业' }
    ]
  },
  {
    value: 'L',
    label: '租赁和商务服务业',
    children: [
      { value: 'L73', label: '租赁业' },
      { value: 'L74', label: '商务服务业' }
    ]
  },
  {
    value: 'M',
    label: '科学研究和技术服务业',
    children: [
      { value: 'M75', label: '研究和试验发展' },
      { value: 'M76', label: '专业技术服务业' },
      { value: 'M77', label: '科技推广和应用服务业' },
      { value: 'M78', label: '科学研究和技术服务业' }
    ]
  },
  {
    value: 'N',
    label: '水利、环境和公共设施管理业',
    children: [
      { value: 'N79', label: '水利管理业' },
      { value: 'N80', label: '生态保护和环境治理业' },
      { value: 'N81', label: '公共设施管理业' }
    ]
  },
  {
    value: 'O',
    label: '居民服务、修理和其他服务业',
    children: [
      { value: 'O82', label: '居民服务业' },
      { value: 'O83', label: '机动车、电子产品和日用产品修理业' },
      { value: 'O84', label: '其他服务业' }
    ]
  },
  {
    value: 'P',
    label: '教育',
    children: [
      { value: 'P85', label: '教育' }
    ]
  },
  {
    value: 'Q',
    label: '卫生和社会工作',
    children: [
      { value: 'Q86', label: '卫生' },
      { value: 'Q87', label: '社会工作' }
    ]
  },
  {
    value: 'R',
    label: '文化、体育和娱乐业',
    children: [
      { value: 'R88', label: '新闻和出版业' },
      { value: 'R89', label: '广播、电视、电影和影视录音制作业' },
      { value: 'R90', label: '文化艺术业' },
      { value: 'R91', label: '体育' },
      { value: 'R92', label: '娱乐业' }
    ]
  },
  {
    value: 'S',
    label: '公共管理、社会保障和社会组织',
    children: [
      { value: 'S93', label: '中国共产党机关' },
      { value: 'S94', label: '国家机构' },
      { value: 'S95', label: '人民政协、民主党派' },
      { value: 'S96', label: '社会保障' },
      { value: 'S97', label: '群众团体、社会团体和群众自治组织' },
      { value: 'S98', label: '基层群众自治组织' }
    ]
  },
  {
    value: 'T',
    label: '国际组织',
    children: [
      { value: 'T99', label: '国际组织' }
    ]
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
  Object.assign(queryParams, { keyword: '', industryCategory: '', industryCategoryLabel: '', enterpriseScale: '', status: '' })
  fetchData()
}

function handleIndustryChange(value) {
  if (value && value.length > 0) {
    queryParams.industryCategory = value[value.length - 1]
    queryParams.industryCategoryLabel = value.map(v => {
      const findLabel = (options, val) => {
        for (const option of options) {
          if (option.value === val) return option.label
          if (option.children) {
            const found = findLabel(option.children, val)
            if (found) return found
          }
        }
      }
      return findLabel(industryOptions, v)
    }).join('/')
  } else {
    queryParams.industryCategory = ''
    queryParams.industryCategoryLabel = ''
  }

  // 触发搜索
  fetchData()
}

// 辅助函数：查找行业项
function findIndustryItem(options, value) {
  for (const option of options) {
    if (option.value === value) return option
    if (option.children) {
      const found = findIndustryItem(option.children, value)
      if (found) return found
    }
  }
}

// 辅助函数：查找行业路径
function findIndustryPath(options, value) {
  for (const option of options) {
    if (option.value === value) return [value]
    if (option.children) {
      for (const child of option.children) {
        if (child.value === value) return [option.value, value]
        // 可以继续查找更深层级
      }
    }
  }
  return null
}

function handleRowClick(row) {
  router.push(`/enterprises/${row.id}`)
}

async function handleEdit(row) {
  editingId.value = row.id
  Object.assign(formData, row)

  if (row.industryCategory) {
    // 反向查找行业路径
    const path = findIndustryPath(industryOptions, row.industryCategory)
    if (path) {
      industryPath.value = path
    }
    if (row.industryCategoryLabel) {
      formData.industryCategoryLabel = row.industryCategoryLabel
    }
  }

  showAddDialog.value = true
}

async function handleSubmit() {
  try {
    // 处理行业分类数据
    const submitData = { ...formData }

    // 如果选择了行业路径，提取第二级作为行业类别
    if (industryPath.value && industryPath.value.length > 0) {
      const firstLevel = industryPath.value[0]
      const industryItem = findIndustryItem(industryOptions, firstLevel)

      if (industryItem && industryItem.children && industryPath.value.length > 1) {
        // 第二级是具体行业类别
        submitData.industryCategory = industryPath.value[1] // 具体行业类别
        submitData.industrySubcategory = null // 不需要第三级
        submitData.industryCategoryLabel = `${industryItem.label}/${industryItem.children.find(c => c.value === industryPath.value[1])?.label}`
      } else {
        // 只选了门类
        submitData.industryCategory = firstLevel
        submitData.industrySubcategory = null
        submitData.industryCategoryLabel = industryItem?.label || firstLevel
      }
    } else {
      // 未选择行业
      submitData.industryCategory = ''
      submitData.industrySubcategory = null
      submitData.industryCategoryLabel = ''
    }

    if (editingId.value) {
      await enterpriseApi.update(editingId.value, submitData)
      ElMessage.success('更新成功')
    } else {
      await enterpriseApi.create(submitData)
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
    industrySubcategory: '', industryCategoryLabel: '', enterpriseScale: 'small', registeredCapital: null,
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
