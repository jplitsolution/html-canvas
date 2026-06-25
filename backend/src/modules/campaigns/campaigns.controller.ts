import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
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
import { CampaignsService } from './campaigns.service';
import { CreateCampaignDto, UpdateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignPageDto } from './dto/update-campaign-page.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { CampaignPageType } from './entities/campaign-page.entity';

@ApiTags('Campaigns')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('campaigns')
export class CampaignsController {
  constructor(private readonly campaignsService: CampaignsService) {}

  @Get()
  @ApiOperation({ summary: 'List all campaigns for the logged-in user' })
  async findAll(@CurrentUser() user: User) {
    return this.campaignsService.findAll(user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new campaign with funnel page slots' })
  async create(@Body() dto: CreateCampaignDto, @CurrentUser() user: User) {
    return this.campaignsService.create(dto, user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get campaign details with pages' })
  async findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: User) {
    return this.campaignsService.findOne(id, user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update campaign metadata or activation status' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCampaignDto,
    @CurrentUser() user: User,
  ) {
    return this.campaignsService.update(id, dto, user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a campaign' })
  async remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: User) {
    await this.campaignsService.remove(id, user.id);
    return { message: 'Campaign deleted successfully' };
  }

  @Post(':id/apply-defaults')
  @ApiOperation({ summary: 'Apply default funnel templates to campaign pages' })
  async applyDefaults(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: User) {
    return this.campaignsService.applyDefaultTemplates(id, user.id, true);
  }

  @Get(':id/pages/:pageType')
  @ApiOperation({ summary: 'Get a campaign page with full template content' })
  async getPage(
    @Param('id', ParseIntPipe) id: number,
    @Param('pageType') pageType: CampaignPageType,
    @CurrentUser() user: User,
  ) {
    return this.campaignsService.getPage(id, pageType, user.id);
  }

  @Patch(':id/pages/:pageType')
  @ApiOperation({ summary: 'Save canvas content for a campaign page' })
  async updatePage(
    @Param('id', ParseIntPipe) id: number,
    @Param('pageType') pageType: CampaignPageType,
    @Body() dto: UpdateCampaignPageDto,
    @CurrentUser() user: User,
  ) {
    return this.campaignsService.updatePageContent(id, pageType, dto, user.id);
  }

  @Get(':id/api-config')
  @ApiOperation({ summary: 'Get partner API configuration for a campaign' })
  async getApiConfig(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: User) {
    const config = await this.campaignsService.getApiConfig(id, user.id);
    return config || {};
  }

  @Patch(':id/api-config')
  @ApiOperation({ summary: 'Save partner API configuration for a campaign' })
  async upsertApiConfig(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: Record<string, unknown>,
    @CurrentUser() user: User,
  ) {
    return this.campaignsService.upsertApiConfig(id, body as any, user.id);
  }
}
