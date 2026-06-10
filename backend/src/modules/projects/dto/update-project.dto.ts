import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UpdateProjectDto {
  @ApiProperty({
    example: 'My Updated Canvas',
    description: 'Updated name of the project/canvas',
    required: false,
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({
    example: { version: '1.0', objects: [{ type: 'rect' }] },
    description: 'Updated JSON representation of the canvas',
    required: false,
  })
  @IsOptional()
  data?: any;
}
