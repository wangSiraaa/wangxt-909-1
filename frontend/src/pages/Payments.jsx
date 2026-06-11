import React, { useEffect, useState } from 'react'
import { Card, Table, Tag, Space, Statistic, Row, Col, Radio } from 'antd'
import dayjs from 'dayjs'
import { commonApi } from '../services/api.js'

export default function Payments() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState({})
  const [stats, setStats] = useState({ total: 0, completed: 0, leader: 0, supplier: 0 })

  const loadData = async (f = {}) => {
    setLoading(true)
    try {
      const d = await commonApi.getPayments(f)
      setData(d)
      setStats({
        total: d.reduce((s, x) => s + (x.amount || 0), 0),
        completed: d.filter(x => x.payment_status === 'completed').length,
        leader: d.filter(x => x.payee_type === 'leader').reduce((s, x) => s + (x.amount || 0), 0),
        supplier: d.filter(x => x.payee_type === 'supplier').reduce((s, x) => s + (x.amount || 0), 0),
      })
    } finally { setLoading(false) }
  }

  useEffect(() => { loadData() }, [])

  return (
    <div>
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={12} sm={6}>
          <Card size="small"><Statistic title="付款总额" prefix="¥" value={stats.total} precision={2} /></Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small"><Statistic title="已完成付款" value={stats.completed} valueStyle={{ color: '#52c41a' }} /></Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small"><Statistic title="佣金支付总额" prefix="¥" value={stats.leader} precision={2} valueStyle={{ color: '#722ed1' }} /></Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small"><Statistic title="货款支付总额" prefix="¥" value={stats.supplier} precision={2} valueStyle={{ color: '#1677ff' }} /></Card>
        </Col>
      </Row>

      <Card style={{ borderRadius: 8 }} title="付款记录（仅财务可见）">
        <Space style={{ marginBottom: 16 }}>
          <Radio.Group
            value={filter.payee_type}
            onChange={(e) => {
              const v = e.target.value
              const f = v ? { payee_type: v } : {}
              setFilter(f)
              loadData(f)
            }}
            defaultValue=""
          >
            <Radio.Button value="">全部</Radio.Button>
            <Radio.Button value="leader">团长佣金</Radio.Button>
            <Radio.Button value="supplier">供应商货款</Radio.Button>
          </Radio.Group>
        </Space>
        <Table
          rowKey="id"
          loading={loading}
          dataSource={data}
          pagination={{ pageSize: 20, showTotal: t => `共 ${t} 条` }}
          scroll={{ x: 1300 }}
          columns={[
            { title: '付款单号', dataIndex: 'payment_no', width: 220, render: v => <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{v}</span> },
            {
              title: '收款类型', dataIndex: 'payee_type', width: 120,
              render: v => v === 'leader' ? <Tag color="purple">团长佣金</Tag> : <Tag color="blue">供应商货款</Tag>
            },
            { title: '收款方', dataIndex: 'payee_name', width: 140 },
            { title: '关联批次', dataIndex: 'batch_no', width: 190, render: v => v ? <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{v}</span> : '-' },
            { title: '金额', dataIndex: 'amount', width: 120, render: v => <b style={{ color: v > 10000 ? '#f5222d' : '#333' }}>¥{v?.toFixed(2)}</b>, align: 'right' },
            {
              title: '状态', dataIndex: 'payment_status', width: 90,
              render: v => {
                const map = { pending: 'default', processing: 'processing', completed: 'green', failed: 'red' }
                const text = { pending: '待付款', processing: '处理中', completed: '已付款', failed: '失败' }
                return <Tag color={map[v]}>{text[v] || v}</Tag>
              }
            },
            { title: '付款方式', dataIndex: 'payment_method', width: 110, render: v => v === 'bank_transfer' ? '银行转账' : v || '-' },
            { title: '交易号', dataIndex: 'transaction_no', width: 200, render: v => v ? <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#666' }}>{v}</span> : '-' },
            { title: '操作员', dataIndex: 'operator_name', width: 90, render: v => v || '-' },
            { title: '付款时间', dataIndex: 'paid_at', width: 160, render: v => v ? dayjs(v).format('YYYY-MM-DD HH:mm') : '-' },
          ]}
        />
      </Card>
    </div>
  )
}
