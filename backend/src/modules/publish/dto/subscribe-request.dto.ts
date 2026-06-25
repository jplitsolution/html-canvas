import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsString } from 'class-validator';

export class SubscribeRequestDto {
  @ApiProperty({
    example: 101,
    description: 'ID of the visit record tracked for the session',
  })
  @IsInt()
  @IsNotEmpty()
  visitId: number;

  @ApiProperty({
    example: 1,
    description: 'Associated project ID',
  })
  @IsInt()
  @IsNotEmpty()
  projectId: number;

  @ApiProperty({
    example: '919876543210',
    description: 'Subscriber phone number',
  })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({
    example: 'weekly_premium_10',
    description: 'Billing plan ID being subscribed to',
  })
  @IsString()
  @IsNotEmpty()
  planId: string;
}
