import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsInt, Length, Matches } from 'class-validator';
import { Type } from 'class-transformer';

export class OtpSendDto {
  @ApiProperty({ description: 'Digits only MSISDN', example: '919876543210' })
  @IsString()
  @Matches(/^\d{8,15}$/)
  phone: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  visitId?: number;

  @ApiProperty({
    required: false,
    description: 'Selected subscription pack (daily | weekly | monthly)',
    example: 'daily',
  })
  @IsOptional()
  @IsString()
  pack?: string;
}

export class OtpVerifyDto {
  @ApiProperty({ description: 'Digits only MSISDN', example: '919876543210' })
  @IsString()
  @Matches(/^\d{8,15}$/)
  phone: string;

  @ApiProperty({ description: '6 digit OTP', example: '123456' })
  @IsString()
  @Length(4, 8)
  otp: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  visitId?: number;
}
