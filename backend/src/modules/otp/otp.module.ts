import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OtpController } from './otp.controller';
import { OtpRequest } from './entities/otp-request.entity';
import { OtpService } from './otp.service';

@Module({
  imports: [TypeOrmModule.forFeature([OtpRequest])],
  controllers: [OtpController],
  providers: [OtpService],
})
export class OtpModule {}

