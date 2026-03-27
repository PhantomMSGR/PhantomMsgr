import { NestFactory } from '@nestjs/core'
import { MicroserviceOptions, Transport } from '@nestjs/microservices'
import { ConfigService } from '@nestjs/config'
import { AuthModule } from './auth.module'

async function bootstrap() {
  // Hybrid app: HTTP for /health + Redis microservice for RPC
  const app = await NestFactory.create(AuthModule)
  const config = app.get(ConfigService)

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.REDIS,
    options: {
      host: config.getOrThrow('REDIS_HOST'),
      port: config.get<number>('REDIS_PORT', 6379),
    },
  })

  await app.startAllMicroservices()
  await app.listen(config.get('AUTH_HTTP_PORT', 3001))
  console.log(`auth-service listening on port ${config.get('AUTH_HTTP_PORT', 3001)}`)
}

bootstrap()
