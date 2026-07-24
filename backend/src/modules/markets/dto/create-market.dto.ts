import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsOptional,
  IsString,
  MinLength,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateMarketDto {
  @ApiProperty({ example: 'India' })
  @IsString()
  @MinLength(1)
  countryName: string;

  @ApiProperty({ example: 'IN' })
  @IsString()
  @MinLength(2)
  @Matches(/^[A-Za-z0-9]+$/, {
    message: 'countryCode must be alphanumeric',
  })
  countryCode: string;

  @ApiProperty({ example: 'Airtel' })
  @IsString()
  @MinLength(1)
  operatorName: string;

  @ApiProperty({ example: 'AIRTEL' })
  @IsString()
  @MinLength(1)
  @Matches(/^[A-Za-z0-9]+$/, {
    message: 'operatorCode must be alphanumeric',
  })
  operatorCode: string;
}

export class CreateMarketCampaignDto {
  @ApiProperty({ example: 'Wellness WAP' })
  @IsString()
  @MinLength(1)
  name: string;

  @ApiPropertyOptional({
    description: 'Clone page templates from another campaign',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  copyFromCampaignId?: number;
}
