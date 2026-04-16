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
              <el-select v-model="form.industryScope" multiple placeholder="选择行业" style="width: 100%">
                <el-option label="信息技术" value="信息技术" />
                <el-option label="生物医药" value="生物医药" />
                <el-option label="智能制造" value="智能制造" />
                <el-option label="新能源" value="新能源" />
                <el-option label="现代服务业" value="现代服务业" />
                <el-option label="其他" value="其他" />
              </el-select>
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
    if (res.data.success) {
      const data = res.data.data
      form.value = {
        ...data,
        industryScope: data.industryScope ? JSON.parse(data.industryScope) : []
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
      
      const res = await request.put(`/api/policies/${route.params.id}/fields`, submitData)
      if (res.data.success) {
        ElMessage.success('保存成功')
        router.push(`/policies/${route.params.id}/detail`)
      } else {
        ElMessage.error(res.data.message || '保存失败')
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
