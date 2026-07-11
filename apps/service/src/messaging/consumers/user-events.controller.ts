import { Controller } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { UserCreatedEvent } from '../events/user-created.event';
import { USER_CREATED_TOPIC } from '../messaging.constants';

/** Kafka consumer for user events — bound only when MESSAGING_DRIVER=kafka (see main.ts). */
@Controller()
export class UserEventsController {
  constructor(@InjectPinoLogger(UserEventsController.name) private readonly logger: PinoLogger) {}

  /** Demo handler — replace with real side effects (welcome email, projections, …). */
  @EventPattern(USER_CREATED_TOPIC)
  handleUserCreated(@Payload() event: UserCreatedEvent): void {
    this.logger.info({ userId: event.userId }, 'user.created consumed from Kafka');
  }
}
