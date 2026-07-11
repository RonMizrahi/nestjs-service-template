import type { Message } from '@aws-sdk/client-sqs';
import { Injectable } from '@nestjs/common';
import { SqsMessageHandler } from '@ssut/nestjs-sqs';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { z } from 'zod';
import { USER_CREATED_TOPIC } from '../messaging.constants';

// wire payloads are untrusted — validate at the boundary instead of casting
const userCreatedEventSchema = z.object({ userId: z.string(), email: z.string() });

/** SQS consumer for user events — polls only when MESSAGING_DRIVER=sqs. */
@Injectable()
export class UserEventsSqsHandler {
  constructor(@InjectPinoLogger(UserEventsSqsHandler.name) private readonly logger: PinoLogger) {}

  /**
   * Demo handler — parses and logs the event.
   * @throws ZodError on malformed payloads (message returns to the queue / DLQ).
   */
  @SqsMessageHandler(USER_CREATED_TOPIC, false)
  handleUserCreated(message: Message): void {
    const event = userCreatedEventSchema.parse(JSON.parse(message.Body ?? '{}'));
    this.logger.info({ userId: event.userId }, 'user.created consumed from SQS');
  }
}
