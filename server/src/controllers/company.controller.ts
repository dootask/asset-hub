import { Context } from 'koa'
import { CompanyService } from '../services/company.service.js'
import { successResponse, errorResponse, paginatedResponse } from '../utils/response.js'

const companyService = new CompanyService()

export class CompanyController {
  // 获取所有公司（树形）
  async getAllCompanies(ctx: Context) {
    try {
      const companies = companyService.getAllCompanies()
      successResponse(ctx, companies, '获取成功')
    } catch (error: any) {
      errorResponse(ctx, error.message, 500)
    }
  }

  // 分页获取公司列表
  async getCompanies(ctx: Context) {
    try {
      const { page = 1, pageSize = 20, search } = ctx.query
      const { companies, total } = companyService.getCompanies(
        Number(page),
        Number(pageSize),
        search as string
      )
      paginatedResponse(ctx, companies, total, Number(page), Number(pageSize))
    } catch (error: any) {
      errorResponse(ctx, error.message, 500)
    }
  }

  // 获取单个公司
  async getCompany(ctx: Context) {
    try {
      const { id } = ctx.params
      const company = companyService.getCompanyById(Number(id))
      if (!company) {
        return errorResponse(ctx, '公司不存在', 404)
      }
      successResponse(ctx, company, '获取成功')
    } catch (error: any) {
      errorResponse(ctx, error.message, 500)
    }
  }

  // 创建公司
  async createCompany(ctx: Context) {
    try {
      const data = ctx.request.body
      const company = companyService.createCompany(data)
      successResponse(ctx, company, '创建成功')
    } catch (error: any) {
      errorResponse(ctx, error.message, 400)
    }
  }

  // 更新公司
  async updateCompany(ctx: Context) {
    try {
      const { id } = ctx.params
      const data = ctx.request.body
      const company = companyService.updateCompany(Number(id), data)
      successResponse(ctx, company, '更新成功')
    } catch (error: any) {
      errorResponse(ctx, error.message, 400)
    }
  }

  // 删除公司
  async deleteCompany(ctx: Context) {
    try {
      const { id } = ctx.params
      companyService.deleteCompany(Number(id))
      successResponse(ctx, null, '删除成功')
    } catch (error: any) {
      errorResponse(ctx, error.message, 400)
    }
  }
}
