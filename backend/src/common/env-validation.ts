import { Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

/** Дефолтные значения из .env.example — недопустимы вне локальной разработки */
const PLACEHOLDER_SECRETS = [
	'change-me-at-least-32-chars-long',
	'change-me-refresh-at-least-32-chars',
]

const MIN_SECRET_LENGTH = 32

/**
 * Проверяет надёжность JWT-секретов на старте приложения.
 *
 * В production любая проблема останавливает запуск (fail-fast), чтобы нельзя
 * было задеплоить с дефолтными/слабыми секретами и получить подделку токенов.
 * В development — только предупреждение, чтобы не ломать локальный запуск.
 */
export function validateAuthSecrets(config: ConfigService): void {
	const logger = new Logger('EnvValidation')
	const isProd = process.env.NODE_ENV === 'production'

	const jwtSecret = config.get<string>('JWT_SECRET')
	const refreshSecret = config.get<string>('JWT_REFRESH_SECRET')

	const problems: string[] = []

	const checkSecret = (name: string, value: string | undefined) => {
		if (!value) {
			problems.push(`${name} не задан`)
			return
		}
		if (value.length < MIN_SECRET_LENGTH) {
			problems.push(`${name} короче ${MIN_SECRET_LENGTH} символов`)
		}
		if (PLACEHOLDER_SECRETS.includes(value)) {
			problems.push(`${name} использует дефолтное значение из .env.example`)
		}
	}

	checkSecret('JWT_SECRET', jwtSecret)
	checkSecret('JWT_REFRESH_SECRET', refreshSecret)

	if (jwtSecret && refreshSecret && jwtSecret === refreshSecret) {
		problems.push('JWT_SECRET и JWT_REFRESH_SECRET совпадают')
	}

	if (problems.length === 0) return

	const message = `Небезопасная конфигурация JWT-секретов:\n - ${problems.join(
		'\n - ',
	)}`

	if (isProd) {
		throw new Error(message)
	}

	logger.warn(`${message}\n(в production это остановит запуск приложения)`)
}
