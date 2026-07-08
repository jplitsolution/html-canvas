import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const CODE_PATTERN = /^[A-Za-z0-9_-]+$/;

export class CreateVendorDto {
  @ApiProperty({ example: 'Acme Media' })
  @IsString()
  @MinLength(1)
  name: string;

  @ApiProperty({ example: 'acme', description: 'Tracking code used as vid' })
  @IsString()
  @MinLength(1)
  @Matches(CODE_PATTERN, {
    message: 'code may only contain letters, numbers, - and _',
  })
  code: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class UpdateVendorDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @Matches(CODE_PATTERN, {
    message: 'code may only contain letters, numbers, - and _',
  })
  code?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class CreateAffiliateDto {
  @ApiProperty({ example: 'Affiliate One' })
  @IsString()
  @MinLength(1)
  name: string;

  @ApiProperty({ example: 'aff01', description: 'Tracking code used as aff_id' })
  @IsString()
  @MinLength(1)
  @Matches(CODE_PATTERN, {
    message: 'code may only contain letters, numbers, - and _',
  })
  code: string;

  @ApiProperty({ description: 'Parent vendor id' })
  @IsInt()
  vendorId: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class UpdateAffiliateDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @Matches(CODE_PATTERN, {
    message: 'code may only contain letters, numbers, - and _',
  })
  code?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
