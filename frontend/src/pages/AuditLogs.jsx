import React, { useEffect, useState } from 'react'
import { Card, Table, Tag, Space, Select, Input, Form, Statistic, Row, Col } from 'antd'
import dayjs from 'dayjs'
import { commonApi } from '../services/api.js'

const OP_COLORS = {
  LOGIN: 'blue',
  LOGOUT: 'default',
  SETTLEMENT_TRIAL: 'cyan',
  SETTLEMENT_GENERATE: 'geekblue',
  SETTLEMENT_REVIEW: 'orange',
  SETTLEMENT_FINANCE_APPROVE: 'purple',
  SETTLEMENT_PAY: 'green',
  SETTLEMENT_EXPORT: 'magenta',
  AFTERSALE_UPDATE: 'red',
  DISPUTE_UPDATE: 'volcano',
  LEADER_LEVEL_CHANGE: 'gold',
}

export default function AuditLogs() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState({})
  const [stats, setStats] = useState({ total: 0, today: 0, settlement: 0, payment: 0 })

  const loadData = async (f = {}) => {
    setLoading(true)
    try {
      const d = await commonApi.getAuditLogs(f)
      setData(d)
      setStats({
        total: d.length,
        today: d.filter(x => dayjs(x.created_at).isSame(dayjs(), 'day')).length,
        settlement: d.filter(x => x.operation_type?.startsWith('SETTLEMENT')).length,
        payment: d.filter(x => x.operation_type === 'SETTLEMENT_PAY').length,
      })
    } finally { setLoading(false) }
  }

  useEffect(() => { loadData() }, [])

  return (
    <div>
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={12} sm={6}><Card size="small"><Statistic title="总审计日志" value={stats.total} /></Card></Col>
        <Col xs={12} sm={6}><Card size="small"><Statistic title="今日操作" value={stats.today} valueStyle={{ color: '#1677ff' }} /></Card></Col>
        <Col xs={12} sm={6}><Card size="small"><Statistic title="结算类操作" value={stats.settlement} valueStyle={{ color: '#722ed1' }} /></Card></Col>
        <Col xs={12} sm={6}><Card size="small"><Statistic title="付款操作" value={stats.payment} valueStyle={{ color: '#52c41a' }} /></Card></Col>
      </Row>

      <Card style={{ borderRadius: 8 }} title="审计日志">
        <Form layout="inline" style={{ marginBottom: 16 }} onFinish={(v) => loadData(v)}>
          <Form.Item name="role" label="角色">
            <Select allowClear style={{ width: 160 }} placeholder="角色"
              options={[
                { value: 'leader', label: '团长' },
                { value: 'supplier', label: '供应商' },
                { value: 'operation_accountant', label: '运营会计' },
                { value: 'customer_service', label: '客服' },
                { value: 'finance_reviewer', label: '财务复核' },
              ]} />
          </Form.Item>
          <Form.Item name="operation_type" label="操作类型">
            <Select allowClear style={{ width: 200 }} placeholder="操作类型"
              options={[
                'LOGIN', 'LOGOUT',
                'SETTLEMENT_TRIAL', 'SETTLEMENT_GENERATE', 'SETTLEMENT_REVIEW',
                'SETTLEMENT_FINANCE_APPROVE', 'SETTLEMENT_PAY', 'SETTLEMENT_EXPORT',
                'AFTERSALE_UPDATE', 'DISPUTE_UPDATE', 'LEADER_LEVEL_CHANGE',
              ].map(v => ({ value: v, label: v }))} />
          </Form.Item>
          <Form.Item name="keyword" label="关键字">
            <Input.Search style={{ width: 240 }} placeholder="搜索用户/详情/IP" enterButton />
          </Form.Item>
          <Form.Item>
            <Space>
              <Input type="submit" value="查询" />
              <Input type="reset" onClick={() => loadData({})} defaultValue="重置" />
            </Space>
          </Form.Item>
        </Form>
        <Table
          rowKey="id"
          loading={loading}
          dataSource={data}
          pagination={{ pageSize: 15, showTotal: t => `共 ${t} 条` }}
          scroll={{ x: 1400 }}
          columns={[
            { title: '时间', dataIndex: 'created_at', width: 170, render: v => dayjs(v).format('YYYY-MM-DD HH:mm:ss') },
            {
              title: '操作类型', dataIndex: 'operation_type', width: 210,
              render: v => <Tag color={OP_COLORS[v] || 'default'} style={{ width: 190, textAlign: 'center' }}>{v}</Tag>
            },
            { title: '用户', dataIndex: 'user_name', width: 100 },
            { title: '角色', dataIndex: 'user_role', width: 110, render: v => {
              const m = {
                leader: '团长', supplier: '供应商', operation_accountant: '运营会计',
                customer_service: '客服', finance_reviewer: '财务', admin: '管理员',
              }
              return <Tag>{m[v] || v}</Tag>
            }},
            { title: '操作对象', dataIndex: 'target_type', width: 110, render: v => v || '-' },
            { title: '对象ID', dataIndex: 'target_id', width: 100, render: v => v || '-' },
            { title: '详情', dataIndex: 'operation_detail', ellipsis: true, render: v => v ? <span style={{ fontSize: 12 }}>{typeof v === 'string' ? v : JSON.stringify(v)}</span> : '-' },
            { title: 'IP地址', dataIndex: 'ip_address', width: 130, render: v => v || '-' },
          ]}
        />
      </Card>
    </div>
  )
}
