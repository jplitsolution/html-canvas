import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'user@example.com', description: 'User email' })
  @IsEmail({}, { message: 'Invalid email address' })
  email;

  @ApiProperty({
    example: 'password123',
    description: 'User password (min 6 chars)',
  })
  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  password;

  @ApiProperty({ example: 'John Doe', description: 'User display name' })
  @IsString()
  @IsNotEmpty({ message: 'Name is required' })
  name;
}
