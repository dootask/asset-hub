import { Link, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  FileText,
  BarChart3,
  Settings,
} from 'lucide-react'

const menuItems = [
  {
    title: '首页',
    icon: LayoutDashboard,
    path: '/',
  },
  {
    title: '资产管理',
    icon: Package,
    path: '/assets',
  },
  {
    title: '耗材管理',
    icon: ShoppingCart,
    path: '/consumables',
  },
  {
    title: '审批中心',
    icon: FileText,
    path: '/approvals',
  },
  {
    title: '报表统计',
    icon: BarChart3,
    path: '/reports',
  },
  {
    title: '系统管理',
    icon: Settings,
    path: '/system',
  },
]

export default function Sidebar() {
  const location = useLocation()

  return (
    <aside className="w-64 border-r bg-card">
      <div className="p-6">
        <h1 className="text-2xl font-bold">资产管理系统</h1>
      </div>
      <nav className="space-y-1 px-3">
        {menuItems.map((item) => {
          const Icon = item.icon
          const isActive = location.pathname === item.path || 
                          (item.path !== '/' && location.pathname.startsWith(item.path))
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <Icon className="h-5 w-5" />
              <span>{item.title}</span>
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
