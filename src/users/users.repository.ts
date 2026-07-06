import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { DuplicateResourceException } from '../common/exceptions/app.exception';
import { User } from './entities/user.entity';

/** Postgres error code for unique-constraint violations. */
const UNIQUE_VIOLATION = '23505';

/**
 * Narrows an unknown error to a Postgres unique-constraint violation.
 * @param error Anything thrown by a TypeORM write.
 */
function isUniqueViolation(error: unknown): boolean {
  if (!(error instanceof QueryFailedError)) return false;
  const driverError: unknown = error.driverError;
  return (
    typeof driverError === 'object' &&
    driverError !== null &&
    'code' in driverError &&
    driverError.code === UNIQUE_VIOLATION
  );
}

/** All User persistence lives here — services depend on this, never on TypeORM directly. */
@Injectable()
export class UsersRepository {
  constructor(
    @InjectRepository(User)
    private readonly repo: Repository<User>,
  ) {}

  /**
   * Persists a new user.
   * @param data Fields of the user to create.
   * @throws DuplicateResourceException when the email is already taken.
   */
  async create(data: Partial<User>): Promise<User> {
    try {
      return await this.repo.save(this.repo.create(data));
    } catch (error) {
      if (isUniqueViolation(error)) throw new DuplicateResourceException('User', 'email');
      throw error;
    }
  }

  /** Returns all users. */
  findAll(): Promise<User[]> {
    return this.repo.find();
  }

  /**
   * Finds a user by primary key.
   * @param id User uuid.
   * @returns The user, or null when absent.
   */
  findById(id: string): Promise<User | null> {
    return this.repo.findOneBy({ id });
  }

  /**
   * Finds a user by unique email.
   * @param email User email.
   * @returns The user, or null when absent.
   */
  findByEmail(email: string): Promise<User | null> {
    return this.repo.findOneBy({ email });
  }

  /**
   * Merges a partial update via preload+save (bumps @UpdateDateColumn).
   * @returns The updated user, or null when absent.
   * @throws DuplicateResourceException when changing to a taken email.
   */
  async update(id: string, data: Partial<User>): Promise<User | null> {
    // id spread LAST so a stray data.id can never redirect the write
    const user = await this.repo.preload({ ...data, id });
    if (!user) return null;
    try {
      return await this.repo.save(user);
    } catch (error) {
      if (isUniqueViolation(error)) throw new DuplicateResourceException('User', 'email');
      throw error;
    }
  }

  /**
   * Deletes a user.
   * @param id User uuid.
   * @returns true when a row was removed.
   */
  async delete(id: string): Promise<boolean> {
    const result = await this.repo.delete(id);
    return (result.affected ?? 0) > 0;
  }
}
