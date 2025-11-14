import Router from '@koa/router'
import { ApprovalController } from '../controllers/approval.controller.js'

const router = new Router()
const approvalController = new ApprovalController()

// 获取审批列表
router.get('/', approvalController.getApprovals)

// 获取待审批数量
router.get('/pending-count', approvalController.getPendingCount)

// 获取审批详情
router.get('/:id', approvalController.getApproval)

// 处理审批（通过/拒绝）
router.post('/:id/process', approvalController.processApproval)

// 取消审批
router.post('/:id/cancel', approvalController.cancelApproval)

export default router
