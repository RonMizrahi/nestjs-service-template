import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'ada@example.dev' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'correct-horse-battery' })
  @IsString()
  password!: string;
}
