import { IsObject, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateCampaignPageDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  projectData;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  html;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  css;
}
