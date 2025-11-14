import Database from 'better-sqlite3'
import { config } from '../config.js'
import fs from 'fs'
import path from 'path'

let db: Database.Database | null = null

export function getDatabase(): Database.Database {
  if (!db) {
    // 确保数据库目录存在
    const dbDir = path.dirname(config.databasePath)
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true })
    }

    db = new Database(config.databasePath)
    db.pragma('journal_mode = WAL')
    db.pragma('foreign_keys = ON')
    
    console.log(`✅ Database connected: ${config.databasePath}`)
  }
  
  return db
}

export function closeDatabase(): void {
  if (db) {
    db.close()
    db = null
    console.log('Database connection closed')
  }
}

export function initDatabase(): void {
  const database = getDatabase()
  
  // 这里会调用迁移脚本来创建表
  console.log('Database initialized')
}

// 处理进程退出时关闭数据库连接
process.on('SIGINT', () => {
  closeDatabase()
  process.exit(0)
})

process.on('SIGTERM', () => {
  closeDatabase()
  process.exit(0)
})
