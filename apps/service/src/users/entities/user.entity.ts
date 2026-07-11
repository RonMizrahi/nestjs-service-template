import { Exclude } from 'class-transformer';
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Role } from '../../common/enums/role.enum';

/** Persisted user — passwordHash is stripped from responses via @Exclude + serializer. */
@Entity('users')
export class User {
  // `!` definite-assignment is unavoidable on ORM-mapped fields under strict mode
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  email!: string;

  @Exclude()
  @Column()
  passwordHash!: string;

  @Column({ type: 'enum', enum: Role, array: true, default: [Role.User] })
  roles!: Role[];

  @Column({ default: true })
  isActive!: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
