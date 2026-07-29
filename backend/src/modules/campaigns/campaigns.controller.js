import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  ParseIntPipe,
  Inject,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CampaignsService } from './campaigns.service';
import {
  CreateCampaignDto,
  UpdateCampaignDto,
  UpdateFlowDto,
} from './dto/create-campaign.dto';
import { UpdateCampaignPageDto } from './dto/update-campaign-page.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Campaigns')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('campaigns')
export class CampaignsController {
  constructor(@Inject(CampaignsService) campaignsService) {
    this.campaignsService = campaignsService;
  }

  @Get()
  @ApiOperation({ summary: 'List all campaigns for the logged-in user' })
  async findAll(@CurrentUser() user) {
    return this.campaignsService.findAll(user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new campaign with funnel page slots' })
  async create(@Body() dto, @CurrentUser() user) {
    return this.campaignsService.create(dto, user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get campaign details with pages' })
  async findOne(
    @Param('id', ParseIntPipe) id,
    @CurrentUser() user,
  ) {
    const campaign = await this.campaignsService.findOne(id, user.id);
    const { flowConfig, verificationMode } = await this.campaignsService.getFlow(id, user.id);
    return {
      ...campaign,
      flowConfig: JSON.stringify(flowConfig),
      verificationMode,
    };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update campaign metadata or activation status' })
  async update(
    @Param('id', ParseIntPipe) id,
    @Body() dto,
    @CurrentUser() user,
  ) {
    return this.campaignsService.update(id, dto, user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a campaign' })
  async remove(
    @Param('id', ParseIntPipe) id,
    @CurrentUser() user,
  ) {
    await this.campaignsService.remove(id, user.id);
    return { message: 'Campaign deleted successfully' };
  }

  @Post(':id/apply-defaults')
  @ApiOperation({ summary: 'Apply default funnel templates to campaign pages' })
  async applyDefaults(
    @Param('id', ParseIntPipe) id,
    @CurrentUser() user,
  ) {
    return this.campaignsService.applyDefaultTemplates(id, user.id, false);
  }

  @Get(':id/pages/:pageType')
  @ApiOperation({ summary: 'Get a campaign page with full template content' })
  async getPage(
    @Param('id', ParseIntPipe) id,
    @Param('pageType') pageType,
    @CurrentUser() user,
  ) {
    return this.campaignsService.getPage(id, pageType, user.id);
  }

  @Patch(':id/pages/:pageType')
  @ApiOperation({ summary: 'Save canvas content for a campaign page' })
  async updatePage(
    @Param('id', ParseIntPipe) id,
    @Param('pageType') pageType,
    @Body() dto,
    @CurrentUser() user,
  ) {
    return this.campaignsService.updatePageContent(id, pageType, dto, user.id);
  }

  @Get(':id/flow')
  @ApiOperation({ summary: 'Get the page-flow graph + verification mode' })
  async getFlow(
    @Param('id', ParseIntPipe) id,
    @CurrentUser() user,
  ) {
    return this.campaignsService.getFlow(id, user.id);
  }

  @Put(':id/flow')
  @ApiOperation({ summary: 'Save the page-flow graph + verification mode' })
  async updateFlow(
    @Param('id', ParseIntPipe) id,
    @Body() dto,
    @CurrentUser() user,
  ) {
    return this.campaignsService.updateFlow(id, dto, user.id);
  }

  @Get(':id/api-config')
  @ApiOperation({ summary: 'Get partner API configuration for a campaign' })
  async getApiConfig(
    @Param('id', ParseIntPipe) id,
    @CurrentUser() user,
  ) {
    const config = await this.campaignsService.getApiConfig(id, user.id);
    return config || {};
  }

  @Patch(':id/api-config')
  @ApiOperation({ summary: 'Save partner API configuration for a campaign' })
  async upsertApiConfig(
    @Param('id', ParseIntPipe) id,
    @Body() body,
    @CurrentUser() user,
  ) {
    return this.campaignsService.upsertApiConfig(id, body, user.id);
  }
}
