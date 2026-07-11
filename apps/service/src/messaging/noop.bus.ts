import { Injectable, NotImplementedException } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { MessageBus } from './message-bus';

/** Bus for MESSAGING_DRIVER=none (dev/tests without a broker) — logs and drops events. */
@Injectable()
export class NoopBus implements MessageBus {
  constructor(@InjectPinoLogger(NoopBus.name) private readonly logger: PinoLogger) {}

  /** Logs and drops the event. */
  publish(topic: string): Promise<void> {
    this.logger.debug({ topic }, 'Messaging disabled — event dropped');
    return Promise.resolve();
  }

  /** @throws NotImplementedException — no transport configured. */
  ask<TReply>(): Promise<TReply> {
    throw new NotImplementedException('Messaging is disabled (MESSAGING_DRIVER=none)');
  }
}
