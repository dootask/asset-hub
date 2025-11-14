import { Context } from 'koa'
import { ApiResponse, PaginatedResponse } from '../types/index.js'

export function successResponse<T>(ctx: Context, data: T, message?: string): void {
  ctx.body = {
    success: true,
    data,
    message,
  } as ApiResponse<T>
}

export function errorResponse(ctx: Context, message: string, statusCode: number = 400): void {
  ctx.status = statusCode
  ctx.body = {
    success: false,
    message,
  } as ApiResponse
}

export function paginatedResponse<T>(
  ctx: Context,
  data: T[],
  total: number,
  page: number,
  pageSize: number
): void {
  ctx.body = {
    success: true,
    data: {
      data,
      total,
      page,
      pageSize,
    } as PaginatedResponse<T>,
  } as ApiResponse<PaginatedResponse<T>>
}
