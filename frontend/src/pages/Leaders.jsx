import React, { useEffect, useState } from 'react'
import { Card, Table, Tag, Space, Progress } from 'antd'
import { commonApi } from '../services/api.js'

export default function Leaders() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      try { setData(await commonApi.getLeaders()) } finally { setLoading(false) }
    })()
  }, [])

  return (
    <Card style={{ borderRadius: 8 }} title="团长档案">
      <Table
        rowKey="id"
        columns={[
          { title: '编号', dataIndex: 'leader_code', width: 130, render: v => <span style={{ fontFamily: 'monospace' }}>{v}</span> },
          { title: '姓名', dataIndex: 'full_name', width: 120 },
          { title: '账号', dataIndex: 'username', width: 120 },
          { title: '等级', dataIndex: 'level_name', width: 110, render: (v, r) => {
            const map = { '普通团长': 'default', '银牌团长': 'blue', '金牌团长': 'orange', '钻石团长': 'purple' }
            return <Tag color={map[v] || 'default'}>{v}</Tag>
          }},
          { title: '佣金率', dataIndex: 'commission_rate', width: 90, render: v => `${(v * 100).toFixed(1)}%` },
          {
            title: '累计佣金进度',
            width: 280,
            render: (_, r) => {
              const pct = r.total_commission > 0 ? (r.settled_commission / r.total_commission * 100) : 0
              return (
                <div>
                  <Progress percent={Number(pct.toFixed(1))} size="small" />
                  <div style={{ fontSize: 12, color: '#888' }}>
                    已结 ¥{r.settled_commission?.toFixed(2)} / 累计 ¥{r.total_commission?.toFixed(2)}
                  </div>
                </div>
              )
            }
          },
          { title: '待结佣金', width: 120, render: (_, r) => <b style={{ color: '#fa8c16' }}>¥{r.pending_commission?.toFixed(2)}</b> },
          { title: '联系电话', dataIndex: 'phone', width: 130 },
          { title: '入驻时间', dataIndex: 'joined_at', width: 170, render: v => v ? new Date(v).toLocaleString('zh-CN').slice(0, 16) : '-' },
        ]}
        dataSource={data}
        loading={loading}
        scroll={{ x: 1400 }}
        pagination={{ pageSize: 20, showTotal: t => `共 ${t} 位团长` }}
      />
    </Card>
  )
}
