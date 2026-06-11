import React, { useState, useEffect } from 'react'
import { Layout, Menu, Avatar, Dropdown, Button, Badge, Tag } from 'antd'
import { useNavigate, useLocation, Outlet } from 'react-router-dom'
import {
  DashboardOutlined,
  ShoppingOutlined,
  SyncOutlined,
  FileDoneOutlined,
  TeamOutlined,
  ShopOutlined,
  MoneyCollectOutlined,
  SettingOutlined,
  HistoryOutlined,
  BankOutlined,
  WarningOutlined,
  PlusOutlined,
  ListOutlined,
  MinusCircleOutlined,
  ClockCircleOutlined,
  LogoutOutlined,
  UserOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'

const { Header, Sider, Content } = Layout

const ICON_MAP = {
  dashboard: DashboardOutlined,
  my_orders: ShoppingOutlined,
  order_management: ShoppingOutlined,
  my_commission: MoneyCollectOutlined,
  my_payables: BankOutlined,
  my_aftersales: SyncOutlined,
  aftersale_management: SyncOutlined,
  dispute_management: WarningOutlined,
  my_settlements: FileDoneOutlined,
  settlement_management: FileDoneOutlined,
  settlement_generate: PlusOutlined,
  settlement_list: ListOutlined,
  settlement_pending: ClockCircleOutlined,
  deduction_details: MinusCircleOutlined,
  leader_management: TeamOutlined,
  leader_commission: MoneyCollectOutlined,
  supplier_management: ShopOutlined,
  supplier_payables: BankOutlined,
  commission_rules: SettingOutlined,
  audit_logs: HistoryOutlined,
  payment_records: BankOutlined,
}

function renderIcon(code) {
  const Icon = ICON_MAP[code] || DashboardOutlined
  return <Icon />
}

function buildMenuItems(menus, parentPath = '') {
  return menus
    .filter((m) => m.permissions?.can_view)
    .map((m) => {
      const fullPath = m.path.startsWith('/') ? m.path : `${parentPath}/${m.path}`
      const item = {
        key: fullPath,
        icon: renderIcon(m.code),
        label: m.name,
      }
      if (m.children && m.children.length > 0) {
        item.children = buildMenuItems(m.children, m.path)
      }
      return item
    })
}

export default function MainLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(false)
  const [user, setUser] = useState(null)
  const [selectedKeys, setSelectedKeys] = useState([])
  const [openKeys, setOpenKeys] = useState([])

  useEffect(() => {
    const userStr = localStorage.getItem('user')
    if (userStr) {
      setUser(JSON.parse(userStr))
    }
  }, [])

  useEffect(() => {
    const path = location.pathname
    setSelectedKeys([path])
    const parts = path.split('/').filter(Boolean)
    if (parts.length >= 2) {
      setOpenKeys(['/' + parts[0] + '/' + parts[1]])
    }
  }, [location.pathname])

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    navigate('/login')
  }

  if (!user) return null

  const menuItems = buildMenuItems(user.menus || [])

  const roleColor = {
    leader: 'cyan',
    supplier: 'purple',
    operation_accountant: 'blue',
    customer_service: 'orange',
    finance_reviewer: 'green',
  }

  const userMenu = {
    items: [
      {
        key: 'profile',
        icon: <UserOutlined />,
        label: (
          <div>
            <div style={{ fontWeight: 600 }}>{user.full_name}</div>
            <div style={{ fontSize: 12, color: '#888' }}>{user.role_name || user.role}</div>
          </div>
        ),
        disabled: true,
      },
      { type: 'divider' },
      {
        key: 'logout',
        icon: <LogoutOutlined />,
        label: '退出登录',
        onClick: handleLogout,
      },
    ],
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        theme="dark"
        width={240}
      >
        <div
          style={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#001529',
            color: '#fff',
            fontSize: collapsed ? 14 : 16,
            fontWeight: 700,
            letterSpacing: 1,
            borderBottom: '1px solid #002140',
          }}
        >
          {collapsed ? '结算' : '🏪 团长结算系统'}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={selectedKeys}
          defaultOpenKeys={openKeys}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>
      <Layout>
        <Header
          style={{
            background: '#fff',
            padding: '0 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
            zIndex: 10,
          }}
        >
          <div>
            <span style={{ fontSize: 18, fontWeight: 600, color: '#262626' }}>
              社群团购团长结算平台
            </span>
            <Tag
              color={roleColor[user.role] || 'default'}
              style={{ marginLeft: 12, fontSize: 13 }}
            >
              {user.role_name || user.role}
            </Tag>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ fontSize: 13, color: '#8c8c8c' }}>
              {dayjs().format('YYYY-MM-DD dddd')}
            </span>
            <Dropdown menu={userMenu} placement="bottomRight">
              <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Avatar
                  size="small"
                  style={{ backgroundColor: roleColor[user.role] }}
                  icon={<UserOutlined />}
                />
                <span style={{ color: '#262626' }}>{user.full_name}</span>
              </div>
            </Dropdown>
          </div>
        </Header>
        <Content
          style={{
            margin: 0,
            padding: 24,
            background: '#f0f2f5',
            minHeight: 'calc(100vh - 64px)',
          }}
        >
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  )
}
