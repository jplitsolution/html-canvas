import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateTemplateDto {
  @ApiProperty({
    example: 'My Custom Template',
    description: 'Name of the template',
  })
  @IsString()
  @IsNotEmpty({ message: 'Template name is required' })
  name;

  @ApiProperty({
    example: { version: '1.0', objects: [] },
    description: 'JSON template layout representation',
  })
  @IsNotEmpty({ message: 'Template data is required' })
  data;

  @ApiProperty({
    example: false,
    description: 'Whether it is a prebuilt system template',
    required: false,
  })
  @IsOptional()
  isPrebuilt;
}
