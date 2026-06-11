import React, { useEffect, useState } from 'react'
import { Card, Table, Tag, Button, Space, Modal, Form, Input, message } from 'antd'
import { CheckCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { commonApi } from '../services/api.js'

export default function Disputes() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [current, setCurrent] = useState(null)
  const [form] = Form.useForm()

  const loadData = async () => {
    setLoading(true)
    try { setData(await commonApi.getDisputes()) } finally { setLoading(false) }
  }

  useEffect(() => { loadData() }, [])

  const resolve = (record, confirmed = true) => {
    Modal.confirm({
      title: confirmed ? '确认解决争议？' : '标记争议已处理？',
      content: `订单号: ${record.order_no}\n商品: ${record.product_name}`,
      onOk: async () => {
        try {
          await commonApi.updateDispute(record.id, {
            dispute_confirmed: confirmed,
            customer_service_note: record.customer_service_note || (confirmed ? '已核实，争议已解决' : '争议处理中'),
          })
          message.success('争议状态已更新')
          loadData()
        } catch {}
      },
    })
  }

  const openNote = (record) => {
    setCurrent(record)
    form.setFieldsValue({
      customer_service_note: record.customer_service_note || '',
      dispute_confirmed: record.dispute_confirmed,
    })
    setOpen(true)
  }

  const saveNote = async () => {
    const values = await form.validateFields()
    try {
      await commonApi.updateDispute(current.id, values)
      message.success('客服备注已保存')
      setOpen(false)
      loadData()
    } catch {}
  }

  return (
    <Card style={{ borderRadius: 8 }} title="争议订单处理（仅客服）">
      <Table
        rowKey="id"
        loading={loading}
        dataSource={data}
        pagination={{ pageSize: 15 }}
        scroll={{ x: 1200 }}
        columns={[
          { title: '订单号', dataIndex: 'order_no', width: 170, render: v => <span style={{ fontFamily: 'monospace' }}>{v}</span> },
          { title: '商品', dataIndex: 'product_name', ellipsis: true },
          { title: '团长', dataIndex: 'leader_name', width: 100 },
          { title: '供应商', dataIndex: 'supplier_name', width: 140, ellipsis: true },
          { title: '订单金额', width: 110, dataIndex: 'order_amount', render: v => `¥${v?.toFixed(2)}`, align: 'right' },
          { title: '退款金额', width: 110, dataIndex: 'refund_amount', render: v => v > 0 ? <Tag color="red">-¥{v?.toFixed(2)}</Tag> : '-', align: 'right' },
          { title: '售后状态', dataIndex: 'aftersale_status', width: 110, render: v => <Tag color="orange">{v}</Tag> },
          {
            title: '确认状态', width: 100, dataIndex: 'dispute_confirmed',
            render: v => v
              ? <Tag icon={<CheckCircleOutlined />} color="green">已确认</Tag>
              : <Tag icon={<ExclamationCircleOutlined />} color="red">待确认</Tag>
          },
          { title: '客服备注', dataIndex: 'customer_service_note', ellipsis: true },
          { title: '下单时间', dataIndex: 'order_date', width: 160, render: v => v ? dayjs(v).format('YYYY-MM-DD HH:mm') : '-' },
          {
            title: '操作', width: 220, fixed: 'right',
            render: (_, r) => (
              <Space>
                <Button size="small" onClick={() => openNote(r)}>备注</Button>
                {!r.dispute_confirmed && (
                  <Button size="small" type="primary" onClick={() => resolve(r, true)}>
                    确认解决
                  </Button>
                )}
              </Space>
            ),
          },
        ]}
      />

      <Modal
        title="处理争议订单"
        open={open}
        onCancel={() => setOpen(false)}
        onOk={saveNote}
        okText="保存"
      >
        {current && (
          <div>
            <div style={{ marginBottom: 12, padding: 12, background: '#fafafa', borderRadius: 6 }}>
              <div>订单号: <b>{current.order_no}</b></div>
              <div>商品: {current.product_name}</div>
              <div>订单金额: ¥{current.order_amount?.toFixed(2)}</div>
            </div>
            <Form form={form} layout="vertical">
              <Form.Item name="dispute_confirmed" label="争议状态">
                <Radio.Group options={[
                  { label: '待确认（暂缓结算）', value: false },
                  { label: '已解决（可参与结算）', value: true },
                ]} />
              </Form.Item>
              <Form.Item name="customer_service_note" label="处理备注" rules={[{ required: true, message: '请填写处理说明' }]}>
                <Input.TextArea rows={4} placeholder="请填写争议处理的详细说明，将作为审计依据" />
              </Form.Item>
            </Form>
          </div>
        )}
      </Modal>
    </Card>
  )
}

import { Radio } from 'antd'
