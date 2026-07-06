import { Inject, Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { PasswordService } from '../auth/password.service';
import { AppCacheService } from '../cache/app-cache.service';
import { ResourceNotFoundException } from '../common/exceptions/app.exception';
import { UserCreatedEvent } from '../messaging/events/user-created.event';
import { MESSAGE_BUS, type MessageBus } from '../messaging/message-bus';
import { USER_CREATED_TOPIC } from '../messaging/messaging.constants';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { USERS_LIST_CACHE_KEY } from './users.constants';
import { UsersRepository } from './users.repository';

const USER = 'User';

/** User CRUD business logic — depends on the repository, never on TypeORM. */
@Injectable()
export class UsersService {
  constructor(
    @InjectPinoLogger(UsersService.name)
    private readonly logger: PinoLogger,
    private readonly usersRepository: UsersRepository,
    private readonly passwordService: PasswordService,
    private readonly appCache: AppCacheService,
    @Inject(MESSAGE_BUS) private readonly messageBus: MessageBus,
  ) {}

  /**
   * Creates a user with a hashed password.
   * @throws DuplicateResourceException when the email is taken.
   */
  async create(dto: CreateUserDto): Promise<UserResponseDto> {
    const passwordHash = await this.passwordService.hash(dto.password);
    const user = await this.usersRepository.create({
      email: dto.email,
      passwordHash,
      roles: dto.roles,
    });
    this.logger.info({ userId: user.id }, 'User created');
    await this.appCache.evict(USERS_LIST_CACHE_KEY);
    try {
      await this.messageBus.publish(USER_CREATED_TOPIC, new UserCreatedEvent(user.id, user.email));
    } catch (error) {
      // a broker outage must never fail user creation
      this.logger.error({ err: error }, 'Failed to publish user.created');
    }
    return new UserResponseDto(user);
  }

  /** Lists all users. */
  async findAll(): Promise<UserResponseDto[]> {
    const users = await this.usersRepository.findAll();
    return users.map((user) => new UserResponseDto(user));
  }

  /**
   * Fetches one user.
   * @throws ResourceNotFoundException when absent.
   */
  async findById(id: string): Promise<UserResponseDto> {
    const user = await this.usersRepository.findById(id);
    if (!user) throw new ResourceNotFoundException(USER, id);
    return new UserResponseDto(user);
  }

  /**
   * Applies a partial update.
   * @throws ResourceNotFoundException when absent.
   */
  async update(id: string, dto: UpdateUserDto): Promise<UserResponseDto> {
    const user = await this.usersRepository.update(id, dto);
    if (!user) throw new ResourceNotFoundException(USER, id);
    this.logger.info({ userId: id }, 'User updated');
    await this.appCache.evict(USERS_LIST_CACHE_KEY);
    return new UserResponseDto(user);
  }

  /**
   * Deletes a user.
   * @throws ResourceNotFoundException when absent.
   */
  async remove(id: string): Promise<void> {
    const deleted = await this.usersRepository.delete(id);
    if (!deleted) throw new ResourceNotFoundException(USER, id);
    this.logger.info({ userId: id }, 'User deleted');
    await this.appCache.evict(USERS_LIST_CACHE_KEY);
  }
}
