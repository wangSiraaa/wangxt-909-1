import React, { useState, useEffect } from 'react'
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Spin } from 'antd'
import Login from './pages/Login.jsx'
import MainLayout from './components/MainLayout.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Orders from './pages/Orders.jsx'
import Aftersales from './pages/Aftersales.jsx'
import Settlements from './pages/Settlements.jsx'
import SettlementDetail from './pages/SettlementDetail.jsx'
import SettlementGenerate from './pages/SettlementGenerate.jsx'
import Deductions from './pages/Deductions.jsx'
import Leaders from './pages/Leaders.jsx'
import Suppliers from './pages/Suppliers.jsx'
import Commission from './pages/Commission.jsx'
import CommissionRules from './pages/CommissionRules.jsx'
import Disputes from './pages/Disputes.jsx'
import AuditLogs from './pages/AuditLogs.jsx'
import Payments from './pages/Payments.jsx'

export function AuthGuard({ children }) {
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    const token = localStorage.getItem('token')
    const userStr = localStorage.getItem('user')
    if (token && userStr) {
      try {
        setUser(JSON.parse(userStr))
      } catch (e) {
          navigate('/login')
        }
      }
    } else if (location.pathname !== '/login') {
      navigate('/login')
    }
    setLoading(false)
  }, [location.pathname, navigate])

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" />
      </div>
    )
  }

  if (!user && location.pathname !== '/login') {
    return <Navigate to="/login" replace />
  }

  return children
}

export function RoleGuard({ roles, children }) {
  const userStr = localStorage.getItem('user')
  const user = userStr ? JSON.parse(userStr) : null
  if (!user) return <Navigate to="/login" replace />
  if (roles && !roles.includes(user.role)) {
    return <div style={{ padding: 50, textAlign: 'center' }}>
      <h2>权限不足</h2>
      <p>您的角色 [{user.role_name || user.role} 无法访问此页面</p>
    </div>
  }
  return children
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <AuthGuard>
            <MainLayout />
          </AuthGuard>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="orders" element={<Orders />} />
        <Route path="aftersales" element={<Aftersales />} />
        <Route path="settlements/generate" element={
          <RoleGuard roles={['operation_accountant', 'finance_reviewer']}>
            <SettlementGenerate />
          </RoleGuard>
        } />
        <Route path="settlements/list" element={<Settlements />} />
        <Route path="settlements/pending" element={
          <RoleGuard roles={['operation_accountant', 'finance_reviewer']}>
            <Settlements pending />
          </RoleGuard>
        } />
        <Route path="settlements/:id" element={<SettlementDetail />} />
        <Route path="settlements/deductions" element={<Deductions />} />
        <Route path="settlements" element={<Navigate to="/settlements/list" replace />} />
        <Route path="leaders" element={<Leaders />} />
        <Route path="leaders/commission" element={<Commission role="leader" />} />
        <Route path="suppliers" element={<Suppliers />} />
        <Route path="suppliers/payables" element={<Commission role="supplier" />} />
        <Route path="commission" element={<Commission />} />
        <Route path="payments" element={<Payments />} />
        <Route path="disputes" element={
          <RoleGuard roles={['customer_service']}>
            <Disputes />
          </RoleGuard>
        } />
        <Route path="audit-logs" element={
          <RoleGuard roles={['operation_accountant', 'finance_reviewer']}>
            <AuditLogs />
          </RoleGuard>
        } />
        <Route path="commission-rules" element={
          <RoleGuard roles={['operation_accountant']}>
            <CommissionRules />
          </RoleGuard>
        } />
        <Route path="*" element={
          <div style={{ padding: 50, textAlign: 'center' }}>
          <h2>404 页面不存在</h2>
        </div>
        } />
      </Route>
    </Routes>
  )
}
