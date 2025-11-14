import axios, { AxiosInstance, AxiosError } from 'axios'
import { toast } from 'sonner'

const apiClient: AxiosInstance = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// 请求拦截器
apiClient.interceptors.request.use(
  (config) => {
    // 从 localStorage 获取 token（如果有）
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 响应拦截器
apiClient.interceptors.response.use(
  (response) => {
    return response.data
  },
  (error: AxiosError) => {
    if (error.response) {
      const status = error.response.status
      const message = (error.response.data as any)?.message || '请求失败'

      switch (status) {
        case 401:
          toast.error('未授权，请重新登录')
          // 清除 token 并跳转到登录页
          localStorage.removeItem('token')
          break
        case 403:
          toast.error('没有权限访问')
          break
        case 404:
          toast.error('请求的资源不存在')
          break
        case 500:
          toast.error('服务器错误，请稍后重试')
          break
        default:
          toast.error(message)
      }
    } else if (error.request) {
      toast.error('网络错误，请检查您的网络连接')
    } else {
      toast.error('请求失败，请稍后重试')
    }
    
    return Promise.reject(error)
  }
)

export default apiClient
