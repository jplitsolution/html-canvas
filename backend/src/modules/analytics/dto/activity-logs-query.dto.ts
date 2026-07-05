import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class ActivityLogsQueryDto {
  @ApiPropertyOptional({ minimum: 1, default: 1, description: 'Page number' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ minimum: 1, default: 20, description: 'Number of logs per page' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Filter by subscriber phone number (MSISDN)' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ description: 'Filter by visit status (e.g. SUCCESS, FAILED, VISIT, BLOCKED)' })
  @IsString()
  @IsOptional()
  status?: string;
}
