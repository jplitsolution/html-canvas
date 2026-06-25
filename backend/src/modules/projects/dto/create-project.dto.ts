import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateProjectDto {
  @ApiProperty({
    example: 'My Awesome Poster',
    description: 'Name of the project/canvas',
  })
  @IsString()
  @IsNotEmpty({ message: 'Project name is required' })
  name: string;

  @ApiProperty({
    example: { version: '1.0', objects: [] },
    description: 'JSON canvas object representation',
    required: false,
  })
  @IsOptional()
  data?: any;

  @ApiProperty({
    example: 'netflix-offer',
    description: 'Unique URL slug for publishing',
    required: false,
  })
  @IsString()
  @IsOptional()
  slug?: string;

  @ApiProperty({
    example: 'netflix_123',
    description: 'Associated service ID for billing/subscription',
    required: false,
  })
  @IsString()
  @IsOptional()
  serviceId?: string;
}
