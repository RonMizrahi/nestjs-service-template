import { ApiProperty } from '@nestjs/swagger';
import { Role } from '../../common/enums/role.enum';

export class AuthTokensDto {
  @ApiProperty({ description: 'Bearer access token (JWT)' })
  accessToken!: string;
}

export class ProfileDto {
  @ApiProperty({ format: 'uuid' })
  userId!: string;

  @ApiProperty({ example: 'ada@example.dev' })
  email!: string;

  @ApiProperty({ enum: Role, isArray: true })
  roles!: Role[];
}
