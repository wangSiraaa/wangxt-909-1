import React, { useEffect, useState } from 'react'
import { Card, Tabs, Table, Tag, Space, Statistic, Row, Col, Alert } from 'antd'
import { commonApi, settlementApi } from '../services/api.js'
import dayjs from 'dayjs'

export default function Commission({ role }) {
  const [user, setUser] = useState(null)
  const [leaders, setLeaders] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const us = localStorage.getItem('user')
    if (us) setUser(JSON.parse(us))
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [ls, ss] = await Promise.all([commonApi.getLeaders(), commonApi.getSuppliers()])
      setLeaders(ls)
      setSuppliers(ss)
    } finally {
      setLoading(false)
    }
  }

  const isLeaderView = role === 'leader' || user?.role === 'leader'
  const isSupplierView = role === 'supplier' || user?.role === 'supplier'

  const showLeader = isLeaderView || !isSupplierView
  const showSupplier = isSupplierView || !isLeaderView

  if (isLeaderView) {
    return (
      <MyCommissionView />
    )
  }

  if (isSupplierView) {
    return (
      <MySupplierView />
    )
  }

  return (
    <div>
      <Card style={{ borderRadius: 8 }}>
        <Tabs
          items={[
            showLeader && {
              key: 'leaders',
              label: '团长佣金明细',
              children: (
                <Table
                  rowKey="id"
                  size="small"
                  loading={loading}
                  dataSource={leaders}
                  pagination={{ pageSize: 20 }}
                  columns={[
                    { title: '团长编号', dataIndex: 'leader_code', width: 130 },
                    { title: '姓名', dataIndex: 'full_name' },
                    { title: '等级', dataIndex: 'level_name', width: 100, render: v => <Tag color="blue">{v}</Tag> },
                    { title: '佣金率', dataIndex: 'commission_rate', width: 90, render: v => `${(v*100).toFixed(1)}%` },
                    { title: '累计佣金', width: 120, dataIndex: 'total_commission', render: v => <b>¥{v?.toFixed(2)}</b>, align: 'right' },
                    { title: '已结佣金', width: 120, dataIndex: 'settled_commission', render: v => <span style={{ color: '#52c41a' }}>¥{v?.toFixed(2)}</span>, align: 'right' },
                    { title: '待结佣金', width: 120, dataIndex: 'pending_commission', render: v => <span style={{ color: '#fa8c16' }}>¥{v?.toFixed(2)}</span>, align: 'right' },
                  ]}
                />
              )
            },
            showSupplier && {
              key: 'suppliers',
              label: '供应商货款明细',
              children: (
                <Table
                  rowKey="id"
                  size="small"
                  loading={loading}
                  dataSource={suppliers}
                  pagination={{ pageSize: 20 }}
                  columns={[
                    { title: '供应商编码', dataIndex: 'supplier_code', width: 130 },
                    { title: '名称', dataIndex: 'supplier_name' },
                    { title: '联系人', dataIndex: 'contact_person', width: 100 },
                    { title: '货款总额', width: 130, dataIndex: 'total_payable', render: v => <b>¥{v?.toFixed(2)}</b>, align: 'right' },
                    { title: '已付货款', width: 130, dataIndex: 'paid_amount', render: v => <span style={{ color: '#52c41a' }}>¥{v?.toFixed(2)}</span>, align: 'right' },
                    { title: '待付货款', width: 130, dataIndex: 'pending_amount', render: v => <span style={{ color: '#1677ff' }}>¥{v?.toFixed(2)}</span>, align: 'right' },
                  ]}
                />
              )
            },
          ].filter(Boolean)}
        />
      </Card>
    </div>
  )
}

