<template>
  <el-container class="main-layout">
    <el-aside :width="sidebarCollapsed ? '64px' : '240px'" class="sidebar">
      <div class="logo-container">
        <img src="@/assets/logo.svg" alt="Logo" class="logo-img" />
        <span v-show="!sidebarCollapsed" class="logo-text">AI政策通</span>
      </div>
      
      <el-menu
        :default-active="activeMenu"
        :collapse="sidebarCollapsed"
        router
        background-color="#001529"
        text-color="#ffffffa6"
        active-text-color="#1890ff"
      >
        <el-menu-item index="/dashboard">
          <el-icon><Odometer /></el-icon>
          <template #title>工作台</template>
        </el-menu-item>

        <el-sub-menu index="policy">
          <template #title>
            <el-icon><Document /></el-icon>
            <span>政策管理</span>
          </template>
          <el-menu-item index="/policies">
            <el-icon><FolderOpened /></el-icon>
            政策库
          </el-menu-item>
          <el-menu-item index="/policies/upload">
            <el-icon><Upload /></el-icon>
            上传政策
          </el-menu-item>
        </el-sub-menu>

        <el-sub-menu index="enterprise">
          <template #title>
            <el-icon><OfficeBuilding /></el-icon>
            <span>企业管理</span>
          </template>
          <el-menu-item index="/enterprises">
            <el-icon><UserFilled /></el-icon>
            企业列表
          </el-menu-item>
        </el-sub-menu>

        <el-menu-item index="/matches">
          <el-icon><Connection /></el-icon>
          <template #title>匹配中心</template>
        </el-menu-item>

        <el-menu-item index="/reminders">
          <el-icon><Bell /></el-icon>
          <template #title>提醒管理</template>
        </el-menu-item>

        <el-menu-item index="/search">
          <el-icon><Search /></el-icon>
          <template #title>高级搜索</template>
        </el-menu-item>
      </el-menu>
    </el-aside>

    <el-container>
      <el-header class="header">
        <div class="header-left">
          <el-icon 
            class="collapse-btn" 
            @click="appStore.toggleSidebar"
            :size="20"
          >
            <Fold v-if="!sidebarCollapsed" />
            <Expand v-else />
          </el-icon>
          
          <el-breadcrumb separator="/">
            <el-breadcrumb-item 
              v-for="item in breadcrumbs" 
              :key="item.path"
              :to="item.path"
            >
              {{ item.title }}
            </el-breadcrumb-item>
          </el-breadcrumb>
        </div>

        <div class="header-right">
          <el-badge :value="unreadReminders" :max="99" class="reminder-badge">
            <el-button :icon="Bell" circle @click="$router.push('/reminders')" />
          </el-badge>

          <el-dropdown trigger="click" @command="handleCommand">
            <div class="user-info">
              <el-avatar :size="32" :icon="UserFilled" />
              <span class="username">{{ userStore.username }}</span>
              <el-icon><ArrowDown /></el-icon>
            </div>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="profile">
                  <el-icon><User /></el-icon>个人中心
                </el-dropdown-item>
                <el-dropdown-item command="password">
                  <el-icon><Lock /></el-icon>修改密码
                </el-dropdown-item>
                <el-dropdown-item command="logout" divided>
                  <el-icon><SwitchButton /></el-icon>退出登录
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>

      <el-main class="main-content">
        <router-view v-slot="{ Component }">
          <transition name="fade-transform" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAppStore, useUserStore } from '@/stores'

const route = useRoute()
const router = useRouter()
const appStore = useAppStore()
const userStore = useUserStore()

const sidebarCollapsed = computed(() => appStore.sidebarCollapsed)

const activeMenu = computed(() => {
  const path = route.path
  if (path.startsWith('/policies')) return '/policies'
  if (path.startsWith('/enterprises')) return '/enterprises'
  return path
})

const breadcrumbs = computed(() => {
  const matched = route.matched.filter(item => item.meta && item.meta.title)
  return matched.map(item => ({
    title: item.meta.title,
    path: item.path || '/'
  }))
})

const unreadReminders = ref(0)

const handleCommand = (command) => {
  switch (command) {
    case 'profile':
      break
    case 'password':
      break
    case 'logout':
      userStore.logout()
      router.push('/login')
      break
  }
}
</script>

<style lang="scss" scoped>
.main-layout {
  height: 100vh;
}

.sidebar {
  background-color: #001529;
  transition: width 0.3s;
  overflow: hidden;

  .logo-container {
    height: 64px;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 16px;
    border-bottom: 1px solid #ffffff10;

    .logo-img {
      width: 32px;
      height: 32px;
    }

    .logo-text {
      margin-left: 12px;
      font-size: 18px;
      font-weight: bold;
      color: #fff;
      white-space: nowrap;
    }
  }

  :deep(.el-menu) {
    border-right: none;
  }
}

.header {
  background: #fff;
  box-shadow: 0 1px 4px rgba(0, 21, 41, 0.08);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  height: 64px;

  .header-left {
    display: flex;
    align-items: center;
    gap: 16px;

    .collapse-btn {
      cursor: pointer;
      color: #666;
      
      &:hover {
        color: #1890ff;
      }
    }
  }

  .header-right {
    display: flex;
    align-items: center;
    gap: 20px;

    .reminder-badge {
      cursor: pointer;
    }

    .user-info {
      display: flex;
      align-items: center;
      cursor: pointer;
      gap: 8px;

      .username {
        font-size: 14px;
        color: #333;
      }
    }
  }
}

.main-content {
  background-color: #f0f2f5;
  padding: 20px;
  overflow-y: auto;
}

.fade-transform-enter-active,
.fade-transform-leave-active {
  transition: all 0.3s;
}

.fade-transform-enter-from {
  opacity: 0;
  transform: translateX(-30px);
}

.fade-transform-leave-to {
  opacity: 0;
  transform: translateX(30px);
}
</style>
