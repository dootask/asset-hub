// 通用分页响应类型
export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
}

// 通用 API 响应类型
export interface ApiResponse<T = any> {
  success: boolean
  data: T
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
  createdAt: string
  updatedAt: string
}

// 资产类型
export interface Asset {
  id: number
  name: string
  code: string
  categoryId: number
  categoryName?: string
  status: string
  companyId: number
  companyName?: string
  departmentId?: number
  departmentName?: string
  userId?: number
  userName?: string
  purchaseDate?: string
  purchasePrice?: number
  currentValue?: number
  location?: string
  description?: string
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

// 审批状态
export type ApprovalStatus = 'pending' | 'reviewing' | 'approved' | 'rejected'

// 审批类型
export interface Approval {
  id: number
  type: OperationType
  title: string
  applicantId: number
  applicantName: string
  approverId?: number
  approverName?: string
  status: ApprovalStatus
  content: string
  attachments?: string[]
  reason?: string
  createdAt: string
  updatedAt: string
}
