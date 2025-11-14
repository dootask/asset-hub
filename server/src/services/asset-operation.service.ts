import { getDatabase } from '../database/connection.js'
import { AssetOperation, OperationType } from '../types/index.js'
import { ApprovalService } from './approval.service.js'
import { AssetService } from './asset.service.js'

const approvalService = new ApprovalService()
const assetService = new AssetService()

export class AssetOperationService {
  private db = getDatabase()

  // 分页获取资产操作记录
  getOperations(page: number = 1, pageSize: number = 20, filters?: {
    assetId?: number
    type?: OperationType
    operatorId?: number
    status?: string
  }) {
    const offset = (page - 1) * pageSize
    
    let query = `
      SELECT ao.*,
             a.name as asset_name,
             a.code as asset_code,
             operator.realname as operator_name,
             from_user.realname as from_user_name,
             to_user.realname as to_user_name
      FROM asset_operations ao
      LEFT JOIN assets a ON ao.asset_id = a.id
      LEFT JOIN users operator ON ao.operator_id = operator.id
      LEFT JOIN users from_user ON ao.from_user_id = from_user.id
      LEFT JOIN users to_user ON ao.to_user_id = to_user.id
      WHERE 1=1
    `
    const params: any[] = []
    
    if (filters?.assetId) {
      query += ' AND ao.asset_id = ?'
      params.push(filters.assetId)
    }
    
    if (filters?.type) {
      query += ' AND ao.type = ?'
      params.push(filters.type)
    }
    
    if (filters?.operatorId) {
      query += ' AND ao.operator_id = ?'
      params.push(filters.operatorId)
    }
    
    if (filters?.status) {
      query += ' AND ao.status = ?'
      params.push(filters.status)
    }
    
    query += ' ORDER BY ao.created_at DESC LIMIT ? OFFSET ?'
    params.push(pageSize, offset)
    
    const operations = this.db.prepare(query).all(...params) as AssetOperation[]
    
    // 解析 JSON 字段
    for (const operation of operations) {
      if (operation.attachments) {
        try {
          operation.attachments = JSON.parse(operation.attachments as any)
        } catch (e) {
          operation.attachments = []
        }
      }
    }
    
    let countQuery = 'SELECT COUNT(*) as total FROM asset_operations WHERE 1=1'
    const countParams: any[] = []
    
    if (filters?.assetId) {
      countQuery += ' AND asset_id = ?'
      countParams.push(filters.assetId)
    }
    if (filters?.type) {
      countQuery += ' AND type = ?'
      countParams.push(filters.type)
    }
    if (filters?.operatorId) {
      countQuery += ' AND operator_id = ?'
      countParams.push(filters.operatorId)
    }
    if (filters?.status) {
      countQuery += ' AND status = ?'
      countParams.push(filters.status)
    }
    
    const { total } = this.db.prepare(countQuery).get(...countParams) as { total: number }
    
    return { operations, total }
  }

  // 根据 ID 获取操作记录
  getOperationById(id: number): AssetOperation | null {
    const operation = this.db.prepare(`
      SELECT ao.*,
             a.name as asset_name,
             a.code as asset_code,
             operator.realname as operator_name,
             from_user.realname as from_user_name,
             to_user.realname as to_user_name
      FROM asset_operations ao
      LEFT JOIN assets a ON ao.asset_id = a.id
      LEFT JOIN users operator ON ao.operator_id = operator.id
      LEFT JOIN users from_user ON ao.from_user_id = from_user.id
      LEFT JOIN users to_user ON ao.to_user_id = to_user.id
      WHERE ao.id = ?
    `).get(id) as AssetOperation | undefined
    
    if (operation && operation.attachments) {
      try {
        operation.attachments = JSON.parse(operation.attachments as any)
      } catch (e) {
        operation.attachments = []
      }
    }
    
    return operation || null
  }

  // 创建采购申请
  createPurchaseRequest(data: {
    assetName: string
    categoryId: number
    quantity: number
    estimatedPrice: number
    reason: string
    attachments?: string[]
    operatorId: number
    approverId?: number
  }) {
    const { assetName, categoryId, quantity, estimatedPrice, reason, attachments, operatorId, approverId } = data
    
    // 创建审批
    const approval = approvalService.createApproval({
      type: 'purchase',
      title: `采购申请 - ${assetName}`,
      applicantId: operatorId,
      approverId,
      content: {
        assetName,
        categoryId,
        quantity,
        estimatedPrice,
        reason,
      },
      attachments,
      priority: 'normal',
    })
    
    return approval
  }

