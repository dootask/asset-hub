import { Context, Next } from 'koa'

export class AppError extends Error {
  statusCode: number
  isOperational: boolean

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message)
    this.statusCode = statusCode
    this.isOperational = isOperational
    Error.captureStackTrace(this, this.constructor)
  }
}

export const errorHandler = async (ctx: Context, next: Next) => {
  try {
    await next()
  } catch (err: any) {
    const error = err as AppError
    
    ctx.status = error.statusCode || 500
    ctx.body = {
      success: false,
      message: error.message || 'Internal server error',
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
    }

    // 记录错误日志
    if (!error.isOperational) {
      console.error('UNEXPECTED ERROR:', error)
    }
  }
}
