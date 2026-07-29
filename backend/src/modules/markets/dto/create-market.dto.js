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
  countryName;

  @ApiProperty({ example: 'IN' })
  @IsString()
  @MinLength(2)
  @Matches(/^[A-Za-z0-9]+$/, {
    message: 'countryCode must be alphanumeric',
  })
  countryCode;

  @ApiProperty({ example: 'Airtel' })
  @IsString()
  @MinLength(1)
  operatorName;

  @ApiProperty({ example: 'AIRTEL' })
  @IsString()
  @MinLength(1)
  @Matches(/^[A-Za-z0-9]+$/, {
    message: 'operatorCode must be alphanumeric',
  })
  operatorCode;
}

export class CreateMarketCampaignDto {
  @ApiProperty({ example: 'Wellness WAP' })
  @IsString()
  @MinLength(1)
  name;

  @ApiPropertyOptional({
    description: 'Clone page templates from another campaign',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  copyFromCampaignId;
}
