import 'dotenv/config'
import { drizzle } from 'drizzle-orm/mysql2'
import mysql from 'mysql2/promise'
import * as schema from './schema.js'

let _db: ReturnType<typeof drizzle> | null = null

export async function getDb() {
  if (_db) return _db

  const pool = mysql.createPool({
    uri: process.env.DATABASE_URL,
    multipleStatements: false,
    waitForConnections: true,
    connectionLimit: 10,
    idleTimeout: 60000,
    enableKeepAlive: true,
    keepAliveInitialDelay: 30000,
  })

  _db = drizzle(pool, { schema, mode: 'default' })
  return _db
}

export type Db = NonNullable<Awaited<ReturnType<typeof getDb>>>
