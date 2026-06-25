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
import { PagesService } from './pages.service';
import { CreatePageDto } from './dto/create-page.dto';
import { UpdatePageDto } from './dto/update-page.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@ApiTags('Pages')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('pages')
export class PagesController {
  constructor(private readonly pagesService: PagesService) {}

  @Get('project/:projectId')
  @ApiOperation({ summary: 'Get all pages for a project (owner only)' })
  @ApiResponse({ status: 200, description: 'List of pages' })
  async findByProject(
    @Param('projectId', ParseIntPipe) projectId: number,
    @CurrentUser() user: User,
  ) {
    return this.pagesService.findByProject(projectId, user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get page by ID (owner only)' })
  @ApiResponse({ status: 200, description: 'Page details' })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: User,
  ) {
    return this.pagesService.findOne(id, user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new page (owner only)' })
  @ApiResponse({ status: 201, description: 'Page successfully created' })
  async create(
    @Body() createPageDto: CreatePageDto,
    @CurrentUser() user: User,
  ) {
    return this.pagesService.create(createPageDto, user.id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a page (owner only)' })
  @ApiResponse({ status: 200, description: 'Page successfully updated' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updatePageDto: UpdatePageDto,
    @CurrentUser() user: User,
  ) {
    return this.pagesService.update(id, updatePageDto, user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a page (owner only)' })
  @ApiResponse({ status: 200, description: 'Page successfully deleted' })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: User,
  ) {
    await this.pagesService.remove(id, user.id);
    return { message: 'Page successfully deleted' };
  }
}
