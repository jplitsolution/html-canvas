import {
  IsBoolean,
  IsIn,
  IsInt,
  IsObject,
  IsArray,
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

  @ApiPropertyOptional({ description: 'Legacy: Assign vendors to this campaign' })
  @IsOptional()
  @IsInt({ each: true })
  vendorIds?: number[];

  @ApiPropertyOptional({ description: 'Assign specific vendors and affiliates' })
  @IsOptional()
  @IsArray()
  trackings?: { vendorId: number; affiliateId?: number | null }[];
}

export class UpdateFlowDto {
  @ApiPropertyOptional({
    description: 'Verification mode',
    enum: ['MSISDN_ONLY', 'OTP_ONLY', 'BOTH'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['MSISDN_ONLY', 'OTP_ONLY', 'BOTH'])
  verificationMode?: 'MSISDN_ONLY' | 'OTP_ONLY' | 'BOTH';

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
