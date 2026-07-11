import { ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateUserDto } from './create-user.dto';

/** Password changes are deliberately excluded — they belong to a dedicated auth flow. */
export class UpdateUserDto extends PartialType(OmitType(CreateUserDto, ['password'] as const)) {
  @ApiPropertyOptional({ description: 'Soft-disable the account' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
