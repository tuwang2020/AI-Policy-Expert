import axios from 'axios'
import { ElMessage } from 'element-plus'
import router from '@/router'
// import store from '@/stores'

const request = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
})

request.interceptors.request.use(
  config => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  error => Promise.reject(error)
)

request.interceptors.response.use(
  response => {
    const res = response.data
    
    if (res.success === false) {
      ElMessage.error(res.message || '请求失败')
      return Promise.reject(new Error(res.message))
    }
    
    return res
  },
  error => {
    if (error.response) {
      const { status, data } = error.response
      
      switch (status) {
        case 401:
          ElMessage.error('登录已过期，请重新登录')
          localStorage.removeItem('token')
          router.push('/login')
          break
        case 403:
          ElMessage.error('没有权限执行此操作')
          break
        case 404:
          ElMessage.error('请求的资源不存在')
          break
        case 500:
          ElMessage.error('服务器内部错误')
          break
        default:
          ElMessage.error(data?.message || '请求失败')
      }
    } else {
      ElMessage.error('网络连接失败，请检查网络')
    }
    
    return Promise.reject(error)
  }
)

export default request

export const policyApi = {
  upload: (file) => {
    const formData = new FormData()
    formData.append('file', file)
    return request.post('/policies/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },
  updateFields: (id, data) => request.put(`/policies/${id}/fields`, data),
  publish: (id) => request.post(`/policies/${id}/publish`),
  getList: (params) => request.get('/policies', { params }),
  getById: (id) => request.get(`/policies/${id}`),
  compareVersions: (id, v1, v2) => request.get(`/policies/${id}/compare`, { params: { v1, v2 } }),
  delete: (id) => request.delete(`/policies/${id}`),
  download: (id) => request.get(`/policies/${id}/download`, { responseType: 'blob' })
}

export const enterpriseApi = {
  create: (data) => request.post('/enterprises', data),
  update: (id, data) => request.put(`/enterprises/${id}`, data),
  delete: (id) => request.delete(`/enterprises/${id}`),
  getById: (id) => request.get(`/enterprises/${id}`),
  getList: (params) => request.get('/enterprises', { params }),
  importExcel: (file) => {
    const formData = new FormData()
    formData.append('file', file)
    return request.post('/enterprises/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },
  downloadTemplate: () => request.get('/enterprises/template/download', { responseType: 'blob' }),
  getStatistics: () => request.get('/enterprises/statistics')
}

export const matchApi = {
  matchPolicy: (policyId) => request.post('/matches/match', { policyId }),
  getResults: (params) => request.get('/matches/results', { params }),
  adjustScore: (id, data) => request.put(`/matches/${id}/adjust-score`, data),
  approve: (id) => request.put(`/matches/${id}/approve`),
  reject: (id) => request.put(`/matches/${id}/reject`)
}

export const reminderApi = {
  getList: (params) => request.get('/reminders', { params }),
  cancel: (id) => request.post(`/reminders/${id}/cancel`),
  manualSend: (id) => request.post(`/reminders/${id}/manual-send`),
  getStatistics: () => request.get('/reminders/statistics')
}

export const searchApi = {
  search: (params) => request.get('/search', { params }),
  suggestions: (keyword) => request.get('/search/suggestions', { params: { keyword } }),
  health: () => request.get('/search/health'),
  syncIndex: () => request.post('/search/sync-index')
}

export const authApi = {
  login: (data) => request.post('/auth/login', data),
  register: (data) => request.post('/auth/register', data),
  getProfile: () => request.get('/auth/profile'),
  changePassword: (data) => request.post('/auth/change-password', data)
}
