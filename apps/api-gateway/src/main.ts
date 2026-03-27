import { NestFactory, Reflector } from '@nestjs/core'
import { ConfigService } from '@nestjs/config'
import helmet from 'helmet'
import compression from 'compression'
import { AppModule } from './app.module'
import { AllExceptionsFilter, TransformInterceptor } from '@phantom/common'
import { JwtAuthGuard } from '@phantom/auth'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)

  // Security
  app.use(helmet())
  app.use(compression())
  app.enableCors()

  // Global guard: JWT required on all routes except @Public()
  const reflector = app.get(Reflector)
  app.useGlobalGuards(new JwtAuthGuard(reflector))

  // Global interceptor: wrap responses in { data, timestamp }
  app.useGlobalInterceptors(new TransformInterceptor())

  // Global error filter
  app.useGlobalFilters(new AllExceptionsFilter())

  app.setGlobalPrefix('api/v1')

  const config = app.get(ConfigService)
  const port = config.get('PORT', 3000)

  await app.listen(port)
  console.log(`api-gateway running on port ${port}`)
}

bootstrap()
