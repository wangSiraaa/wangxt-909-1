import React, { useEffect, useState } from 'react'
import { Table, Tag, Card, Input, DatePicker, Select, Button, Space, Drawer, Descriptions, Badge } from 'antd'
import { SearchOutlined, ReloadOutlined, EyeOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { commonApi } from '../services/api.js'

const STATUS_MAP = {
  completed: { text: '已完成', color: 'green' },
  delivered: { text: '已发货', color: 'blue' },
  pending: { text: '待处理', color: 'orange' },
  cancelled: { text: '已取消', color: 'default' },
}

const AFTERSALE_MAP = {
  none: { text: '无售后', color: 'default' },
  processing: { text: '售后处理中', color: 'orange' },
  refunded: { text: '全额退款', color: 'red' },
  partial_refund: { text: '部分退款', color: 'volcano' },
  rejected: { text: '售后驳回', color: 'default' },
}

export default function Orders() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [detail, setDetail] = useState(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [params, setParams] = useState({})
  const [user, setUser] = useState(null)

  useEffect(() => {
    const us = localStorage.getItem('user')
    if (us) setUser(JSON.parse(us))
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const res = await commonApi.getOrders(params)
      setData(res || [])
    } finally {
      setLoading(false)
    }
  }

  const showDetail = async (record) => {
    const d = await commonApi.getOrderDetail(record.id)
    setDetail(d)
    setDetailOpen(true)
  }

  const columns = [
    {
      title: '订单号',
      dataIndex: 'order_no',
      width: 160,
      render: (v) => <a onClick={() => showDetail({ id: v?.id || data.find(o => o.order_no === v)?.id })} style={{ fontFamily: 'monospace' }}>{v}</a>,
    },
    { title: '商品', dataIndex: 'product_name', ellipsis: true },
    { title: '商品编码', dataIndex: 'product_code', width: 120 },
    { title: '数量', dataIndex: 'quantity', width: 80 },
    { title: '单价', dataIndex: 'unit_price', width: 100, render: (v) => `¥${v?.toFixed(2)}` },
    {
      title: '订单金额',
      dataIndex: 'order_amount',
      width: 120,
      sorter: (a, b) => a.order_amount - b.order_amount,
      render: (v) => <b style={{ color: '#1677ff' }}>¥{v?.toFixed(2)}</b>,
    },
    {
      title: '佣金金额',
      dataIndex: 'commission_amount',
      width: 120,
      render: (v, r) => {
        const final = r.final_commission ?? v
        return <b style={{ color: '#722ed1' }}>¥{final?.toFixed(2)}</b>
      },
    },
    {
      title: '退款金额',
      dataIndex: 'refund_amount',
      width: 110,
      render: (v) => v > 0 ? <Tag color="red">-¥{v.toFixed(2)}</Tag> : '-',
    },
    {
      title: '订单状态',
      dataIndex: 'order_status',
      width: 100,
      render: (v) => {
        const s = STATUS_MAP[v] || { text: v, color: 'default' }
        return <Tag color={s.color}>{s.text}</Tag>
      },
    },
    {
      title: '售后状态',
      dataIndex: 'aftersale_status',
      width: 110,
      render: (v) => {
        const s = AFTERSALE_MAP[v] || { text: v || '无', color: 'default' }
        return <Tag color={s.color}>{s.text}</Tag>
      },
    },
    {
      title: '争议',
      dataIndex: 'dispute_flag',
      width: 90,
      render: (v, r) => v ? (
        <Badge status={r.dispute_confirmed ? 'success' : 'warning'}
          text={r.dispute_confirmed ? '已解决' : '待确认'} />
      ) : '-',
    },
    user?.role === 'operation_accountant' && { title: '团长', dataIndex: 'leader_name', width: 100 },
    user?.role === 'operation_accountant' && { title: '供应商', dataIndex: 'supplier_name', width: 140, ellipsis: true },
    {
      title: '下单时间',
      dataIndex: 'order_date',
      width: 170,
      render: (v) => v ? dayjs(v).format('YYYY-MM-DD HH:mm') : '-',
    },
  ].filter(Boolean)

  return (
    <div>
      <Card style={{ borderRadius: 8 }}>
        <Space wrap style={{ marginBottom: 16 }}>
          <Input
            placeholder="搜索订单号/商品名"
            prefix={<SearchOutlined />}
            allowClear
            style={{ width: 240 }}
            onChange={(e) => setParams({ ...params, keyword: e.target.value })}
            onPressEnter={loadData}
          />
          <DatePicker.RangePicker
            showTime
            onChange={(dates) => {
              if (dates) {
                setParams({
                  ...params,
                  period_start: dates[0].toISOString(),
                  period_end: dates[1].toISOString(),
                })
              } else {
                const { period_start, period_end, ...rest } = params
                setParams(rest)
              }
            }}
          />
          <Select
            placeholder="订单状态"
            allowClear
            style={{ width: 130 }}
            onChange={(v) => setParams({ ...params, status: v })}
            options={Object.entries(STATUS_MAP).map(([k, v]) => ({ value: k, label: v.text }))}
          />
          <Select
            placeholder="售后状态"
            allowClear
            style={{ width: 130 }}
            onChange={(v) => setParams({ ...params, aftersale_status: v })}
            options={Object.entries(AFTERSALE_MAP).map(([k, v]) => ({ value: k, label: v.text }))}
          />
          <Button type="primary" icon={<SearchOutlined />} onClick={loadData}>查询</Button>
          <Button icon={<ReloadOutlined />} onClick={() => { setParams({}); loadData() }}>重置</Button>
        </Space>

        <Table
          rowKey="id"
          columns={columns}
          dataSource={data}
          loading={loading}
          scroll={{ x: 1400 }}
          pagination={{ pageSize: 20, showSizeChanger: true, showTotal: (t) => `共 ${t} 条` }}
        />
      </Card>

      <Drawer
        title="订单详情"
        width={720}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
      >
        {detail && (
          <div>
            <Descriptions title="基础信息" bordered column={2} size="small" style={{ marginBottom: 20 }}>
              <Descriptions.Item label="订单号">{detail.order_no}</Descriptions.Item>
              <Descriptions.Item label="下单时间">{dayjs(detail.order_date).format('YYYY-MM-DD HH:mm:ss')}</Descriptions.Item>
              <Descriptions.Item label="商品名称">{detail.product_name}</Descriptions.Item>
              <Descriptions.Item label="数量">{detail.quantity}</Descriptions.Item>
              <Descriptions.Item label="订单金额"><b style={{ color: '#1677ff' }}>¥{detail.order_amount.toFixed(2)}</b></Descriptions.Item>
              <Descriptions.Item label="佣金"><b style={{ color: '#722ed1' }}>¥{detail.commission_amount.toFixed(2)}</b></Descriptions.Item>
              <Descriptions.Item label="订单状态">
                <Tag color={STATUS_MAP[detail.order_status]?.color || 'default'}>
                  {STATUS_MAP[detail.order_status]?.text || detail.order_status}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="售后状态">
                <Tag color={AFTERSALE_MAP[detail.aftersale_status]?.color || 'default'}>
                  {AFTERSALE_MAP[detail.aftersale_status]?.text || detail.aftersale_status || '无'}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="团长">{detail.leader_name || '-'}</Descriptions.Item>
              <Descriptions.Item label="供应商">{detail.supplier_name || '-'}</Descriptions.Item>
              <Descriptions.Item label="退款金额" span={2}>
                <span style={{ color: '#ff4d4f' }}>¥{detail.refund_amount.toFixed(2)}</span>
              </Descriptions.Item>
            </Descriptions>

            {detail.aftersales?.length > 0 && (
              <div>
                <h4 style={{ marginBottom: 12 }}>售后记录 ({detail.aftersales.length})</h4>
                <Table
                  size="small"
                  rowKey="id"
                  pagination={false}
                  dataSource={detail.aftersales}
                  columns={[
                    { title: '售后单号', dataIndex: 'aftersale_no', width: 160 },
                    { title: '类型', dataIndex: 'aftersale_type', width: 110 },
                    { title: '原因', dataIndex: 'reason', ellipsis: true },
                    { title: '退款金额', dataIndex: 'refund_amount', width: 100, render: (v) => <Tag color="red">¥{v.toFixed(2)}</Tag> },
                    { title: '扣减佣金', dataIndex: 'deduction_commission', width: 100, render: (v) => <Tag color="orange">-¥{v.toFixed(2)}</Tag> },
                    { title: '状态', dataIndex: 'is_completed', width: 90, render: (v) => <Tag color={v ? 'green' : 'orange'}>{v ? '已完成' : '处理中'}</Tag> },
                    { title: '客服备注', dataIndex: 'customer_service_note', width: 150, ellipsis: true },
                  ]}
                />
              </div>
            )}
          </div>
        )}
      </Drawer>
    </div>
  )
}
