import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateApiConfigDto {
  @ApiProperty({
    example: 1,
    description: 'Associated project ID',
  })
  @IsInt()
  @IsNotEmpty()
  projectId: number;

  @ApiProperty({
    example: 'https://api.partner.com/user/verify',
    description: 'Endpoint to verify user presence or profile',
    required: false,
  })
  @IsString()
  @IsOptional()
  userApi?: string;

  @ApiProperty({
    example: 'https://api.partner.com/blocklist/check',
    description: 'Endpoint to check if subscriber is blocklisted',
    required: false,
  })
  @IsString()
  @IsOptional()
  blocklistApi?: string;

  @ApiProperty({
    example: 'https://api.partner.com/subscription/check',
    description: 'Endpoint to verify subscription status',
    required: false,
  })
  @IsString()
  @IsOptional()
  subscriptionApi?: string;

  @ApiProperty({
    example: 'https://api.partner.com/subscribe',
    description: 'Endpoint to trigger a new subscription charge/OTP',
    required: false,
  })
  @IsString()
  @IsOptional()
  subscribeApi?: string;

  @ApiProperty({
    example: '{"Authorization": "Bearer key", "X-Partner-Id": "123"}',
    description: 'JSON string of custom headers required for calls',
    required: false,
  })
  @IsString()
  @IsOptional()
  headersJson?: string;
}
