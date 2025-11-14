import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config()

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  
  // 数据库配置
  databasePath: process.env.DATABASE_PATH || path.join(__dirname, '../data/asset_management.db'),
  
  // 文件上传配置
  uploadPath: process.env.UPLOAD_PATH || path.join(__dirname, '../uploads'),
  maxUploadSize: parseInt(process.env.MAX_UPLOAD_SIZE || '10485760', 10), // 10MB
  
  // JWT 配置
  jwtSecret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  
  // DooTask 配置
  dootaskUrl: process.env.DOOTASK_URL || 'http://localhost:8080',
  dootaskApiKey: process.env.DOOTASK_API_KEY || '',
  
  // CORS 配置
  corsOrigin: process.env.CORS_ORIGIN || '*',
}
