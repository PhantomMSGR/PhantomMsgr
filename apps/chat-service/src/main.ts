import { NestFactory } from '@nestjs/core'
import { MicroserviceOptions, Transport } from '@nestjs/microservices'
import { ConfigService } from '@nestjs/config'
import { ChatModule } from './chat.module'

async function bootstrap() {
  const app = await NestFactory.create(ChatModule)
  const config = app.get(ConfigService)

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.REDIS,
    options: {
      host: config.getOrThrow('REDIS_HOST'),
      port: config.get<number>('REDIS_PORT', 6379),
    },
  })

  await app.startAllMicroservices()
  await app.listen(config.get('CHAT_HTTP_PORT', 3002))
}

bootstrap()
