import { Global, Module } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from '../../../src/database/schema'
import { DRIZZLE } from './database.constants'

@Global()
@Module({
  providers: [
    {
      provide: DRIZZLE,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const url = config.getOrThrow<string>('DATABASE_URL')
        const client = postgres(url)
        return drizzle(client, { schema })
      },
    },
  ],
  exports: [DRIZZLE],
})
export class DatabaseModule {}
