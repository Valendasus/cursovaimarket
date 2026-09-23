import {
	GetObjectCommand,
	PutObjectCommand,
	S3Client,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import {
	BadRequestException,
	Injectable,
	InternalServerErrorException,
	Logger,
} from '@nestjs/common'

@Injectable()
export class S3Service {
	private readonly client: S3Client | null
	private readonly bucket: string
	private readonly expiresIn: number
	private readonly enabled: boolean
	private readonly endpointHost: string | null
	private readonly logger = new Logger(S3Service.name)

	constructor() {
		const bucket = process.env.S3_BUCKET
		const region = process.env.S3_REGION
		const endpoint = process.env.S3_ENDPOINT
		const accessKeyId = process.env.S3_ACCESS_KEY
		const secretAccessKey = process.env.S3_SECRET_KEY
		const rawExpires = Number(process.env.S3_SIGNED_URL_EXPIRES ?? 3600)

		this.bucket = bucket ?? ''
		this.expiresIn =
			Number.isFinite(rawExpires) && rawExpires > 0 ? rawExpires : 3600

		this.enabled = Boolean(
			bucket && region && endpoint && accessKeyId && secretAccessKey,
		)
		this.endpointHost = this.enabled ? this.safeHost(endpoint) : null

		if (!this.enabled) {
			this.client = null
			this.logger.warn('S3 is not configured; uploads are disabled.')
			return
		}

		this.client = new S3Client({
			region,
			endpoint,
			forcePathStyle: true,
			credentials: { accessKeyId, secretAccessKey },
		})
	}

	isEnabled(): boolean {
		return this.enabled
	}

	toS3Ref(key: string): string {
		const normalized = key.replace(/^\/+/, '')
		return `s3://${this.bucket}/${normalized}`
	}

	isS3Ref(value: string): boolean {
		return value.startsWith('s3://')
	}

	isRefWithinPrefix(value: string, prefix: string): boolean {
		if (!this.isS3Ref(value)) return false
		const normalizedPrefix = prefix.replace(/^\/+/, '').replace(/\/+$/, '')
		const key = this.extractKeyFromRef(value)
		return key.startsWith(`${normalizedPrefix}/`)
	}

	normalizeRef(value?: string | null): string | null | undefined {
		if (!value) return value
		if (this.isS3Ref(value)) return value

		if (value.startsWith('http://') || value.startsWith('https://')) {
			if (!this.isS3Url(value)) return value
			const key = this.extractKeyFromUrl(value)
			return key ? this.toS3Ref(key) : value
		}

		return this.toS3Ref(value)
	}

	async uploadBuffer(
		key: string,
		body: Buffer,
		contentType?: string,
	): Promise<string> {
		if (!this.client || !this.enabled) {
			throw new InternalServerErrorException('S3 не настроен')
		}

		try {
			await this.client.send(
				new PutObjectCommand({
					Bucket: this.bucket,
					Key: key,
					Body: body,
					ContentType: contentType,
				}),
			)
			return this.toS3Ref(key)
		} catch (error) {
			this.logger.error('Failed to upload to S3', error)
			throw new BadRequestException('Не удалось загрузить файл')
		}
	}

	async signUrl(value?: string | null): Promise<string | null | undefined> {
		if (!value) return value
		if (!this.client || !this.enabled) return value
		if (!this.isS3Ref(value)) return value

		const key = this.extractKeyFromRef(value)
		const command = new GetObjectCommand({
			Bucket: this.bucket,
			Key: key,
		})
		return getSignedUrl(this.client, command, { expiresIn: this.expiresIn })
	}

	private extractKeyFromRef(value: string): string {
		const trimmed = value.replace('s3://', '')
		if (!trimmed.startsWith(this.bucket)) {
			return trimmed.replace(/^\/+/, '')
		}
		return trimmed.slice(this.bucket.length + 1)
	}

	private extractKeyFromUrl(raw: string): string | null {
		try {
			const url = new URL(raw)
			if (this.bucket && url.host.startsWith(`${this.bucket}.`)) {
				return url.pathname.replace(/^\/+/, '') || null
			}
			const path = url.pathname.replace(/^\/+/, '')
			if (!path) return null
			if (path.startsWith(`${this.bucket}/`)) {
				return path.slice(this.bucket.length + 1)
			}
			return path
		} catch {
			return null
		}
	}

	private isS3Url(raw: string): boolean {
		if (!this.endpointHost) return false
		try {
			const url = new URL(raw)
			return (
				url.host === this.endpointHost ||
				url.host.endsWith(`.${this.endpointHost}`)
			)
		} catch {
			return false
		}
	}

	private safeHost(raw?: string): string | null {
		if (!raw) return null
		try {
			return new URL(raw).host
		} catch {
			return null
		}
	}
}
