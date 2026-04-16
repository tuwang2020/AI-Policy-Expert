<template>
  <div class="policy-upload">
    <el-card>
      <template #header>
        <span>上传并解析政策文件</span>
      </template>

      <el-steps :active="currentStep" finish-status="success" align-center class="upload-steps">
        <el-step title="上传文件" />
        <el-step title="AI解析中" />
        <el-step title="确认信息" />
        <el-step title="完成" />
      </el-steps>

      <!-- 步骤1：文件上传 -->
      <div v-show="currentStep === 0" class="step-content">
        <el-upload
          ref="uploadRef"
          class="upload-area"
          drag
          action=""
          :auto-upload="false"
          :limit="1"
          accept=".pdf,.doc,.docx"
          :on-change="handleFileChange"
          :on-remove="handleFileRemove"
          :before-upload="beforeUpload"
        >
          <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
          <div class="el-upload__text">
            将PDF/Word文件拖到此处，或<em>点击上传</em>
          </div>
          <template #tip>
            <div class="el-upload__tip">
              仅支持 PDF、DOC、DOCX 格式，文件大小不超过 50MB
            </div>
          </template>
        </el-upload>

        <div class="action-buttons">
          <el-button 
            type="primary" 
            :disabled="!selectedFile"
            :loading="uploading"
            @click="handleUpload"
          >
            开始解析
          </el-button>
        </div>
      </div>

      <!-- 步骤2：AI解析进度 -->
      <div v-show="currentStep === 1" class="step-content">
        <div class="parsing-status">
          <el-icon class="is-loading" :size="48" color="#1890ff"><Loading /></el-icon>
          <h3>AI正在智能解析政策文件...</h3>
          <p class="status-text">{{ parsingStatus }}</p>
          
          <el-progress 
            :percentage="parseProgress" 
            :stroke-width="10"
            status="success"
            style="width: 400px; margin: 20px auto;"
          />
          
          <div class="parse-info">
            <el-descriptions :column="2" border size="small">
              <el-descriptions-item label="文件名">{{ selectedFile?.name }}</el-descriptions-item>
              <el-descriptions-item label="文件大小">{{ formatFileSize(selectedFile?.size) }}</el-descriptions-item>
              <el-descriptions-item label="文件类型">{{ selectedFile?.type?.toUpperCase() || '-' }}</el-descriptions-item>
              <el-descriptions-item label="预计耗时">约 10-30 秒</el-descriptions-item>
            </el-descriptions>
          </div>
        </div>
      </div>

      <!-- 步骤3：确认提取结果 -->
      <div v-show="currentStep === 2" class="step-content">
        <el-alert 
          title="请核对以下AI提取的信息，可手动修正后保存"
          type="info" 
          :closable="false"
          show-icon
          style="margin-bottom: 20px;"
        />

        <el-form 
          ref="formRef" 
          :model="extractedData" 
          label-width="120px"
          class="edit-form"
        >
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="政策名称" required>
                <el-input v-model="extractedData.policyName" placeholder="政策完整名称" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="政策文号">
                <el-input v-model="extractedData.policyNumber" placeholder="如：国发〔2024〕1号" />
              </el-form-item>
            </el-col>
          </el-row>

          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="发布机构" required>
                <el-input v-model="extractedData.publishOrg" placeholder="发布机构全称" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="发布日期">
                <el-date-picker 
                  v-model="extractedData.publishDate" 
                  type="date" 
                  placeholder="选择日期"
                  value-format="YYYY-MM-DD"
                  style="width: 100%;"
                />
              </el-form-item>
            </el-col>
          </el-row>

          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="生效日期">
                <el-date-picker 
                  v-model="extractedData.effectiveDate" 
                  type="date" 
                  placeholder="选择日期"
                  value-format="YYYY-MM-DD"
                  style="width: 100%;"
                />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="截止日期">
                <el-date-picker 
                  v-model="extractedData.deadline" 
                  type="datetime" 
                  placeholder="选择截止时间"
                  value-format="YYYY-MM-DD HH:mm:ss"
                  style="width: 100%;"
                />
              </el-form-item>
            </el-col>
          </el-row>

          <el-form-item label="申报对象条件">
            <el-input 
              v-model="extractedData.eligibility" 
              type="textarea" 
              :rows="4"
              placeholder="申报对象条件的详细描述"
            />
          </el-form-item>

          <el-form-item label="补贴/支持内容">
            <el-input 
              v-model="extractedData.subsidyContent" 
              type="textarea" 
              :rows="4"
              placeholder="补贴或支持内容的具体描述"
            />
          </el-form-item>

          <el-form-item label="申报材料清单">
            <div class="materials-list">
              <div 
                v-for="(material, index) in extractedData.materialsList" 
                :key="index"
                class="material-item"
              >
                <el-input v-model="extractedData.materialsList[index]" placeholder="材料名称" />
                <el-button 
                  type="danger" 
                  icon="Delete" 
                  circle 
                  size="small"
                  @click="removeMaterial(index)"
                />
              </div>
              <el-button type="primary" plain size="small" @click="addMaterial">
                + 添加材料
              </el-button>
            </div>
          </el-form-item>

          <el-row :gutter="20">
            <el-col :span="8">
              <el-form-item label="联系部门">
                <el-input v-model="extractedData.contactInfo.department" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="联系电话">
                <el-input v-model="extractedData.contactInfo.phone" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="联系邮箱">
                <el-input v-model="extractedData.contactInfo.email" />
              </el-form-item>
            </el-col>
          </el-row>

          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="适用行业">
                <el-select 
                  v-model="extractedData.industryScope" 
                  multiple 
                  filterable 
                  allow-create 
                  default-first-option
                  placeholder="选择或输入适用行业"
                  style="width: 100%;"
                >
                  <el-option label="信息技术" value="信息技术" />
                  <el-option label="生物医药" value="生物医药" />
                  <el-option label="智能制造" value="智能制造" />
                  <el-option label="新能源" value="新能源" />
                  <el-option label="新材料" value="新材料" />
                  <el-option label="现代服务业" value="现代服务业" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="适用地域">
                <el-select 
                  v-model="extractedData.regionScope" 
                  multiple 
                  filterable 
                  allow-create 
                  default-first-option
                  placeholder="选择或输入适用地域"
                  style="width: 100%;"
                >
                  <el-option label="全国" value="全国" />
                  <el-option label="北京市" value="北京市" />
                  <el-option label="上海市" value="上海市" />
                  <el-option label="广东省" value="广东省" />
                  <el-option label="浙江省" value="浙江省" />
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>
        </el-form>

        <div class="confidence-badge">
          <el-tag :type="extractedData.confidence > 0.85 ? 'success' : 'warning'">
            AI提取置信度: {{ (extractedData.confidence * 100).toFixed(1) }}%
          </el-tag>
        </div>

        <div class="action-buttons">
          <el-button @click="currentStep--">上一步</el-button>
          <el-button type="primary" @click="handleSave">保存并完成</el-button>
        </div>
      </div>

      <!-- 步骤4：完成 -->
      <div v-show="currentStep === 3" class="step-content">
        <el-result 
          icon="success" 
          title="政策上传成功！"
          sub-title="政策文件已解析并保存到政策库"
        >
          <template #extra>
            <el-button type="primary" @click="$router.push('/policies')">查看政策库</el-button>
            <el-button @click="resetUpload">继续上传</el-button>
          </template>
        </el-result>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { policyApi } from '@/api'
