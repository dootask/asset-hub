import { getDatabase } from '../database/connection.js'
import { User } from '../types/index.js'

export class UserService {
  private db = getDatabase()

  // 分页获取用户列表
  getUsers(page: number = 1, pageSize: number = 20, filters?: {
    search?: string
    companyId?: number
    departmentId?: number
    status?: string
  }) {
    const offset = (page - 1) * pageSize
    
    let query = `
      SELECT u.*, c.name as company_name, d.name as department_name
      FROM users u
      LEFT JOIN companies c ON u.company_id = c.id
      LEFT JOIN departments d ON u.department_id = d.id
      WHERE 1=1
    `
    const params: any[] = []
    
    if (filters?.search) {
      query += ' AND (u.username LIKE ? OR u.realname LIKE ? OR u.email LIKE ?)'
      params.push(`%${filters.search}%`, `%${filters.search}%`, `%${filters.search}%`)
    }
    
    if (filters?.companyId) {
      query += ' AND u.company_id = ?'
      params.push(filters.companyId)
    }
    
    if (filters?.departmentId) {
      query += ' AND u.department_id = ?'
      params.push(filters.departmentId)
    }
    
    if (filters?.status) {
      query += ' AND u.status = ?'
      params.push(filters.status)
    }
    
    query += ' ORDER BY u.created_at DESC LIMIT ? OFFSET ?'
    params.push(pageSize, offset)
    
    const users = this.db.prepare(query).all(...params) as User[]
    
    // 获取总数
    let countQuery = 'SELECT COUNT(*) as total FROM users WHERE 1=1'
    const countParams: any[] = []
    
    if (filters?.search) {
      countQuery += ' AND (username LIKE ? OR realname LIKE ? OR email LIKE ?)'
      countParams.push(`%${filters.search}%`, `%${filters.search}%`, `%${filters.search}%`)
    }
    if (filters?.companyId) {
      countQuery += ' AND company_id = ?'
      countParams.push(filters.companyId)
    }
    if (filters?.departmentId) {
      countQuery += ' AND department_id = ?'
      countParams.push(filters.departmentId)
    }
    if (filters?.status) {
      countQuery += ' AND status = ?'
      countParams.push(filters.status)
    }
    
    const { total } = this.db.prepare(countQuery).get(...countParams) as { total: number }
    
    return { users, total }
  }

  // 根据 ID 获取用户
  getUserById(id: number): User | null {
    const user = this.db.prepare(`
      SELECT u.*, c.name as company_name, d.name as department_name
      FROM users u
      LEFT JOIN companies c ON u.company_id = c.id
      LEFT JOIN departments d ON u.department_id = d.id
      WHERE u.id = ?
    `).get(id) as User | undefined
    
    return user || null
  }

  // 根据用户名获取用户
  getUserByUsername(username: string): User | null {
    const user = this.db.prepare('SELECT * FROM users WHERE username = ?').get(username) as User | undefined
    return user || null
  }

  // 创建用户
  createUser(data: Partial<User>): User {
    const {
      username,
      realname,
      email,
      phone,
      company_id,
      department_id,
      position,
      employee_number,
      dootask_user_id
    } = data
    
    // 检查用户名是否已存在
    if (this.getUserByUsername(username!)) {
      throw new Error('用户名已存在')
    }
    
    const result = this.db.prepare(`
      INSERT INTO users (
        username, realname, email, phone, company_id, department_id, 
        position, employee_number, dootask_user_id
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      username, realname, email || null, phone || null,
      company_id || null, department_id || null,
      position || null, employee_number || null, dootask_user_id || null
    )
    
    return this.getUserById(Number(result.lastInsertRowid))!
  }

  // 更新用户
  updateUser(id: number, data: Partial<User>): User {
    const {
      realname,
      email,
      phone,
      company_id,
      department_id,
      position,
      employee_number,
      status
    } = data
    
    this.db.prepare(`
      UPDATE users 
      SET realname = ?, email = ?, phone = ?, company_id = ?, 
          department_id = ?, position = ?, employee_number = ?, 
          status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      realname, email || null, phone || null, company_id || null,
      department_id || null, position || null, employee_number || null,
      status || 'active', id
    )
    
    return this.getUserById(id)!
  }

  // 删除用户
  deleteUser(id: number): void {
    // 软删除：将状态设置为 inactive
    this.db.prepare(`
      UPDATE users 
      SET status = 'inactive', updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(id)
  }

  // 批量导入用户
  importUsers(users: Partial<User>[]): { success: number; failed: number; errors: string[] } {
    let success = 0
    let failed = 0
    const errors: string[] = []
    
    for (const userData of users) {
      try {
        this.createUser(userData)
        success++
      } catch (error: any) {
        failed++
        errors.push(`用户 ${userData.username}: ${error.message}`)
      }
    }
    
    return { success, failed, errors }
  }

  // 从 DooTask 同步用户
  async syncFromDooTask(dootaskUsers: any[]): Promise<{ synced: number; errors: string[] }> {
    let synced = 0
    const errors: string[] = []
    
    for (const dUser of dootaskUsers) {
      try {
        const existingUser = this.db.prepare(
          'SELECT * FROM users WHERE dootask_user_id = ?'
        ).get(dUser.id) as User | undefined
        
        if (existingUser) {
          // 更新现有用户
          this.updateUser(existingUser.id, {
            realname: dUser.realname || dUser.nickname,
            email: dUser.email,
            phone: dUser.phone,
          })
        } else {
          // 创建新用户
          this.createUser({
            username: dUser.email || `user${dUser.id}`,
            realname: dUser.realname || dUser.nickname,
            email: dUser.email,
            phone: dUser.phone,
            dootask_user_id: dUser.id,
          })
        }
        synced++
      } catch (error: any) {
        errors.push(`同步用户 ${dUser.email}: ${error.message}`)
      }
    }
    
    return { synced, errors }
  }
}
