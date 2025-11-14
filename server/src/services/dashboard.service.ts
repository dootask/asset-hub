import { getDatabase } from '../database/connection.js'

export class DashboardService {
  private db = getDatabase()

  // 获取资产概览统计
  getAssetOverview(filters?: {
    companyId?: number
    departmentId?: number
    startDate?: string
    endDate?: string
  }) {
    let baseQuery = 'SELECT status, COUNT(*) as count, SUM(current_value) as total_value FROM assets WHERE 1=1'
    const params: any[] = []
    
    if (filters?.companyId) {
      baseQuery += ' AND company_id = ?'
      params.push(filters.companyId)
    }
    
    if (filters?.departmentId) {
      baseQuery += ' AND department_id = ?'
      params.push(filters.departmentId)
    }
    
    if (filters?.startDate) {
      baseQuery += ' AND created_at >= ?'
      params.push(filters.startDate)
    }
    
    if (filters?.endDate) {
      baseQuery += ' AND created_at <= ?'
      params.push(filters.endDate)
    }
    
    baseQuery += ' GROUP BY status'
    
    const statusStats = this.db.prepare(baseQuery).all(...params) as Array<{
      status: string
      count: number
      total_value: number | null
    }>
    
    // 计算总计
    let totalCount = 0
    let totalValue = 0
    
    const stats: any = {
      total: { count: 0, value: 0 },
      idle: { count: 0, value: 0 },
      in_use: { count: 0, value: 0 },
      maintaining: { count: 0, value: 0 },
      scrapped: { count: 0, value: 0 },
      lost: { count: 0, value: 0 },
    }
    
    for (const stat of statusStats) {
      totalCount += stat.count
      totalValue += stat.total_value || 0
      
      if (stats[stat.status]) {
        stats[stat.status] = {
          count: stat.count,
          value: stat.total_value || 0,
        }
      }
    }
    
    stats.total = { count: totalCount, value: totalValue }
    
    return stats
  }

  // 按分类统计资产
  getAssetsByCategory(filters?: {
    companyId?: number
    departmentId?: number
  }) {
    let query = `
      SELECT c.name as category_name, COUNT(a.id) as count, SUM(a.current_value) as total_value
      FROM assets a
      LEFT JOIN asset_categories c ON a.category_id = c.id
      WHERE 1=1
    `
    const params: any[] = []
    
    if (filters?.companyId) {
      query += ' AND a.company_id = ?'
      params.push(filters.companyId)
    }
    
    if (filters?.departmentId) {
      query += ' AND a.department_id = ?'
      params.push(filters.departmentId)
    }
    
    query += ' GROUP BY c.id, c.name ORDER BY count DESC LIMIT 10'
    
    return this.db.prepare(query).all(...params)
  }

  // 按公司统计资产
  getAssetsByCompany() {
    const query = `
      SELECT c.name as company_name, COUNT(a.id) as count, SUM(a.current_value) as total_value
      FROM assets a
      LEFT JOIN companies c ON a.company_id = c.id
      GROUP BY c.id, c.name
      ORDER BY count DESC
    `
    
    return this.db.prepare(query).all()
  }

  // 按部门统计资产
  getAssetsByDepartment(companyId?: number) {
    let query = `
      SELECT d.name as department_name, COUNT(a.id) as count, SUM(a.current_value) as total_value
      FROM assets a
      LEFT JOIN departments d ON a.department_id = d.id
      WHERE a.department_id IS NOT NULL
    `
    const params: any[] = []
    
    if (companyId) {
      query += ' AND a.company_id = ?'
      params.push(companyId)
    }
    
    query += ' GROUP BY d.id, d.name ORDER BY count DESC LIMIT 10'
    
    return this.db.prepare(query).all(...params)
  }

