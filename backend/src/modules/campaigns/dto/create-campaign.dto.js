import {
  IsBoolean,
  IsIn,
  IsInt,
  IsObject,
  IsArray,
  IsOptional,
  IsString,
  MinLength,
  Matches,
  ValidateNested,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';

export class CreateCampaignDto {
  @ApiProperty({ example: 'India Airtel Wellness' })
  @IsString()
  @MinLength(1)
  name;

  @ApiPropertyOptional({ example: 'India' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  country;

  @ApiPropertyOptional({ example: 'Airtel' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  operator;

  @ApiPropertyOptional({ example: 'IN' })
  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-z0-9]+$/)
  countryCode;

  @ApiPropertyOptional({ example: 'AIRTEL' })
  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-z0-9]+$/)
  operatorCode;

  @ApiPropertyOptional({ description: 'Link to an existing market operator' })
  @IsOptional()
  @IsInt()
  operatorId;

  @ApiPropertyOptional({ example: 'zain_svc_01' })
  @IsOptional()
  @IsString()
  serviceId;

  @ApiPropertyOptional({
    description: 'Clone page templates from another campaign',
  })
  @IsOptional()
  @IsInt()
  copyFromCampaignId;
}

export class CampaignTrackingItemDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  vendorId;

  @ApiPropertyOptional({ example: 2, nullable: true })
  @IsOptional()
  @Transform(({ value }) => (value === null || value === '' || value === undefined ? null : Number(value)))
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @IsInt()
  affiliateId;

  @ApiPropertyOptional({
    example: true,
    description: 'When false, public tracking URL shows not available',
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null) return undefined;
    if (value === true || value === 'true' || value === 1 || value === '1') return true;
    if (value === false || value === 'false' || value === 0 || value === '0') return false;
    return Boolean(value);
  })
  @IsBoolean()
  active;
}

export class UpdateCampaignDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  name;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  serviceId;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  active;

  @ApiPropertyOptional({ description: 'Legacy: Assign vendors to this campaign' })
  @IsOptional()
  @IsInt({ each: true })
  vendorIds;

  @ApiPropertyOptional({ description: 'Assign specific vendors and affiliates' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CampaignTrackingItemDto)
  trackings;
}

export class UpdateFlowDto {
  @ApiPropertyOptional({
    description:
      'Verification mode: HEADER_INJECTION | OTP_ONLY | BOTH | NONE (legacy MSISDN_ONLY → HEADER_INJECTION)',
    enum: ['HEADER_INJECTION', 'OTP_ONLY', 'BOTH', 'NONE', 'MSISDN_ONLY'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['HEADER_INJECTION', 'OTP_ONLY', 'BOTH', 'NONE', 'MSISDN_ONLY'])
  verificationMode;

  @ApiPropertyOptional({
    description: 'Flow graph: { version, nodes[], edges[] }',
  })
  @IsOptional()
  @IsObject()
  flowConfig;
}