import { ElMessage } from 'element-plus'

const router = useRouter()

const currentStep = ref(0)
const uploadRef = ref(null)
const formRef = ref(null)
const uploading = ref(false)
const selectedFile = ref(null)
const parseProgress = ref(0)
const parsingStatus = ref('')
const policyId = ref(null)

const extractedData = reactive({
  policyName: '',
  policyNumber: '',
  publishOrg: '',
  publishDate: '',
  effectiveDate: '',
  deadline: '',
  eligibility: '',
  subsidyContent: '',
  materialsList: [],
  contactInfo: {
    department: '',
    phone: '',
    email: '',
    address: ''
  },
  industryScope: [],
  regionScope: [],
  confidence: 0
})

function handleFileChange(file) {
  selectedFile.value = file.raw
}

function handleFileRemove() {
  selectedFile.value = null
}

function beforeUpload(file) {
  const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
  const isAllowed = allowedTypes.includes(file.type)
  const isLt50M = file.size / 1024 / 1024 < 50

  if (!isAllowed) {
    ElMessage.error('仅支持 PDF、DOC、DOCX 格式!')
    return false
  }
  
  if (!isLt50M) {
    ElMessage.error('文件大小不能超过 50MB!')
    return false
  }
  
  return true
}

async function handleUpload() {
  if (!selectedFile.value) {
    ElMessage.warning('请先选择文件')
    return
  }

  currentStep.value = 1
  uploading.value = true
  parseProgress.value = 0

  const statusMessages = [
    '正在读取文件内容...',
    '正在进行文本预处理...',
    '正在调用AI模型分析...',
    '正在提取关键字段...',
    '正在生成结构化数据...',
    '解析完成!'
  ]

  for (let i = 0; i < statusMessages.length; i++) {
    parsingStatus.value = statusMessages[i]
    parseProgress.value = ((i + 1) / statusMessages.length) * 100
    await new Promise(resolve => setTimeout(resolve, 800))
  }

  try {
    const formData = new FormData()
    formData.append('file', selectedFile.value)

    const res = await policyApi.upload(selectedFile.value)

    if (res.data?.extractedData) {
      Object.assign(extractedData, res.data.extractedData)
      policyId.value = res.data.policyId
      
      currentStep.value = 2
      ElMessage.success('AI解析完成，请确认信息')
    }
  } catch (error) {
    console.error('上传解析失败:', error)
    currentStep.value = 0
  } finally {
    uploading.value = false
  }
}

