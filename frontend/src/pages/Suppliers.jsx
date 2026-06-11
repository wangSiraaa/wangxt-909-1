import React, { useEffect, useState } from 'react'
import { Card, Table, Tag, Space, Progress } from 'antd'
import { commonApi } from '../services/api.js'

export default function Suppliers() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      try { setData(await commonApi.getSuppliers()) } finally { setLoading(false) }
    })()
  }, [])

  return (
    <Card style={{ borderRadius: 8 }} title="供应商档案">
      <Table
        rowKey="id"
        columns={[
          { title: '编码', dataIndex: 'supplier_code', width: 130, render: v => <span style={{ fontFamily: 'monospace' }}>{v}</span> },
          { title: '名称', dataIndex: 'supplier_name' },
          { title: '账号', dataIndex: 'username', width: 120 },
          { title: '联系人', dataIndex: 'contact_person', width: 100 },
          { title: '联系电话', dataIndex: 'contact_phone', width: 130 },
          {
            title: '货款进度',
            width: 300,
            render: (_, r) => {
              const pct = r.total_payable > 0 ? (r.paid_amount / r.total_payable * 100) : 0
              return (
                <div>
                  <Progress percent={Number(pct.toFixed(1))} size="small" strokeColor="#1677ff" />
                  <div style={{ fontSize: 12, color: '#888' }}>
                    已付 ¥{r.paid_amount?.toFixed(2)} / 总额 ¥{r.total_payable?.toFixed(2)}
                  </div>
                </div>
              )
            }
          },
          { title: '待付货款', width: 120, render: (_, r) => <b style={{ color: '#1677ff' }}>¥{r.pending_amount?.toFixed(2)}</b> },
        ]}
        dataSource={data}
        loading={loading}
        scroll={{ x: 1200 }}
        pagination={{ pageSize: 20, showTotal: t => `共 ${t} 家供应商` }}
      />
    </Card>
  )
}
