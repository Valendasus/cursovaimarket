import { CurrentUser } from '@/common/decorators/current-user.decorator'
import {
	Body,
	Controller,
	Delete,
	Get,
	Param,
	Patch,
	Post,
	Query,
	UseGuards,
} from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import {
	CreateServiceDto,
	ServiceFiltersDto,
	UpdateServiceDto,
} from './dto/service.dto'
import { ServicesService } from './services.service'

@ApiTags('Services')
@Controller('services')
export class ServicesController {
	constructor(private readonly servicesService: ServicesService) {}

	@Get()
	@ApiOperation({ summary: 'Список услуг с фильтрами и пагинацией' })
	findAll(@Query() filters: ServiceFiltersDto) {
		return this.servicesService.findAll(filters)
	}

	@Get(':id')
	@ApiOperation({ summary: 'Детали услуги' })
	findOne(@Param('id') id: string) {
		return this.servicesService.findOne(id)
	}

	@Post()
	@UseGuards(AuthGuard('jwt'))
	@ApiBearerAuth()
	@ApiOperation({ summary: 'Создать услугу (только фрилансер)' })
	create(@CurrentUser('id') userId: string, @Body() dto: CreateServiceDto) {
		return this.servicesService.create(userId, dto)
	}

	@Patch(':id')
	@UseGuards(AuthGuard('jwt'))
	@ApiBearerAuth()
	@ApiOperation({ summary: 'Обновить услугу' })
	update(
		@Param('id') id: string,
		@CurrentUser('id') userId: string,
		@Body() dto: UpdateServiceDto,
	) {
		return this.servicesService.update(id, userId, dto)
	}

	@Delete(':id')
	@UseGuards(AuthGuard('jwt'))
	@ApiBearerAuth()
	@ApiOperation({ summary: 'Удалить услугу' })
	remove(@Param('id') id: string, @CurrentUser('id') userId: string) {
		return this.servicesService.remove(id, userId)
	}
}
