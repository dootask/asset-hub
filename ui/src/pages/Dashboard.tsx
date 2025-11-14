import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Package, ShoppingCart, AlertCircle, TrendingUp } from 'lucide-react'

export default function Dashboard() {
  const stats = [
    {
      title: '资产总额',
      value: '¥1,234,567',
      change: '+12.5%',
      icon: Package,
      description: '较上月增长',
    },
    {
      title: '使用中资产',
      value: '356',
      change: '+8',
      icon: TrendingUp,
      description: '本月新增',
    },
    {
      title: '耗材库存',
      value: '1,234',
      change: '-23',
      icon: ShoppingCart,
      description: '本月消耗',
    },
    {
      title: '待处理审批',
      value: '12',
      change: '+3',
      icon: AlertCircle,
      description: '需要处理',
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">仪表板</h1>
        <p className="text-muted-foreground">欢迎使用资产管理系统</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">
                  <span className="text-green-600">{stat.change}</span> {stat.description}
                </p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>最近操作</CardTitle>
            <CardDescription>最近7天的资产操作记录</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center">
                <div className="flex-1">
                  <p className="text-sm font-medium">MacBook Pro 入库</p>
                  <p className="text-xs text-muted-foreground">2024-01-15 14:30</p>
                </div>
                <div className="text-sm text-muted-foreground">已完成</div>
              </div>
              <div className="flex items-center">
                <div className="flex-1">
                  <p className="text-sm font-medium">办公椅 领用申请</p>
                  <p className="text-xs text-muted-foreground">2024-01-14 10:20</p>
                </div>
                <div className="text-sm text-yellow-600">待审批</div>
              </div>
              <div className="flex items-center">
                <div className="flex-1">
                  <p className="text-sm font-medium">打印机 维修</p>
                  <p className="text-xs text-muted-foreground">2024-01-13 16:45</p>
                </div>
                <div className="text-sm text-muted-foreground">已完成</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>待办事项</CardTitle>
            <CardDescription>需要您处理的任务</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center">
                <div className="flex-1">
                  <p className="text-sm font-medium">审批资产采购申请</p>
                  <p className="text-xs text-muted-foreground">3个待审批</p>
                </div>
                <div className="text-sm text-red-600">紧急</div>
              </div>
              <div className="flex items-center">
                <div className="flex-1">
                  <p className="text-sm font-medium">本月资产盘点</p>
                  <p className="text-xs text-muted-foreground">截止日期：2024-01-31</p>
                </div>
                <div className="text-sm text-muted-foreground">进行中</div>
              </div>
              <div className="flex items-center">
                <div className="flex-1">
                  <p className="text-sm font-medium">耗材库存预警</p>
                  <p className="text-xs text-muted-foreground">5种耗材库存不足</p>
                </div>
                <div className="text-sm text-yellow-600">注意</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
