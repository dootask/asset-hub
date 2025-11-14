import { Context } from 'koa'
import { DashboardService } from '../services/dashboard.service.js'
import { successResponse, errorResponse } from '../utils/response.js'

const dashboardService = new DashboardService()

export class DashboardController {
  // 获取完整的仪表板数据
  async getDashboardData(ctx: Context) {
    try {
      // TODO: 从 token 获取用户 ID
      const userId = 1
      const { companyId, departmentId } = ctx.query
      
      const data = dashboardService.getDashboardData(userId, {
        companyId: companyId ? Number(companyId) : undefined,
        departmentId: departmentId ? Number(departmentId) : undefined,
      })
      
      successResponse(ctx, data, '获取成功')
    } catch (error: any) {
      errorResponse(ctx, error.message, 500)
    }
  }

  // 获取资产概览
  async getAssetOverview(ctx: Context) {
    try {
      const { companyId, departmentId, startDate, endDate } = ctx.query
      const data = dashboardService.getAssetOverview({
        companyId: companyId ? Number(companyId) : undefined,
        departmentId: departmentId ? Number(departmentId) : undefined,
        startDate: startDate as string,
        endDate: endDate as string,
      })
      successResponse(ctx, data, '获取成功')
    } catch (error: any) {
      errorResponse(ctx, error.message, 500)
    }
  }

  // 按分类统计资产
  async getAssetsByCategory(ctx: Context) {
    try {
      const { companyId, departmentId } = ctx.query
      const data = dashboardService.getAssetsByCategory({
        companyId: companyId ? Number(companyId) : undefined,
        departmentId: departmentId ? Number(departmentId) : undefined,
      })
      successResponse(ctx, data, '获取成功')
    } catch (error: any) {
      errorResponse(ctx, error.message, 500)
    }
  }

  // 获取资产趋势
  async getAssetTrend(ctx: Context) {
    try {
      const { months = 12, companyId, categoryId } = ctx.query
      const data = dashboardService.getAssetTrend(Number(months), {
        companyId: companyId ? Number(companyId) : undefined,
        categoryId: categoryId ? Number(categoryId) : undefined,
      })
      successResponse(ctx, data, '获取成功')
    } catch (error: any) {
      errorResponse(ctx, error.message, 500)
    }
  }

  // 获取待办事项
  async getTodoList(ctx: Context) {
    try {
      // TODO: 从 token 获取用户 ID
      const userId = 1
      const data = dashboardService.getTodoList(userId)
      successResponse(ctx, data, '获取成功')
    } catch (error: any) {
      errorResponse(ctx, error.message, 500)
    }
  }
}
