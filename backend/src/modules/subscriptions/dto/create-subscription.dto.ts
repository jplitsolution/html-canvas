import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { SubscriptionStatus } from '../entities/subscription.entity';

export class CreateSubscriptionDto {
  @ApiProperty({
    example: '919876543210',
    description: 'Subscriber phone number',
  })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({
    example: 'netflix_123',
    description: 'Billing/service ID for subscription',
  })
  @IsString()
  @IsNotEmpty()
  serviceId: string;

  @ApiProperty({
    enum: SubscriptionStatus,
    example: SubscriptionStatus.ACTIVE,
    description: 'Status of the subscription',
    required: false,
  })
  @IsEnum(SubscriptionStatus)
  @IsOptional()
  status?: SubscriptionStatus;
}
