import React, { useEffect, useState } from 'react'
import { Card, Col, Row, Statistic, Progress, Table, Tag, Empty } from 'antd'
import {
  ShoppingOutlined,
  MoneyCollectOutlined,
  SyncOutlined,
  FileDoneOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  TeamOutlined,
  ShopOutlined,
  BankOutlined,
  DollarOutlined,
  UserOutlined,
  WarningOutlined,
} from '@ant-design/icons'
import { commonApi } from '../services/api.js'
import dayjs from 'dayjs'

const ROLE_DASHBOARD_CONFIG = {
  leader: {
    title: '团长工作台',
    subtitle: '我的佣金、订单与售后',
  },
  supplier: {
    title: '供应商工作台',
    subtitle: '我的货款、供货订单',
  },
  customer_service: {
    title: '客服工作台',
    subtitle: '待处理售后与争议订单',
  },
  operation_accountant: {
    title: '运营会计工作台',
    subtitle: '结算批次与订单管理',
  },
  finance_reviewer: {
    title: '财务工作台',
    subtitle: '待复核结算与付款',
  },
}

export default function Dashboard() {
  const [stats, setStats] = useState({})
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const userStr = localStorage.getItem('user')
    if (userStr) setUser(JSON.parse(userStr))
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const data = await commonApi.getDashboardStats()
      setStats(data || {})
    } finally {
      setLoading(false)
    }
  }

  const cfg = ROLE_DASHBOARD_CONFIG[user?.role] || { title: '工作台', subtitle: '' }

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ margin: 0 }}>{cfg.title}</h2>
        <p style={{ color: '#8c8c8c', margin: '4px 0 0' }}>{cfg.subtitle}</p>
      </div>

      {user?.role === 'leader' && <LeaderDashboard stats={stats} />}
      {user?.role === 'supplier' && <SupplierDashboard stats={stats} />}
      {user?.role === 'customer_service' && <CSDashboard stats={stats} />}
      {user?.role === 'operation_accountant' && <OpDashboard stats={stats} />}
      {user?.role === 'finance_reviewer' && <FinanceDashboard stats={stats} />}
      {!['leader', 'supplier', 'customer_service', 'operation_accountant', 'finance_reviewer'].includes(user?.role) && (
        <Empty description="暂无工作台数据" />
      )}
    </div>
  )
}

function CardItem({ title, value, prefix, suffix, icon, color, trend, progress }) {
  return (
    <Card style={{ borderRadius: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ color: '#8c8c8c', fontSize: 13, marginBottom: 8 }}>{title}</div>
          <Statistic
            value={value}
            prefix={prefix}
            suffix={suffix}
            valueStyle={{ fontSize: 26, fontWeight: 700, color: color || '#262626' }}
          />
          {trend && <div style={{ fontSize: 12, color: trend > 0 ? '#52c41a' : '#ff4d4f', marginTop: 4 }}>
            {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}% 较上期
          </div>}
        </div>
        <div style={{
          width: 48, height: 48, borderRadius: 12,
          background: `${color || '#1677ff'}15`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 22, color: color || '#1677ff'
        }}>
          {icon}
        </div>
      </div>
      {progress != null && (
        <Progress percent={progress} showInfo={false} style={{ marginTop: 12, marginBottom: 0 }} />
      )}
    </Card>
  )
}

