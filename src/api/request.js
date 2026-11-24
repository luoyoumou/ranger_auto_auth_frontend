import axios from 'axios'
import { ElMessage } from 'element-plus'
import router from '../router'

const request = axios.create({
  baseURL: '/api/v1', // 配合 vite 代理
  timeout: 10000
})

// 请求拦截器：自动带 Token
request.interceptors.request.use(
  config => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`
    }
    return config
  },
  error => Promise.reject(error)
)

// 响应拦截器：统一处理错误
request.interceptors.response.use(
  response => {
    return response.data
  },
  error => {
    if (error.response) {
      if (error.response.status === 401) {
        ElMessage.error('登录已过期，请重新登录')
        localStorage.removeItem('token')
        router.push('/login')
      } else {
        let msg = '请求失败'
        const detail = error.response.data?.detail
        if (typeof detail === 'string') {
          msg = detail
        } else if (Array.isArray(detail)) {
          msg = detail.map(err => `${err.loc.join('.')}: ${err.msg}`).join('; ')
        }
        ElMessage.error(msg)
      }
    } else {
      ElMessage.error('网络异常，请检查后端服务是否启动')
    }
    return Promise.reject(error)
  }
)

export default request