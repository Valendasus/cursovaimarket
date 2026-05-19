import { ValidationPipe, VersioningType } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { NestFactory } from '@nestjs/core'
import { NestExpressApplication } from '@nestjs/platform-express'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import compression from 'compression'
import cookieParser from 'cookie-parser'
import helmet from 'helmet'
import { AppModule } from './app.module'
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter'
import { resolveUploadsRoot } from './common/uploads'

async function bootstrap() {
	const app = await NestFactory.create<NestExpressApplication>(AppModule)
	const config = app.get(ConfigService)

	// Graceful shutdown
	app.enableShutdownHooks()

	// Security
	app.use(
		helmet({
			crossOriginResourcePolicy: { policy: 'cross-origin' },
		}),
	)
	app.use(cookieParser())

	// Compression (gzip) — reduces response size
	app.use(compression())

	// Static uploads
	app.useStaticAssets(resolveUploadsRoot(), { prefix: '/uploads' })

	// Global prefix + versioning
	app.setGlobalPrefix('api')
	app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' })

	// CORS – allow configured origin (mirrors request in dev, locked in prod)
	const isProd = process.env.NODE_ENV === 'production'
	const corsOrigin = config.get<string>('CORS_ORIGIN', 'http://localhost:5173')
	app.enableCors({
		origin: (
			origin: string | undefined,
			callback: (error: Error | null, allow?: boolean) => void,
		) => {
			// Allow requests with no origin (like mobile apps or Swagger)
			if (!origin) return callback(null, true)
			// In dev: allow any localhost port, in prod: strict check
			if (!isProd && /^http:\/\/localhost:\d+$/.test(origin)) {
				return callback(null, true)
			}
			// Production: use explicit CORS_ORIGIN env var
			if (corsOrigin === '*' || origin === corsOrigin) {
				return callback(null, true)
			}
			return callback(new Error('Not allowed by CORS'))
		},
		credentials: true,
		methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
		allowedHeaders: ['Content-Type', 'Authorization'],
	})

	// Global exception filter
	app.useGlobalFilters(new AllExceptionsFilter())

	// Global validation pipe
	app.useGlobalPipes(
		new ValidationPipe({
			whitelist: true,
			forbidNonWhitelisted: true,
			transform: true,
			transformOptions: { enableImplicitConversion: true },
		}),
	)

	// Swagger
	const swaggerConfig = new DocumentBuilder()
		.setTitle('КурсовойМаркет API')
		.setDescription('REST API для маркетплейса курсовых работ')
		.setVersion('1.0')
		.addBearerAuth()
		.build()
	const document = SwaggerModule.createDocument(app, swaggerConfig)
	SwaggerModule.setup('api/docs', app, document)

	const port = config.get<number>('PORT', 3000)
	await app.listen(port)
	console.log(`🚀 Backend running: http://localhost:${port}`)
	console.log(`📚 Swagger docs:    http://localhost:${port}/api/docs`)
}

bootstrap()
