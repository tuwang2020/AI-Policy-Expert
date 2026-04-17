<template>
  <div class="enterprise-detail" v-loading="loading">
    <el-card v-if="enterprise">
      <!-- 编辑对话框 -->
      <el-dialog
        v-model="showEditDialog"
        title="编辑企业信息"
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
          <el-button @click="showEditDialog = false">取消</el-button>
          <el-button type="primary" @click="handleEditSubmit">保存</el-button>
        </template>
      </el-dialog>
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
const showEditDialog = ref(false)
const activeTab = ref('basic')
const industryPath = ref([])

// 编辑表单数据
const formData = ref({
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

// 行业分类选项
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
    console.log('Enterprise detail response:', res)

    // 无论 success 如何，都尝试获取数据
    if (res.data) {
      enterprise.value = res.data
      console.log('Enterprise data loaded:', enterprise.value)
    } else if (res.success && res.data === null) {
      enterprise.value = null
      ElMessage.error('未找到该企业信息')
    } else {
      enterprise.value = null
      ElMessage.error(res.message || '获取企业详情失败')
    }
  } catch (error) {
    console.error('获取企业详情失败:', error)
    ElMessage.error('获取企业详情失败')
    enterprise.value = null
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

const handleEdit = async () => {
  console.log('handleEdit called, enterprise:', enterprise.value)

  if (!enterprise.value || !enterprise.value.id) {
    console.error('Enterprise data is invalid:', enterprise.value)
    ElMessage.error('企业数据加载失败')
    return
  }

  console.log('Enterprise data:', enterprise.value)

  try {
    // 清空表单数据
    Object.assign(formData.value, {
      enterpriseName: enterprise.value.enterpriseName || '',
      unifiedSocialCreditCode: enterprise.value.unifiedSocialCreditCode || '',
      industryCategory: enterprise.value.industryCategory || '',
      industrySubcategory: enterprise.value.industrySubcategory || '',
      industryCategoryLabel: enterprise.value.industryCategoryLabel || '',
      enterpriseScale: enterprise.value.enterpriseScale || 'small',
      registeredCapital: enterprise.value.registeredCapital || null,
      establishmentDate: enterprise.value.establishmentDate ? dayjs(enterprise.value.establishmentDate).format('YYYY-MM-DD') : '',
      registeredProvince: enterprise.value.registeredProvince || '',
      registeredCity: enterprise.value.registeredCity || '',
      registeredDistrict: enterprise.value.registeredDistrict || '',
      registeredAddress: enterprise.value.registeredAddress || '',
      legalRepresentative: enterprise.value.legalRepresentative || '',
      contactPerson: enterprise.value.contactPerson || '',
      contactPhone: enterprise.value.contactPhone || '',
      contactEmail: enterprise.value.contactEmail || '',
      feishuUserId: enterprise.value.feishuUserId || '',
      wechatOpenId: enterprise.value.wechatOpenId || '',
      qualifications: enterprise.value.qualifications ?
        (typeof enterprise.value.qualifications === 'string' ? JSON.parse(enterprise.value.qualifications) : enterprise.value.qualifications) : [],
      revenueLastYear: enterprise.value.revenueLastYear || null,
      employeeCount: enterprise.value.employeeCount || null,
      rdInvestmentRatio: enterprise.value.rdInvestmentRatio || null,
      patentCount: enterprise.value.patentCount || 0,
      softwareCopyrightCount: enterprise.value.softwareCopyrightCount || 0
    })

    console.log('Form data after assignment:', formData.value)

    // 处理行业分类
    if (formData.value.industryCategory) {
      const path = findIndustryPath(industryOptions, formData.value.industryCategory)
      if (path) {
        industryPath.value = path
        console.log('Industry path found:', path)
      } else {
        console.log('Industry path not found for:', formData.value.industryCategory)
      }
      if (formData.value.industryCategoryLabel) {
        formData.value.industryCategoryLabel = formData.value.industryCategoryLabel
      }
    }

    console.log('About to show edit dialog')
    showEditDialog.value = true
  } catch (error) {
    console.error('Error in handleEdit:', error)
    ElMessage.error('编辑失败：' + error.message)
  }
}

const handleEditSubmit = async () => {
  try {
    // 处理行业分类数据
    const submitData = { ...formData.value }

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

    await enterpriseApi.update(enterprise.value.id, submitData)
    ElMessage.success('更新成功')
    showEditDialog.value = false
    fetchEnterpriseDetail() // 刷新企业详情
  } catch (error) {
    console.error('保存失败:', error)
    ElMessage.error('保存失败')
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

// 辅助函数：查找行业项
const findIndustryItem = (options, value) => {
  for (const option of options) {
    if (option.value === value) return option
    if (option.children) {
      const found = findIndustryItem(option.children, value)
      if (found) return found
    }
  }
}

// 辅助函数：查找行业路径
const findIndustryPath = (options, value) => {
  for (const option of options) {
    if (option.value === value) return [value]
    if (option.children) {
      for (const child of option.children) {
        if (child.value === value) return [option.value, value]
        if (child.children) {
          for (const grandchild of child.children) {
            if (grandchild.value === value) return [option.value, child.value, value]
          }
        }
      }
    }
  }
  return null
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