function addMaterial() {
  extractedData.materialsList.push('')
}

function removeMaterial(index) {
  extractedData.materialsList.splice(index, 1)
}

async function handleSave() {
  try {
    await policyApi.updateFields(policyId.value, extractedData)
    
    currentStep.value = 3
    ElMessage.success('政策信息保存成功')
  } catch (error) {
    console.error('保存失败:', error)
  }
}

function resetUpload() {
  currentStep.value = 0
  selectedFile.value = null
  policyId.value = null
  
  Object.assign(extractedData, {
    policyName: '', policyNumber: '', publishOrg: '', publishDate: '',
    effectiveDate: '', deadline: '', eligibility: '', subsidyContent: '',
    materialsList: [], contactInfo: {}, industryScope: [], regionScope: [],
    confidence: 0
  })
}

function formatFileSize(bytes) {
  if (!bytes) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}
</script>

<style lang="scss" scoped>
.policy-upload {
  .upload-steps {
    margin-bottom: 40px;
  }

  .step-content {
    padding: 20px 0;
    min-height: 500px;

    &.parsing-status {
      text-align: center;
      padding: 60px 20px;

      h3 {
        margin: 20px 0 10px;
        color: #333;
      }

      .status-text {
        color: #666;
        font-size: 14px;
      }

      .parse-info {
        max-width: 600px;
        margin: 30px auto 0;
      }
    }
  }

  .upload-area {
    :deep(.el-upload-dragger) {
      padding: 60px 20px;
    }
  }

  .action-buttons {
    text-align: center;
    margin-top: 30px;

    .el-button {
      min-width: 120px;
    }
  }

  .edit-form {
    max-width: 900px;
    margin: 0 auto;
  }

  .materials-list {
    width: 100%;

    .material-item {
      display: flex;
      gap: 10px;
      margin-bottom: 10px;
      
      .el-input {
        flex: 1;
      }
    }
  }

  .confidence-badge {
    text-align: center;
    margin: 20px 0;
  }
}
</style>
