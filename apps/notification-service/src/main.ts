import { NestFactory } from '@nestjs/core'
import { MicroserviceOptions, Transport } from '@nestjs/microservices'
import { ConfigService } from '@nestjs/config'
import { NotificationModule } from './notification.module'

async function bootstrap() {
  // Notifications is a pure consumer — no HTTP needed except /health
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    NotificationModule,
    {
      transport: Transport.REDIS,
      options: {
        host: process.env.REDIS_HOST ?? 'localhost',
        port: parseInt(process.env.REDIS_PORT ?? '6379'),
      },
    },
  )

  await app.listen()
  console.log('notification-service listening')
}

bootstrap()
