import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString } from 'class-validator';
import { PageType } from '../entities/page.entity';

export class UpdatePageDto {
  @ApiProperty({
    example: 1,
    description: 'Associated template ID',
    required: false,
  })
  @IsInt()
  @IsOptional()
  templateId?: number;

  @ApiProperty({
    example: 'Plan Page',
    description: 'Name of the page',
    required: false,
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({
    example: 'plan',
    description: 'Slug of the page',
    required: false,
  })
  @IsString()
  @IsOptional()
  slug?: string;

  @ApiProperty({
    enum: PageType,
    example: PageType.PLAN,
    description: 'Type of the page',
    required: false,
  })
  @IsEnum(PageType)
  @IsOptional()
  pageType?: PageType;
}
