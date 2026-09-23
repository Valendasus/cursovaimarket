import { BadRequestException, InternalServerErrorException } from '@nestjs/common'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { S3Service } from './s3.service'

const sendMock = jest.fn()

jest.mock('@aws-sdk/client-s3', () => ({
	S3Client: jest.fn().mockImplementation(() => ({ send: sendMock })),
	PutObjectCommand: jest.fn().mockImplementation(input => ({ kind: 'put', input })),
	GetObjectCommand: jest.fn().mockImplementation(input => ({ kind: 'get', input })),
}))

jest.mock('@aws-sdk/s3-request-presigner', () => ({
	getSignedUrl: jest.fn(),
}))

const ENV_KEYS = [
	'S3_BUCKET',
	'S3_REGION',
	'S3_ENDPOINT',
	'S3_ACCESS_KEY',
	'S3_SECRET_KEY',
	'S3_SIGNED_URL_EXPIRES',
] as const

describe('S3Service', () => {
	const originalEnv = { ...process.env }

	beforeEach(() => {
		jest.clearAllMocks()
		process.env.S3_BUCKET = 'test-bucket'
		process.env.S3_REGION = 'ru-7'
		process.env.S3_ENDPOINT = 'https://s3.ru-7.storage.selcloud.ru'
		process.env.S3_ACCESS_KEY = 'access'
		process.env.S3_SECRET_KEY = 'secret'
		process.env.S3_SIGNED_URL_EXPIRES = '900'
	})

	afterAll(() => {
		for (const key of ENV_KEYS) {
			if (originalEnv[key] === undefined) delete process.env[key]
			else process.env[key] = originalEnv[key]
		}
	})

	it('disables uploads when configuration is incomplete', async () => {
		delete process.env.S3_SECRET_KEY
		const service = new S3Service()

		expect(service.isEnabled()).toBe(false)
		expect(service.normalizeRef('avatars/a.png')).toBe(
			's3://test-bucket/avatars/a.png',
		)
		await expect(
			service.uploadBuffer('a.txt', Buffer.from('x')),
		).rejects.toBeInstanceOf(InternalServerErrorException)
		expect(await service.signUrl('s3://bucket/a.txt')).toBe(
			's3://bucket/a.txt',
		)
	})

	it('normalizes refs, endpoint URLs and prefixes', () => {
		const service = new S3Service()

		expect(service.toS3Ref('/avatars/a.png')).toBe(
			's3://test-bucket/avatars/a.png',
		)
		expect(service.isS3Ref('s3://test-bucket/a')).toBe(true)
		expect(service.isS3Ref('https://example.com/a')).toBe(false)
		expect(
			service.isRefWithinPrefix(
				's3://test-bucket/messages/c1/u1/file.pdf',
				'/messages/c1/u1/',
			),
		).toBe(true)
		expect(service.isRefWithinPrefix('https://example.com/a', 'messages')).toBe(
			false,
		)
		expect(service.normalizeRef(null)).toBeNull()
		expect(service.normalizeRef('s3://test-bucket/a')).toBe(
			's3://test-bucket/a',
		)
		expect(
			service.normalizeRef(
				'https://s3.ru-7.storage.selcloud.ru/test-bucket/avatars/a.png',
			),
		).toBe('s3://test-bucket/avatars/a.png')
		expect(
			service.normalizeRef(
				'https://test-bucket.s3.ru-7.storage.selcloud.ru/avatars/a.png',
			),
		).toBe('s3://test-bucket/avatars/a.png')
		expect(service.normalizeRef('https://cdn.example.com/a.png')).toBe(
			'https://cdn.example.com/a.png',
		)
	})

	it('uploads a buffer and returns a stable S3 reference', async () => {
		sendMock.mockResolvedValueOnce({})
		const service = new S3Service()

		await expect(
			service.uploadBuffer('avatars/a.png', Buffer.from('image'), 'image/png'),
		).resolves.toBe('s3://test-bucket/avatars/a.png')
		expect(sendMock).toHaveBeenCalledWith({
			kind: 'put',
			input: {
				Bucket: 'test-bucket',
				Key: 'avatars/a.png',
				Body: expect.any(Buffer),
				ContentType: 'image/png',
			},
		})
	})

	it('maps SDK upload failures to a safe HTTP error', async () => {
		sendMock.mockRejectedValueOnce(new Error('secret provider error'))
		const service = new S3Service()

		await expect(
			service.uploadBuffer('a.txt', Buffer.from('x')),
		).rejects.toBeInstanceOf(BadRequestException)
	})

	it('signs only S3 references using the configured expiration', async () => {
		;(getSignedUrl as jest.Mock).mockResolvedValue('https://signed.example/a')
		const service = new S3Service()

		expect(await service.signUrl(undefined)).toBeUndefined()
		expect(await service.signUrl('https://cdn.example/a')).toBe(
			'https://cdn.example/a',
		)
		await expect(
			service.signUrl('s3://test-bucket/avatars/a.png'),
		).resolves.toBe('https://signed.example/a')
		expect(getSignedUrl).toHaveBeenCalledWith(
			expect.objectContaining({ send: sendMock }),
			{
				kind: 'get',
				input: { Bucket: 'test-bucket', Key: 'avatars/a.png' },
			},
			{ expiresIn: 900 },
		)
	})

	it('falls back to the default expiration for an invalid value', async () => {
		process.env.S3_SIGNED_URL_EXPIRES = '-1'
		;(getSignedUrl as jest.Mock).mockResolvedValue('signed')
		const service = new S3Service()

		await service.signUrl('s3://test-bucket/a')
		expect(getSignedUrl).toHaveBeenCalledWith(
			expect.anything(),
			expect.anything(),
			{ expiresIn: 3600 },
		)
	})
})
