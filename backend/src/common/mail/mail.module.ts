import { Global, Module } from '@nestjs/common'
import { MailService } from './mail.service'
import { SmtpTransport } from './transports/smtp.transport'
import { UnisenderTransport } from './transports/unisender.transport'

@Global()
@Module({
	providers: [MailService, UnisenderTransport, SmtpTransport],
	exports: [MailService],
})
export class MailModule {}
