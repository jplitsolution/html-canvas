import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { PageType } from '../entities/page.entity';

export class CreatePageDto {
  @ApiProperty({
    example: 1,
    description: 'Associated project ID',
  })
  @IsInt()
  @IsNotEmpty()
  projectId: number;

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
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    example: 'plan',
    description: 'Slug of the page',
  })
  @IsString()
  @IsNotEmpty()
  slug: string;

  @ApiProperty({
    enum: PageType,
    example: PageType.PLAN,
    description: 'Type of the page',
  })
  @IsEnum(PageType)
  @IsNotEmpty()
  pageType: PageType;
}
