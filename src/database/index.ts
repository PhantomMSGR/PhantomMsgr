import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as dotenv from 'dotenv'
import * as schema from './schema'

dotenv.config()

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  throw new Error('DATABASE_URL is not set')
}

// Отдельный клиент для миграций (max: 1 соединение)
export const migrationClient = postgres(connectionString, { max: 1 })

// Основной пул соединений
const queryClient = postgres(connectionString)

export const db = drizzle(queryClient, { schema })

export type DB = typeof db
