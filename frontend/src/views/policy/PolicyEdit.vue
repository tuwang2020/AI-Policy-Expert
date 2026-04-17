<template>
  <div class="policy-edit" v-loading="loading">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>编辑政策</span>
          <div class="header-actions">
            <el-button @click="$router.back()">取消</el-button>
            <el-button type="primary" @click="handleSave" :loading="saving">保存</el-button>
          </div>
        </div>
      </template>

      <el-form :model="form" :rules="rules" ref="formRef" label-width="120px">
        <!-- 基本信息 -->
        <h3 class="section-title">基本信息</h3>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="政策名称" prop="policyName">
              <el-input v-model="form.policyName" placeholder="请输入政策名称" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="政策文号" prop="policyNumber">
              <el-input v-model="form.policyNumber" placeholder="请输入政策文号" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="发布机构" prop="publishOrg">
              <el-input v-model="form.publishOrg" placeholder="请输入发布机构" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="发布日期" prop="publishDate">
              <el-date-picker
                v-model="form.publishDate"
                type="date"
                placeholder="选择日期"
                value-format="YYYY-MM-DD"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="生效日期" prop="effectiveDate">
              <el-date-picker
                v-model="form.effectiveDate"
                type="date"
                placeholder="选择日期"
                value-format="YYYY-MM-DD"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="截止日期" prop="deadline">
              <el-date-picker
                v-model="form.deadline"
                type="datetime"
                placeholder="选择日期时间"
                value-format="YYYY-MM-DD HH:mm:ss"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
        </el-row>

        <!-- 申报条件 -->
        <h3 class="section-title">申报条件</h3>
        <el-form-item label="申报对象条件" prop="eligibility">
          <el-input
            v-model="form.eligibility"
            type="textarea"
            :rows="4"
            placeholder="请输入申报对象条件"
          />
        </el-form-item>

        <el-form-item label="补贴/支持内容" prop="subsidyContent">
          <el-input
            v-model="form.subsidyContent"
            type="textarea"
            :rows="4"
            placeholder="请输入补贴或支持内容"
          />
        </el-form-item>

        <!-- 适用范围 -->
        <h3 class="section-title">适用范围</h3>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="适用行业" prop="industryScope">
              <el-cascader
                v-model="form.industryScope"
                :options="industryOptions"
                :props="{ multiple: true }"
                placeholder="选择行业范围"
                clearable
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="地域范围" prop="regionScope">
              <el-input v-model="form.regionScope" placeholder="如：全国、北京市等" />
            </el-form-item>
          </el-col>
        </el-row>

        <!-- 联系方式 -->
        <h3 class="section-title">联系方式</h3>
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="联系部门" prop="contactDept">
              <el-input v-model="form.contactDept" placeholder="联系部门" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="联系电话" prop="contactPhone">
              <el-input v-model="form.contactPhone" placeholder="联系电话" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="联系邮箱" prop="contactEmail">
              <el-input v-model="form.contactEmail" placeholder="联系邮箱" />
            </el-form-item>
          </el-col>
        </el-row>

        <!-- 备注 -->
        <el-form-item label="备注" prop="remark">
          <el-input
            v-model="form.remark"
            type="textarea"
            :rows="3"
            placeholder="备注信息（可选）"
          />
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import request from '@/utils/request'

const route = useRoute()
const router = useRouter()

const loading = ref(false)
const saving = ref(false)
const formRef = ref(null)

const form = ref({
  policyName: '',
  policyNumber: '',
  publishOrg: '',
  publishDate: '',
  effectiveDate: '',
  deadline: '',
  eligibility: '',
  subsidyContent: '',
  industryScope: [],
  regionScope: '',
  contactDept: '',
  contactPhone: '',
  contactEmail: '',
  remark: ''
})

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

const rules = {
  policyName: [{ required: true, message: '请输入政策名称', trigger: 'blur' }],
  publishOrg: [{ required: true, message: '请输入发布机构', trigger: 'blur' }],
  publishDate: [{ required: true, message: '请选择发布日期', trigger: 'change' }]
}

onMounted(async () => {
  if (route.params.id) {
    await fetchPolicyDetail()
  }
})

const fetchPolicyDetail = async () => {
  loading.value = true
  try {
    const res = await request.get(`/policies/${route.params.id}`)
    if (res.success) {
      const data = res.data
      form.value = {
        ...data,
        industryScope: data.industryScope || []
      }
    }
  } catch (error) {
    console.error('获取政策详情失败:', error)
    ElMessage.error('获取政策详情失败')
  } finally {
    loading.value = false
  }
}

const handleSave = async () => {
  if (!formRef.value) return
  
  await formRef.value.validate(async (valid) => {
    if (!valid) return
    
    saving.value = true
    try {
      const submitData = {
        ...form.value,
        industryScope: JSON.stringify(form.value.industryScope)
      }
      
      const res = await request.put(`/policies/${route.params.id}/fields`, submitData)
      if (res.success) {
        ElMessage.success('保存成功')
        router.push(`/policies/${route.params.id}/detail`)
      } else {
        ElMessage.error(res.message || '保存失败')
      }
    } catch (error) {
      console.error('保存失败:', error)
      ElMessage.error('保存失败')
    } finally {
      saving.value = false
    }
  })
}
</script>

<style scoped>
.policy-edit {
  padding: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.section-title {
  margin: 24px 0 16px;
  padding-left: 10px;
  border-left: 4px solid #409eff;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}
</style>
