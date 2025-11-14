import { getDatabase } from '../database/connection.js'
import { Role } from '../types/index.js'

interface Permission {
  id: number
  name: string
  code: string
  module: string
}

export class RoleService {
  private db = getDatabase()

  // 获取所有角色
  getAllRoles(): Role[] {
    const roles = this.db.prepare(`
      SELECT * FROM roles 
      WHERE status = 'active'
      ORDER BY is_system DESC, created_at DESC
    `).all() as Role[]
    
    // 为每个角色获取权限
    for (const role of roles) {
      role.permissions = this.getRolePermissions(role.id)
    }
    
    return roles
  }

  // 分页获取角色列表
  getRoles(page: number = 1, pageSize: number = 20, search?: string) {
    const offset = (page - 1) * pageSize
    
    let query = 'SELECT * FROM roles WHERE 1=1'
    const params: any[] = []
    
    if (search) {
      query += ' AND (name LIKE ? OR code LIKE ?)'
      params.push(`%${search}%`, `%${search}%`)
    }
    
    query += ' ORDER BY is_system DESC, created_at DESC LIMIT ? OFFSET ?'
    params.push(pageSize, offset)
    
    const roles = this.db.prepare(query).all(...params) as Role[]
    
    // 为每个角色获取权限
    for (const role of roles) {
      role.permissions = this.getRolePermissions(role.id)
    }
    
    const countQuery = search 
      ? 'SELECT COUNT(*) as total FROM roles WHERE name LIKE ? OR code LIKE ?'
      : 'SELECT COUNT(*) as total FROM roles'
    const countParams = search ? [`%${search}%`, `%${search}%`] : []
    const { total } = this.db.prepare(countQuery).get(...countParams) as { total: number }
    
    return { roles, total }
  }

  // 根据 ID 获取角色
  getRoleById(id: number): Role | null {
    const role = this.db.prepare('SELECT * FROM roles WHERE id = ?').get(id) as Role | undefined
    if (role) {
      role.permissions = this.getRolePermissions(role.id)
    }
    return role || null
  }

  // 创建角色
  createRole(data: Partial<Role> & { permissionIds?: number[] }): Role {
    const { name, code, description, permissionIds } = data
    
    // 检查角色代码是否已存在
    const existing = this.db.prepare('SELECT id FROM roles WHERE code = ?').get(code!) as { id: number } | undefined
    if (existing) {
      throw new Error('角色代码已存在')
    }
    
    const result = this.db.prepare(`
      INSERT INTO roles (name, code, description, is_system)
      VALUES (?, ?, ?, 0)
    `).run(name, code, description || null)
    
    const roleId = Number(result.lastInsertRowid)
    
    // 分配权限
    if (permissionIds && permissionIds.length > 0) {
      this.assignPermissions(roleId, permissionIds)
    }
    
    return this.getRoleById(roleId)!
  }

  // 更新角色
  updateRole(id: number, data: Partial<Role> & { permissionIds?: number[] }): Role {
    const { name, description, status, permissionIds } = data
    
    // 检查是否是系统角色
    const role = this.getRoleById(id)
    if (role?.is_system) {
      throw new Error('系统角色不能修改')
    }
    
    this.db.prepare(`
      UPDATE roles 
      SET name = ?, description = ?, status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND is_system = 0
    `).run(name, description || null, status || 'active', id)
    
    // 更新权限
    if (permissionIds !== undefined) {
      // 删除旧权限
      this.db.prepare('DELETE FROM role_permissions WHERE role_id = ?').run(id)
      // 分配新权限
      if (permissionIds.length > 0) {
        this.assignPermissions(id, permissionIds)
      }
    }
    
    return this.getRoleById(id)!
  }

  // 删除角色
  deleteRole(id: number): void {
    // 检查是否是系统角色
    const role = this.getRoleById(id)
    if (role?.is_system) {
      throw new Error('系统角色不能删除')
    }
    
    // 检查是否有用户使用此角色
    const users = this.db.prepare('SELECT COUNT(*) as count FROM user_roles WHERE role_id = ?').get(id) as { count: number }
    if (users.count > 0) {
      throw new Error('该角色已分配给用户，无法删除')
    }
    
    this.db.prepare('DELETE FROM roles WHERE id = ? AND is_system = 0').run(id)
  }

  // 获取角色的权限列表
  getRolePermissions(roleId: number): string[] {
    const permissions = this.db.prepare(`
      SELECT p.code
      FROM permissions p
      INNER JOIN role_permissions rp ON p.id = rp.permission_id
      WHERE rp.role_id = ?
    `).all(roleId) as { code: string }[]
    
    return permissions.map(p => p.code)
  }

  // 为角色分配权限
  assignPermissions(roleId: number, permissionIds: number[]): void {
    const insert = this.db.prepare(`
      INSERT INTO role_permissions (role_id, permission_id)
      VALUES (?, ?)
    `)
    
    for (const permissionId of permissionIds) {
      try {
        insert.run(roleId, permissionId)
      } catch (error) {
        // 忽略重复插入错误
      }
    }
  }

  // 获取所有权限
  getAllPermissions(): Permission[] {
    return this.db.prepare(`
      SELECT * FROM permissions 
      ORDER BY module, name
    `).all() as Permission[]
  }

  // 按模块分组获取权限
  getPermissionsByModule(): Record<string, Permission[]> {
    const permissions = this.getAllPermissions()
    const grouped: Record<string, Permission[]> = {}
    
    for (const permission of permissions) {
      if (!grouped[permission.module]) {
        grouped[permission.module] = []
      }
      grouped[permission.module].push(permission)
    }
    
    return grouped
  }

  // 获取用户的所有角色
  getUserRoles(userId: number): Role[] {
    const roles = this.db.prepare(`
      SELECT r.* 
      FROM roles r
      INNER JOIN user_roles ur ON r.id = ur.role_id
      WHERE ur.user_id = ?
    `).all(userId) as Role[]
    
    for (const role of roles) {
      role.permissions = this.getRolePermissions(role.id)
    }
    
    return roles
  }

  // 为用户分配角色
  assignRolesToUser(userId: number, roleIds: number[]): void {
    // 删除旧角色
    this.db.prepare('DELETE FROM user_roles WHERE user_id = ?').run(userId)
    
    // 分配新角色
    const insert = this.db.prepare(`
      INSERT INTO user_roles (user_id, role_id)
      VALUES (?, ?)
    `)
    
    for (const roleId of roleIds) {
      try {
        insert.run(userId, roleId)
      } catch (error) {
        // 忽略重复插入错误
      }
    }
  }

  // 检查用户是否有指定权限
  userHasPermission(userId: number, permissionCode: string): boolean {
    const result = this.db.prepare(`
      SELECT COUNT(*) as count
      FROM user_roles ur
      INNER JOIN role_permissions rp ON ur.role_id = rp.role_id
      INNER JOIN permissions p ON rp.permission_id = p.id
      WHERE ur.user_id = ? AND p.code = ?
    `).get(userId, permissionCode) as { count: number }
    
    return result.count > 0
  }
}
