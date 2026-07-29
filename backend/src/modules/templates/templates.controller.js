import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  UseGuards,
  ParseIntPipe,
  Req,
  Inject,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { TemplatesService } from './templates.service';
import { CreateTemplateDto } from './dto/create-template.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtService } from '@nestjs/jwt';

@ApiTags('Templates')
@Controller('templates')
export class TemplatesController {
  constructor(
    @Inject(TemplatesService) templatesService,
    @Inject(JwtService) jwtService,
  ) {
    this.templatesService = templatesService;
    this.jwtService = jwtService;
  }

  @Get('prebuilt')
  @ApiOperation({ summary: 'Get all prebuilt system templates' })
  @ApiResponse({ status: 200, description: 'List of prebuilt templates' })
  async getPrebuilt() {
    return this.templatesService.findAllPrebuilt();
  }

  @Get('user')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all custom templates of the logged-in user' })
  @ApiResponse({ status: 200, description: 'List of user custom templates' })
  async getUserTemplates(@CurrentUser() user) {
    return this.templatesService.findUserTemplates(user.id);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get details of a specific template (supports optional auth)',
  })
  @ApiResponse({ status: 200, description: 'Template details' })
  async findOne(@Param('id', ParseIntPipe) id, @Req() req) {
    let userId;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        const payload = this.jwtService.decode(token);
        if (payload && typeof payload.sub === 'number') {
          userId = payload.sub;
        }
      } catch {
        // Ignore token parse error
      }
    }
    return this.templatesService.findOne(id, userId);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Save a custom template' })
  @ApiResponse({ status: 201, description: 'Template successfully saved' })
  async create(
    @Body() createTemplateDto,
    @CurrentUser() user,
  ) {
    return this.templatesService.create(createTemplateDto, user.id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a user template' })
  @ApiResponse({ status: 200, description: 'Template deleted successfully' })
  async remove(
    @Param('id', ParseIntPipe) id,
    @CurrentUser() user,
  ) {
    await this.templatesService.remove(id, user.id);
    return { message: 'Template deleted successfully' };
  }
}
