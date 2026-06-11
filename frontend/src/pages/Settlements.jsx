import React, { useEffect, useState } from 'react'
import {
  Table, Tag, Card, Button, Space, Input, Select, Modal, Descriptions,
  Row, Col, Statistic, Progress, Tabs, List, Tooltip, message, Alert,
} from 'antd'
import {
  ReloadOutlined, PlusOutlined, CheckCircleOutlined, BankOutlined,
  DollarOutlined, FileSearchOutlined, DownloadOutlined, EyeOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import { useNavigate } from 'react-router-dom'
import { settlementApi } from '../services/api.js'

const STATUS_COLORS = {
  draft: 'default',
  reviewing: 'processing',
  reviewed: 'orange',
  finance_approved: 'purple',
  paid: 'success',
  rejected: 'error',
}

const STATUS_TEXT = {
  draft: '草稿',
  reviewing: '试算中',
  reviewed: '运营已复核',
  finance_approved: '财务已确认',
  paid: '已付款',
  rejected: '已驳回',
}

export default function Settlements({ pending = false }) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [user, setUser] = useState(null)
  const [statusFilter, setStatusFilter] = useState(pending ? 'reviewed' : undefined)
  const navigate = useNavigate()

  useEffect(() => {
    const us = localStorage.getItem('user')
    if (us) setUser(JSON.parse(us))
    loadData()
  }, [statusFilter])

  const loadData = async () => {
    setLoading(true)
    try {
      setData(await settlementApi.list({ status: statusFilter }))
    } finally {
      setLoading(false)
    }
  }

  const canReview = user?.role === 'operation_accountant'
  const canFinance = user?.role === 'finance_reviewer'
  const canGenerate = user?.role === 'operation_accountant'

  const handleReview = async (record) => {
    Modal.confirm({
      title: '运营复核确认',
      content: `确认通过结算批次 ${record.batch_no}？复核通过后批次将被锁定，无法修改。`,
      okText: '确认复核',
      cancelText: '取消',
      onOk: async () => {
        try {
          await settlementApi.review(record.id)
          message.success('运营复核成功，批次已锁定')
          loadData()
        } catch (e) {}
      },
    })
  }

  const handleFinance = async (record) => {
    Modal.confirm({
      title: '财务确认',
      content: `确认结算批次 ${record.batch_no}？确认后即可进行付款操作。`,
      okText: '确认通过',
      cancelText: '取消',
      onOk: async () => {
        try {
          await settlementApi.financeApprove(record.id)
          message.success('财务确认成功')
          loadData()
        } catch (e) {}
      },
    })
  }

  const handlePay = async (record) => {
    Modal.confirm({
      title: '⚠️ 确认付款',
      content: (
        <div>
          <Alert type="warning" showIcon style={{ marginBottom: 12 }}
            message="此操作将生成实际付款记录，请确保银行转账已完成" />
          <div>批次: <b>{record.batch_no}</b></div>
          <div>应付佣金: <b style={{ color: '#722ed1' }}>¥{record.total_commission.toFixed(2)}</b></div>
          <div>应付货款: <b style={{ color: '#1677ff' }}>¥{record.total_supplier_payable.toFixed(2)}</b></div>
          <div style={{ marginTop: 8 }}>
            合计: <b style={{ color: '#f5222d', fontSize: 16 }}>
              ¥{(record.total_commission + record.total_supplier_payable).toFixed(2)}
            </b>
          </div>
        </div>
      ),
      okText: '确认付款',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: async () => {
        try {
          await settlementApi.pay(record.id)
          message.success('付款确认成功，已生成付款记录')
          loadData()
        } catch (e) {}
      },
    })
  }

  const handleExport = async (record) => {
    try {
      const result = await settlementApi.export(record.id)
      Modal.info({
        title: '导出成功',
        width: 720,
        content: (
          <div>
            <Descriptions size="small" bordered column={1}>
              <Descriptions.Item label="批次号">{result.batch_no}</Descriptions.Item>
              <Descriptions.Item label="周期">{result.period_code}</Descriptions.Item>
              <Descriptions.Item label="导出时间">{dayjs(result.exported_at).format('YYYY-MM-DD HH:mm:ss')}</Descriptions.Item>
              <Descriptions.Item label="导出人">{result.exported_by}</Descriptions.Item>
              <Descriptions.Item label="结算汇总">
                总订单: {result.summary?.eligible_order_count || 0} 单
                | 佣金: ¥{result.summary?.total_net_commission?.toFixed(2) || 0}
                | 货款: ¥{result.summary?.total_supplier_payable?.toFixed(2) || 0}
              </Descriptions.Item>
            </Descriptions>
            <div style={{ marginTop: 16 }}>
              <h4>导出数据（已复制到剪贴板可粘贴到 Excel）:</h4>
              <Input.TextArea
                rows={10}
                value={JSON.stringify(result, null, 2)}
                readOnly
                style={{ fontFamily: 'monospace', fontSize: 12 }}
              />
            </div>
          </div>
        ),
      })
    } catch (e) {}
  }

  const columns = [
    {
      title: '批次号', dataIndex: 'batch_no', width: 190, fixed: 'left',
      render: (v, r) => (
        <a onClick={() => navigate(`/settlements/${r.id}`)} style={{ fontFamily: 'monospace' }}>{v}</a>
      ),
    },
    {
      title: '结算周期', dataIndex: 'period_code', width: 160,
      render: (v, r) => (
        <Tooltip title={`${dayjs(r.period_start).format('YYYY-MM-DD')} 至 ${dayjs(r.period_end).format('YYYY-MM-DD')}`}>
          {v}
        </Tooltip>
      ),
    },
    {
      title: '订单数', dataIndex: 'total_orders', width: 90, align: 'right',
      sorter: (a, b) => a.total_orders - b.total_orders,
    },
    {
      title: '订单总额', dataIndex: 'total_amount', width: 130, align: 'right',
      sorter: (a, b) => a.total_amount - b.total_amount,
      render: (v) => `¥${v?.toFixed(2)}`,
    },
    {
      title: '退款扣减', dataIndex: 'total_refund', width: 120, align: 'right',
      render: (v) => v > 0 ? <Tag color="red">-¥{v.toFixed(2)}</Tag> : '-',
    },
    {
      title: '佣金扣减', dataIndex: 'total_deduction', width: 120, align: 'right',
      render: (v) => v > 0 ? <Tag color="orange">-¥{v.toFixed(2)}</Tag> : '-',
    },
    {
      title: '净佣金', dataIndex: 'total_commission', width: 130, align: 'right',
      sorter: (a, b) => a.total_commission - b.total_commission,
      render: (v) => <b style={{ color: '#722ed1' }}>¥{v?.toFixed(2)}</b>,
    },
    {
      title: '供应商货款', dataIndex: 'total_supplier_payable', width: 130, align: 'right',
      render: (v) => <b style={{ color: '#1677ff' }}>¥{v?.toFixed(2)}</b>,
    },
    {
      title: '版本', dataIndex: 'version', width: 70, align: 'center',
      render: (v, r) => (
        <Tooltip title={r.is_locked ? '已锁定，不可修改' : '草稿状态可修改'}>
          <Tag color={r.is_locked ? 'gold' : 'default'} icon={r.is_locked ? '🔒' : '✏️'}>
            v{v}
          </Tag>
        </Tooltip>
      ),
    },
    {
      title: '状态', dataIndex: 'status', width: 120,
      render: (v) => (
        <Tag color={STATUS_COLORS[v]} style={{ padding: '2px 10px' }}>
          {STATUS_TEXT[v] || v}
        </Tag>
      ),
    },
    {
      title: '创建时间', dataIndex: 'created_at', width: 170,
      render: (v) => dayjs(v).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '操作',
      width: 320,
      fixed: 'right',
      render: (_, r) => (
        <Space size="small">
          <Button size="small" icon={<EyeOutlined />} onClick={() => navigate(`/settlements/${r.id}`)}>详情</Button>
          {canReview && r.status === 'reviewing' && (
            <Button size="small" type="primary" icon={<CheckCircleOutlined />} onClick={() => handleReview(r)}>运营复核</Button>
          )}
          {canFinance && r.status === 'reviewed' && (
            <Button size="small" type="primary" icon={<FileSearchOutlined />} onClick={() => handleFinance(r)}>财务确认</Button>
          )}
          {canFinance && r.status === 'finance_approved' && (
            <Button size="small" danger icon={<DollarOutlined />} onClick={() => handlePay(r)}>确认付款</Button>
          )}
          {(r.status === 'paid' || r.status === 'finance_approved' || r.status === 'reviewed') && (
            <Button size="small" icon={<DownloadOutlined />} onClick={() => handleExport(r)}>导出</Button>
          )}
        </Space>
      ),
    },
  ]

  return (
    <div>
      {pending && (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message={
            user?.role === 'finance_reviewer'
              ? '待财务确认/付款的结算批次'
              : '待运营复核的结算批次'
          }
        />
      )}
      <Card style={{ borderRadius: 8 }}>
        <Space wrap style={{ marginBottom: 16 }}>
          <Input.Search
            placeholder="搜索批次号/周期"
            allowClear
            style={{ width: 260 }}
            onSearch={(v) => settlementApi.list({ period_code: v }).then(setData)}
          />
          <Select
            placeholder="状态筛选"
            allowClear
            style={{ width: 150 }}
            value={statusFilter}
            onChange={(v) => setStatusFilter(v)}
            options={Object.entries(STATUS_TEXT).map(([k, v]) => ({ value: k, label: v }))}
          />
          {canGenerate && (
            <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/settlements/generate')}>
              生成新结算
            </Button>
          )}
          <Button icon={<ReloadOutlined />} onClick={loadData}>刷新</Button>
        </Space>

        {pending === false && (
          <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
            <Col xs={24} sm={12} md={6}>
              <Card size="small">
                <Statistic title="草稿/试算中" value={data.filter(d => ['draft', 'reviewing'].includes(d.status)).length}
                  valueStyle={{ color: '#1677ff' }} />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card size="small">
                <Statistic title="待财务确认" value={data.filter(d => d.status === 'reviewed').length}
                  valueStyle={{ color: '#fa8c16' }} />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card size="small">
                <Statistic title="待付款" value={data.filter(d => d.status === 'finance_approved').length}
                  valueStyle={{ color: '#722ed1' }} />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card size="small">
                <Statistic title="已完成付款" value={data.filter(d => d.status === 'paid').length}
                  valueStyle={{ color: '#52c41a' }} />
              </Card>
            </Col>
          </Row>
        )}

        <Table
          rowKey="id"
          columns={columns}
          dataSource={data}
          loading={loading}
          scroll={{ x: 1700 }}
          pagination={{ pageSize: 15, showSizeChanger: true, showTotal: (t) => `共 ${t} 个批次` }}
        />
      </Card>
    </div>
  )
}