function LeaderDashboard({ stats }) {
  return (
    <div>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={6}>
          <CardItem
            title="累计佣金总额" value={stats.total_commission || 0}
            prefix="¥" icon={<MoneyCollectOutlined />} color="#722ed1"
            progress={85}
          />
        </Col>
        <Col xs={24} sm={12} md={6}>
          <CardItem
            title="已结算佣金" value={stats.settled_commission || 0}
            prefix="¥" icon={<CheckCircleOutlined />} color="#52c41a"
            progress={70}
          />
        </Col>
        <Col xs={24} sm={12} md={6}>
          <CardItem
            title="待结算佣金" value={stats.pending_commission || 0}
            prefix="¥" icon={<ClockCircleOutlined />} color="#faad14"
            progress={30}
          />
        </Col>
        <Col xs={24} sm={12} md={6}>
          <CardItem
            title="总订单数" value={stats.total_orders || 0}
            suffix="单" icon={<ShoppingOutlined />} color="#1677ff"
          />
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} md={12}>
          <Card title="佣金构成" bordered={false} style={{ borderRadius: 8 }}>
            <SimpleBarChart
              data={[
                { label: '基础佣金', value: (stats.settled_commission || 0) * 0.7, color: '#1677ff' },
                { label: '等级奖励', value: (stats.settled_commission || 0) * 0.2, color: '#722ed1' },
                { label: '活动奖励', value: (stats.settled_commission || 0) * 0.1, color: '#52c41a' },
              ]}
            />
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card title="订单状态" bordered={false} style={{ borderRadius: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-around', padding: 20 }}>
              <StatusItem label="已完成" count={stats.total_orders || 0} color="#52c41a" />
              <StatusItem label="售后中" count={stats.pending_aftersales || 0} color="#faad14" />
              <StatusItem label="已退款" count={stats.refund_order_count || 0} color="#ff4d4f" />
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  )
}

function SupplierDashboard({ stats }) {
  return (
    <div>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={6}>
          <CardItem title="货款总额" value={stats.total_payable || 0} prefix="¥" icon={<BankOutlined />} color="#1677ff" />
        </Col>
        <Col xs={24} sm={12} md={6}>
          <CardItem title="已付款" value={stats.paid_amount || 0} prefix="¥" icon={<CheckCircleOutlined />} color="#52c41a" />
        </Col>
        <Col xs={24} sm={12} md={6}>
          <CardItem title="待付款" value={stats.pending_amount || 0} prefix="¥" icon={<ClockCircleOutlined />} color="#faad14" />
        </Col>
        <Col xs={24} sm={12} md={6}>
          <CardItem title="供货订单" value={stats.total_orders || 0} suffix="单" icon={<ShoppingOutlined />} color="#722ed1" />
        </Col>
      </Row>
    </div>
  )
}

function CSDashboard({ stats }) {
  return (
    <div>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={6}>
          <CardItem
            title="待处理售后" value={stats.pending_aftersales || 0}
            suffix="单" icon={<SyncOutlined />} color="#faad14"
          />
        </Col>
        <Col xs={24} sm={12} md={6}>
          <CardItem
            title="待确认争议" value={stats.pending_disputes || 0}
            suffix="单" icon={<WarningOutlined />} color="#ff4d4f"
          />
        </Col>
        <Col xs={24} sm={12} md={6}>
          <CardItem
            title="今日处理" value={stats.today_processed || 0}
            suffix="单" icon={<CheckCircleOutlined />} color="#52c41a"
          />
        </Col>
      </Row>
    </div>
  )
}

function OpDashboard({ stats }) {
  return (
    <div>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={6}>
          <CardItem title="待生成结算" value={stats.draft_batches || 0} suffix="批次" icon={<ClockCircleOutlined />} color="#1677ff" />
        </Col>
        <Col xs={24} sm={12} md={6}>
          <CardItem title="待财务复核" value={stats.reviewed_batches || 0} suffix="批次" icon={<FileDoneOutlined />} color="#722ed1" />
        </Col>
        <Col xs={24} sm={12} md={6}>
          <CardItem title="已完成结算" value={stats.paid_batches || 0} suffix="批次" icon={<CheckCircleOutlined />} color="#52c41a" />
        </Col>
        <Col xs={24} sm={12} md={6}>
          <CardItem title="未完结售后" value={stats.pending_aftersales || 0} suffix="单" icon={<SyncOutlined />} color="#faad14" />
        </Col>
      </Row>
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} md={12}>
          <CardItem title="团长总数" value={stats.total_leaders || 0} suffix="人" icon={<TeamOutlined />} color="#13c2c2" />
        </Col>
        <Col xs={24} md={12}>
          <CardItem title="供应商总数" value={stats.total_suppliers || 0} suffix="家" icon={<ShopOutlined />} color="#eb2f96" />
        </Col>
      </Row>
    </div>
  )
}

function FinanceDashboard({ stats }) {
  return (
    <div>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={6}>
          <CardItem title="待财务确认" value={stats.pending_review || 0} suffix="批次" icon={<ClockCircleOutlined />} color="#faad14" />
        </Col>
        <Col xs={24} sm={12} md={6}>
          <CardItem title="待付款批次" value={stats.approved_batches || 0} suffix="批次" icon={<DollarOutlined />} color="#1677ff" />
        </Col>
        <Col xs={24} sm={12} md={6}>
          <CardItem title="已完成付款" value={stats.paid_batches || 0} suffix="批次" icon={<CheckCircleOutlined />} color="#52c41a" />
        </Col>
        <Col xs={24} sm={12} md={6}>
          <CardItem title="待付款总金额" value={stats.total_pending_payment || 0} prefix="¥" icon={<BankOutlined />} color="#722ed1" />
        </Col>
      </Row>
    </div>
  )
}

function StatusItem({ label, count, color }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 32, fontWeight: 700, color }}>{count}</div>
      <div style={{ fontSize: 13, color: '#8c8c8c', marginTop: 4 }}>{label}</div>
    </div>
  )
}

function SimpleBarChart({ data }) {
  const max = Math.max(...data.map((d) => d.value), 1)
  return (
    <div style={{ padding: '10px 0' }}>
      {data.map((d, i) => (
        <div key={i} style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
            <span>{d.label}</span>
            <span style={{ color: d.color, fontWeight: 600 }}>¥{d.value.toFixed(2)}</span>
          </div>
          <div style={{ height: 10, background: '#f0f0f0', borderRadius: 5, overflow: 'hidden' }}>
            <div style={{
              width: `${(d.value / max) * 100}%`,
              height: '100%', background: d.color, borderRadius: 5, transition: 'width .6s'
            }} />
          </div>
        </div>
      ))}
    </div>
  )
}
