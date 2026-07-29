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
  Inject,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PartnersService } from './partners.service';
import {
  CreateAffiliateDto,
  CreateVendorDto,
  UpdateAffiliateDto,
  UpdateVendorDto,
} from './dto/partner.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Partners')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('partners')
export class PartnersController {
  constructor(@Inject(PartnersService) partnersService) {
    this.partnersService = partnersService;
  }

  @Get('vendors')
  @ApiOperation({ summary: 'List vendors (with affiliates) for current user' })
  listVendors(@CurrentUser() user) {
    return this.partnersService.listVendors(user.id);
  }

  @Post('vendors')
  @ApiOperation({ summary: 'Create a vendor' })
  createVendor(@Body() dto, @CurrentUser() user) {
    return this.partnersService.createVendor(dto, user.id);
  }

  @Get('vendors/:id')
  @ApiOperation({ summary: 'Get a vendor with its affiliates' })
  getVendor(
    @Param('id', ParseIntPipe) id,
    @CurrentUser() user,
  ) {
    return this.partnersService.getVendor(id, user.id);
  }

  @Patch('vendors/:id')
  @ApiOperation({ summary: 'Update a vendor' })
  updateVendor(
    @Param('id', ParseIntPipe) id,
    @Body() dto,
    @CurrentUser() user,
  ) {
    return this.partnersService.updateVendor(id, dto, user.id);
  }

  @Delete('vendors/:id')
  @ApiOperation({ summary: 'Delete a vendor (and its affiliates)' })
  async removeVendor(
    @Param('id', ParseIntPipe) id,
    @CurrentUser() user,
  ) {
    await this.partnersService.removeVendor(id, user.id);
    return { message: 'Vendor deleted' };
  }

  @Get('vendors/:id/affiliates')
  @ApiOperation({ summary: 'List affiliates for a vendor' })
  listAffiliates(
    @Param('id', ParseIntPipe) id,
    @CurrentUser() user,
  ) {
    return this.partnersService.listAffiliates(id, user.id);
  }

  @Post('affiliates')
  @ApiOperation({ summary: 'Create an affiliate under a vendor' })
  createAffiliate(
    @Body() dto,
    @CurrentUser() user,
  ) {
    return this.partnersService.createAffiliate(dto, user.id);
  }

  @Patch('affiliates/:id')
  @ApiOperation({ summary: 'Update an affiliate' })
  updateAffiliate(
    @Param('id', ParseIntPipe) id,
    @Body() dto,
    @CurrentUser() user,
  ) {
    return this.partnersService.updateAffiliate(id, dto, user.id);
  }

  @Delete('affiliates/:id')
  @ApiOperation({ summary: 'Delete an affiliate' })
  async removeAffiliate(
    @Param('id', ParseIntPipe) id,
    @CurrentUser() user,
  ) {
    await this.partnersService.removeAffiliate(id, user.id);
    return { message: 'Affiliate deleted' };
  }
}
