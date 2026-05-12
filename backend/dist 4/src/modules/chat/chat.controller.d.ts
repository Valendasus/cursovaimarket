import { ChatService } from './chat.service';
import { CreateConversationDto, SendMessageDto } from './dto/chat.dto';
export declare class ChatController {
    private readonly chatService;
    constructor(chatService: ChatService);
    getConversations(userId: string): Promise<{
        id: string;
        partner: {
            id: string;
            name: string;
            avatar: string | null;
        };
        lastMessage: {
            createdAt: Date;
            senderId: string;
            content: string;
        };
        updatedAt: Date;
    }[]>;
    findOrCreate(userId: string, body: CreateConversationDto): Promise<{
        userA: {
            id: string;
            name: string;
            avatar: string | null;
        };
        userB: {
            id: string;
            name: string;
            avatar: string | null;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userAId: string;
        userBId: string;
    }>;
    getUnreadCounts(userId: string): Promise<Record<string, number>>;
    getMessages(conversationId: string, userId: string, page: number, limit: number): Promise<{
        data: ({
            sender: {
                id: string;
                name: string;
                avatar: string | null;
            };
        } & {
            id: string;
            createdAt: Date;
            conversationId: string;
            senderId: string;
            content: string;
            isRead: boolean;
        })[];
        total: number;
        page: number;
        limit: number;
    }>;
    sendMessage(conversationId: string, userId: string, body: SendMessageDto): Promise<{
        sender: {
            id: string;
            name: string;
            avatar: string | null;
        };
    } & {
        id: string;
        createdAt: Date;
        conversationId: string;
        senderId: string;
        content: string;
        isRead: boolean;
    }>;
    markRead(conversationId: string, userId: string): Promise<void>;
}
