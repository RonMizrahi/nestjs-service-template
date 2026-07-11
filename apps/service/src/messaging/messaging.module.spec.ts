import { ClientKafka } from '@nestjs/microservices';
import { SqsService } from '@ssut/nestjs-sqs';
import type { PinoLogger } from 'nestjs-pino';
import { KafkaBus } from './kafka.bus';
import { createMessageBus } from './messaging.module';
import { NoopBus } from './noop.bus';
import { SqsBus } from './sqs.bus';

describe('createMessageBus', () => {
  const kafkaClient = {} as unknown as ClientKafka;
  const sqsService = {} as unknown as SqsService;
  const logger = {} as unknown as PinoLogger;

  it.each([
    ['kafka', KafkaBus],
    ['sqs', SqsBus],
    ['none', NoopBus],
  ] as const)('selects the %s driver (happy path)', (driver, expected) => {
    expect(createMessageBus(driver, kafkaClient, sqsService, logger)).toBeInstanceOf(expected);
  });
});