  // 资产入库
  createStockIn(data: {
    assetId?: number
    assetData?: any
    operatorId: number
    images?: string[]
    reason?: string
    approvalId?: number
  }) {
    const { assetId, assetData, operatorId, images, reason, approvalId } = data
    
    let finalAssetId = assetId
    
    // 如果没有资产 ID，则创建新资产
    if (!finalAssetId && assetData) {
      const asset = assetService.createAsset({
        ...assetData,
        images,
        status: 'idle',
      }, operatorId)
      finalAssetId = asset.id
    }
    
    if (!finalAssetId) {
      throw new Error('资产 ID 或资产数据必须提供')
    }
    
    // 创建入库操作记录
    const result = this.db.prepare(`
      INSERT INTO asset_operations (
        asset_id, type, operator_id, reason, attachments, approval_id, status
      )
      VALUES (?, 'stock_in', ?, ?, ?, ?, 'approved')
    `).run(
      finalAssetId,
      operatorId,
      reason || '资产入库',
      images ? JSON.stringify(images) : null,
      approvalId || null
    )
    
    // 更新资产状态为闲置
    this.db.prepare(`
      UPDATE assets SET status = 'idle', updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `).run(finalAssetId)
    
    return this.getOperationById(Number(result.lastInsertRowid))
  }

  // 资产领用申请
  createRequisitionRequest(data: {
    assetId: number
    userId: number
    operatorId: number
    reason: string
    approverId?: number
  }) {
    const { assetId, userId, operatorId, reason, approverId } = data
    
    const asset = assetService.getAssetById(assetId)
    if (!asset) {
      throw new Error('资产不存在')
    }
    
    if (asset.status !== 'idle') {
      throw new Error('资产不可用')
    }
    
    // 创建审批
    const approval = approvalService.createApproval({
      type: 'requisition',
      title: `领用申请 - ${asset.name}`,
      applicantId: operatorId,
      approverId,
      content: {
        assetId,
        assetName: asset.name,
        assetCode: asset.code,
        userId,
        reason,
      },
      priority: 'normal',
    })
    
    return approval
  }

  // 处理领用申请（审批通过后调用）
  processRequisition(approvalId: number) {
    const approval = approvalService.getApprovalById(approvalId)
    if (!approval || approval.status !== 'approved') {
      throw new Error('审批未通过')
    }
    
    const { assetId, userId, reason } = approval.content
    
    // 创建领用操作记录
    const result = this.db.prepare(`
      INSERT INTO asset_operations (
        asset_id, type, operator_id, to_user_id, reason, approval_id, status
      )
      VALUES (?, 'requisition', ?, ?, ?, ?, 'approved')
    `).run(assetId, approval.applicantId, userId, reason, approvalId)
    
    // 更新资产状态和使用人
    this.db.prepare(`
      UPDATE assets 
      SET status = 'in_use', user_id = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).run(userId, assetId)
    
    return this.getOperationById(Number(result.lastInsertRowid))
  }

  // 借用申请
  createBorrowRequest(data: {
    assetId: number
    userId: number
    operatorId: number
    reason: string
    expectedReturnDate: string
    approverId?: number
  }) {
    const { assetId, userId, operatorId, reason, expectedReturnDate, approverId } = data
    
    const asset = assetService.getAssetById(assetId)
    if (!asset) {
      throw new Error('资产不存在')
    }
    
    if (asset.status !== 'idle' && asset.status !== 'in_use') {
      throw new Error('资产不可借用')
    }
    
    // 创建审批
    const approval = approvalService.createApproval({
      type: 'borrow',
      title: `借用申请 - ${asset.name}`,
      applicantId: operatorId,
      approverId,
      content: {
        assetId,
        assetName: asset.name,
        assetCode: asset.code,
        userId,
        reason,
        expectedReturnDate,
      },
      priority: 'normal',
    })
    
    return approval
  }

  // 处理借用申请
  processBorrow(approvalId: number) {
    const approval = approvalService.getApprovalById(approvalId)
    if (!approval || approval.status !== 'approved') {
      throw new Error('审批未通过')
    }
    
    const { assetId, userId, reason } = approval.content
    
    const result = this.db.prepare(`
      INSERT INTO asset_operations (
        asset_id, type, operator_id, to_user_id, reason, approval_id, status
      )
      VALUES (?, 'borrow', ?, ?, ?, ?, 'approved')
    `).run(assetId, approval.applicantId, userId, reason, approvalId)
    
    // 更新资产状态
    this.db.prepare(`
      UPDATE assets 
      SET status = 'borrowing', user_id = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).run(userId, assetId)
    
    return this.getOperationById(Number(result.lastInsertRowid))
  }

