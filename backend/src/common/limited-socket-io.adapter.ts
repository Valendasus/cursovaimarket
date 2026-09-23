import { INestApplicationContext } from '@nestjs/common'
import { IoAdapter } from '@nestjs/platform-socket.io'
import { getSocketLimits } from '../modules/chat/socket-limits'

/** Applies transport-level limits after ConfigModule has loaded the .env file. */
export class LimitedSocketIoAdapter extends IoAdapter {
	constructor(app: INestApplicationContext) {
		super(app)
	}

	createIOServer(port: number, options?: Record<string, unknown>) {
		const limits = getSocketLimits()
		return super.createIOServer(port, {
			...options,
			maxHttpBufferSize: limits.maxEventBytes,
			pingInterval: limits.pingIntervalMs,
			pingTimeout: limits.pingTimeoutMs,
		})
	}
}
