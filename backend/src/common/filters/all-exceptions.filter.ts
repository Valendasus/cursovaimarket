import {
	ArgumentsHost,
	Catch,
	ExceptionFilter,
	HttpException,
	HttpStatus,
	Logger,
} from '@nestjs/common'
import { Request, Response } from 'express'

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
	private readonly logger = new Logger(AllExceptionsFilter.name)

	catch(exception: unknown, host: ArgumentsHost) {
		const ctx = host.switchToHttp()
		const response = ctx.getResponse<Response>()
		const request = ctx.getRequest<Request>()

		const status =
			exception instanceof HttpException
				? exception.getStatus()
				: HttpStatus.INTERNAL_SERVER_ERROR

		const rawResponse =
			exception instanceof HttpException
				? exception.getResponse()
				: 'Internal server error'

		// Normalize message to always be a string
		const extractMessage = (r: unknown): string => {
			if (typeof r === 'string') return r
			if (Array.isArray(r)) return r[0] ?? 'Error'
			if (r && typeof r === 'object' && 'message' in r) {
				return extractMessage((r as { message: unknown }).message)
			}
			return 'Internal server error'
		}

		const message = extractMessage(rawResponse)

		if (status >= 500) {
			this.logger.error(exception)
		}

		response.status(status).json({
			statusCode: status,
			timestamp: new Date().toISOString(),
			path: request.url,
			message,
		})
	}
}
