import { SQSClient } from '@aws-sdk/client-sqs';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientKafka, ClientsModule } from '@nestjs/microservices';
import { SqsModule, SqsService } from '@ssut/nestjs-sqs';
import { getLoggerToken, PinoLogger } from 'nestjs-pino';
import type { Env } from '../config/env.schema';
import { UserEventsController } from './consumers/user-events.controller';
import { UserEventsSqsHandler } from './consumers/user-events.sqs-handler';
import { KafkaBus } from './kafka.bus';
import { kafkaOptions } from './kafka.options';
import { MESSAGE_BUS, MessageBus } from './message-bus';
import { KAFKA_CLIENT, USER_CREATED_TOPIC } from './messaging.constants';
import { NoopBus } from './noop.bus';
import { SqsBus } from './sqs.bus';

// the package doesn't re-export its options type — derive it from the module signature
type SqsOptions = Parameters<typeof SqsModule.register>[0];

/** Instantiates the bus selected by MESSAGING_DRIVER — unselected transports never connect. */
export function createMessageBus(
  driver: Env['MESSAGING_DRIVER'],
  kafkaClient: ClientKafka,
  sqsService: SqsService,
  logger: PinoLogger,
): MessageBus {
  switch (driver) {
    case 'kafka':
      return new KafkaBus(kafkaClient);
    case 'sqs':
      return new SqsBus(sqsService);
    case 'none':
      return new NoopBus(logger);
  }
}

/** Builds SQS consumer/producer wiring — empty (inert) unless the sqs driver is selected. */
function sqsOptions(config: ConfigService<Env, true>): SqsOptions {
  if (config.get('MESSAGING_DRIVER', { infer: true }) !== 'sqs') {
    return { consumers: [], producers: [] };
  }
  const queueUrl = config.get('SQS_QUEUE_URL', { infer: true });
  if (!queueUrl) throw new Error('SQS_QUEUE_URL is required when MESSAGING_DRIVER=sqs');
  const sqs = new SQSClient({
    region: config.get('SQS_REGION', { infer: true }),
    endpoint: config.get('SQS_ENDPOINT', { infer: true }), // set for LocalStack, unset for AWS
  });
  return {
    consumers: [{ name: USER_CREATED_TOPIC, queueUrl, sqs }],
    producers: [{ name: USER_CREATED_TOPIC, queueUrl, sqs }],
  };
}

/** Pluggable messaging: publishers inject the MESSAGE_BUS port, never a transport. */
@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: KAFKA_CLIENT,
        inject: [ConfigService],
        useFactory: (config: ConfigService<Env, true>) => kafkaOptions(config, 'client'),
      },
    ]),
    SqsModule.registerAsync({ inject: [ConfigService], useFactory: sqsOptions }),
  ],
  controllers: [UserEventsController],
  providers: [
    UserEventsSqsHandler,
    {
      provide: MESSAGE_BUS,
      inject: [ConfigService, KAFKA_CLIENT, SqsService, getLoggerToken(NoopBus.name)],
      useFactory: (
        config: ConfigService<Env, true>,
        kafkaClient: ClientKafka,
        sqsService: SqsService,
        logger: PinoLogger,
      ): MessageBus =>
        createMessageBus(
          config.get('MESSAGING_DRIVER', { infer: true }),
          kafkaClient,
          sqsService,
          logger,
        ),
    },
  ],
  exports: [MESSAGE_BUS],
})
export class MessagingModule {}
