import { getDatabase } from '../database/connection.js'
import { Asset } from '../types/index.js'

export class AssetService {
  private db = getDatabase()

  // 分页获取资产列表
  getAssets(page: number = 1, pageSize: number = 20, filters?: {
    search?: string
    categoryId?: number
    status?: string
    companyId?: number
    departmentId?: number
    userId?: number
  }) {
    const offset = (page - 1) * pageSize
    
    let query = `
      SELECT a.*, 
             c.name as category_name,
             co.name as company_name,
             d.name as department_name,
             u.realname as user_name,
             creator.realname as created_by_name,
             updater.realname as updated_by_name
      FROM assets a
      LEFT JOIN asset_categories c ON a.category_id = c.id
      LEFT JOIN companies co ON a.company_id = co.id
      LEFT JOIN departments d ON a.department_id = d.id
      LEFT JOIN users u ON a.user_id = u.id
      LEFT JOIN users creator ON a.created_by = creator.id
      LEFT JOIN users updater ON a.updated_by = updater.id
      WHERE 1=1
    `
    const params: any[] = []
    
    if (filters?.search) {
      query += ' AND (a.name LIKE ? OR a.code LIKE ? OR a.serial_number LIKE ?)'
      params.push(`%${filters.search}%`, `%${filters.search}%`, `%${filters.search}%`)
    }
    
    if (filters?.categoryId) {
      query += ' AND a.category_id = ?'
      params.push(filters.categoryId)
    }
    
    if (filters?.status) {
      query += ' AND a.status = ?'
      params.push(filters.status)
    }
    
    if (filters?.companyId) {
      query += ' AND a.company_id = ?'
      params.push(filters.companyId)
    }
    
    if (filters?.departmentId) {
      query += ' AND a.department_id = ?'
      params.push(filters.departmentId)
    }
    
    if (filters?.userId) {
      query += ' AND a.user_id = ?'
      params.push(filters.userId)
    }
    
    query += ' ORDER BY a.created_at DESC LIMIT ? OFFSET ?'
    params.push(pageSize, offset)
    
    const assets = this.db.prepare(query).all(...params) as Asset[]
    
    // 解析 JSON 字段
    for (const asset of assets) {
      if (asset.custom_fields) {
        try {
          asset.custom_fields = JSON.parse(asset.custom_fields as any)
        } catch (e) {
          asset.custom_fields = {}
        }
      }
      if (asset.images) {
        try {
          asset.images = JSON.parse(asset.images as any)
        } catch (e) {
          asset.images = []
        }
      }
    }
    
    // 获取总数
    let countQuery = 'SELECT COUNT(*) as total FROM assets WHERE 1=1'
    const countParams: any[] = []
    
    if (filters?.search) {
      countQuery += ' AND (name LIKE ? OR code LIKE ? OR serial_number LIKE ?)'
      countParams.push(`%${filters.search}%`, `%${filters.search}%`, `%${filters.search}%`)
    }
    if (filters?.categoryId) {
      countQuery += ' AND category_id = ?'
      countParams.push(filters.categoryId)
    }
    if (filters?.status) {
      countQuery += ' AND status = ?'
      countParams.push(filters.status)
    }
    if (filters?.companyId) {
      countQuery += ' AND company_id = ?'
      countParams.push(filters.companyId)
    }
    if (filters?.departmentId) {
      countQuery += ' AND department_id = ?'
      countParams.push(filters.departmentId)
    }
    if (filters?.userId) {
      countQuery += ' AND user_id = ?'
      countParams.push(filters.userId)
    }
    
    const { total } = this.db.prepare(countQuery).get(...countParams) as { total: number }
    
    return { assets, total }
  }

  // 根据 ID 获取资产
  getAssetById(id: number): Asset | null {
    const asset = this.db.prepare(`
      SELECT a.*, 
             c.name as category_name,
             co.name as company_name,
             d.name as department_name,
             u.realname as user_name,
             creator.realname as created_by_name,
             updater.realname as updated_by_name
      FROM assets a
      LEFT JOIN asset_categories c ON a.category_id = c.id
      LEFT JOIN companies co ON a.company_id = co.id
      LEFT JOIN departments d ON a.department_id = d.id
      LEFT JOIN users u ON a.user_id = u.id
      LEFT JOIN users creator ON a.created_by = creator.id
      LEFT JOIN users updater ON a.updated_by = updater.id
      WHERE a.id = ?
    `).get(id) as Asset | undefined
    
    if (asset) {
      // 解析 JSON 字段
      if (asset.custom_fields) {
        try {
          asset.custom_fields = JSON.parse(asset.custom_fields as any)
        } catch (e) {
          asset.custom_fields = {}
        }
      }
      if (asset.images) {
        try {
          asset.images = JSON.parse(asset.images as any)
        } catch (e) {
          asset.images = []
        }
      }
    }
    
    return asset || null
  }

