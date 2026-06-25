import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { SubscriptionsService } from './subscriptions.service';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Subscriptions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all subscriptions' })
  @ApiResponse({ status: 200, description: 'List of subscriptions' })
  async findAll() {
    return this.subscriptionsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get single subscription' })
  @ApiResponse({ status: 200, description: 'Subscription details' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.subscriptionsService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create or update a subscription' })
  @ApiResponse({ status: 201, description: 'Subscription successfully created/updated' })
  async create(@Body() createDto: CreateSubscriptionDto) {
    return this.subscriptionsService.create(createDto);
  }
}
