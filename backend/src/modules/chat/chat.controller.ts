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
import { ChatService } from './chat.service'
import { SendMessageDto } from './dto/chat.dto'

@ApiTags('Chat')
@Controller('chat')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class ChatController {
	constructor(private readonly chatService: ChatService) {}

	/**
	 * IMPORTANT: static routes must be declared before param routes.
	 * GET /chat/unread/counts MUST come before GET /chat/:orderId
	 * otherwise NestJS matches 'unread' as the orderId param.
	 */

	/** Get unread counts across all user orders */
	@Get('unread/counts')
	@ApiOperation({ summary: 'Количество непрочитанных сообщений по заказам' })
	async getUnreadCounts(@CurrentUser('id') userId: string) {
		return this.chatService.getUnreadCounts(userId)
	}

	/** Get message history for an order (HTTP fallback) */
	@Get(':orderId')
	@ApiOperation({ summary: 'История сообщений заказа' })
	async getMessages(
		@Param('orderId') orderId: string,
		@CurrentUser('id') userId: string,
		@Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
		@Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
	) {
		await this.chatService.assertParticipant(orderId, userId)
		return this.chatService.getMessages(orderId, page, limit)
	}

	/** Send a message via REST (fallback when WS unavailable) */
	@Post(':orderId')
	@ApiOperation({ summary: 'Отправить сообщение' })
	async sendMessage(
		@Param('orderId') orderId: string,
		@CurrentUser('id') userId: string,
		@Body() dto: SendMessageDto,
	) {
		await this.chatService.assertParticipant(orderId, userId)
		return this.chatService.saveMessage(orderId, userId, dto.content)
	}

	/** Mark messages as read */
	@Patch(':orderId/read')
	@ApiOperation({ summary: 'Отметить сообщения как прочитанные' })
	async markAsRead(
		@Param('orderId') orderId: string,
		@CurrentUser('id') userId: string,
	) {
		await this.chatService.assertParticipant(orderId, userId)
		await this.chatService.markAsRead(orderId, userId)
		return { ok: true }
	}
}
