import React, { useState } from 'react'
import {
  Card, Form, DatePicker, Button, Row, Col, Statistic, Alert, Tabs,
  Table, Tag, Space, Progress, Divider, Modal, Result, Steps, message, Spin,
} from 'antd'
import {
  CalculatorOutlined, CheckCircleOutlined, PlayCircleOutlined,
  ExclamationCircleOutlined, ThunderboltOutlined, DatabaseOutlined,
  CheckOutlined, CloseOutlined, FileSearchOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import { useNavigate } from 'react-router-dom'
import { settlementApi } from '../services/api.js'

export default function SettlementGenerate() {
  const [form] = Form.useForm()
  const navigate = useNavigate()
  const [trialResult, setTrialResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)

  const handleTrial = async () => {
    const values = await form.validateFields()
    setLoading(true)
    try {
      const res = await settlementApi.trialCalculation(
        values.period[0].startOf('day').toISOString(),
        values.period[1].endOf('day').toISOString()
      )
      setTrialResult(res)
      message.success(`试算完成，符合条件 ${res.summary.eligible_order_count} 条订单`)
    } finally {
      setLoading(false)
    }
  }

  const handleGenerate = () => {
    Modal.confirm({
      title: '确认生成结算批次？',
      icon: <DatabaseOutlined />,
      content: (
        <div>
          <Alert
            type="info" showIcon
            message={
              <div>
                <div>符合条件订单: <b>{trialResult?.summary.eligible_order_count}</b> 条</div>
                <div>排除订单: <b>{trialResult?.summary.excluded_order_count}</b> 条</div>
                <div>净佣金合计: <b style={{ color: '#722ed1' }}>¥{trialResult?.summary.total_net_commission?.toFixed(2)}</b></div>
                <div>供应商货款: <b style={{ color: '#1677ff' }}>¥{trialResult?.summary.total_supplier_payable?.toFixed(2)}</b></div>
              </div>
            }
          />
          {trialResult?.existing_batch_no && (
            <Alert
              type="warning" showIcon style={{ marginTop: 12 }}
              message={`该周期已存在批次 ${trialResult.existing_batch_no}，若继续生成会报错`}
            />
          )}
        </div>
      ),
      okText: '确认生成',
      okButtonProps: { type: 'primary', size: 'large' },
      cancelText: '取消',
      onOk: async () => {
        const values = form.getFieldsValue()
        setGenerating(true)
        try {
          const res = await settlementApi.generate(
            values.period[0].startOf('day').toISOString(),
            values.period[1].endOf('day').toISOString()
          )
          Modal.success({
            title: '结算批次生成成功',
            content: (
              <Result
                status="success"
                title={`批次号: ${res.batch_no}`}
                subTitle="批次状态: 试算中 → 请前往运营会计进行复核"
                extra={[
                  <Button type="primary" key="view" onClick={() => navigate(`/settlements/${res.id}`)}>
                    查看批次详情
                  </Button>,
                  <Button key="list" onClick={() => navigate('/settlements/list')}>
                    返回批次列表
                  </Button>,
                ]}
              />
            ),
          })
        } catch (e) {
          if (e?.existing_batch_no) {
            Modal.warning({
              title: '该周期已存在结算批次',
              content: (
                <div>
                  <p>已存在批次号: <b>{e.existing_batch_no}</b></p>
                  <p>状态: <b>{e.existing_status}</b></p>
                  <Button type="primary" onClick={() => navigate(`/settlements/list`)}>
                    前往查看已有批次
                  </Button>
                </div>
              ),
            })
          }
        } finally {
          setGenerating(false)
        }
      },
    })
  }

  return (
    <div>
      <Card style={{ borderRadius: 8, marginBottom: 20 }}>
        <Steps
          current={trialResult ? 1 : 0}
          items={[
            { title: '设置周期', icon: <CalculatorOutlined /> },
            { title: '佣金试算', icon: <PlayCircleOutlined /> },
            { title: '生成批次', icon: <DatabaseOutlined /> },
          ]}
          style={{ marginBottom: 24 }}
        />

        <Form form={form} layout="inline">
          <Form.Item
            label="结算周期"
            name="period"
            rules={[{ required: true, message: '请选择结算周期' }]}
          >
            <DatePicker.RangePicker
              size="large"
              format="YYYY-MM-DD"
              disabledDate={(d) => d && d > dayjs().endOf('day')}
              style={{ width: 360 }}
            />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button
                type="primary"
                size="large"
                icon={<CalculatorOutlined />}
                loading={loading}
                onClick={handleTrial}
              >
                开始试算
              </Button>
              {trialResult && (
                <Button
                  size="large"
                  type="primary"
                  danger={!!trialResult.existing_batch_no}
                  icon={<DatabaseOutlined />}
                  loading={generating}
                  onClick={handleGenerate}
                  disabled={trialResult.summary.eligible_order_count === 0}
                >
                  生成结算批次
                </Button>
              )}
            </Space>
          </Form.Item>
        </Form>
      </Card>

      {loading && (
        <Card style={{ textAlign: 'center', padding: 80, borderRadius: 8 }}>
          <Spin size="large" />
          <div style={{ marginTop: 16, color: '#888' }}>正在进行佣金试算...</div>
        </Card>
      )}

      {trialResult && !loading && (
        <div>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} md={6}>
              <Card>
                <Statistic
                  title="符合条件订单"
                  value={trialResult.summary.eligible_order_count}
                  suffix="条"
                  valueStyle={{ color: '#52c41a' }}
                  prefix={<CheckCircleOutlined />}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card>
                <Statistic
                  title="排除订单"
                  value={trialResult.summary.excluded_order_count}
                  suffix="条"
                  valueStyle={{ color: '#ff4d4f' }}
                  prefix={<CloseOutlined />}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card>
                <Statistic
                  title="佣金扣减"
                  value={trialResult.summary.total_deduction}
                  prefix="-¥"
                  valueStyle={{ color: '#fa8c16' }}
                  precision={2}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card>
                <Statistic
                  title="应付佣金净额"
                  value={trialResult.summary.total_net_commission}
                  prefix="¥"
                  valueStyle={{ color: '#722ed1' }}
                  precision={2}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card>
                <Statistic
                  title="退款总额"
                  value={trialResult.summary.total_refund}
                  prefix="¥"
                  valueStyle={{ color: '#ff4d4f' }}
                  precision={2}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card>
                <Statistic
                  title="供应商货款"
                  value={trialResult.summary.total_supplier_payable}
                  prefix="¥"
                  valueStyle={{ color: '#1677ff' }}
                  precision={2}
                />
              </Card>
            </Col>
          </Row>

          <Divider />

          <Tabs
            items={[
              {
                key: 'eligible',
                label: `✅ 符合条件订单 (${trialResult.eligible_orders.length})`,
                children: (
                  <Card size="small">
                    <OrderTable data={trialResult.eligible_orders} showCommission />
                  </Card>
                ),
              },
              {
                key: 'excluded',
                label: `❌ 排除订单 (${trialResult.excluded_orders.length})`,
                children: (
                  <Card size="small">
                    <ExcludedTable data={trialResult.excluded_orders} />
                  </Card>
                ),
              },
              {
                key: 'deductions',
                label: `📋 扣减明细 (${trialResult.deduction_details.length})`,
                children: (
                  <Card size="small">
                    <DeductionTable data={trialResult.deduction_details} />
                  </Card>
                ),
              },
              {
                key: 'leaders',
                label: `👥 团长结算 (${trialResult.leader_settlements.length})`,
                children: (
                  <Card size="small">
                    <Table
                      size="small"
                      rowKey="leader_id"
                      pagination={false}
                      dataSource={trialResult.leader_settlements}
                      columns={[
                        { title: '团长编号', dataIndex: 'leader_code', width: 130 },
                        { title: '团长姓名', dataIndex: 'leader_name' },
                        { title: '等级', dataIndex: 'level_name', width: 100 },
                        { title: '订单数', dataIndex: 'total_orders', width: 80, align: 'right' },
                        { title: '订单总额', dataIndex: 'order_amount_sum', width: 120, align: 'right', render: (v) => `¥${v.toFixed(2)}` },
                        { title: '退款总额', dataIndex: 'refund_sum', width: 110, align: 'right', render: (v) => v > 0 ? <Tag color="red">-¥{v.toFixed(2)}</Tag> : '-' },
                        { title: '原始佣金', dataIndex: 'original_commission_sum', width: 120, align: 'right', render: (v) => `¥${v.toFixed(2)}` },
                        { title: '扣减佣金', dataIndex: 'deduction_sum', width: 110, align: 'right', render: (v) => v > 0 ? <Tag color="orange">-¥{v.toFixed(2)}</Tag> : '-' },
                        { title: '净佣金', dataIndex: 'net_commission', width: 120, align: 'right', render: (v) => <b style={{ color: '#722ed1' }}>¥{v.toFixed(2)}</b> },
                      ]}
                    />
                  </Card>
                ),
              },
              {
                key: 'suppliers',
                label: `🏪 供应商结算 (${trialResult.supplier_settlements.length})`,
                children: (
                  <Card size="small">
                    <Table
                      size="small"
                      rowKey="supplier_id"
                      pagination={false}
                      dataSource={trialResult.supplier_settlements}
                      columns={[
                        { title: '供应商编码', dataIndex: 'supplier_code', width: 130 },
                        { title: '供应商名称', dataIndex: 'supplier_name' },
                        { title: '订单数', dataIndex: 'total_orders', width: 80, align: 'right' },
                        { title: '订单总额', dataIndex: 'order_amount_sum', width: 120, align: 'right', render: (v) => `¥${v.toFixed(2)}` },
                        { title: '退款总额', dataIndex: 'refund_sum', width: 110, align: 'right', render: (v) => v > 0 ? <Tag color="red">-¥{v.toFixed(2)}</Tag> : '-' },
                        { title: '团长佣金', dataIndex: 'commission_sum', width: 120, align: 'right', render: (v) => <Tag color="purple">-¥{v.toFixed(2)}</Tag> },
                        { title: '应付货款', dataIndex: 'payable_amount', width: 130, align: 'right', render: (v) => <b style={{ color: '#1677ff' }}>¥{v.toFixed(2)}</b> },
                      ]}
                    />
                  </Card>
                ),
              },
            ]}
          />
        </div>
      )}
    </div>
  )
}

