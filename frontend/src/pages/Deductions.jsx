import React, { useEffect, useState } from 'react'
import { Card, Table, Tag, Button, Space, Modal, Form, Input, Select, message } from 'antd'
import { commonApi } from '../services/api.js'

export default function Deductions() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)

  useEffect(() => {
    const us = localStorage.getItem('user')
    if (us) setUser(JSON.parse(us))
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const batches = await commonApi.getPayments({})
      const result = []
      for (let i = 1; i <= 50; i++) {
        try {
          const deds = await settlement_list_and_collect(i)
          if (deds) result.push(...deds)
        } catch {}
      }
      setData(result)
    } finally {
      setLoading(false)
    }
  }

  const settlement_list_and_collect = async (batchId) => {
    try {
      const { settlementApi } = await import('../services/api.js')
      const list = await settlementApi.deductions(batchId)
      return list
    } catch {
      return []
    }
  }

  useEffect(() => {
    ;(async () => {
      try {
        const { settlementApi } = await import('../services/api.js')
        const batches = await settlementApi.list({ limit: 100 })
        const all = []
        for (const b of batches) {
          try {
            const ds = await settlementApi.deductions(b.id)
            ds.forEach(d => { d.batch_no = b.batch_no; d.period_code = b.period_code })
            all.push(...ds)
          } catch {}
        }
        setData(all)
      } catch {}
    })()
  }, [])

  return (
    <Card style={{ borderRadius: 8 }} title="扣减明细（售后退款佣金扣减）">
      <Table
        rowKey="id"
        columns={[
          { title: '批次号', dataIndex: 'batch_no', width: 180, render: v => <span style={{ fontFamily: 'monospace' }}>{v}</span> },
          { title: '周期', dataIndex: 'period_code', width: 160 },
          { title: '订单号', dataIndex: 'order_no', width: 170, render: v => <span style={{ fontFamily: 'monospace' }}>{v}</span> },
          {
            title: '扣减类型', dataIndex: 'deduction_type', width: 140,
            render: v => <Tag color="red">{v === 'REFUND_COMMISSION' ? '售后退款扣佣' : v}</Tag>
          },
          { title: '说明', dataIndex: 'description', ellipsis: true },
          { title: '订单金额', dataIndex: 'order_amount', width: 110, render: v => `¥${v?.toFixed(2)}` },
          { title: '原始佣金', dataIndex: 'original_commission', width: 110, render: v => `¥${v?.toFixed(2)}` },
          { title: '退款金额', dataIndex: 'refund_amount', width: 110, render: v => <Tag color="red">-¥{v?.toFixed(2)}</Tag> },
          {
            title: '扣减佣金', dataIndex: 'deduction_commission', width: 120,
            render: v => <b style={{ color: '#fa8c16' }}>-¥{v?.toFixed(2)}</b>
          },
        ]}
        dataSource={data}
        loading={loading}
        scroll={{ x: 1400 }}
        pagination={{ pageSize: 20, showTotal: t => `共 ${t} 条扣减` }}
      />
    </Card>
  )
}
