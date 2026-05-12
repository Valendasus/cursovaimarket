import { PrismaService } from '@/prisma/prisma.service';
export declare class ChatService {
    private prisma;
    constructor(prisma: PrismaService);
    findOrCreateConversation(userIdA: string, userIdB: string): Promise<{
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
    assertParticipant(conversationId: string, userId: string): Promise<{
        userAId: string;
        userBId: string;
    }>;
    saveMessage(conversationId: string, senderId: string, content: string): Promise<{
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
    getMessages(conversationId: string, page?: number, limit?: number): Promise<{
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
    markAsRead(conversationId: string, userId: string): Promise<void>;
    getUnreadCounts(userId: string): Promise<Record<string, number>>;
}
