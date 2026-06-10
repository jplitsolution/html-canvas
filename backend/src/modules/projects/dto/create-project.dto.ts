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
}
