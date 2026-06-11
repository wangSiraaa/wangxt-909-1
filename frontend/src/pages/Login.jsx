import React, { useState } from 'react'
import { Form, Input, Button, Card, Typography, message, Checkbox, Divider, Tag, Alert } from 'antd'
import { UserOutlined, LockOutlined, UserAddOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { authApi } from '../services/api.js'

const { Title, Text, Link } = Typography

const TEST_ACCOUNTS = [
  { username: 'op_acc01', role: '运营会计', desc: '生成/复核结算批次' },
  { username: 'fin01', role: '财务复核', desc: '财务确认/付款' },
  { username: 'cs01', role: '客服', desc: '处理售后/争议' },
  { username: 'leader001', role: '团长', desc: '查看佣金/订单' },
  { username: 'supplier01', role: '供应商', desc: '查看货款/订单' },
]

export default function Login() {
  const [loading, setLoading] = useState(false)
  const [form] = Form.useForm()
  const navigate = useNavigate()

  const handleLogin = async (values) => {
    setLoading(true)
    try {
      const res = await authApi.login(values.username.trim(), values.password)
      localStorage.setItem('token', res.access_token)
      localStorage.setItem('user', JSON.stringify(res.user))
      message.success(`欢迎回来，${res.user.full_name}！')
      navigate('/dashboard')
    } catch (e) {
      // 拦截器已处理
    } finally {
      setLoading(false)
    }
  }

  const handleQuickLogin = (username) => {
    form.setFieldsValue({ username, password: '123456' })
  }

  return (
    <div style={styles.container}>
      <Card style={styles.card}>
        <div style={styles.logoArea}>
          <div style={styles.logoIcon}>🏪</div>
          <Title level={2} style={styles.title}>
            社群团购团长结算系统
          </Title>
          <Text type="secondary">Community Group Buy Settlement Platform</Text>
        </div>

        <Divider />

        <Alert
          message="测试账户（密码均为 123456）
          description={
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
              {TEST_ACCOUNTS.map((a) => (
                <Tag.CheckableTag
                  key={a.username}
                  checked={false}
                  onChange={() => handleQuickLogin(a.username)}
                  style={{ padding: '4px 10px', margin: 0 }}
                >
                  <b>{a.role}</b>: {a.username}
                </Tag.CheckableTag>
              ))}
            </div>
          }
          type="info"
          showIcon
          style={{ marginBottom: 20 }}
        />

        <Form form={form} onFinish={handleLogin} size="large">
          <Form.Item
            name="username"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input prefix={<UserOutlined />} placeholder="用户名" allowClear />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="密码" />
          </Form.Item>

          <Form.Item>
            <Form.Item name="remember" valuePropName="checked" noStyle>
              <Checkbox>记住登录</Checkbox>
            </Form.Item>
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              block
              size="large"
              style={{ height: 44, fontSize: 15, fontWeight: 600 }}
            >
              登 录
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    padding: 20,
  },
  card: {
    width: 460,
    borderRadius: 12,
    boxShadow: '0 8px 40px rgba(0,0,0,0.12)',
  },
  logoArea: {
    textAlign: 'center',
    marginBottom: 20,
  },
  logoIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  title: {
    margin: 0,
    color: '#262626',
  },
}
