import { CurrentUser } from '@/common/decorators/current-user.decorator'
import {
	Body,
	Controller,
	DefaultValuePipe,
	Get,
	Param,
	ParseIntPipe,
	Post,
	Query,
	UseGuards,
} from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { CreateReviewDto } from './dto/review.dto'
import { ReviewsService } from './reviews.service'

@ApiTags('Reviews')
@Controller('reviews')
export class ReviewsController {
	constructor(private readonly reviewsService: ReviewsService) {}

	@Post()
	@UseGuards(AuthGuard('jwt'))
	@ApiBearerAuth()
	@ApiOperation({ summary: 'Оставить отзыв' })
	create(@CurrentUser('id') userId: string, @Body() dto: CreateReviewDto) {
		return this.reviewsService.create(userId, dto)
	}

	@Get('my')
	@UseGuards(AuthGuard('jwt'))
	@ApiBearerAuth()
	@ApiOperation({ summary: 'Мои отзывы (написанные мной)' })
	myReviews(
		@CurrentUser('id') userId: string,
		@Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
		@Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
	) {
		return this.reviewsService.findByAuthor(userId, page, limit)
	}

	@Get('received')
	@UseGuards(AuthGuard('jwt'))
	@ApiBearerAuth()
	@ApiOperation({ summary: 'Отзывы обо мне (как фрилансере)' })
	receivedReviews(
		@CurrentUser('id') userId: string,
		@Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
		@Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
	) {
		return this.reviewsService.findForFreelancer(userId, page, limit)
	}

	@Get('service/:serviceId')
	@ApiOperation({ summary: 'Отзывы для услуги' })
	forService(
		@Param('serviceId') serviceId: string,
		@Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
		@Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
	) {
		return this.reviewsService.findForService(serviceId, page, limit)
	}
}
