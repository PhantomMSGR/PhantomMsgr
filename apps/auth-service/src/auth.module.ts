import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { JwtModule } from '@nestjs/jwt'
import { DatabaseModule } from '@phantom/database'
import { RedisModule } from '@phantom/redis'
import { AuthController } from './auth.controller'
import { AuthService } from './auth.service'
import { TokenService } from './token/token.service'
import { SessionService } from './session/session.service'
import { TwoFactorService } from './two-factor/two-factor.service'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    RedisModule.forRootAsync(),
    JwtModule.registerAsync({
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow('JWT_SECRET'),
        signOptions: { expiresIn: '15m' },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, TokenService, SessionService, TwoFactorService],
})
export class AuthModule {}
