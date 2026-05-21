import { CurrentUser } from '@/common/decorators/current-user.decorator'
import {
	buildMessagePath,
	buildPublicUrl,
	resolveMessageDir,
} from '@/common/uploads'
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
	Req,
	UploadedFile,
	UseGuards,
	UseInterceptors,
} from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { FileInterceptor } from '@nestjs/platform-express'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { Throttle } from '@nestjs/throttler'
import type { Request } from 'express'
import { diskStorage } from 'multer'
import { extname } from 'path'
import { ChatService } from './chat.service'
import { CreateConversationDto, SendMessageDto } from './dto/chat.dto'

@ApiTags('Chat')
@Controller('chat')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class ChatController {
	constructor(private readonly chatService: ChatService) {}

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
		await this.chatService.assertParticipant(conversationId, userId)
		const hasText = Boolean(body.content?.trim())
		const hasAttachment = Boolean(body.attachmentUrl)
		if (!hasText && !hasAttachment) {
			throw new BadRequestException('Сообщение не может быть пустым')
		}
		return this.chatService.saveMessage(
			conversationId,
			userId,
			body.content,
			hasAttachment
				? {
						url: body.attachmentUrl ?? '',
						name: body.attachmentName,
						type: body.attachmentType,
						size: body.attachmentSize,
					}
				: undefined,
		)
	}

	/** POST /chat/conversations/:id/files — upload attachment */
	@Post('conversations/:conversationId/files')
	@Throttle({ default: { limit: 30, ttl: 60_000 } })
	@ApiOperation({ summary: 'Загрузить файл для переписки' })
	@UseInterceptors(
		FileInterceptor('file', {
			storage: diskStorage({
				destination: (req, file, cb) => {
					cb(null, resolveMessageDir())
				},
				filename: (
					req: Request,
					file: Express.Multer.File,
					cb: (error: Error | null, filename: string) => void,
				) => {
					const ext = extname(file.originalname).toLowerCase()
					const stamp = Date.now().toString(36)
					const rand = Math.random().toString(36).slice(2, 8)
					cb(null, `msg-${stamp}-${rand}${ext}`)
				},
			}),
			limits: { fileSize: 20 * 1024 * 1024 },
		}),
	)
	async uploadMessageFile(
		@Param('conversationId') conversationId: string,
		@CurrentUser('id') userId: string,
		@UploadedFile() file: Express.Multer.File,
		@Req() req: Request,
	) {
		await this.chatService.assertParticipant(conversationId, userId)
		if (!file) {
			throw new BadRequestException('Файл не загружен')
		}
		const originalName = Buffer.from(file.originalname, 'latin1').toString(
			'utf8',
		)
		const path = buildMessagePath(file.filename)
		return {
			url: buildPublicUrl(path, req),
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
