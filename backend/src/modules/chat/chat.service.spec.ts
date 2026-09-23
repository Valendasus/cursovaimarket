/// <reference types="jest" />
import { BadRequestException } from '@nestjs/common'
import { ChatService } from './chat.service'

describe('ChatService message safety', () => {
	const savedMessage = {
		id: 'message-1',
		conversationId: 'conversation-1',
		senderId: 'user-1',
		clientMessageId: 'client-1',
		content: 'Привет',
		attachmentUrl: null,
		attachmentName: null,
		attachmentType: null,
		attachmentSize: null,
		isRead: false,
		createdAt: new Date(),
		sender: { id: 'user-1', name: 'User', avatar: null },
	}

	function setup(isOwnedAttachment = true) {
		const tx = {
			directMessage: {
				upsert: jest.fn().mockResolvedValue(savedMessage),
				create: jest.fn().mockResolvedValue(savedMessage),
			},
			conversation: {
				update: jest.fn().mockResolvedValue({}),
			},
		}
		const prisma = {
			$transaction: jest.fn(
				(callback: (client: typeof tx) => unknown) => callback(tx),
			),
		}
		const s3 = {
			normalizeRef: jest.fn((value: string) => value),
			isS3Ref: jest.fn(() => true),
			isRefWithinPrefix: jest.fn(() => isOwnedAttachment),
			signUrl: jest.fn(async (value?: string | null) => value),
		}
		const service = new ChatService(prisma as never, s3 as never)
		return { service, prisma, s3, tx }
	}

	it('uses the client id as an atomic idempotency key', async () => {
		const { service, tx } = setup()

		await service.saveMessage(
			'conversation-1',
			'user-1',
			'Привет',
			undefined,
			' client-1 ',
		)

		expect(tx.directMessage.upsert).toHaveBeenCalledWith(
			expect.objectContaining({
				where: {
					conversationId_senderId_clientMessageId: {
						conversationId: 'conversation-1',
						senderId: 'user-1',
						clientMessageId: 'client-1',
					},
				},
			}),
		)
		expect(tx.directMessage.create).not.toHaveBeenCalled()
	})

	it('rejects an attachment outside the conversation/user upload prefix', async () => {
		const { service, prisma, s3 } = setup(false)

		await expect(
			service.saveMessage('conversation-1', 'user-1', undefined, {
				url: 's3://bucket/messages/another-conversation/user-2/file.pdf',
			}),
		).rejects.toBeInstanceOf(BadRequestException)

		expect(s3.isRefWithinPrefix).toHaveBeenCalledWith(
			's3://bucket/messages/another-conversation/user-2/file.pdf',
			'messages/conversation-1/user-1',
		)
		expect(prisma.$transaction).not.toHaveBeenCalled()
	})
})
