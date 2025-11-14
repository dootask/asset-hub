import { getDatabase } from './connection.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export function runMigrations(): void {
  const db = getDatabase()
  
  console.log('📦 Running database migrations...')
  
  try {
    // 读取 schema.sql 文件
    const schemaPath = path.join(__dirname, 'schema.sql')
    const schema = fs.readFileSync(schemaPath, 'utf-8')
    
    // 分割 SQL 语句并执行
    const statements = schema
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0)
    
    db.transaction(() => {
      for (const statement of statements) {
        db.exec(statement)
      }
    })()
    
    console.log('✅ Database migrations completed successfully')
  } catch (error) {
    console.error('❌ Database migration failed:', error)
    throw error
  }
}

// 如果直接运行此脚本，执行迁移
if (import.meta.url === `file://${process.argv[1]}`) {
  runMigrations()
  process.exit(0)
}
