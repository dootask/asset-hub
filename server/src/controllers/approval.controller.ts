import { Context } from 'koa'
import { ApprovalService } from '../services/approval.service.js'
import { successResponse, errorResponse, paginatedResponse } from '../utils/response.js'

const approvalService = new ApprovalService()

export class ApprovalController {
  // 获取审批列表
  async getApprovals(ctx: Context) {
    try {
      const { page = 1, pageSize = 20, applicantId, approverId, status, type } = ctx.query
      const { approvals, total } = approvalService.getApprovals(
        Number(page),
        Number(pageSize),
        {
          applicantId: applicantId ? Number(applicantId) : undefined,
          approverId: approverId ? Number(approverId) : undefined,
          status: status as any,
          type: type as any,
        }
      )
      paginatedResponse(ctx, approvals, total, Number(page), Number(pageSize))
    } catch (error: any) {
      errorResponse(ctx, error.message, 500)
    }
  }

  // 获取单个审批
  async getApproval(ctx: Context) {
    try {
      const { id } = ctx.params
      const approval = approvalService.getApprovalById(Number(id))
      if (!approval) {
        return errorResponse(ctx, '审批不存在', 404)
      }
      successResponse(ctx, approval, '获取成功')
    } catch (error: any) {
      errorResponse(ctx, error.message, 500)
    }
  }

  // 处理审批（通过/拒绝）
  async processApproval(ctx: Context) {
    try {
      const { id } = ctx.params
      const { action, reason } = ctx.request.body
      // TODO: 从 token 获取用户 ID
      const userId = 1
      
      if (action !== 'approve' && action !== 'reject') {
        return errorResponse(ctx, '无效的操作', 400)
      }
      
      const approval = approvalService.processApproval(Number(id), userId, action, reason)
      successResponse(ctx, approval, '操作成功')
    } catch (error: any) {
      errorResponse(ctx, error.message, 400)
    }
  }

  // 取消审批
  async cancelApproval(ctx: Context) {
    try {
      const { id } = ctx.params
      const { reason } = ctx.request.body
      // TODO: 从 token 获取用户 ID
      const userId = 1
      
      const approval = approvalService.cancelApproval(Number(id), userId, reason)
      successResponse(ctx, approval, '取消成功')
    } catch (error: any) {
      errorResponse(ctx, error.message, 400)
    }
  }

  // 获取待审批数量
  async getPendingCount(ctx: Context) {
    try {
      // TODO: 从 token 获取用户 ID
      const userId = 1
      const count = approvalService.getPendingCount(userId)
      successResponse(ctx, { count }, '获取成功')
    } catch (error: any) {
      errorResponse(ctx, error.message, 500)
    }
  }
}
