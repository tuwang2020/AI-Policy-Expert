import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useAppStore = defineStore('app', () => {
  const sidebarCollapsed = ref(false)
  const isMobile = ref(window.innerWidth < 768)
  
  function toggleSidebar() {
    sidebarCollapsed.value = !sidebarCollapsed.value
  }

  function setMobile(value) {
    isMobile.value = value
  }

  return {
    sidebarCollapsed,
    isMobile,
    toggleSidebar,
    setMobile
  }
})
