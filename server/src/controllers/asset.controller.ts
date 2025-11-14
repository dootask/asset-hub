import { Context } from 'koa'
import { AssetService } from '../services/asset.service.js'
import { successResponse, errorResponse, paginatedResponse } from '../utils/response.js'

const assetService = new AssetService()

export class AssetController {
  // 获取资产列表
  async getAssets(ctx: Context) {
    try {
      const {
        page = 1,
        pageSize = 20,
        search,
        categoryId,
        status,
        companyId,
        departmentId,
        userId,
      } = ctx.query
      
      const { assets, total } = assetService.getAssets(
        Number(page),
        Number(pageSize),
        {
          search: search as string,
          categoryId: categoryId ? Number(categoryId) : undefined,
          status: status as string,
          companyId: companyId ? Number(companyId) : undefined,
          departmentId: departmentId ? Number(departmentId) : undefined,
          userId: userId ? Number(userId) : undefined,
        }
      )
      
      paginatedResponse(ctx, assets, total, Number(page), Number(pageSize))
    } catch (error: any) {
      errorResponse(ctx, error.message, 500)
    }
  }

  // 获取单个资产
  async getAsset(ctx: Context) {
    try {
      const { id } = ctx.params
      const asset = assetService.getAssetById(Number(id))
      if (!asset) {
        return errorResponse(ctx, '资产不存在', 404)
      }
      successResponse(ctx, asset, '获取成功')
    } catch (error: any) {
      errorResponse(ctx, error.message, 500)
    }
  }

  // 创建资产
  async createAsset(ctx: Context) {
    try {
      const data = ctx.request.body
      // TODO: 从 token 获取用户 ID
      const userId = 1 // 临时使用管理员 ID
      const asset = assetService.createAsset(data, userId)
      successResponse(ctx, asset, '创建成功')
    } catch (error: any) {
      errorResponse(ctx, error.message, 400)
    }
  }

  // 更新资产
  async updateAsset(ctx: Context) {
    try {
      const { id } = ctx.params
      const data = ctx.request.body
      // TODO: 从 token 获取用户 ID
      const userId = 1 // 临时使用管理员 ID
      const asset = assetService.updateAsset(Number(id), data, userId)
      successResponse(ctx, asset, '更新成功')
    } catch (error: any) {
      errorResponse(ctx, error.message, 400)
    }
  }

  // 删除资产
  async deleteAsset(ctx: Context) {
    try {
      const { id } = ctx.params
      assetService.deleteAsset(Number(id))
      successResponse(ctx, null, '删除成功')
    } catch (error: any) {
      errorResponse(ctx, error.message, 400)
    }
  }

  // 获取资产统计信息
  async getStatistics(ctx: Context) {
    try {
      const { companyId, departmentId, startDate, endDate } = ctx.query
      const stats = assetService.getAssetStatistics({
        companyId: companyId ? Number(companyId) : undefined,
        departmentId: departmentId ? Number(departmentId) : undefined,
        startDate: startDate as string,
        endDate: endDate as string,
      })
      successResponse(ctx, stats, '获取成功')
    } catch (error: any) {
      errorResponse(ctx, error.message, 500)
    }
  }

  // 批量导入资产
  async importAssets(ctx: Context) {
    try {
      const { assets } = ctx.request.body
      // TODO: 从 token 获取用户 ID
      const userId = 1 // 临时使用管理员 ID
      const result = assetService.importAssets(assets, userId)
      successResponse(ctx, result, '导入完成')
    } catch (error: any) {
      errorResponse(ctx, error.message, 400)
    }
  }
}
