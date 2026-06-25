import {
  Controller,
  Get,
  Post,
  Put,
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
import { ApiConfigService } from './api-config.service';
import { CreateApiConfigDto } from './dto/create-api-config.dto';
import { UpdateApiConfigDto } from './dto/update-api-config.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@ApiTags('API Config')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api-config')
export class ApiConfigController {
  constructor(private readonly apiConfigService: ApiConfigService) {}

  @Get('project/:projectId')
  @ApiOperation({ summary: 'Get API configuration for a project' })
  @ApiResponse({ status: 200, description: 'API configuration details' })
  async findByProject(
    @Param('projectId', ParseIntPipe) projectId: number,
    @CurrentUser() user: User,
  ) {
    return this.apiConfigService.findByProject(projectId, user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get API configuration by ID' })
  @ApiResponse({ status: 200, description: 'API configuration details' })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: User,
  ) {
    return this.apiConfigService.findOne(id, user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Create or update API configuration for a project' })
  @ApiResponse({ status: 201, description: 'API configuration successfully saved' })
  async create(
    @Body() createDto: CreateApiConfigDto,
    @CurrentUser() user: User,
  ) {
    return this.apiConfigService.create(createDto, user.id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update API configuration' })
  @ApiResponse({ status: 200, description: 'API configuration successfully updated' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateApiConfigDto,
    @CurrentUser() user: User,
  ) {
    return this.apiConfigService.update(id, updateDto, user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete API configuration' })
  @ApiResponse({ status: 200, description: 'API configuration successfully deleted' })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: User,
  ) {
    await this.apiConfigService.remove(id, user.id);
    return { message: 'API configuration successfully deleted' };
  }
}
