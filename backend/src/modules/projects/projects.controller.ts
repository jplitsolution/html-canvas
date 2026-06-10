import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@ApiTags('Projects')
@Controller('projects')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new canvas project' })
  @ApiResponse({ status: 201, description: 'Project successfully created' })
  async create(
    @Body() createProjectDto: CreateProjectDto,
    @CurrentUser() user: User,
  ) {
    return this.projectsService.create(createProjectDto, user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Retrieve all projects of the logged-in user' })
  @ApiResponse({ status: 200, description: 'List of user projects' })
  async findAll(@CurrentUser() user: User) {
    return this.projectsService.findAll(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Retrieve details of a specific project' })
  @ApiResponse({ status: 200, description: 'Project details' })
  @ApiResponse({ status: 403, description: 'Forbidden access' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: User,
  ) {
    return this.projectsService.findOne(id, user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an existing canvas project' })
  @ApiResponse({ status: 200, description: 'Project updated successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden access' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateProjectDto: UpdateProjectDto,
    @CurrentUser() user: User,
  ) {
    return this.projectsService.update(id, updateProjectDto, user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a canvas project' })
  @ApiResponse({ status: 200, description: 'Project deleted successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden access' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: User,
  ) {
    await this.projectsService.remove(id, user.id);
    return { message: 'Project deleted successfully' };
  }
}