  // 获取最近操作记录
  getRecentOperations(limit: number = 10, filters?: {
    userId?: number
    companyId?: number
  }) {
    let query = `
      SELECT ao.*, 
             a.name as asset_name,
             a.code as asset_code,
             u.realname as operator_name
      FROM asset_operations ao
      LEFT JOIN assets a ON ao.asset_id = a.id
      LEFT JOIN users u ON ao.operator_id = u.id
      WHERE 1=1
    `
    const params: any[] = []
    
    if (filters?.userId) {
      query += ' AND ao.operator_id = ?'
      params.push(filters.userId)
    }
    
    if (filters?.companyId) {
      query += ' AND a.company_id = ?'
      params.push(filters.companyId)
    }
    
    query += ' ORDER BY ao.created_at DESC LIMIT ?'
    params.push(limit)
    
    return this.db.prepare(query).all(...params)
  }

  // 获取待办事项
  getTodoList(userId: number) {
    const todos: any[] = []
    
    // 待审批事项
    const pendingApprovals = this.db.prepare(`
      SELECT COUNT(*) as count
      FROM approvals
      WHERE approver_id = ? AND status IN ('pending', 'reviewing')
    `).get(userId) as { count: number }
    
    if (pendingApprovals.count > 0) {
      todos.push({
        type: 'approval',
        title: '待审批申请',
        count: pendingApprovals.count,
        priority: 'high',
        link: '/approvals/pending',
      })
    }
    
    // 待盘点任务
    const pendingInventories = this.db.prepare(`
      SELECT COUNT(*) as count
      FROM inventory_tasks
      WHERE status = 'pending'
      AND JSON_EXTRACT(assignee_ids, '$') LIKE ?
    `).get(`%${userId}%`) as { count: number }
    
    if (pendingInventories.count > 0) {
      todos.push({
        type: 'inventory',
        title: '待盘点任务',
        count: pendingInventories.count,
        priority: 'normal',
        link: '/assets/inventory',
      })
    }
    
    // 耗材库存预警
    const lowStockConsumables = this.db.prepare(`
      SELECT COUNT(*) as count
      FROM consumables
      WHERE stock <= min_stock AND status = 'active'
    `).get() as { count: number }
    
    if (lowStockConsumables.count > 0) {
      todos.push({
        type: 'low_stock',
        title: '耗材库存预警',
        count: lowStockConsumables.count,
        priority: 'medium',
        link: '/consumables/list',
      })
    }
    
    return todos
  }

  // 获取资产趋势数据（按月统计）
  getAssetTrend(months: number = 12, filters?: {
    companyId?: number
    categoryId?: number
  }) {
    let query = `
      SELECT 
        strftime('%Y-%m', created_at) as month,
        COUNT(*) as count,
        SUM(purchase_price) as total_value
      FROM assets
      WHERE created_at >= datetime('now', '-${months} months')
    `
    const params: any[] = []
    
    if (filters?.companyId) {
      query += ' AND company_id = ?'
      params.push(filters.companyId)
    }
    
    if (filters?.categoryId) {
      query += ' AND category_id = ?'
      params.push(filters.categoryId)
    }
    
    query += ' GROUP BY month ORDER BY month ASC'
    
    return this.db.prepare(query).all(...params)
  }

  // 获取耗材概览统计
  getConsumableOverview(filters?: {
    companyId?: number
  }) {
    let query = `
      SELECT 
        COUNT(*) as total_count,
        SUM(stock * price) as total_value,
        SUM(CASE WHEN stock <= min_stock THEN 1 ELSE 0 END) as low_stock_count
      FROM consumables
      WHERE status = 'active'
    `
    const params: any[] = []
    
    // 暂时不按公司筛选耗材，因为表结构中没有 company_id
    
    return this.db.prepare(query).get(...params)
  }

  // 获取完整的仪表板数据
  getDashboardData(userId: number, filters?: {
    companyId?: number
    departmentId?: number
  }) {
    return {
      assetOverview: this.getAssetOverview(filters),
      assetsByCategory: this.getAssetsByCategory(filters),
      assetsByCompany: this.getAssetsByCompany(),
      assetsByDepartment: this.getAssetsByDepartment(filters?.companyId),
      recentOperations: this.getRecentOperations(10, { companyId: filters?.companyId }),
      todoList: this.getTodoList(userId),
      assetTrend: this.getAssetTrend(12, { companyId: filters?.companyId }),
      consumableOverview: this.getConsumableOverview(),
    }
  }
}
