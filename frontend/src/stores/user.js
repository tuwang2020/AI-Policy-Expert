import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authApi } from '@/api'

export const useUserStore = defineStore('user', () => {
  const token = ref(localStorage.getItem('token') || '')
  const userInfo = ref(JSON.parse(localStorage.getItem('userInfo') || '{}'))
  const permissions = ref([])

  const isLoggedIn = computed(() => !!token.value)
  const isAdmin = computed(() => userInfo.value.role === 'admin')
  const username = computed(() => userInfo.value.username || '')

  async function login(credentials) {
    try {
      const res = await authApi.login(credentials)
      
      if (res.data.token) {
        token.value = res.data.token
        userInfo.value = res.data.user
        
        localStorage.setItem('token', res.data.token)
        localStorage.setItem('userInfo', JSON.stringify(res.data.user))
        
        return true
      }
      return false
    } catch (error) {
      throw error
    }
  }

  async function register(userData) {
    return await authApi.register(userData)
  }

  async function fetchProfile() {
    try {
      const res = await authApi.getProfile()
      userInfo.value = res.data
      localStorage.setItem('userInfo', JSON.stringify(res.data))
    } catch (error) {
      console.error('获取用户信息失败:', error)
    }
  }

  function logout() {
    token.value = ''
    userInfo.value = {}
    permissions.value = []
    
    localStorage.removeItem('token')
    localStorage.removeItem('userInfo')
  }

  return {
    token,
    userInfo,
    permissions,
    isLoggedIn,
    isAdmin,
    username,
    login,
    register,
    fetchProfile,
    logout
  }
})
