import { createRouter, createWebHistory } from 'vue-router'
import NProgress from 'nprogress'
import 'nprogress/nprogress.css'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login.vue'),
    meta: { title: '登录', requiresAuth: false }
  },
  {
    path: '/',
    component: () => import('@/views/layout/MainLayout.vue'),
    redirect: '/dashboard',
    meta: { requiresAuth: true },
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('@/views/Dashboard.vue'),
        meta: { title: '工作台', icon: 'Odometer' }
      },
      {
        path: 'policies',
        name: 'PolicyList',
        component: () => import('@/views/policy/PolicyList.vue'),
        meta: { title: '政策库', icon: 'Document' }
      },
      {
        path: 'policies/upload',
        name: 'PolicyUpload',
        component: () => import('@/views/policy/PolicyUpload.vue'),
        meta: { title: '上传政策', icon: 'Upload' }
      },
      {
        path: 'policies/:id/edit',
        name: 'PolicyEdit',
        component: () => import('@/views/policy/PolicyEdit.vue'),
        meta: { title: '编辑政策', icon: 'Edit' }
      },
      {
        path: 'policies/:id/detail',
        name: 'PolicyDetail',
        component: () => import('@/views/policy/PolicyDetail.vue'),
        meta: { title: '政策详情', icon: 'View' }
      },
      {
        path: 'policies/:id/compare',
        name: 'PolicyCompare',
        component: () => import('@/views/policy/PolicyCompare.vue'),
        meta: { title: '版本对比', icon: 'DataAnalysis' }
      },
      {
        path: 'enterprises',
        name: 'EnterpriseList',
        component: () => import('@/views/enterprise/EnterpriseList.vue'),
        meta: { title: '企业管理', icon: 'OfficeBuilding' }
      },
      {
        path: 'enterprises/:id',
        name: 'EnterpriseDetail',
        component: () => import('@/views/enterprise/EnterpriseDetail.vue'),
        meta: { title: '企业详情', icon: 'User' }
      },
      {
        path: 'matches',
        name: 'MatchList',
        component: () => import('@/views/match/MatchList.vue'),
        meta: { title: '匹配中心', icon: 'Connection' }
      },
      {
        path: 'reminders',
        name: 'ReminderList',
        component: () => import('@/views/reminder/ReminderList.vue'),
        meta: { title: '提醒管理', icon: 'Bell' }
      },
      {
        path: 'search',
        name: 'AdvancedSearch',
        component: () => import('@/views/search/AdvancedSearch.vue'),
        meta: { title: '高级搜索', icon: 'Search' }
      }
    ]
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@/views/404.vue'),
    meta: { title: '页面不存在' }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) return savedPosition
    return { top: 0 }
  }
})

router.beforeEach((to, from, next) => {
  NProgress.start()
  
  if (to.meta.title) {
    document.title = `${to.meta.title} - AI政策通`
  }

  const token = localStorage.getItem('token')
  
  if (to.meta.requiresAuth !== false && !token) {
    next('/login')
  } else if (to.path === '/login' && token) {
    next('/')
  } else {
    next()
  }
})

router.afterEach(() => {
  NProgress.done()
})

export default router
