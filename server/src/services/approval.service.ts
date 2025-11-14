import { getDatabase } from '../database/connection.js'
import { Approval, ApprovalStatus, OperationType } from '../types/index.js'

export class ApprovalService {
  private db = getDatabase()

  // 分页获取审批列表
  getApprovals(page: number = 1, pageSize: number = 20, filters?: {
    applicantId?: number
    approverId?: number
    status?: ApprovalStatus
    type?: OperationType
  }) {
    const offset = (page - 1) * pageSize
    
    let query = `
      SELECT a.*,
             applicant.realname as applicant_name,
             approver.realname as approver_name
      FROM approvals a
      LEFT JOIN users applicant ON a.applicant_id = applicant.id
      LEFT JOIN users approver ON a.approver_id = approver.id
      WHERE 1=1
    `
    const params: any[] = []
    
    if (filters?.applicantId) {
      query += ' AND a.applicant_id = ?'
      params.push(filters.applicantId)
    }
    
    if (filters?.approverId) {
      query += ' AND a.approver_id = ?'
      params.push(filters.approverId)
    }
    
    if (filters?.status) {
      query += ' AND a.status = ?'
      params.push(filters.status)
    }
    
    if (filters?.type) {
      query += ' AND a.type = ?'
      params.push(filters.type)
    }
    
    query += ' ORDER BY a.created_at DESC LIMIT ? OFFSET ?'
    params.push(pageSize, offset)
    
    const approvals = this.db.prepare(query).all(...params) as Approval[]
    
    // 解析 JSON 字段
    for (const approval of approvals) {
      if (approval.content) {
        try {
          approval.content = JSON.parse(approval.content as any)
        } catch (e) {
          approval.content = {}
        }
      }
      if (approval.attachments) {
        try {
          approval.attachments = JSON.parse(approval.attachments as any)
        } catch (e) {
          approval.attachments = []
        }
      }
    }
    
    // 获取总数
    let countQuery = 'SELECT COUNT(*) as total FROM approvals WHERE 1=1'
    const countParams: any[] = []
    
    if (filters?.applicantId) {
      countQuery += ' AND applicant_id = ?'
      countParams.push(filters.applicantId)
    }
    if (filters?.approverId) {
      countQuery += ' AND approver_id = ?'
      countParams.push(filters.approverId)
    }
    if (filters?.status) {
      countQuery += ' AND status = ?'
      countParams.push(filters.status)
    }
    if (filters?.type) {
      countQuery += ' AND type = ?'
      countParams.push(filters.type)
    }
    
    const { total } = this.db.prepare(countQuery).get(...countParams) as { total: number }
    
    return { approvals, total }
  }

  // 根据 ID 获取审批
  getApprovalById(id: number): Approval | null {
    const approval = this.db.prepare(`
      SELECT a.*,
             applicant.realname as applicant_name,
             approver.realname as approver_name
      FROM approvals a
      LEFT JOIN users applicant ON a.applicant_id = applicant.id
      LEFT JOIN users approver ON a.approver_id = approver.id
      WHERE a.id = ?
    `).get(id) as Approval | undefined
    
    if (approval) {
      // 解析 JSON 字段
      if (approval.content) {
        try {
          approval.content = JSON.parse(approval.content as any)
        } catch (e) {
          approval.content = {}
        }
      }
      if (approval.attachments) {
        try {
          approval.attachments = JSON.parse(approval.attachments as any)
        } catch (e) {
          approval.attachments = []
        }
      }
      
      // 获取审批日志
      approval.logs = this.getApprovalLogs(id)
    }
    
    return approval || null
  }

  // 创建审批
  createApproval(data: {
    type: OperationType
    title: string
    applicantId: number
    approverId?: number
    content: any
    attachments?: string[]
    priority?: string
  }): Approval {
    const { type, title, applicantId, approverId, content, attachments, priority } = data
    
    const result = this.db.prepare(`
      INSERT INTO approvals (
        type, title, applicant_id, approver_id, content, attachments, priority
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      type,
      title,
      applicantId,
      approverId || null,
      JSON.stringify(content),
      attachments ? JSON.stringify(attachments) : null,
      priority || 'normal'
    )
    
    const approvalId = Number(result.lastInsertRowid)
    
    // 添加提交日志
    this.addApprovalLog(approvalId, applicantId, 'submit', '提交审批')
    
    return this.getApprovalById(approvalId)!
  }

  // 处理审批（通过/拒绝）
  processApproval(
    id: number,
    userId: number,
    action: 'approve' | 'reject',
    reason?: string
  ): Approval {
    const approval = this.getApprovalById(id)
    if (!approval) {
      throw new Error('审批不存在')
    }
    
    if (approval.status !== 'pending' && approval.status !== 'reviewing') {
      throw new Error('审批已处理')
    }
    
    const status: ApprovalStatus = action === 'approve' ? 'approved' : 'rejected'
    const now = new Date().toISOString()
    
    this.db.prepare(`
      UPDATE approvals
      SET status = ?, approver_id = ?, reason = ?, approved_at = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(status, userId, reason || null, now, id)
    
    // 添加审批日志
    this.addApprovalLog(id, userId, action, reason || '')
    
    return this.getApprovalById(id)!
  }

  // 取消审批
  cancelApproval(id: number, userId: number, reason?: string): Approval {
    const approval = this.getApprovalById(id)
    if (!approval) {
      throw new Error('审批不存在')
    }
    
    if (approval.applicantId !== userId) {
      throw new Error('只能取消自己提交的审批')
    }
    
    if (approval.status !== 'pending' && approval.status !== 'reviewing') {
      throw new Error('审批已处理，无法取消')
    }
    
    this.db.prepare(`
      UPDATE approvals
      SET status = 'cancelled', reason = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(reason || null, id)
    
    // 添加取消日志
    this.addApprovalLog(id, userId, 'cancel', reason || '取消审批')
    
    return this.getApprovalById(id)!
  }

  // 获取审批日志
  getApprovalLogs(approvalId: number) {
    const logs = this.db.prepare(`
      SELECT al.*, u.realname as user_name
      FROM approval_logs al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE al.approval_id = ?
      ORDER BY al.created_at ASC
    `).all(approvalId)
    
    return logs
  }

  // 添加审批日志
  private addApprovalLog(
    approvalId: number,
    userId: number,
    action: string,
    comment: string
  ): void {
    this.db.prepare(`
      INSERT INTO approval_logs (approval_id, user_id, action, comment)
      VALUES (?, ?, ?, ?)
    `).run(approvalId, userId, action, comment)
  }

  // 获取待审批数量
  getPendingCount(userId: number): number {
    const { count } = this.db.prepare(`
      SELECT COUNT(*) as count
      FROM approvals
      WHERE approver_id = ? AND status IN ('pending', 'reviewing')
    `).get(userId) as { count: number }
    
    return count
  }
}
