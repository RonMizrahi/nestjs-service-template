import { ConfigService } from '@nestjs/config';
import { KafkaOptions, Transport } from '@nestjs/microservices';
import type { Env } from '../config/env.schema';
import { ASK_TOPICS } from './messaging.constants';

/**
 * Kafka transport options shared by the producer client and the consumer microservice.
 * @param role Distinct consumer groups — the client's reply-consumer must not steal server messages.
 */
export function kafkaOptions(
  config: ConfigService<Env, true>,
  role: 'client' | 'server',
): KafkaOptions {
  const groupId = config.get('KAFKA_GROUP_ID', { infer: true });
  return {
    transport: Transport.KAFKA,
    options: {
      client: {
        clientId: config.get('KAFKA_CLIENT_ID', { infer: true }),
        brokers: config.get('KAFKA_BROKERS', { infer: true }).split(','),
      },
      consumer: { groupId: role === 'server' ? groupId : `${groupId}-client` },
      // without ask() reply topics the client needs no consumer group — and a
      // failing group-join must not take the producer (publish) down with it
      producerOnlyMode: role === 'client' && ASK_TOPICS.length === 0,
    },
  };
}