  // 归还资产
  createReturn(data: {
    assetId: number
    operatorId: number
    reason?: string
    condition?: string
  }) {
    const { assetId, operatorId, reason, condition } = data
    
    const asset = assetService.getAssetById(assetId)
    if (!asset) {
      throw new Error('资产不存在')
    }
    
    if (asset.status !== 'borrowing') {
      throw new Error('资产未处于借用状态')
    }
    
    const result = this.db.prepare(`
      INSERT INTO asset_operations (
        asset_id, type, operator_id, from_user_id, reason, status
      )
      VALUES (?, 'return', ?, ?, ?, 'approved')
    `).run(assetId, operatorId, asset.user_id, `${reason || '归还'}。资产状态：${condition || '正常'}`)
    
    // 更新资产状态，清除使用人
    this.db.prepare(`
      UPDATE assets 
      SET status = 'idle', user_id = NULL, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).run(assetId)
    
    return this.getOperationById(Number(result.lastInsertRowid))
  }

  // 派发申请
  createTransferRequest(data: {
    assetId: number
    toDepartmentId: number
    toUserId?: number
    operatorId: number
    reason: string
    logistics?: string
    shippingCost?: number
    approverId?: number
  }) {
    const { assetId, toDepartmentId, toUserId, operatorId, reason, logistics, shippingCost, approverId } = data
    
    const asset = assetService.getAssetById(assetId)
    if (!asset) {
      throw new Error('资产不存在')
    }
    
    // 创建审批
    const approval = approvalService.createApproval({
      type: 'transfer',
      title: `派发申请 - ${asset.name}`,
      applicantId: operatorId,
      approverId,
      content: {
        assetId,
        assetName: asset.name,
        assetCode: asset.code,
        fromDepartmentId: asset.departmentId,
        toDepartmentId,
        toUserId,
        reason,
        logistics,
        shippingCost,
      },
      priority: 'normal',
    })
    
    return approval
  }

  // 处理派发申请
  processTransfer(approvalId: number) {
    const approval = approvalService.getApprovalById(approvalId)
    if (!approval || approval.status !== 'approved') {
      throw new Error('审批未通过')
    }
    
    const { assetId, toDepartmentId, toUserId, reason, shippingCost } = approval.content
    
    const asset = assetService.getAssetById(assetId)
    
    const result = this.db.prepare(`
      INSERT INTO asset_operations (
        asset_id, type, operator_id, from_department_id, to_department_id, 
        to_user_id, amount, reason, approval_id, status
      )
      VALUES (?, 'transfer', ?, ?, ?, ?, ?, ?, ?, 'approved')
    `).run(
      assetId, 
      approval.applicantId, 
      asset?.departmentId || null, 
      toDepartmentId, 
      toUserId || null,
      shippingCost || null,
      reason,
      approvalId
    )
    
    // 更新资产部门和使用人
    this.db.prepare(`
      UPDATE assets 
      SET department_id = ?, user_id = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).run(toDepartmentId, toUserId || null, assetId)
    
    return this.getOperationById(Number(result.lastInsertRowid))
  }

  // 维修申请
  createMaintenanceRequest(data: {
    assetId: number
    operatorId: number
    reason: string
    estimatedCost?: number
    approverId?: number
  }) {
    const { assetId, operatorId, reason, estimatedCost, approverId } = data
    
    const asset = assetService.getAssetById(assetId)
    if (!asset) {
      throw new Error('资产不存在')
    }
    
    // 创建审批
    const approval = approvalService.createApproval({
      type: 'maintain',
      title: `维修申请 - ${asset.name}`,
      applicantId: operatorId,
      approverId,
      content: {
        assetId,
        assetName: asset.name,
        assetCode: asset.code,
        reason,
        estimatedCost,
      },
      priority: 'high',
    })
    
    return approval
  }

  // 处理维修申请
  processMaintenance(approvalId: number, actualCost?: number) {
    const approval = approvalService.getApprovalById(approvalId)
    if (!approval || approval.status !== 'approved') {
      throw new Error('审批未通过')
    }
    
    const { assetId, reason } = approval.content
    
    const result = this.db.prepare(`
      INSERT INTO asset_operations (
        asset_id, type, operator_id, amount, reason, approval_id, status
      )
      VALUES (?, 'maintain', ?, ?, ?, ?, 'approved')
    `).run(assetId, approval.applicantId, actualCost || null, reason, approvalId)
    
    // 更新资产状态为维修中
    this.db.prepare(`
      UPDATE assets 
      SET status = 'maintaining', updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).run(assetId)
    
    return this.getOperationById(Number(result.lastInsertRowid))
  }

  // 完成维修
  completeMaintenance(assetId: number, operatorId: number, actualCost?: number, notes?: string) {
    const asset = assetService.getAssetById(assetId)
    if (!asset) {
      throw new Error('资产不存在')
    }
    
    if (asset.status !== 'maintaining') {
      throw new Error('资产未处于维修状态')
    }
    
    const result = this.db.prepare(`
      INSERT INTO asset_operations (
        asset_id, type, operator_id, amount, reason, status
      )
      VALUES (?, 'maintain', ?, ?, ?, 'approved')
    `).run(assetId, operatorId, actualCost || null, `维修完成。${notes || ''}`)
    
    // 更新资产状态为闲置
    this.db.prepare(`
      UPDATE assets 
      SET status = 'idle', updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).run(assetId)
    
    return this.getOperationById(Number(result.lastInsertRowid))
  }

