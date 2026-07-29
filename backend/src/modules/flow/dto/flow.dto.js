import { IsEnum, IsInt, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { CampaignPageType } from '../../campaigns/entities/campaign-page.entity';

export class GetFlowPageQueryDto {
  @ApiProperty()
  @IsString()
  country;

  @ApiProperty()
  @IsString()
  operator;

  @ApiPropertyOptional({ enum: CampaignPageType })
  @IsOptional()
  @IsEnum(CampaignPageType)
  page;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  msisdn;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  visitId;

  @ApiPropertyOptional({
    description: 'Subscription pack: daily | weekly | monthly',
  })
  @IsOptional()
  @IsString()
  pack;

  @ApiPropertyOptional({ description: 'Campaign id (campid tracking param)' })
  @IsOptional()
  @IsString()
  campid;

  @ApiPropertyOptional({ description: 'Vendor tracking code (vid)' })
  @IsOptional()
  @IsString()
  vid;

  @ApiPropertyOptional({ description: 'Affiliate tracking code (aff_id)' })
  @IsOptional()
  @IsString()
  aff_id;

  @ApiPropertyOptional({ description: 'Click id supplied by affiliate/network' })
  @IsOptional()
  @IsString()
  click_id;
}

export class FlowTransitionDto {
  @ApiProperty()
  @IsInt()
  visitId;

  @ApiProperty()
  @IsString()
  country;

  @ApiProperty()
  @IsString()
  operator;

  @ApiProperty({ enum: CampaignPageType })
  @IsEnum(CampaignPageType)
  fromPage;

  @ApiProperty({ description: 'SUBSCRIBE | CONFIRM' })
  @IsString()
  action;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  planId;

  @ApiPropertyOptional({ description: 'Campaign tracking id (campid)' })
  @IsOptional()
  @IsString()
  campid;
}
