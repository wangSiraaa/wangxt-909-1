import axios from 'axios'
import { message } from 'antd'

const API_BASE = '/api'

const request = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
})

request.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

request.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response) {
      const { status, data } = error.response
      if (status === 401) {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        message.error('登录已过期，请重新登录')
        if (window.location.pathname !== '/login') {
          window.location.href = '/login'
        }
      } else if (status === 403) {
        message.error(data?.detail || '权限不足，无法执行此操作')
      } else if (status === 409) {
        message.warning(data?.detail?.message || '操作冲突')
        return Promise.reject(data?.detail || error)
      } else if (data?.detail) {
        message.error(typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail))
      } else {
        message.error(`请求失败 (${status})`)
      }
    } else if (error.message?.includes('timeout')) {
      message.error('请求超时，请稍后重试')
    } else if (error.message) {
      message.error(error.message)
    }
    return Promise.reject(error)
  }
)

export const authApi = {
  login: (username, password) =>
    request.post('/auth/login', { username, password }),
}

export const settlementApi = {
  trialCalculation: (periodStart, periodEnd) =>
    request.post('/settlements/trial-calculation', {
      period_start: periodStart,
      period_end: periodEnd,
    }),
  generate: (periodStart, periodEnd) =>
    request.post('/settlements/generate', {
      period_start: periodStart,
      period_end: periodEnd,
    }),
  list: (params = {}) => request.get('/settlements', { params }),
  detail: (id) => request.get(`/settlements/${id}`),
  review: (id) => request.post(`/settlements/${id}/review`),
  financeApprove: (id) => request.post(`/settlements/${id}/finance-approve`),
  pay: (id) => request.post(`/settlements/${id}/pay`),
  deductions: (id) => request.get(`/settlements/${id}/deductions`),
  export: (id, type = 'all') =>
    request.get(`/settlements/${id}/export`, { params: { export_type: type } }),
}

export const commonApi = {
  getOrders: (params = {}) => request.get('/orders', { params }),
  getOrderDetail: (id) => request.get(`/orders/${id}`),
  updateDispute: (id, data) => request.put(`/orders/${id}/dispute`, data),
  getAftersales: (params = {}) => request.get('/aftersales', { params }),
  processAftersale: (id, data) => request.post(`/aftersales/${id}/process`, data),
  getLeaders: (params = {}) => request.get('/leaders', { params }),
  getSuppliers: (params = {}) => request.get('/suppliers', { params }),
  getLeaderLevels: () => request.get('/leader-levels'),
  getCommissionRules: () => request.get('/commission-rules'),
  getAuditLogs: (params = {}) => request.get('/audit-logs', { params }),
  getPayments: (params = {}) => request.get('/payments', { params }),
  getDisputes: (params = {}) => request.get('/disputes', { params }),
  getMyLeaderInfo: () => request.get('/me/leader-info'),
  getMySupplierInfo: () => request.get('/me/supplier-info'),
  getMyCommissionSummary: () => request.get('/me/commission-summary'),
  getDashboardStats: () => request.get('/dashboard/stats'),
}

export const healthCheck = () =>
  axios.get('/health', { timeout: 5000 }).then((r) => r.data)

export default request