  // 根据编号获取资产
  getAssetByCode(code: string): Asset | null {
    const asset = this.db.prepare('SELECT * FROM assets WHERE code = ?').get(code) as Asset | undefined
    return asset || null
  }

  // 创建资产
  createAsset(data: Partial<Asset>, userId: number): Asset {
    const {
      name,
      code,
      category_id,
      company_id,
      department_id,
      user_id,
      location,
      purchase_date,
      purchase_price,
      current_value,
      supplier,
      brand,
      model,
      serial_number,
      warranty_end_date,
      description,
      custom_fields,
      images,
      qr_code,
      rfid_tag,
    } = data
    
    // 检查编号是否已存在
    if (code && this.getAssetByCode(code)) {
      throw new Error('资产编号已存在')
    }
    
    const result = this.db.prepare(`
      INSERT INTO assets (
        name, code, category_id, company_id, department_id, user_id,
        location, purchase_date, purchase_price, current_value,
        supplier, brand, model, serial_number, warranty_end_date,
        description, custom_fields, images, qr_code, rfid_tag,
        created_by, updated_by
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      name,
      code || this.generateAssetCode(),
      category_id,
      company_id,
      department_id || null,
      user_id || null,
      location || null,
      purchase_date || null,
      purchase_price || null,
      current_value || purchase_price || null,
      supplier || null,
      brand || null,
      model || null,
      serial_number || null,
      warranty_end_date || null,
      description || null,
      custom_fields ? JSON.stringify(custom_fields) : null,
      images ? JSON.stringify(images) : null,
      qr_code || null,
      rfid_tag || null,
      userId,
      userId
    )
    
    return this.getAssetById(Number(result.lastInsertRowid))!
  }

  // 更新资产
  updateAsset(id: number, data: Partial<Asset>, userId: number): Asset {
    const {
      name,
      category_id,
      status,
      company_id,
      department_id,
      user_id,
      location,
      purchase_date,
      purchase_price,
      current_value,
      supplier,
      brand,
      model,
      serial_number,
      warranty_end_date,
      description,
      custom_fields,
      images,
    } = data
    
    this.db.prepare(`
      UPDATE assets 
      SET name = ?, category_id = ?, status = ?, company_id = ?,
          department_id = ?, user_id = ?, location = ?,
          purchase_date = ?, purchase_price = ?, current_value = ?,
          supplier = ?, brand = ?, model = ?, serial_number = ?,
          warranty_end_date = ?, description = ?, custom_fields = ?,
          images = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      name,
      category_id,
      status || 'idle',
      company_id,
      department_id || null,
      user_id || null,
      location || null,
      purchase_date || null,
      purchase_price || null,
      current_value || null,
      supplier || null,
      brand || null,
      model || null,
      serial_number || null,
      warranty_end_date || null,
      description || null,
      custom_fields ? JSON.stringify(custom_fields) : null,
      images ? JSON.stringify(images) : null,
      userId,
      id
    )
    
    return this.getAssetById(id)!
  }

  // 删除资产
  deleteAsset(id: number): void {
    // 检查是否有操作记录
    const operations = this.db.prepare(
      'SELECT COUNT(*) as count FROM asset_operations WHERE asset_id = ?'
    ).get(id) as { count: number }
    
    if (operations.count > 0) {
      throw new Error('资产有操作记录，无法删除')
    }
    
    this.db.prepare('DELETE FROM assets WHERE id = ?').run(id)
  }

  // 生成资产编号
  private generateAssetCode(): string {
    const prefix = 'AST'
    const timestamp = Date.now().toString().slice(-8)
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
    return `${prefix}${timestamp}${random}`
  }

  // 获取资产统计信息
  getAssetStatistics(filters?: {
    companyId?: number
    departmentId?: number
    startDate?: string
    endDate?: string
  }) {
    let query = 'SELECT status, COUNT(*) as count, SUM(current_value) as total_value FROM assets WHERE 1=1'
    const params: any[] = []
    
    if (filters?.companyId) {
      query += ' AND company_id = ?'
      params.push(filters.companyId)
    }
    
    if (filters?.departmentId) {
      query += ' AND department_id = ?'
      params.push(filters.departmentId)
    }
    
    if (filters?.startDate) {
      query += ' AND created_at >= ?'
      params.push(filters.startDate)
    }
    
    if (filters?.endDate) {
      query += ' AND created_at <= ?'
      params.push(filters.endDate)
    }
    
    query += ' GROUP BY status'
    
    const stats = this.db.prepare(query).all(...params) as Array<{
      status: string
      count: number
      total_value: number
    }>
    
    return stats
  }

  // 批量导入资产
  importAssets(assets: Partial<Asset>[], userId: number): {
    success: number
    failed: number
    errors: string[]
  } {
    let success = 0
    let failed = 0
    const errors: string[] = []
    
    for (const assetData of assets) {
      try {
        this.createAsset(assetData, userId)
        success++
      } catch (error: any) {
        failed++
        errors.push(`资产 ${assetData.name}: ${error.message}`)
      }
    }
    
    return { success, failed, errors }
  }
}
