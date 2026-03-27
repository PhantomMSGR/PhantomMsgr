import { NestFactory } from '@nestjs/core'
import { MicroserviceOptions, Transport } from '@nestjs/microservices'
import { ConfigService } from '@nestjs/config'
import { MessagingModule } from './messaging.module'

async function bootstrap() {
  const app = await NestFactory.create(MessagingModule)
  const config = app.get(ConfigService)

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.REDIS,
    options: {
      host: config.getOrThrow('REDIS_HOST'),
      port: config.get<number>('REDIS_PORT', 6379),
    },
  })

  await app.startAllMicroservices()
  await app.listen(config.get('MESSAGING_HTTP_PORT', 3003))
}

bootstrap()
