import Koa from 'koa'
import Router from '@koa/router'
import cors from '@koa/cors'
import helmet from 'koa-helmet'
import koaBody from 'koa-body'
import compress from 'koa-compress'
import logger from 'koa-logger'
import serve from 'koa-static'
import { config } from './config.js'
import { errorHandler } from './middleware/errorHandler.js'
import { initDatabase } from './database/connection.js'
import assetRoutes from './routes/asset.routes.js'
import approvalRoutes from './routes/approval.routes.js'
import systemRoutes from './routes/system.routes.js'
import dashboardRoutes from './routes/dashboard.routes.js'

const app = new Koa()
const router = new Router()

// 全局错误处理
app.use(errorHandler)

// 安全相关中间件
app.use(helmet())
app.use(cors({
  origin: config.corsOrigin,
  credentials: true,
}))

// 日志
if (config.env === 'development') {
  app.use(logger())
}

// 请求体解析
app.use(koaBody({
  multipart: true,
  formidable: {
    maxFileSize: config.maxUploadSize,
    uploadDir: config.uploadPath,
    keepExtensions: true,
  },
}))

// 压缩
app.use(compress({
  threshold: 2048,
  gzip: {
    flush: require('zlib').constants.Z_SYNC_FLUSH
  },
  deflate: {
    flush: require('zlib').constants.Z_SYNC_FLUSH,
  },
}))

// 静态文件服务
app.use(serve(config.uploadPath))

// 健康检查
router.get('/health', (ctx) => {
  ctx.body = {
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
  }
})

// API 路由
const apiRouter = new Router({ prefix: '/api' })

apiRouter.use('/dashboard', dashboardRoutes.routes(), dashboardRoutes.allowedMethods())
apiRouter.use('/assets', assetRoutes.routes(), assetRoutes.allowedMethods())
apiRouter.use('/approvals', approvalRoutes.routes(), approvalRoutes.allowedMethods())
apiRouter.use('/system', systemRoutes.routes(), systemRoutes.allowedMethods())

router.use(apiRouter.routes(), apiRouter.allowedMethods())

app.use(router.routes())
app.use(router.allowedMethods())

// 初始化数据库
initDatabase()

// 启动服务器
const port = config.port
app.listen(port, () => {
  console.log(`🚀 Server is running on port ${port}`)
  console.log(`📦 Environment: ${config.env}`)
  console.log(`💾 Database: ${config.databasePath}`)
  console.log(`📁 Upload path: ${config.uploadPath}`)
})

export default app
