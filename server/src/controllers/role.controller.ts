import { Context } from 'koa'
import { RoleService } from '../services/role.service.js'
import { successResponse, errorResponse, paginatedResponse } from '../utils/response.js'

const roleService = new RoleService()

export class RoleController {
  // 获取所有角色
  async getAllRoles(ctx: Context) {
    try {
      const roles = roleService.getAllRoles()
      successResponse(ctx, roles, '获取成功')
    } catch (error: any) {
      errorResponse(ctx, error.message, 500)
    }
  }

  // 分页获取角色列表
  async getRoles(ctx: Context) {
    try {
      const { page = 1, pageSize = 20, search } = ctx.query
      const { roles, total } = roleService.getRoles(
        Number(page),
        Number(pageSize),
        search as string
      )
      paginatedResponse(ctx, roles, total, Number(page), Number(pageSize))
    } catch (error: any) {
      errorResponse(ctx, error.message, 500)
    }
  }

  // 获取单个角色
  async getRole(ctx: Context) {
    try {
      const { id } = ctx.params
      const role = roleService.getRoleById(Number(id))
      if (!role) {
        return errorResponse(ctx, '角色不存在', 404)
      }
      successResponse(ctx, role, '获取成功')
    } catch (error: any) {
      errorResponse(ctx, error.message, 500)
    }
  }

  // 创建角色
  async createRole(ctx: Context) {
    try {
      const data = ctx.request.body
      const role = roleService.createRole(data)
      successResponse(ctx, role, '创建成功')
    } catch (error: any) {
      errorResponse(ctx, error.message, 400)
    }
  }

  // 更新角色
  async updateRole(ctx: Context) {
    try {
      const { id } = ctx.params
      const data = ctx.request.body
      const role = roleService.updateRole(Number(id), data)
      successResponse(ctx, role, '更新成功')
    } catch (error: any) {
      errorResponse(ctx, error.message, 400)
    }
  }

  // 删除角色
  async deleteRole(ctx: Context) {
    try {
      const { id } = ctx.params
      roleService.deleteRole(Number(id))
      successResponse(ctx, null, '删除成功')
    } catch (error: any) {
      errorResponse(ctx, error.message, 400)
    }
  }

  // 获取所有权限
  async getAllPermissions(ctx: Context) {
    try {
      const permissions = roleService.getAllPermissions()
      successResponse(ctx, permissions, '获取成功')
    } catch (error: any) {
      errorResponse(ctx, error.message, 500)
    }
  }

  // 按模块分组获取权限
  async getPermissionsByModule(ctx: Context) {
    try {
      const permissions = roleService.getPermissionsByModule()
      successResponse(ctx, permissions, '获取成功')
    } catch (error: any) {
      errorResponse(ctx, error.message, 500)
    }
  }

  // 获取用户的角色
  async getUserRoles(ctx: Context) {
    try {
      const { userId } = ctx.params
      const roles = roleService.getUserRoles(Number(userId))
      successResponse(ctx, roles, '获取成功')
    } catch (error: any) {
      errorResponse(ctx, error.message, 500)
    }
  }

  // 为用户分配角色
  async assignRolesToUser(ctx: Context) {
    try {
      const { userId } = ctx.params
      const { roleIds } = ctx.request.body
      roleService.assignRolesToUser(Number(userId), roleIds)
      successResponse(ctx, null, '分配成功')
    } catch (error: any) {
      errorResponse(ctx, error.message, 400)
    }
  }
}
