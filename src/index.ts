import { db } from './database'
import { users } from './database/schema'

async function main() {
  const allUsers = await db.select().from(users).limit(1)
  console.log('DB connected. Users:', allUsers.length)
}

main().catch(console.error)
