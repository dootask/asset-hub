import { Context } from 'koa'
import { AssetCategoryService } from '../services/asset-category.service.js'
import { successResponse, errorResponse, paginatedResponse } from '../utils/response.js'

const categoryService = new AssetCategoryService()

export class AssetCategoryController {
  // 获取所有分类（树形）
  async getAllCategories(ctx: Context) {
    try {
      const categories = categoryService.getAllCategories()
      successResponse(ctx, categories, '获取成功')
    } catch (error: any) {
      errorResponse(ctx, error.message, 500)
    }
  }

  // 分页获取分类列表
  async getCategories(ctx: Context) {
    try {
      const { page = 1, pageSize = 20, search } = ctx.query
      const { categories, total } = categoryService.getCategories(
        Number(page),
        Number(pageSize),
        search as string
      )
      paginatedResponse(ctx, categories, total, Number(page), Number(pageSize))
    } catch (error: any) {
      errorResponse(ctx, error.message, 500)
    }
  }

  // 获取单个分类
  async getCategory(ctx: Context) {
    try {
      const { id } = ctx.params
      const category = categoryService.getCategoryById(Number(id))
      if (!category) {
        return errorResponse(ctx, '分类不存在', 404)
      }
      successResponse(ctx, category, '获取成功')
    } catch (error: any) {
      errorResponse(ctx, error.message, 500)
    }
  }

  // 创建分类
  async createCategory(ctx: Context) {
    try {
      const data = ctx.request.body
      const category = categoryService.createCategory(data)
      successResponse(ctx, category, '创建成功')
    } catch (error: any) {
      errorResponse(ctx, error.message, 400)
    }
  }

  // 更新分类
  async updateCategory(ctx: Context) {
    try {
      const { id } = ctx.params
      const data = ctx.request.body
      const category = categoryService.updateCategory(Number(id), data)
      successResponse(ctx, category, '更新成功')
    } catch (error: any) {
      errorResponse(ctx, error.message, 400)
    }
  }

  // 删除分类
  async deleteCategory(ctx: Context) {
    try {
      const { id } = ctx.params
      categoryService.deleteCategory(Number(id))
      successResponse(ctx, null, '删除成功')
    } catch (error: any) {
      errorResponse(ctx, error.message, 400)
    }
  }
}
