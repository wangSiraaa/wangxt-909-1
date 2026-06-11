import React, { useEffect, useState } from 'react'
import { Table, Tag, Card, Button, Space, Drawer, Form, Select, Input, Modal, message } from 'antd'
import { ReloadOutlined, EditOutlined, CheckCircleOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { commonApi } from '../services/api.js'

const REFUND_STATUS = {
  pending: { text: '待处理', color: 'orange' },
  processing: { text: '处理中', color: 'blue' },
  refunded: { text: '已退款', color: 'green' },
  rejected: { text: '已驳回', color: 'default' },
  partial_refund: { text: '部分退款', color: 'cyan' },
}

export default function Aftersales() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [user, setUser] = useState(null)
  const [processOpen, setProcessOpen] = useState(false)
  const [currentRecord, setCurrentRecord] = useState(null)
  const [form] = Form.useForm()

  useEffect(() => {
    const us = localStorage.getItem('user')
    if (us) setUser(JSON.parse(us))
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      setData(await commonApi.getAftersales())
    } finally {
      setLoading(false)
    }
  }

  const openProcess = (record) => {
    setCurrentRecord(record)
    form.setFieldsValue({
      refund_status: record.refund_status,
      customer_service_note: record.customer_service_note || '',
      is_completed: record.is_completed,
    })
    setProcessOpen(true)
  }

  const handleProcess = async () => {
    const values = await form.validateFields()
    try {
      await commonApi.processAftersale(currentRecord.id, values)
      message.success('售后处理成功')
      setProcessOpen(false)
      loadData()
    } catch (e) {}
  }

  const isCS = user?.role === 'customer_service' || user?.role === 'operation_accountant'

  const columns = [
    { title: '售后单号', dataIndex: 'aftersale_no', width: 170, render: (v) => <span style={{ fontFamily: 'monospace' }}>{v}</span> },
    { title: '关联订单', dataIndex: 'order_no', width: 170 },
    {
      title: '类型', dataIndex: 'aftersale_type', width: 110,
      render: (v) => {
        const map = {
          return_refund: '退货退款',
          partial_refund: '部分退款',
          exchange: '换货',
          repair: '维修',
        }
        return map[v] || v
      },
    },
    { title: '原因', dataIndex: 'reason', ellipsis: true },
    {
      title: '退款金额', dataIndex: 'refund_amount', width: 110,
      render: (v) => <b style={{ color: '#ff4d4f' }}>¥{v?.toFixed(2)}</b>,
    },
    {
      title: '扣减佣金', dataIndex: 'deduction_commission', width: 110,
      render: (v) => <Tag color="orange">-¥{v?.toFixed(2)}</Tag>,
    },
    {
      title: '退款状态', dataIndex: 'refund_status', width: 100,
      render: (v) => <Tag color={REFUND_STATUS[v]?.color || 'default'}>
        {REFUND_STATUS[v]?.text || v}
      </Tag>,
    },
    {
      title: '完结状态', dataIndex: 'is_completed', width: 100,
      render: (v) => v
        ? <Tag icon={<CheckCircleOutlined />} color="green">已完结</Tag>
        : <Tag color="red">未完结</Tag>,
    },
    { title: '客服备注', dataIndex: 'customer_service_note', ellipsis: true },
    isCS && user?.role === 'leader' ? null : { title: '团长', dataIndex: 'leader_name', width: 100 },
    {
      title: '申请时间', dataIndex: 'created_at', width: 170,
      render: (v) => dayjs(v).format('YYYY-MM-DD HH:mm'),
    },
    isCS && {
      title: '操作', width: 100,
      fixed: 'right',
      render: (_, r) => !r.is_completed && (
        <Button type="link" icon={<EditOutlined />} onClick={() => openProcess(r)}>处理</Button>
      ),
    },
  ].filter(Boolean)

  return (
    <div>
      <Card style={{ borderRadius: 8 }}>
        <Space style={{ marginBottom: 16 }}>
          <Button icon={<ReloadOutlined />} onClick={loadData}>刷新</Button>
        </Space>

        <Table
          rowKey="id"
          columns={columns}
          dataSource={data}
          loading={loading}
          scroll={{ x: 1400 }}
          pagination={{ pageSize: 20, showTotal: (t) => `共 ${t} 条` }}
        />
      </Card>

      <Drawer
        title="处理售后"
        width={560}
        open={processOpen}
        onClose={() => setProcessOpen(false)}
        extra={
          <Space>
            <Button onClick={() => setProcessOpen(false)}>取消</Button>
            <Button type="primary" onClick={handleProcess}>保存</Button>
          </Space>
        }
      >
        {currentRecord && (
          <div>
            <Card size="small" type="inner" style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 12, color: '#888' }}>售后单号</div>
              <div style={{ fontFamily: 'monospace', fontWeight: 600 }}>{currentRecord.aftersale_no}</div>
              <div style={{ marginTop: 8, fontSize: 13 }}>原因: {currentRecord.reason}</div>
              <div style={{ marginTop: 4 }}>
                退款: <b style={{ color: '#ff4d4f' }}>¥{currentRecord.refund_amount.toFixed(2)}</b>
                {'　'}扣减佣金: <b style={{ color: '#fa8c16' }}>¥{currentRecord.deduction_commission.toFixed(2)}</b>
              </div>
            </Card>
            <Form form={form} layout="vertical">
              <Form.Item name="refund_status" label="退款状态" rules={[{ required: true }]}>
                <Select options={Object.entries(REFUND_STATUS).map(([k, v]) => ({ value: k, label: v.text }))} />
              </Form.Item>
              <Form.Item name="is_completed" label="是否完结" rules={[{ required: true }]}>
                <Select options={[
                  { value: true, label: '已完结' },
                  { value: false, label: '处理中' },
                ]} />
              </Form.Item>
              <Form.Item name="customer_service_note" label="客服处理备注">
                <Input.TextArea rows={4} placeholder="请输入处理说明，将记录到审计日志中" />
              </Form.Item>
            </Form>
          </div>
        )}
      </Drawer>
    </div>
  )
}