function MyCommissionView() {
  const [info, setInfo] = useState(null)
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      try {
        const [info, orders] = await Promise.all([
          commonApi.getMyLeaderInfo(),
          commonApi.getOrders(),
        ])
        setInfo(info)
        setOrders(orders)
      } finally { setLoading(false) }
    })()
  }, [])

  return (
    <div>
      {info && (
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col xs={24} sm={12} md={6}><Card><Statistic title="我的等级" value={info.level_name} /></Card></Col>
          <Col xs={24} sm={12} md={6}><Card><Statistic title="佣金率" value={info.commission_rate * 100} suffix="%" precision={1} /></Card></Col>
          <Col xs={24} sm={12} md={6}><Card><Statistic title="累计佣金" prefix="¥" value={info.total_commission} precision={2} valueStyle={{ color: '#722ed1' }} /></Card></Col>
          <Col xs={24} sm={12} md={6}><Card><Statistic title="待结佣金" prefix="¥" value={info.pending_commission} precision={2} valueStyle={{ color: '#fa8c16' }} /></Card></Col>
        </Row>
      )}
      <Card title="我的订单佣金明细" style={{ borderRadius: 8 }}>
        <Table
          rowKey="id"
          loading={loading}
          dataSource={orders}
          pagination={{ pageSize: 20 }}
          columns={[
            { title: '订单号', dataIndex: 'order_no', width: 170, render: v => <span style={{ fontFamily: 'monospace' }}>{v}</span> },
            { title: '商品', dataIndex: 'product_name' },
            { title: '金额', width: 110, dataIndex: 'order_amount', render: v => `¥${v?.toFixed(2)}`, align: 'right' },
            { title: '佣金率', width: 90, dataIndex: 'commission_rate', render: v => `${(v*100).toFixed(1)}%`, align: 'right' },
            { title: '佣金', width: 110, dataIndex: 'commission_amount', render: v => <b style={{ color: '#722ed1' }}>¥{v?.toFixed(2)}</b>, align: 'right' },
            { title: '退款', width: 100, dataIndex: 'refund_amount', render: v => v > 0 ? <Tag color="red">-¥{v?.toFixed(2)}</Tag> : '-', align: 'right' },
            { title: '售后', width: 110, dataIndex: 'aftersale_status', render: v => v === 'none' ? <Tag color="default">无</Tag> : <Tag color="orange">{v}</Tag> },
            { title: '下单时间', dataIndex: 'order_date', width: 160, render: v => v ? dayjs(v).format('YYYY-MM-DD HH:mm') : '-' },
          ]}
        />
      </Card>
    </div>
  )
}

function MySupplierView() {
  const [info, setInfo] = useState(null)
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      try {
        const [info, payments] = await Promise.all([
          commonApi.getMySupplierInfo(),
          commonApi.getPayments(),
        ])
        setInfo(info)
        setPayments(payments)
      } finally { setLoading(false) }
    })()
  }, [])

  return (
    <div>
      {info && (
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col xs={24} sm={8} md={6}><Card><Statistic title="货款总额" prefix="¥" value={info.total_payable} precision={2} /></Card></Col>
          <Col xs={24} sm={8} md={6}><Card><Statistic title="已付货款" prefix="¥" value={info.paid_amount} precision={2} valueStyle={{ color: '#52c41a' }} /></Card></Col>
          <Col xs={24} sm={8} md={6}><Card><Statistic title="待付货款" prefix="¥" value={info.pending_amount} precision={2} valueStyle={{ color: '#1677ff' }} /></Card></Col>
          <Col xs={24} md={6}><Card type="inner" title="收款账户">
            <div style={{ fontSize: 13 }}>
              <div>{info.bank_name || '-'}</div>
              <div style={{ fontFamily: 'monospace', marginTop: 4 }}>{info.bank_account || '-'}</div>
            </div>
          </Card></Col>
        </Row>
      )}
      <Card title="我的付款记录" style={{ borderRadius: 8 }}>
        <Table
          rowKey="id"
          loading={loading}
          dataSource={payments}
          pagination={{ pageSize: 20 }}
          columns={[
            { title: '付款单号', dataIndex: 'payment_no', width: 200, render: v => <span style={{ fontFamily: 'monospace' }}>{v}</span> },
            { title: '关联批次', dataIndex: 'batch_no', width: 180, render: v => v || '-' },
            { title: '金额', width: 120, dataIndex: 'amount', render: v => <b>¥{v?.toFixed(2)}</b>, align: 'right' },
            { title: '状态', width: 100, dataIndex: 'payment_status', render: v => <Tag color="green">{v === 'completed' ? '已到账' : v}</Tag> },
            { title: '付款方式', dataIndex: 'payment_method', width: 120, render: v => v === 'bank_transfer' ? '银行转账' : v || '-' },
            { title: '交易号', dataIndex: 'transaction_no', width: 180, render: v => v ? <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{v}</span> : '-' },
            { title: '付款时间', dataIndex: 'paid_at', width: 160, render: v => v ? dayjs(v).format('YYYY-MM-DD HH:mm') : '-' },
          ]}
        />
      </Card>
    </div>
  )
}
