import { ValidationPipe, VersioningType } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { NestFactory } from '@nestjs/core'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import cookieParser from 'cookie-parser'
import helmet from 'helmet'
import { AppModule } from './app.module'

async function bootstrap() {
	const app = await NestFactory.create(AppModule)
	const config = app.get(ConfigService)

	// Security
	app.use(helmet())
	app.use(cookieParser())

	// Global prefix + versioning
	app.setGlobalPrefix('api')
	app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' })

	// CORS
	app.enableCors({
		origin: config.get('CORS_ORIGIN', 'http://localhost:5173'),
		credentials: true,
	})

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
