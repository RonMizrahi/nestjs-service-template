import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

const PASSWORD_MIN_LENGTH = 8;

export class RegisterDto {
  @ApiProperty({ example: 'ada@example.dev', description: 'Unique login email' })
  @IsEmail()
  email!: string;

  @ApiProperty({ minLength: PASSWORD_MIN_LENGTH, example: 'correct-horse-battery' })
  @IsString()
  @MinLength(PASSWORD_MIN_LENGTH)
  password!: string;
}
