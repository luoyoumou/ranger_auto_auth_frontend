<template>
  <el-container class="layout-container">
    <!-- 侧边栏 -->
    <el-aside width="220px" class="aside">
      <div class="logo">
        <el-icon :size="24" color="#409eff"><Monitor /></el-icon>
        <span>Ranger 管理台</span>
      </div>
      
      <el-menu
        active-text-color="#ffffff"
        background-color="#1e293b"
        text-color="#94a3b8"
        router
        :default-active="$route.path"
        class="el-menu-vertical"
      >
        <el-menu-item index="/system/user">
          <el-icon><User /></el-icon>
          <span>用户管理</span>
        </el-menu-item>
        
        <el-menu-item index="/system/cluster">
          <el-icon><Platform /></el-icon>
          <span>集群管理</span>
        </el-menu-item>

        <el-menu-item index="/system/policy">
          <el-icon><Key /></el-icon>
          <span>Ranger 权限管理</span>
        </el-menu-item>
      </el-menu>
    </el-aside>

    <!-- 右侧内容 -->
    <el-container class="main-container">
      <!-- 头部 -->
      <el-header class="header">
        <div class="header-left">
          <el-breadcrumb separator="/">
            <el-breadcrumb-item :to="{ path: '/' }">首页</el-breadcrumb-item>
            <el-breadcrumb-item>{{ $route.meta.title || '页面' }}</el-breadcrumb-item>
          </el-breadcrumb>
        </div>
        <div class="header-right">
          <el-dropdown>
            <span class="user-info">
              <el-avatar :size="32" style="background-color: #409eff; margin-right: 8px;">
                {{ username.charAt(0).toUpperCase() }}
              </el-avatar>
              <span class="username">{{ username }}</span>
              <el-icon><ArrowDown /></el-icon>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item @click="handleLogout">退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>

      <!-- 主体内容 -->
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
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessageBox } from 'element-plus'
import { User, Platform, Key, Monitor, ArrowDown } from '@element-plus/icons-vue'

const router = useRouter()

const username = computed(() => {
  const info = JSON.parse(localStorage.getItem('user_info') || '{}')
  return info.username || 'Admin'
})

const handleLogout = () => {
  ElMessageBox.confirm('确定要退出登录吗?', '提示', {
    confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning',
  }).then(() => {
    localStorage.removeItem('token')
    localStorage.removeItem('user_info')
    router.push('/login')
  }).catch(() => {})
}
</script>

<style scoped>
.layout-container {
  height: 100vh;
  overflow: hidden;
}

/* 侧边栏样式 */
.aside {
  background-color: #1e293b;
  display: flex;
  flex-direction: column;
  box-shadow: 2px 0 8px 0 rgba(29,35,41,.05);
  z-index: 10;
}

.logo {
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 18px;
  font-weight: 700;
  letter-spacing: 1px;
  background-color: #0f172a;
  border-bottom: 1px solid rgba(255,255,255,0.05);
}
.logo span {
  margin-left: 10px;
}

.el-menu-vertical {
  border-right: none;
  flex: 1;
}

/* 菜单悬浮效果 */
.el-menu-item:hover {
  background-color: #334155 !important;
}
.el-menu-item.is-active {
  background-color: #3b82f6 !important;
  color: #fff !important;
}

/* 头部样式 */
.header {
  height: 64px;
  background-color: #fff;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 1px 4px rgba(0,21,41,.08);
  z-index: 9;
  padding: 0 24px;
}

.header-right .user-info {
  display: flex;
  align-items: center;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 8px;
  transition: background 0.3s;
}
.header-right .user-info:hover {
  background-color: #f1f5f9;
}
.username {
  font-size: 14px;
  font-weight: 500;
  color: #333;
  margin-right: 8px;
}

/* 主体内容 */
.main-container {
  background-color: #f4f7f9;
}
.main-content {
  padding: 24px;
  overflow-y: auto;
}

/* 路由切换动画 */
.fade-transform-enter-active,
.fade-transform-leave-active {
  transition: all 0.3s;
}
.fade-transform-enter-from {
  opacity: 0;
  transform: translateX(-10px);
}
.fade-transform-leave-to {
  opacity: 0;
  transform: translateX(10px);
}
</style>