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
  name: string;

  @ApiPropertyOptional({ example: 'India' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  country?: string;

  @ApiPropertyOptional({ example: 'Airtel' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  operator?: string;

  @ApiPropertyOptional({ example: 'IN' })
  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-z0-9]+$/)
  countryCode?: string;

  @ApiPropertyOptional({ example: 'AIRTEL' })
  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-z0-9]+$/)
  operatorCode?: string;

  @ApiPropertyOptional({ description: 'Link to an existing market operator' })
  @IsOptional()
  @IsInt()
  operatorId?: number;

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

export class CampaignTrackingItemDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  vendorId: number;

  @ApiPropertyOptional({ example: 2, nullable: true })
  @IsOptional()
  @Transform(({ value }) => (value === null || value === '' || value === undefined ? null : Number(value)))
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @IsInt()
  affiliateId?: number | null;

  @ApiPropertyOptional({
    example: true,
    description: 'When false, public tracking URL shows not available',
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null) return undefined
    if (value === true || value === 'true' || value === 1 || value === '1') return true
    if (value === false || value === 'false' || value === 0 || value === '0') return false
    return Boolean(value)
  })
  @IsBoolean()
  active?: boolean;
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

  @ApiPropertyOptional({ description: 'Legacy: Assign vendors to this campaign' })
  @IsOptional()
  @IsInt({ each: true })
  vendorIds?: number[];

  @ApiPropertyOptional({ description: 'Assign specific vendors and affiliates' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CampaignTrackingItemDto)
  trackings?: CampaignTrackingItemDto[];
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
  verificationMode?:
    | 'HEADER_INJECTION'
    | 'OTP_ONLY'
    | 'BOTH'
    | 'NONE'
    | 'MSISDN_ONLY';

  @ApiPropertyOptional({
    description: 'Flow graph: { version, nodes[], edges[] }',
  })
  @IsOptional()
  @IsObject()
  flowConfig?: {
    version: number;
    nodes: Array<{
      id: string;
      pageType: string;
      position?: { x: number; y: number };
    }>;
    edges: Array<{
      id: string;
      source: string;
      target: string;
      condition?: string;
    }>;
  };
}
