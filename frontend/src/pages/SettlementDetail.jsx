import React, { useEffect, useState } from 'react'
import {
  Card, Descriptions, Tag, Button, Space, Tabs, Table, Row, Col, Statistic,
  Divider, List, Timeline, Modal, Result, message, Badge, Steps, Alert,
} from 'antd'
import {
  CheckCircleOutlined, BankOutlined, DownloadOutlined, DollarOutlined,
  FileSearchOutlined, HistoryOutlined, LeftOutlined, LockOutlined,
} from '@ant-design/icons'
import { useParams, useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import { settlementApi } from '../services/api.js'

const STATUS_MAP = {
  draft: { text: '草稿', color: 'default', step: 0 },
  reviewing: { text: '试算中', color: 'processing', step: 0 },
  reviewed: { text: '运营已复核', color: 'orange', step: 1 },
  finance_approved: { text: '财务已确认', color: 'purple', step: 2 },
  paid: { text: '已付款', color: 'success', step: 3 },
  rejected: { text: '已驳回', color: 'error', step: 0 },
}

export default function SettlementDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [detail, setDetail] = useState(null)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)

  useEffect(() => {
    const us = localStorage.getItem('user')
    if (us) setUser(JSON.parse(us))
    loadDetail()
  }, [id])

  const loadDetail = async () => {
    setLoading(true)
    try {
      setDetail(await settlementApi.detail(id))
    } finally {
      setLoading(false)
    }
  }

  if (loading || !detail) return <Card loading />

  const { batch, snapshot = {}, deductions, payments, version_logs } = detail
  const statusInfo = STATUS_MAP[batch.status] || STATUS_MAP.draft
  const canReview = user?.role === 'operation_accountant' && batch.status === 'reviewing'
  const canFinance = user?.role === 'finance_reviewer' && batch.status === 'reviewed'
  const canPay = user?.role === 'finance_reviewer' && batch.status === 'finance_approved'

  const handleReview = () => {
    Modal.confirm({
      title: '运营复核确认',
      content: (
        <Alert type="warning" showIcon
          message="复核通过后批次将被锁定，版本升级，后续不能修改订单" />
      ),
      onOk: async () => {
        await settlementApi.review(id)
        message.success('运营复核成功')
        loadDetail()
      },
    })
  }

  const handleFinance = () => {
    Modal.confirm({
      title: '财务确认',
      content: '确认后即可执行付款操作',
      onOk: async () => {
        await settlementApi.financeApprove(id)
        message.success('财务确认成功')
        loadDetail()
      },
    })
  }

  const handlePay = () => {
    Modal.confirm({
      title: '⚠️ 确认付款',
      okText: '确认付款',
      okButtonProps: { danger: true },
      content: (
        <div>
          <Alert type="warning" showIcon style={{ marginBottom: 12 }}
            message="确认后将生成实际付款记录，请确保已完成银行转账" />
          <div>合计金额: <b style={{ color: '#f5222d', fontSize: 18 }}>
            ¥{(batch.total_commission + batch.total_supplier_payable).toFixed(2)}
          </b></div>
        </div>
      ),
      onOk: async () => {
        await settlementApi.pay(id)
        message.success('付款成功')
        loadDetail()
      },
    })
  }

  const handleExport = async () => {
    const res = await settlementApi.export(id)
    Modal.info({
      title: '导出成功',
      width: 600,
      content: (
        <div>
          <Descriptions size="small" bordered column={1}>
            <Descriptions.Item label="批次号">{res.batch_no}</Descriptions.Item>
            <Descriptions.Item label="导出人">{res.exported_by}</Descriptions.Item>
            <Descriptions.Item label="团长明细">{res.leader_settlements?.length || 0} 条</Descriptions.Item>
            <Descriptions.Item label="供应商明细">{res.supplier_settlements?.length || 0} 条</Descriptions.Item>
            <Descriptions.Item label="扣减明细">{res.deductions?.length || 0} 条</Descriptions.Item>
          </Descriptions>
          <p style={{ marginTop: 12, color: '#888' }}>
            数据已导出，可复制 JSON 粘贴到 Excel：
          </p>
        </div>
      ),
    })
  }

  const stepIdx = statusInfo.step
  const steps = [
    { title: '试算/草稿', description: '运营会计试算订单', icon: <LockOutlined /> },
    { title: '运营复核', description: batch.reviewed_at ? dayjs(batch.reviewed_at).format('MM-DD HH:mm') : '待处理', icon: <CheckCircleOutlined /> },
    { title: '财务确认', description: batch.finance_approved_at ? dayjs(batch.finance_approved_at).format('MM-DD HH:mm') : '待处理', icon: <FileSearchOutlined /> },
    { title: '付款完成', description: batch.paid_at ? dayjs(batch.paid_at).format('MM-DD HH:mm') : '待处理', icon: <BankOutlined /> },
  ]

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<LeftOutlined />} onClick={() => navigate(-1)}>返回</Button>
        <h2 style={{ margin: 0 }}>结算批次详情</h2>
        <Tag color={statusInfo.color} style={{ fontSize: 14, padding: '4px 14px' }}>
          {batch.is_locked && '🔒 '}{statusInfo.text}
        </Tag>
        <Tag color="gold" style={{ fontSize: 13 }}>v{batch.version}</Tag>
      </Space>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24}>
          <Card style={{ borderRadius: 8 }}>
            <Steps
              current={stepIdx}
              status={batch.status === 'rejected' ? 'error' : 'process'}
              items={steps}
              size="small"
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={16}>
          <Card
            style={{ borderRadius: 8, marginBottom: 16 }}
            title="批次信息"
            extra={
              <Space>
                {canReview && <Button type="primary" onClick={handleReview}>运营复核</Button>}
                {canFinance && <Button type="primary" onClick={handleFinance}>财务确认</Button>}
                {canPay && <Button danger type="primary" icon={<DollarOutlined />} onClick={handlePay}>确认付款</Button>}
                {batch.status !== 'draft' && batch.status !== 'reviewing' && (
                  <Button icon={<DownloadOutlined />} onClick={handleExport}>导出</Button>
                )}
              </Space>
            }
          >
            <Descriptions size="small" bordered column={2}>
              <Descriptions.Item label="批次号" span={1}>
                <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{batch.batch_no}</span>
              </Descriptions.Item>
              <Descriptions.Item label="周期编码">{batch.period_code}</Descriptions.Item>
              <Descriptions.Item label="结算周期" span={2}>
                {dayjs(batch.period_start).format('YYYY-MM-DD')} 至 {dayjs(batch.period_end).format('YYYY-MM-DD')}
              </Descriptions.Item>
              <Descriptions.Item label="订单数量">{batch.total_orders} 单</Descriptions.Item>
              <Descriptions.Item label="创建时间">{dayjs(batch.created_at).format('YYYY-MM-DD HH:mm')}</Descriptions.Item>
              <Descriptions.Item label="复核时间">{batch.reviewed_at ? dayjs(batch.reviewed_at).format('YYYY-MM-DD HH:mm') : '-'}</Descriptions.Item>
              <Descriptions.Item label="财务确认">{batch.finance_approved_at ? dayjs(batch.finance_approved_at).format('YYYY-MM-DD HH:mm') : '-'}</Descriptions.Item>
              <Descriptions.Item label="付款时间" span={2}>
                {batch.paid_at ? dayjs(batch.paid_at).format('YYYY-MM-DD HH:mm') : '未付款'}
              </Descriptions.Item>
              {batch.note && <Descriptions.Item label="备注" span={2}>{batch.note}</Descriptions.Item>}
            </Descriptions>
          </Card>

          <Card style={{ borderRadius: 8 }} title="批次数据">
            <Tabs
              items={[
                {
                  key: 'summary',
                  label: '📊 汇总',
                  children: (
                    <Row gutter={[12, 12]}>
                      <Col xs={12} sm={8}>
                        <Card size="small"><Statistic title="订单总额" prefix="¥" value={batch.total_amount} precision={2} valueStyle={{ color: '#1677ff' }} /></Card>
                      </Col>
                      <Col xs={12} sm={8}>
                        <Card size="small"><Statistic title="退款总额" prefix="-¥" value={batch.total_refund} precision={2} valueStyle={{ color: '#ff4d4f' }} /></Card>
                      </Col>
                      <Col xs={12} sm={8}>
                        <Card size="small"><Statistic title="净订单金额" prefix="¥" value={batch.total_amount - batch.total_refund} precision={2} /></Card>
                      </Col>
                      <Col xs={12} sm={8}>
                        <Card size="small"><Statistic title="佣金扣减" prefix="-¥" value={batch.total_deduction} precision={2} valueStyle={{ color: '#fa8c16' }} /></Card>
                      </Col>
                      <Col xs={12} sm={8}>
                        <Card size="small"><Statistic title="净佣金" prefix="¥" value={batch.net_commission} precision={2} valueStyle={{ color: '#722ed1' }} /></Card>
                      </Col>
                      <Col xs={12} sm={8}>
                        <Card size="small"><Statistic title="供应商货款" prefix="¥" value={batch.total_supplier_payable} precision={2} valueStyle={{ color: '#13c2c2' }} /></Card>
                      </Col>
                    </Row>
                  ),
                },
                {
                  key: 'orders',
                  label: `📦 订单 (${snapshot?.eligible_orders?.length || 0})`,
                  children: (
                    <Table
                      size="small"
                      rowKey="order_id"
                      scroll={{ x: 1200 }}
                      pagination={{ pageSize: 10 }}
                      dataSource={snapshot?.eligible_orders || []}
                      columns={[
                        { title: '订单号', dataIndex: 'order_no', width: 150, render: (v) => <span style={{ fontFamily: 'monospace' }}>{v}</span> },
                        { title: '商品', dataIndex: 'product_name', ellipsis: true },
                        { title: '金额', dataIndex: 'order_amount', width: 100, render: (v) => `¥${v.toFixed(2)}` },
                        { title: '原始佣金', dataIndex: 'original_commission', width: 100, render: (v) => `¥${v.toFixed(2)}` },
                        { title: '退款', dataIndex: 'refund_amount', width: 90, render: (v) => v > 0 ? <Tag color="red">-¥{v.toFixed(0)}</Tag> : '-' },
                        { title: '扣佣', dataIndex: 'deduction_commission', width: 90, render: (v) => v > 0 ? <Tag color="orange">-¥{v.toFixed(0)}</Tag> : '-' },
                        { title: '实发佣金', dataIndex: 'final_commission', width: 100, render: (v) => <b style={{ color: '#722ed1' }}>¥{v.toFixed(2)}</b> },
                      ]}
                    />
                  ),
                },
                {
                  key: 'excluded',
                  label: `🚫 排除订单 (${snapshot?.excluded_orders?.length || 0})`,
                  children: (
                    <Table
                      size="small"
                      rowKey="order_id"
                      pagination={{ pageSize: 10 }}
                      dataSource={snapshot?.excluded_orders || []}
                      columns={[
                        { title: '订单号', dataIndex: 'order_no', width: 150 },
                        { title: '商品', dataIndex: 'product_name' },
                        { title: '金额', dataIndex: 'order_amount', width: 100, render: (v) => `¥${v.toFixed(2)}` },
                        {
                          title: '排除原因', dataIndex: 'exclude_reason',
                          render: (v) => <Tag color="red">{v}</Tag>,
                        },
                      ]}
                    />
                  ),
                },
                {
                  key: 'leaders',
                  label: `👥 团长明细 (${snapshot?.leader_settlements?.length || 0})`,
                  children: (
                    <Table
                      size="small"
                      rowKey="leader_id"
                      pagination={{ pageSize: 10 }}
                      dataSource={snapshot?.leader_settlements || []}
                      columns={[
                        { title: '编号', dataIndex: 'leader_code', width: 120 },
                        { title: '姓名', dataIndex: 'leader_name' },
                        { title: '等级', dataIndex: 'level_name', width: 100 },
                        { title: '订单数', dataIndex: 'total_orders', width: 80, align: 'right' },
                        { title: '订单额', dataIndex: 'order_amount_sum', width: 110, align: 'right', render: (v) => `¥${v.toFixed(2)}` },
                        { title: '原始佣金', dataIndex: 'original_commission_sum', width: 110, align: 'right', render: (v) => `¥${v.toFixed(2)}` },
                        { title: '扣减', dataIndex: 'deduction_sum', width: 90, align: 'right', render: (v) => v > 0 ? <Tag color="orange">-¥{v.toFixed(0)}</Tag> : '-' },
                        { title: '净佣金', dataIndex: 'net_commission', width: 110, align: 'right', render: (v) => <b style={{ color: '#722ed1' }}>¥{v.toFixed(2)}</b> },
                      ]}
                    />
                  ),
                },
                {
                  key: 'suppliers',
                  label: `🏪 供应商明细 (${snapshot?.supplier_settlements?.length || 0})`,
                  children: (
                    <Table
                      size="small"
                      rowKey="supplier_id"
                      pagination={{ pageSize: 10 }}
                      dataSource={snapshot?.supplier_settlements || []}
                      columns={[
                        { title: '编码', dataIndex: 'supplier_code', width: 120 },
                        { title: '名称', dataIndex: 'supplier_name' },
                        { title: '订单数', dataIndex: 'total_orders', width: 80, align: 'right' },
                        { title: '订单额', dataIndex: 'order_amount_sum', width: 110, align: 'right', render: (v) => `¥${v.toFixed(2)}` },
                        { title: '退款', dataIndex: 'refund_sum', width: 90, align: 'right', render: (v) => v > 0 ? <Tag color="red">-¥{v.toFixed(0)}</Tag> : '-' },
                        { title: '佣金', dataIndex: 'commission_sum', width: 100, align: 'right', render: (v) => <Tag color="purple">-¥{v.toFixed(0)}</Tag> },
                        { title: '应付货款', dataIndex: 'payable_amount', width: 120, align: 'right', render: (v) => <b style={{ color: '#1677ff' }}>¥{v.toFixed(2)}</b> },
                      ]}
                    />
                  ),
                },
                {
                  key: 'deductions',
                  label: `📋 扣减明细 (${deductions?.length || 0})`,
                  children: (
                    <Table
                      size="small"
                      rowKey="id"
                      pagination={{ pageSize: 10 }}
                      dataSource={deductions || []}
                      columns={[
                        { title: '订单号', dataIndex: 'order_no', width: 150 },
                        {
                          title: '扣减类型', dataIndex: 'deduction_type', width: 130,
                          render: (v) => <Tag color="red">{v === 'REFUND_COMMISSION' ? '售后退款扣佣' : v}</Tag>,
                        },
                        { title: '说明', dataIndex: 'description', ellipsis: true },
                        { title: '订单金额', dataIndex: 'order_amount', width: 100, render: (v) => `¥${v.toFixed(2)}` },
                        { title: '原始佣金', dataIndex: 'original_commission', width: 100, render: (v) => `¥${v.toFixed(2)}` },
                        { title: '退款金额', dataIndex: 'refund_amount', width: 100, render: (v) => <Tag color="red">-¥{v.toFixed(2)}</Tag> },
                        {
                          title: '扣减佣金', dataIndex: 'deduction_commission', width: 110,
                          render: (v) => <b style={{ color: '#fa8c16' }}>-¥{v.toFixed(2)}</b>,
                        },
                      ]}
                    />
                  ),
                },
                {
                  key: 'payments',
                  label: `💰 付款记录 (${payments?.length || 0})`,
                  children: (
                    <Table
                      size="small"
                      rowKey="id"
                      pagination={{ pageSize: 10 }}
                      dataSource={payments || []}
                      columns={[
                        { title: '付款单号', dataIndex: 'payment_no', width: 180, render: (v) => <span style={{ fontFamily: 'monospace' }}>{v}</span> },
                        {
                          title: '收款方类型', dataIndex: 'payee_type', width: 100,
                          render: (v) => <Tag color={v === 'leader' ? 'cyan' : 'blue'}>
                            {v === 'leader' ? '团长佣金' : '供应商货款'}
                          </Tag>,
                        },
                        { title: '收款方', dataIndex: 'payee_name' },
                        { title: '金额', dataIndex: 'amount', width: 120, render: (v) => <b>¥{v.toFixed(2)}</b> },
                        { title: '状态', dataIndex: 'payment_status', width: 90, render: (v) => <Tag color="green">{v === 'completed' ? '已付款' : v}</Tag> },
                        { title: '付款时间', dataIndex: 'paid_at', width: 160, render: (v) => v ? dayjs(v).format('YYYY-MM-DD HH:mm') : '-' },
                      ]}
                    />
                  ),
                },
                {
                  key: 'version',
                  label: `🕐 版本日志 (${version_logs?.length || 0})`,
                  children: (
                    <Timeline
                      items={version_logs?.map(v => ({
                        color: v.operation_type.includes('PAY') ? 'green' : 'blue',
                        children: (
                          <Card size="small" style={{ marginBottom: 8 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Space>
                                <Tag color="gold">v{v.version}</Tag>
                                <b>{v.operation_type}</b>
                                <span style={{ color: '#888' }}>{v.operator_name || '-'}</span>
                              </Space>
                              <span style={{ fontSize: 12, color: '#888' }}>{dayjs(v.created_at).format('YYYY-MM-DD HH:mm:ss')}</span>
                            </div>
                            <div style={{ marginTop: 8, fontSize: 13, color: '#555' }}>{v.change_summary}</div>
                          </Card>
                        ),
                      })) || []}
                    />
                  ),
                },
              ]}
            />
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card title="应付概览" style={{ borderRadius: 8, marginBottom: 16 }} type="inner">
            <Statistic
              title="应付佣金（团长）"
              value={batch.total_commission}
              prefix="¥"
              precision={2}
              valueStyle={{ color: '#722ed1' }}
              style={{ marginBottom: 16 }}
            />
            <Statistic
              title="应付货款（供应商）"
              value={batch.total_supplier_payable}
              prefix="¥"
              precision={2}
              valueStyle={{ color: '#1677ff' }}
              style={{ marginBottom: 16 }}
            />
            <Divider style={{ margin: '12px 0' }} />
            <Statistic
              title="合计应付"
              value={batch.total_commission + batch.total_supplier_payable}
              prefix="¥"
              precision={2}
              valueStyle={{ color: '#f5222d', fontSize: 24 }}
            />
          </Card>

          <Card
            title={`扣减概览 (${deductions?.length || 0} 条)`}
            style={{ borderRadius: 8, marginBottom: 16 }}
            type="inner"
          >
            <Statistic
              title="退款扣佣总额"
              value={batch.total_deduction}
              prefix="-¥"
              precision={2}
              valueStyle={{ color: '#fa8c16' }}
            />
            <Divider style={{ margin: '12px 0' }} />
            <Statistic
              title="退款订单总额"
              value={batch.total_refund}
              prefix="-¥"
              precision={2}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>

          {batch.status === 'paid' && (
            <Result
              status="success"
              title="结算已完成"
              subTitle={`已生成 ${payments?.length || 0} 条付款记录`}
              style={{ padding: 0, marginTop: 16 }}
              extra={[
                <Button key="export" icon={<DownloadOutlined />} onClick={handleExport}>
                  导出结算单
                </Button>,
              ]}
            />
          )}
        </Col>
      </Row>
    </div>
  )
}
