import { CurrentUser } from '@/common/decorators/current-user.decorator'
import {
	Body,
	Controller,
	DefaultValuePipe,
	Get,
	Param,
	ParseIntPipe,
	Patch,
	Post,
	Query,
	UseGuards,
} from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { Throttle } from '@nestjs/throttler'
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
		return this.chatService.saveMessage(
			conversationId,
			userId,
			body.content.trim(),
		)
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
