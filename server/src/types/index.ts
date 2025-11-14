// 通用分页参数
export interface PaginationParams {
  page?: number
  pageSize?: number
}

// 通用分页响应
export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
}

// 通用 API 响应
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  message?: string
}

// 用户类型
export interface User {
  id: number
  username: string
  realname: string
  email: string
  department?: string
  role?: string
  status: 'active' | 'inactive'
  createdAt: string
  updatedAt: string
}

// 公司类型
export interface Company {
  id: number
  name: string
  code: string
  parentId?: number
  level: number
  sort: number
  status: 'active' | 'inactive'
  createdAt: string
  updatedAt: string
}

// 部门类型
export interface Department {
  id: number
  name: string
  code: string
  companyId: number
  parentId?: number
  managerId?: number
  sort: number
  status: 'active' | 'inactive'
  createdAt: string
  updatedAt: string
}

// 角色类型
export interface Role {
  id: number
  name: string
  code: string
  description?: string
  permissions: string[]
  status: 'active' | 'inactive'
  createdAt: string
  updatedAt: string
}

// 资产分类类型
export interface AssetCategory {
  id: number
  name: string
  code: string
  parentId?: number
  description?: string
  customFields?: any
  sort: number
  status: 'active' | 'inactive'
  createdAt: string
  updatedAt: string
}

// 资产类型
export interface Asset {
  id: number
  name: string
  code: string
  categoryId: number
  status: 'idle' | 'in_use' | 'maintaining' | 'scrapped'
  companyId: number
  departmentId?: number
  userId?: number
  purchaseDate?: string
  purchasePrice?: number
  currentValue?: number
  location?: string
  description?: string
  customFields?: any
  createdBy: number
  updatedBy: number
  createdAt: string
  updatedAt: string
}

// 操作类型
export type OperationType =
  | 'purchase'
  | 'stock_in'
  | 'requisition'
  | 'borrow'
  | 'return'
  | 'transfer'
  | 'maintain'
  | 'scrap'
  | 'recycle'
  | 'lost'

// 资产操作记录
export interface AssetOperation {
  id: number
  assetId: number
  type: OperationType
  operatorId: number
  fromUserId?: number
  toUserId?: number
  fromLocation?: string
  toLocation?: string
  quantity?: number
  amount?: number
  reason?: string
  attachments?: string[]
  approvalId?: number
  status: 'pending' | 'approved' | 'rejected'
  operatedAt: string
  createdAt: string
  updatedAt: string
}

// 审批状态
export type ApprovalStatus = 'pending' | 'reviewing' | 'approved' | 'rejected'

// 审批记录
export interface Approval {
  id: number
  type: OperationType
  title: string
  applicantId: number
  approverId?: number
  status: ApprovalStatus
  content: any
  attachments?: string[]
  reason?: string
  approvedAt?: string
  createdAt: string
  updatedAt: string
}

// 耗材类型
export interface Consumable {
  id: number
  name: string
  code: string
  categoryId: number
  unit: string
  stock: number
  minStock: number
  maxStock: number
  price?: number
  location?: string
  description?: string
  status: 'active' | 'inactive'
  createdBy: number
  updatedBy: number
  createdAt: string
  updatedAt: string
}

// 盘点任务类型
export interface InventoryTask {
  id: number
  title: string
  type: 'asset' | 'consumable'
  categoryIds?: number[]
  startDate: string
  endDate: string
  assigneeIds: number[]
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
  result?: any
  createdBy: number
  createdAt: string
  updatedAt: string
}
