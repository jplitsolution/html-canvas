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
import { BlocklistService } from './blocklist.service';
import { CreateBlocklistEntryDto } from './dto/create-blocklist-entry.dto';
import { UpdateBlocklistEntryDto } from './dto/update-blocklist-entry.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Blocklist')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('blocklist')
export class BlocklistController {
  constructor(private readonly blocklistService: BlocklistService) {}

  @Get()
  @ApiOperation({ summary: 'Get all blocklisted numbers' })
  @ApiResponse({ status: 200, description: 'List of blocklist entries' })
  async findAll() {
    return this.blocklistService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get single blocklist entry' })
  @ApiResponse({ status: 200, description: 'Blocklist entry details' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.blocklistService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Add phone number to blocklist' })
  @ApiResponse({ status: 201, description: 'Blocklist entry successfully created' })
  async create(@Body() createDto: CreateBlocklistEntryDto) {
    return this.blocklistService.create(createDto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update blocklist entry' })
  @ApiResponse({ status: 200, description: 'Blocklist entry successfully updated' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateBlocklistEntryDto,
  ) {
    return this.blocklistService.update(id, updateDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove phone number from blocklist' })
  @ApiResponse({ status: 200, description: 'Blocklist entry successfully deleted' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.blocklistService.remove(id);
    return { message: 'Blocklist entry successfully deleted' };
  }
}
