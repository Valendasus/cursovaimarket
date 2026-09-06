// Health-check S3-бакета. Запуск:  node --env-file=.env s3-check.cjs
const {
	S3Client,
	HeadBucketCommand,
	PutObjectCommand,
	GetObjectCommand,
	DeleteObjectCommand,
} = require('@aws-sdk/client-s3')
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner')

console.log('=== S3 health-check старт ===')

const {
	S3_ENDPOINT,
	S3_REGION,
	S3_BUCKET,
	S3_ACCESS_KEY,
	S3_SECRET_KEY,
	S3_SIGNED_URL_EXPIRES,
} = process.env

// Сторож: если за 20с ничего не произошло — сеть/доступ закрыты
const watchdog = setTimeout(() => {
	console.log('⏱  Таймаут 20с — нет ответа от Selectel (сеть/firewall закрыты?)')
	process.exit(1)
}, 20000)

console.log('Endpoint:', S3_ENDPOINT || '(не задан!)')
console.log('Region:  ', S3_REGION || '(не задан!)')
console.log('Bucket:  ', S3_BUCKET || '(не задан!)')
console.log('AccessKey:', S3_ACCESS_KEY ? S3_ACCESS_KEY.slice(0, 4) + '…' : '(не задан!)')
console.log('SecretKey:', S3_SECRET_KEY ? 'задан' : '(не задан!)')
console.log('---')

if (!S3_ENDPOINT || !S3_REGION || !S3_BUCKET || !S3_ACCESS_KEY || !S3_SECRET_KEY) {
	console.log('❌ Не все переменные заданы. Запускай: node --env-file=.env s3-check.cjs')
	clearTimeout(watchdog)
	process.exit(1)
}

const client = new S3Client({
	region: S3_REGION,
	endpoint: S3_ENDPOINT,
	forcePathStyle: true,
	credentials: { accessKeyId: S3_ACCESS_KEY, secretAccessKey: S3_SECRET_KEY },
	requestHandler: { requestTimeout: 8000, connectionTimeout: 8000 },
	maxAttempts: 1,
})

async function main() {
	// 1. Доступ к бакету + валидность ключей
	try {
		await client.send(new HeadBucketCommand({ Bucket: S3_BUCKET }))
		console.log('[1] HeadBucket: OK — бакет доступен, ключи валидны')
	} catch (e) {
		console.log('[1] HeadBucket: FAIL —', e.name, '| HTTP', e.$metadata?.httpStatusCode, '|', e.message)
		throw e
	}

	const key = `healthcheck/test-${Date.now()}.txt`

	// 2. Запись
	await client.send(
		new PutObjectCommand({
			Bucket: S3_BUCKET,
			Key: key,
			Body: Buffer.from('s3 healthcheck'),
			ContentType: 'text/plain',
		}),
	)
	console.log('[2] PutObject: OK — запись работает')

	// 3. Presigned-чтение
	const url = await getSignedUrl(
		client,
		new GetObjectCommand({ Bucket: S3_BUCKET, Key: key }),
		{ expiresIn: Number(S3_SIGNED_URL_EXPIRES) || 3600 },
	)
	const res = await fetch(url)
	const text = await res.text()
	console.log(
		'[3] Presigned GET:',
		res.ok && text === 's3 healthcheck' ? 'OK' : 'FAIL',
		'— HTTP',
		res.status,
	)

	// 4. Удаление тестового объекта
	await client.send(new DeleteObjectCommand({ Bucket: S3_BUCKET, Key: key }))
	console.log('[4] DeleteObject: OK — тестовый объект удалён')

	console.log('---')
	console.log('✅ S3 настроен корректно и полностью рабочий')
}

main()
	.then(() => {
		clearTimeout(watchdog)
		process.exit(0)
	})
	.catch(e => {
		clearTimeout(watchdog)
		console.log('---')
		console.log('❌ S3 проверка не пройдена:', e.name, '-', e.message)
		process.exit(1)
	})
