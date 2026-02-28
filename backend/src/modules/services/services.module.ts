import { RolesGuard } from '@/common/guards/roles.guard'
import { Module } from '@nestjs/common'
import { ServicesController } from './services.controller'
import { ServicesService } from './services.service'

@Module({
	controllers: [ServicesController],
	providers: [ServicesService, RolesGuard],
	exports: [ServicesService],
})
export class ServicesModule {}
