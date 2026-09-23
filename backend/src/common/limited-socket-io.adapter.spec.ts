import { IoAdapter } from '@nestjs/platform-socket.io'
import { LimitedSocketIoAdapter } from './limited-socket-io.adapter'

describe('LimitedSocketIoAdapter', () => {
	const originalEnv = { ...process.env }

	afterEach(() => {
		jest.restoreAllMocks()
		process.env = { ...originalEnv }
	})

	it('applies packet-size and heartbeat limits without dropping gateway options', () => {
		process.env.SOCKET_MAX_EVENT_BYTES = '4096'
		process.env.SOCKET_PING_INTERVAL_MS = '15000'
		process.env.SOCKET_PING_TIMEOUT_MS = '7000'
		const create = jest
			.spyOn(IoAdapter.prototype, 'createIOServer')
			.mockReturnValue('server' as never)
		const adapter = new LimitedSocketIoAdapter({} as never)

		expect(adapter.createIOServer(3000, { cors: { credentials: true } })).toBe(
			'server',
		)
		expect(create).toHaveBeenCalledWith(3000, {
			cors: { credentials: true },
			maxHttpBufferSize: 4096,
			pingInterval: 15000,
			pingTimeout: 7000,
		})
	})
})