function OrderTable({ data, showCommission = false }) {
  const columns = [
    { title: '订单号', dataIndex: 'order_no', width: 160, render: (v) => <span style={{ fontFamily: 'monospace' }}>{v}</span> },
    { title: '商品', dataIndex: 'product_name' },
    { title: '数量', dataIndex: 'quantity', width: 70, align: 'right' },
    { title: '订单金额', dataIndex: 'order_amount', width: 110, align: 'right', render: (v) => `¥${v.toFixed(2)}` },
    { title: '成本金额', dataIndex: 'cost_amount', width: 110, align: 'right', render: (v) => `¥${v.toFixed(2)}` },
    {
      title: '佣金率', dataIndex: 'commission_rate', width: 90, align: 'right',
      render: (v, r) => `${(v * 100).toFixed(1)}%${r.level_bonus > 0 ? `+${(r.level_bonus * 100).toFixed(0)}%` : ''}`,
    },
    { title: '原始佣金', dataIndex: 'original_commission', width: 110, align: 'right', render: (v) => `¥${v.toFixed(2)}` },
    {
      title: '退款金额', dataIndex: 'refund_amount', width: 110, align: 'right',
      render: (v) => v > 0 ? <Tag color="red">-¥{v.toFixed(2)}</Tag> : '-',
    },
    {
      title: '佣金扣减', dataIndex: 'deduction_commission', width: 110, align: 'right',
      render: (v) => v > 0 ? <Tag color="orange">-¥{v.toFixed(2)}</Tag> : '-',
    },
    {
      title: '实发佣金', dataIndex: 'final_commission', width: 120, align: 'right',
      render: (v) => <b style={{ color: '#722ed1' }}>¥{v.toFixed(2)}</b>,
    },
    {
      title: '供应商应付', dataIndex: 'supplier_payable', width: 120, align: 'right',
      render: (v) => <b style={{ color: '#1677ff' }}>¥{v.toFixed(2)}</b>,
    },
    {
      title: '下单时间', dataIndex: 'order_date', width: 170,
      render: (v) => v ? dayjs(v).format('YYYY-MM-DD HH:mm') : '-',
    },
  ]

  return (
    <Table
      size="small"
      rowKey="order_id"
      scroll={{ x: 1500 }}
      pagination={{ pageSize: 10, showTotal: (t) => `共 ${t} 条` }}
      dataSource={data}
      columns={columns}
    />
  )
}

