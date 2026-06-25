import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateBlocklistEntryDto {
  @ApiProperty({
    example: '919876543210',
    description: 'Phone number to blocklist',
  })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({
    example: 'Spamming or fraudulent subscription behavior',
    description: 'Reason for blocklisting the phone number',
    required: false,
  })
  @IsString()
  @IsOptional()
  reason?: string;

  @ApiProperty({
    example: true,
    description: 'Whether the blocklist entry is currently active',
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  active?: boolean;
}
