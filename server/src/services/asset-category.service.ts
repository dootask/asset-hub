import { getDatabase } from '../database/connection.js'
import { AssetCategory } from '../types/index.js'

export class AssetCategoryService {
  private db = getDatabase()

  // 获取所有分类（树形结构）
  getAllCategories(): AssetCategory[] {
    const categories = this.db.prepare(`
      SELECT * FROM asset_categories 
      WHERE status = 'active'
      ORDER BY sort, created_at
    `).all() as AssetCategory[]
    
    return this.buildTree(categories)
  }

  // 分页获取分类列表
  getCategories(page: number = 1, pageSize: number = 20, search?: string) {
    const offset = (page - 1) * pageSize
    
    let query = 'SELECT * FROM asset_categories WHERE 1=1'
    const params: any[] = []
    
    if (search) {
      query += ' AND (name LIKE ? OR code LIKE ?)'
      params.push(`%${search}%`, `%${search}%`)
    }
    
    query += ' ORDER BY sort, created_at LIMIT ? OFFSET ?'
    params.push(pageSize, offset)
    
    const categories = this.db.prepare(query).all(...params) as AssetCategory[]
    
    // 获取每个分类下的资产数量
    for (const category of categories) {
      const { count } = this.db.prepare(
        'SELECT COUNT(*) as count FROM assets WHERE category_id = ?'
      ).get(category.id) as { count: number }
      category.assetCount = count
    }
    
    const countQuery = search 
      ? 'SELECT COUNT(*) as total FROM asset_categories WHERE name LIKE ? OR code LIKE ?'
      : 'SELECT COUNT(*) as total FROM asset_categories'
    const countParams = search ? [`%${search}%`, `%${search}%`] : []
    const { total } = this.db.prepare(countQuery).get(...countParams) as { total: number }
    
    return { categories, total }
  }

  // 根据 ID 获取分类
  getCategoryById(id: number): AssetCategory | null {
    const category = this.db.prepare(
      'SELECT * FROM asset_categories WHERE id = ?'
    ).get(id) as AssetCategory | undefined
    
    if (category) {
      const { count } = this.db.prepare(
        'SELECT COUNT(*) as count FROM assets WHERE category_id = ?'
      ).get(id) as { count: number }
      category.assetCount = count
    }
    
    return category || null
  }

  // 创建分类
  createCategory(data: Partial<AssetCategory>): AssetCategory {
    const {
      name,
      code,
      parent_id,
      icon,
      description,
      custom_fields,
      depreciation_rate,
      depreciation_years,
      sort,
    } = data
    
    // 检查代码是否已存在
    const existing = this.db.prepare(
      'SELECT id FROM asset_categories WHERE code = ?'
    ).get(code!) as { id: number } | undefined
    
    if (existing) {
      throw new Error('分类代码已存在')
    }
    
    const result = this.db.prepare(`
      INSERT INTO asset_categories (
        name, code, parent_id, icon, description, custom_fields,
        depreciation_rate, depreciation_years, sort
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      name,
      code,
      parent_id || null,
      icon || null,
      description || null,
      custom_fields ? JSON.stringify(custom_fields) : null,
      depreciation_rate || null,
      depreciation_years || null,
      sort || 0
    )
    
    return this.getCategoryById(Number(result.lastInsertRowid))!
  }

  // 更新分类
  updateCategory(id: number, data: Partial<AssetCategory>): AssetCategory {
    const {
      name,
      code,
      parent_id,
      icon,
      description,
      custom_fields,
      depreciation_rate,
      depreciation_years,
      sort,
      status,
    } = data
    
    // 检查是否更新为自己的子分类
    if (parent_id && parent_id === id) {
      throw new Error('不能将分类设置为自己的子分类')
    }
    
    this.db.prepare(`
      UPDATE asset_categories 
      SET name = ?, code = ?, parent_id = ?, icon = ?, description = ?,
          custom_fields = ?, depreciation_rate = ?, depreciation_years = ?,
          sort = ?, status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      name,
      code,
      parent_id || null,
      icon || null,
      description || null,
      custom_fields ? JSON.stringify(custom_fields) : null,
      depreciation_rate || null,
      depreciation_years || null,
      sort || 0,
      status || 'active',
      id
    )
    
    return this.getCategoryById(id)!
  }

  // 删除分类
  deleteCategory(id: number): void {
    // 检查是否有子分类
    const children = this.db.prepare(
      'SELECT COUNT(*) as count FROM asset_categories WHERE parent_id = ?'
    ).get(id) as { count: number }
    
    if (children.count > 0) {
      throw new Error('存在子分类，无法删除')
    }
    
    // 检查是否有关联的资产
    const assets = this.db.prepare(
      'SELECT COUNT(*) as count FROM assets WHERE category_id = ?'
    ).get(id) as { count: number }
    
    if (assets.count > 0) {
      throw new Error('存在关联的资产，无法删除')
    }
    
    this.db.prepare('DELETE FROM asset_categories WHERE id = ?').run(id)
  }

  // 构建树形结构
  private buildTree(categories: AssetCategory[], parentId: number | null = null): any[] {
    const tree: any[] = []
    
    for (const category of categories) {
      if (category.parentId === parentId) {
        const children = this.buildTree(categories, category.id)
        if (children.length > 0) {
          tree.push({ ...category, children })
        } else {
          tree.push(category)
        }
      }
    }
    
    return tree
  }

  // 获取分类的所有子分类 ID（包括自己）
  getCategoryIdsWithChildren(categoryId: number): number[] {
    const ids = [categoryId]
    const children = this.db.prepare(
      'SELECT id FROM asset_categories WHERE parent_id = ?'
    ).all(categoryId) as { id: number }[]
    
    for (const child of children) {
      ids.push(...this.getCategoryIdsWithChildren(child.id))
    }
    
    return ids
  }
}
