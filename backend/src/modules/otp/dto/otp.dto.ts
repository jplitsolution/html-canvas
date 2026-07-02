import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, Length, Matches } from 'class-validator';

export class OtpSendDto {
  @ApiProperty({ description: 'Digits only MSISDN', example: '919876543210' })
  @IsString()
  @Matches(/^\d{8,15}$/)
  phone: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  visitId?: string;
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
}

