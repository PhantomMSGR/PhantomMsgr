import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common'
import { RpcException } from '@nestjs/microservices'
import { Response } from 'express'

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name)

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<Response>()
    const request = ctx.getRequest()

    let status = HttpStatus.INTERNAL_SERVER_ERROR
    let message = 'Internal server error'
    let code = 'INTERNAL_ERROR'

    if (exception instanceof HttpException) {
      status = exception.getStatus()
      const body = exception.getResponse()
      message = typeof body === 'string' ? body : (body as any).message
      code = exception.constructor.name.replace('Exception', '').toUpperCase()
    } else if (exception instanceof RpcException) {
      const error = exception.getError()
      if (typeof error === 'object' && error !== null) {
        status = (error as any).status ?? HttpStatus.BAD_REQUEST
        message = (error as any).message ?? message
        code = (error as any).code ?? code
      }
    }

    if (status === HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(exception)
    }

    response.status(status).json({
      error: {
        code,
        message,
        path: request.url,
        timestamp: new Date().toISOString(),
      },
    })
  }
}
