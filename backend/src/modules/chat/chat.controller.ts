import { CurrentUser } from '@/common/decorators/current-user.decorator'
import { S3Service } from '@/common/s3/s3.service'
import {
	BadRequestException,
	Body,
	Controller,
	DefaultValuePipe,
	Get,
	Param,
	ParseIntPipe,
	Patch,
	Post,
	Query,
	UploadedFile,
	UseGuards,
	UseInterceptors,
} from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { FileInterceptor } from '@nestjs/platform-express'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { Throttle } from '@nestjs/throttler'
import { memoryStorage } from 'multer'
import { extname } from 'path'
import { ChatGateway } from './chat.gateway'
import { ChatService } from './chat.service'
import { CreateConversationDto, SendMessageDto } from './dto/chat.dto'

@ApiTags('Chat')
@Controller('chat')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class ChatController {
	constructor(
		private readonly chatService: ChatService,
		private readonly chatGateway: ChatGateway,
		private readonly s3Service: S3Service,
	) {}

	/** GET /chat/conversations — list all conversations for the current user */
	@Get('conversations')
	@Throttle({ default: { limit: 60, ttl: 60_000 } })
	@ApiOperation({ summary: 'Список переписок текущего пользователя' })
	async getConversations(@CurrentUser('id') userId: string) {
		return this.chatService.getConversations(userId)
	}

	/** POST /chat/conversations — find or create conversation with a partner */
	@Post('conversations')
	@Throttle({ default: { limit: 30, ttl: 60_000 } })
	@ApiOperation({ summary: 'Найти или создать переписку с пользователем' })
	async findOrCreate(
		@CurrentUser('id') userId: string,
		@Body() body: CreateConversationDto,
	) {
		return this.chatService.findOrCreateConversation(userId, body.partnerId)
	}

	/** GET /chat/unread/counts — unread per conversationId */
	@Get('unread/counts')
	@Throttle({ default: { limit: 60, ttl: 60_000 } })
	@ApiOperation({ summary: 'Количество непрочитанных сообщений по перепискам' })
	async getUnreadCounts(@CurrentUser('id') userId: string) {
		return this.chatService.getUnreadCounts(userId)
	}

	/** GET /chat/conversations/:id — paginated message history */
	@Get('conversations/:conversationId')
	@Throttle({ default: { limit: 120, ttl: 60_000 } })
	@ApiOperation({ summary: 'История сообщений переписки' })
	async getMessages(
		@Param('conversationId') conversationId: string,
		@CurrentUser('id') userId: string,
		@Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
		@Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
	) {
		await this.chatService.assertParticipant(conversationId, userId)
		return this.chatService.getMessages(conversationId, page, limit)
	}

	/** POST /chat/conversations/:id — send message via REST fallback */
	@Post('conversations/:conversationId')
	@Throttle({ default: { limit: 60, ttl: 60_000 } })
	@ApiOperation({ summary: 'Отправить сообщение (fallback)' })
	async sendMessage(
		@Param('conversationId') conversationId: string,
		@CurrentUser('id') userId: string,
		@Body() body: SendMessageDto,
	) {
		const conv = await this.chatService.assertParticipant(
			conversationId,
			userId,
		)
		const hasText = Boolean(body.content?.trim())
		const hasAttachment = Boolean(body.attachmentUrl)
		if (!hasText && !hasAttachment) {
			throw new BadRequestException('Сообщение не может быть пустым')
		}
		const message = await this.chatService.saveMessage(
			conversationId,
			userId,
			body.content,
			hasAttachment
				? (() => {
						const normalized = this.s3Service.normalizeRef(
							body.attachmentUrl ?? '',
						)
						if (!normalized || !this.s3Service.isS3Ref(normalized)) {
							throw new BadRequestException('Недопустимый файл')
						}
						return {
							url: normalized,
							name: body.attachmentName,
							type: body.attachmentType,
							size: body.attachmentSize,
						}
					})()
				: undefined,
		)
		const payload = {
			...message,
			clientMessageId: body.clientMessageId ?? null,
		}
		this.chatGateway.emitNewMessage(
			conversationId,
			conv.userAId,
			conv.userBId,
			payload,
		)
		return payload
	}

	/** POST /chat/conversations/:id/files — upload attachment */
	@Post('conversations/:conversationId/files')
	@Throttle({ default: { limit: 30, ttl: 60_000 } })
	@ApiOperation({ summary: 'Загрузить файл для переписки' })
	@UseInterceptors(
		FileInterceptor('file', {
			storage: memoryStorage(),
			limits: { fileSize: 20 * 1024 * 1024 },
		}),
	)
	async uploadMessageFile(
		@Param('conversationId') conversationId: string,
		@CurrentUser('id') userId: string,
		@UploadedFile() file: Express.Multer.File,
	) {
		await this.chatService.assertParticipant(conversationId, userId)
		if (!file) {
			throw new BadRequestException('Файл не загружен')
		}
		const originalName = Buffer.from(file.originalname, 'latin1').toString(
			'utf8',
		)
		const ext = extname(file.originalname).toLowerCase()
		const stamp = Date.now().toString(36)
		const rand = Math.random().toString(36).slice(2, 8)
		const key = `messages/msg-${stamp}-${rand}${ext}`
		const s3Ref = await this.s3Service.uploadBuffer(
			key,
			file.buffer,
			file.mimetype,
		)
		const signedUrl = await this.s3Service.signUrl(s3Ref)
		return {
			url: signedUrl,
			key: s3Ref,
			name: originalName,
			type: file.mimetype,
			size: file.size,
		}
	}

	/** PATCH /chat/conversations/:id/read */
	@Patch('conversations/:conversationId/read')
	@Throttle({ default: { limit: 120, ttl: 60_000 } })
	@ApiOperation({ summary: 'Отметить сообщения как прочитанные' })
	async markRead(
		@Param('conversationId') conversationId: string,
		@CurrentUser('id') userId: string,
	) {
		await this.chatService.assertParticipant(conversationId, userId)
		await this.chatService.markAsRead(conversationId, userId)
	}
}
