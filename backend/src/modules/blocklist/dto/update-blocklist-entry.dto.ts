import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateBlocklistEntryDto {
  @ApiProperty({
    example: '919876543210',
    description: 'Phone number to blocklist',
    required: false,
  })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({
    example: 'Spamming behavior resolved',
    description: 'Reason for blocklisting',
    required: false,
  })
  @IsString()
  @IsOptional()
  reason?: string;

  @ApiProperty({
    example: false,
    description: 'Whether the blocklist entry is currently active',
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  active?: boolean;
}
