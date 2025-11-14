import { getDatabase } from '../database/connection.js'
import { Company } from '../types/index.js'

export class CompanyService {
  private db = getDatabase()

  // 获取所有公司（树形结构）
  getAllCompanies(): Company[] {
    const companies = this.db.prepare(`
      SELECT * FROM companies 
      WHERE status = 'active'
      ORDER BY level, sort
    `).all() as Company[]
    
    return this.buildTree(companies)
  }

  // 分页获取公司列表
  getCompanies(page: number = 1, pageSize: number = 20, search?: string) {
    const offset = (page - 1) * pageSize
    
    let query = 'SELECT * FROM companies WHERE 1=1'
    const params: any[] = []
    
    if (search) {
      query += ' AND (name LIKE ? OR code LIKE ?)'
      params.push(`%${search}%`, `%${search}%`)
    }
    
    query += ' ORDER BY level, sort LIMIT ? OFFSET ?'
    params.push(pageSize, offset)
    
    const companies = this.db.prepare(query).all(...params) as Company[]
    
    const countQuery = search 
      ? 'SELECT COUNT(*) as total FROM companies WHERE name LIKE ? OR code LIKE ?'
      : 'SELECT COUNT(*) as total FROM companies'
    const countParams = search ? [`%${search}%`, `%${search}%`] : []
    const { total } = this.db.prepare(countQuery).get(...countParams) as { total: number }
    
    return { companies, total }
  }

  // 根据 ID 获取公司
  getCompanyById(id: number): Company | null {
    const company = this.db.prepare('SELECT * FROM companies WHERE id = ?').get(id) as Company | undefined
    return company || null
  }

  // 创建公司
  createCompany(data: Partial<Company>): Company {
    const { name, code, parent_id, contact_person, contact_phone, address, description } = data
    
    // 计算层级
    let level = 1
    if (parent_id) {
      const parent = this.getCompanyById(parent_id)
      if (parent) {
        level = parent.level + 1
      }
    }
    
    const result = this.db.prepare(`
      INSERT INTO companies (name, code, parent_id, level, contact_person, contact_phone, address, description)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(name, code, parent_id || null, level, contact_person || null, contact_phone || null, address || null, description || null)
    
    return this.getCompanyById(Number(result.lastInsertRowid))!
  }

  // 更新公司
  updateCompany(id: number, data: Partial<Company>): Company {
    const { name, code, parent_id, contact_person, contact_phone, address, description, status } = data
    
    // 重新计算层级
    let level = 1
    if (parent_id) {
      const parent = this.getCompanyById(parent_id)
      if (parent) {
        level = parent.level + 1
      }
    }
    
    this.db.prepare(`
      UPDATE companies 
      SET name = ?, code = ?, parent_id = ?, level = ?, 
          contact_person = ?, contact_phone = ?, address = ?, 
          description = ?, status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      name, code, parent_id || null, level,
      contact_person || null, contact_phone || null, address || null,
      description || null, status || 'active', id
    )
    
    return this.getCompanyById(id)!
  }

  // 删除公司
  deleteCompany(id: number): void {
    // 检查是否有子公司
    const children = this.db.prepare('SELECT COUNT(*) as count FROM companies WHERE parent_id = ?').get(id) as { count: number }
    if (children.count > 0) {
      throw new Error('存在子公司，无法删除')
    }
    
    // 检查是否有关联的资产或用户
    const assets = this.db.prepare('SELECT COUNT(*) as count FROM assets WHERE company_id = ?').get(id) as { count: number }
    if (assets.count > 0) {
      throw new Error('存在关联的资产，无法删除')
    }
    
    this.db.prepare('DELETE FROM companies WHERE id = ?').run(id)
  }

  // 构建树形结构
  private buildTree(companies: Company[], parentId: number | null = null): Company[] {
    const tree: any[] = []
    
    for (const company of companies) {
      if (company.parentId === parentId) {
        const children = this.buildTree(companies, company.id)
        if (children.length > 0) {
          tree.push({ ...company, children })
        } else {
          tree.push(company)
        }
      }
    }
    
    return tree
  }
}
