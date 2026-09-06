import {
	CanActivate,
	ExecutionContext,
	ForbiddenException,
	Injectable,
} from '@nestjs/common'

/**
 * Blocks an action until the authenticated user has a verified email.
 * Must run after AuthGuard('jwt') so request.user is populated.
 *
 * Users created before email verification existed were backfilled to
 * emailVerified = true, so this never affects legacy accounts.
 */
@Injectable()
export class EmailVerifiedGuard implements CanActivate {
	canActivate(context: ExecutionContext): boolean {
		const { user } = context.switchToHttp().getRequest()
		if (!user?.emailVerified) {
			throw new ForbiddenException(
				'Подтвердите email, чтобы выполнить это действие',
			)
		}
		return true
	}
}
