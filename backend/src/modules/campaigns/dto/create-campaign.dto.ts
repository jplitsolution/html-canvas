import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCampaignDto {
  @ApiProperty({ example: 'India Zain' })
  @IsString()
  @MinLength(1)
  name: string;

  @ApiProperty({ example: 'India' })
  @IsString()
  @MinLength(1)
  country: string;

  @ApiProperty({ example: 'Zain' })
  @IsString()
  @MinLength(1)
  operator: string;

  @ApiPropertyOptional({ example: 'zain_svc_01' })
  @IsOptional()
  @IsString()
  serviceId?: string;

  @ApiPropertyOptional({
    description: 'Clone page templates from another campaign',
  })
  @IsOptional()
  @IsInt()
  copyFromCampaignId?: number;
}

export class UpdateCampaignDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  serviceId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
