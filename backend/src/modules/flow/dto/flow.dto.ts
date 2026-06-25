import { IsEnum, IsInt, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { CampaignPageType } from '../../campaigns/entities/campaign-page.entity';

export class GetFlowPageQueryDto {
  @ApiProperty()
  @IsString()
  country: string;

  @ApiProperty()
  @IsString()
  operator: string;

  @ApiProperty({ enum: CampaignPageType })
  @IsEnum(CampaignPageType)
  page: CampaignPageType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  msisdn?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  visitId?: number;

  @ApiPropertyOptional({ description: 'Subscription pack: daily | weekly | monthly' })
  @IsOptional()
  @IsString()
  pack?: string;
}

export class FlowTransitionDto {
  @ApiProperty()
  @IsInt()
  visitId: number;

  @ApiProperty()
  @IsString()
  country: string;

  @ApiProperty()
  @IsString()
  operator: string;

  @ApiProperty({ enum: CampaignPageType })
  @IsEnum(CampaignPageType)
  fromPage: CampaignPageType;

  @ApiProperty({ description: 'SUBSCRIBE | CONFIRM' })
  @IsString()
  action: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  planId?: string;
}
