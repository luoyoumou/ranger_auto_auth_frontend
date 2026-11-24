import { createRouter, createWebHistory } from 'vue-router'
import Layout from '../layout/Layout.vue'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/login/index.vue')
  },
  {
    path: '/',
    component: Layout,
    redirect: '/system/user',
    children: [
      {
        path: 'system/user',
        name: 'UserManage',
        component: () => import('../views/system/user/index.vue'),
        meta: { title: '用户管理' }
      },
      {
        path: 'system/cluster',
        name: 'ClusterManage',
        component: () => import('../views/system/cluster/index.vue'),
        meta: { title: '集群管理' }
      },
      {
        path: 'system/policy',
        name: 'PolicyManage',
        component: () => import('../views/system/policy/index.vue'),
        meta: { title: 'Ranger 权限管理' }
      }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 【核心修复区】：彻底去掉 next() 参数
router.beforeEach((to, from) => {
  const token = localStorage.getItem('token')
  
  // 如果去登录页，且已经登录了，直接返回首页（跳转）
  if (to.path === '/login' && token) {
    return '/'
  }
  
  // 如果去其他页面，且没有 token，直接返回登录页（跳转）
  if (to.path !== '/login' && !token) {
    return '/login'
  }
  
  // 其他情况直接放行（返回 true 等同于 next()）
  return true
})

export default router