function ExcludedTable({ data }) {
  return (
    <Table
      size="small"
      rowKey="order_id"
      scroll={{ x: 1000 }}
      pagination={{ pageSize: 10, showTotal: (t) => `共 ${t} 条` }}
      dataSource={data}
      columns={[
        { title: '订单号', dataIndex: 'order_no', width: 160, render: (v) => <span style={{ fontFamily: 'monospace' }}>{v}</span> },
        { title: '商品', dataIndex: 'product_name' },
        { title: '订单金额', dataIndex: 'order_amount', width: 110, align: 'right', render: (v) => `¥${v.toFixed(2)}` },
        { title: '订单状态', dataIndex: 'order_status', width: 100 },
        { title: '售后状态', dataIndex: 'aftersale_status', width: 110 },
        {
          title: '排除原因', dataIndex: 'exclude_reason',
          render: (v) => <Tag color="red" icon={<ExclamationCircleOutlined />}>{v}</Tag>,
        },
      ]}
    />
  )
}

function DeductionTable({ data }) {
  return (
    <Table
      size="small"
      rowKey={(r, i) => `${r.order_id}-${r.aftersale_id}-${i}`}
      scroll={{ x: 1200 }}
      pagination={{ pageSize: 10, showTotal: (t) => `共 ${t} 条` }}
      dataSource={data}
      columns={[
        {
          title: '扣减类型', dataIndex: 'deduction_type', width: 160,
          render: (v) => {
            const map = {
              REFUND_COMMISSION: { text: '售后退款扣佣', color: 'red' },
              DISPUTE_DEDUCTION: { text: '争议订单扣佣', color: 'orange' },
              MANUAL_DEDUCTION: { text: '人工扣佣', color: 'purple' },
            }
            const c = map[v] || { text: v, color: 'default' }
            return <Tag color={c.color}>{c.text}</Tag>
          },
        },
        { title: '说明', dataIndex: 'description', ellipsis: true },
        { title: '订单金额', dataIndex: 'order_amount', width: 110, align: 'right', render: (v) => `¥${v.toFixed(2)}` },
        { title: '原始佣金', dataIndex: 'original_commission', width: 110, align: 'right', render: (v) => `¥${v.toFixed(2)}` },
        { title: '退款金额', dataIndex: 'refund_amount', width: 110, align: 'right', render: (v) => <Tag color="red">-¥{v.toFixed(2)}</Tag> },
        {
          title: '扣减佣金', dataIndex: 'deduction_commission', width: 130, align: 'right',
          render: (v) => <b style={{ color: '#fa8c16' }}>-¥{v.toFixed(2)}</b>,
        },
      ]}
    />
  )
}
