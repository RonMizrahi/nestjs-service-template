import { ApiProperty } from '@nestjs/swagger';
import { Role } from '../../common/enums/role.enum';
import { User } from '../entities/user.entity';

/** Client-facing user shape — never carries the password hash. */
export class UserResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'grace@example.dev' })
  email!: string;

  @ApiProperty({ enum: Role, isArray: true })
  roles!: Role[];

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  constructor(user: User) {
    this.id = user.id;
    this.email = user.email;
    this.roles = user.roles;
    this.isActive = user.isActive;
    this.createdAt = user.createdAt;
    this.updatedAt = user.updatedAt;
  }
}
