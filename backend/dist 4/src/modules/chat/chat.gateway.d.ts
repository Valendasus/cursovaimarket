import { JwtService } from '@nestjs/jwt';
import { OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';
interface AuthenticatedSocket extends Socket {
    data: {
        userId: string;
        userName: string;
    };
}
export declare class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
    private chatService;
    private jwtService;
    server: Server;
    private readonly eventRateMap;
    constructor(chatService: ChatService, jwtService: JwtService);
    handleConnection(client: AuthenticatedSocket): Promise<void>;
    handleDisconnect(client: AuthenticatedSocket): void;
    private checkRateLimit;
    handleJoinRoom(client: AuthenticatedSocket, data: {
        conversationId: string;
    }): Promise<void>;
    handleSendMessage(client: AuthenticatedSocket, data: {
        conversationId: string;
        content: string;
    }): Promise<void>;
    handleMarkRead(client: AuthenticatedSocket, data: {
        conversationId: string;
    }): Promise<void>;
}
export {};
