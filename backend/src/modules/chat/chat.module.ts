import { Module } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtModule } from '@nestjs/jwt'
import { ChatController } from './chat.controller'
import { ChatGateway } from './chat.gateway'
import { ChatService } from './chat.service'

@Module({
	imports: [
		JwtModule.registerAsync({
			inject: [ConfigService],
			useFactory: (config: ConfigService) => ({
				secret: config.get('JWT_SECRET'),
				signOptions: { expiresIn: config.get('JWT_EXPIRES_IN', '7d') },
			}),
		}),
	],
	controllers: [ChatController],
	providers: [ChatService, ChatGateway],
})
export class ChatModule {}
