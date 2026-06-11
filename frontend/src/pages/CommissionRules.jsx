import React, { useEffect, useState } from 'react'
import { Card, Table, Tag, Space, Statistic, Row, Col } from 'antd'
import { commonApi } from '../services/api.js'

export default function CommissionRules() {
  const [data, setData] = useState([])
  const [levels, setLevels] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      try {
        const [r, l] = await Promise.all([
          commonApi.getCommissionRules(),
          commonApi.getLeaderLevels(),
        ])
        setData(r)
        setLevels(l)
      } finally { setLoading(false) }
    })()
  }, [])

  return (
    <div>
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        {levels.map(l => (
          <Col xs={24} sm={12} md={6} key={l.id}>
            <Card>
              <Statistic
                title={l.name}
                value={`${(l.commission_rate * 100).toFixed(1)}%`}
                valueStyle={{ color: l.commission_rate >= 0.12 ? '#722ed1' : '#1677ff' }}
                suffix={`+${(l.bonus_rate * 100).toFixed(0)}%奖励`}
              />
              <div style={{ marginTop: 4, fontSize: 12, color: '#888' }}>
                最低 {l.min_orders} 单 · {l.description}
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      <Card title="佣金规则" style={{ borderRadius: 8 }}>
        <Table
          rowKey="id"
          loading={loading}
          dataSource={data}
          pagination={false}
          columns={[
            { title: '规则编码', dataIndex: 'rule_code', width: 150, render: v => <Tag color="blue">{v}</Tag> },
            { title: '规则名称', dataIndex: 'rule_name', width: 180 },
            { title: '适用品类', dataIndex: 'product_category', width: 120, render: v => {
              const c = { '生鲜': 'green', '日用': 'orange', '精品': 'purple' }
              return <Tag color={c[v] || 'default'}>{v}</Tag>
            }},
            { title: '基础佣金率', dataIndex: 'base_rate', width: 110, render: v => <b>{(v*100).toFixed(1)}%</b> },
            { title: '等级奖励加成', width: 280, dataIndex: 'level_bonus_rates', render: v => v && Object.entries(v).map(([k, val]) => (
              <Tag key={k} style={{ marginBottom: 4 }}>{k}: +{(val*100).toFixed(0)}%</Tag>
            ))},
            { title: '最低订单额', width: 120, dataIndex: 'min_order_amount', render: v => v > 0 ? `¥${v}` : '不限' },
          ]}
        />
      </Card>
    </div>
  )
}
