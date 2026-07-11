import { Injectable, NotImplementedException } from '@nestjs/common';
import { SqsService } from '@ssut/nestjs-sqs';
import { randomUUID } from 'node:crypto';
import { MessageBus } from './message-bus';

/** SQS-backed MessageBus — publish only (SQS has no reply channel). */
@Injectable()
export class SqsBus implements MessageBus {
  constructor(private readonly sqs: SqsService) {}

  /** Sends the payload to the producer registered under the topic name. */
  async publish<T>(topic: string, payload: T): Promise<void> {
    await this.sqs.send(topic, { id: randomUUID(), body: payload });
  }

  /** @throws NotImplementedException — SQS cannot request-reply. */
  ask<TReply>(): Promise<TReply> {
    throw new NotImplementedException('The SQS driver does not support request-reply');
  }
}