  // 报废申请
  createScrapRequest(data: {
    assetId: number
    operatorId: number
    reason: string
    approverId?: number
  }) {
    const { assetId, operatorId, reason, approverId } = data
    
    const asset = assetService.getAssetById(assetId)
    if (!asset) {
      throw new Error('资产不存在')
    }
    
    // 创建审批
    const approval = approvalService.createApproval({
      type: 'scrap',
      title: `报废申请 - ${asset.name}`,
      applicantId: operatorId,
      approverId,
      content: {
        assetId,
        assetName: asset.name,
        assetCode: asset.code,
        reason,
        currentValue: asset.currentValue,
      },
      priority: 'normal',
    })
    
    return approval
  }

  // 处理报废申请
  processScrap(approvalId: number) {
    const approval = approvalService.getApprovalById(approvalId)
    if (!approval || approval.status !== 'approved') {
      throw new Error('审批未通过')
    }
    
    const { assetId, reason } = approval.content
    
    const result = this.db.prepare(`
      INSERT INTO asset_operations (
        asset_id, type, operator_id, reason, approval_id, status
      )
      VALUES (?, 'scrap', ?, ?, ?, 'approved')
    `).run(assetId, approval.applicantId, reason, approvalId)
    
    // 更新资产状态为报废
    this.db.prepare(`
      UPDATE assets 
      SET status = 'scrapped', user_id = NULL, current_value = 0, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).run(assetId)
    
    return this.getOperationById(Number(result.lastInsertRowid))
  }

  // 回收资产
  createRecycle(data: {
    assetId: number
    operatorId: number
    reason?: string
    recoveryValue?: number
  }) {
    const { assetId, operatorId, reason, recoveryValue } = data
    
    const asset = assetService.getAssetById(assetId)
    if (!asset) {
      throw new Error('资产不存在')
    }
    
    if (asset.status !== 'scrapped') {
      throw new Error('只能回收报废资产')
    }
    
    const result = this.db.prepare(`
      INSERT INTO asset_operations (
        asset_id, type, operator_id, amount, reason, status
      )
      VALUES (?, 'recycle', ?, ?, ?, 'approved')
    `).run(assetId, operatorId, recoveryValue || null, reason || '资产回收')
    
    return this.getOperationById(Number(result.lastInsertRowid))
  }

  // 遗失报告
  createLostReport(data: {
    assetId: number
    operatorId: number
    responsibleUserId?: number
    reason: string
    estimatedLoss?: number
    approverId?: number
  }) {
    const { assetId, operatorId, responsibleUserId, reason, estimatedLoss, approverId } = data
    
    const asset = assetService.getAssetById(assetId)
    if (!asset) {
      throw new Error('资产不存在')
    }
    
    // 创建审批
    const approval = approvalService.createApproval({
      type: 'lost',
      title: `遗失报告 - ${asset.name}`,
      applicantId: operatorId,
      approverId,
      content: {
        assetId,
        assetName: asset.name,
        assetCode: asset.code,
        responsibleUserId,
        reason,
        estimatedLoss: estimatedLoss || asset.currentValue,
      },
      priority: 'urgent',
    })
    
    return approval
  }

  // 处理遗失报告
  processLost(approvalId: number) {
    const approval = approvalService.getApprovalById(approvalId)
    if (!approval || approval.status !== 'approved') {
      throw new Error('审批未通过')
    }
    
    const { assetId, responsibleUserId, reason, estimatedLoss } = approval.content
    
    const result = this.db.prepare(`
      INSERT INTO asset_operations (
        asset_id, type, operator_id, from_user_id, amount, reason, approval_id, status
      )
      VALUES (?, 'lost', ?, ?, ?, ?, ?, 'approved')
    `).run(
      assetId,
      approval.applicantId,
      responsibleUserId || null,
      estimatedLoss || null,
      reason,
      approvalId
    )
    
    // 更新资产状态为遗失
    this.db.prepare(`
      UPDATE assets 
      SET status = 'lost', user_id = NULL, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).run(assetId)
    
    return this.getOperationById(Number(result.lastInsertRowid))
  }
}
