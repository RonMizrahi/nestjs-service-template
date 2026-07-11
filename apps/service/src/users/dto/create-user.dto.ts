import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { Role } from '../../common/enums/role.enum';

const PASSWORD_MIN_LENGTH = 8;

export class CreateUserDto {
  @ApiProperty({ example: 'grace@example.dev', description: 'Unique login email' })
  @IsEmail()
  email!: string;

  @ApiProperty({ minLength: PASSWORD_MIN_LENGTH, example: 'correct-horse-battery' })
  @IsString()
  @MinLength(PASSWORD_MIN_LENGTH)
  password!: string;

  @ApiPropertyOptional({ enum: Role, isArray: true, example: [Role.User] })
  @IsOptional()
  @IsArray() // without this, a bare enum string would pass { each: true } validation
  @IsEnum(Role, { each: true })
  roles?: Role[];
}
