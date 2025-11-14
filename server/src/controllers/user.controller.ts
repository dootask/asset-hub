import { Context } from 'koa'
import { UserService } from '../services/user.service.js'
import { successResponse, errorResponse, paginatedResponse } from '../utils/response.js'

const userService = new UserService()

export class UserController {
  // 获取用户列表
  async getUsers(ctx: Context) {
    try {
      const { page = 1, pageSize = 20, search, companyId, departmentId, status } = ctx.query
      const { users, total } = userService.getUsers(
        Number(page),
        Number(pageSize),
        {
          search: search as string,
          companyId: companyId ? Number(companyId) : undefined,
          departmentId: departmentId ? Number(departmentId) : undefined,
          status: status as string,
        }
      )
      paginatedResponse(ctx, users, total, Number(page), Number(pageSize))
    } catch (error: any) {
      errorResponse(ctx, error.message, 500)
    }
  }

  // 获取单个用户
  async getUser(ctx: Context) {
    try {
      const { id } = ctx.params
      const user = userService.getUserById(Number(id))
      if (!user) {
        return errorResponse(ctx, '用户不存在', 404)
      }
      successResponse(ctx, user, '获取成功')
    } catch (error: any) {
      errorResponse(ctx, error.message, 500)
    }
  }

  // 创建用户
  async createUser(ctx: Context) {
    try {
      const data = ctx.request.body
      const user = userService.createUser(data)
      successResponse(ctx, user, '创建成功')
    } catch (error: any) {
      errorResponse(ctx, error.message, 400)
    }
  }

  // 更新用户
  async updateUser(ctx: Context) {
    try {
      const { id } = ctx.params
      const data = ctx.request.body
      const user = userService.updateUser(Number(id), data)
      successResponse(ctx, user, '更新成功')
    } catch (error: any) {
      errorResponse(ctx, error.message, 400)
    }
  }

  // 删除用户
  async deleteUser(ctx: Context) {
    try {
      const { id } = ctx.params
      userService.deleteUser(Number(id))
      successResponse(ctx, null, '删除成功')
    } catch (error: any) {
      errorResponse(ctx, error.message, 400)
    }
  }

  // 批量导入用户
  async importUsers(ctx: Context) {
    try {
      const { users } = ctx.request.body
      const result = userService.importUsers(users)
      successResponse(ctx, result, '导入完成')
    } catch (error: any) {
      errorResponse(ctx, error.message, 400)
    }
  }

  // 从 DooTask 同步用户
  async syncFromDooTask(ctx: Context) {
    try {
      // TODO: 从 DooTask API 获取用户数据
      const dootaskUsers = [] // 这里需要调用 DooTask API
      const result = await userService.syncFromDooTask(dootaskUsers)
      successResponse(ctx, result, '同步完成')
    } catch (error: any) {
      errorResponse(ctx, error.message, 400)
    }
  }
}
