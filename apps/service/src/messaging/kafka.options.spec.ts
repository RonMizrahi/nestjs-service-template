import { ConfigService } from '@nestjs/config';
import { Transport } from '@nestjs/microservices';
import type { Env } from '../config/env.schema';
import { kafkaOptions } from './kafka.options';

describe('kafkaOptions', () => {
  const values: Record<string, string> = {
    KAFKA_CLIENT_ID: 'svc',
    KAFKA_BROKERS: 'b1:9092,b2:9092',
    KAFKA_GROUP_ID: 'svc-group',
  };
  const config = {
    get: jest.fn((key: string) => values[key]),
  } as unknown as ConfigService<Env, true>;

  it('builds server options with the consumer group (happy path)', () => {
    const opts = kafkaOptions(config, 'server');

    expect(opts.transport).toBe(Transport.KAFKA);
    expect(opts.options?.client?.brokers).toEqual(['b1:9092', 'b2:9092']);
    expect(opts.options?.consumer?.groupId).toBe('svc-group');
    expect(opts.options?.producerOnlyMode).toBe(false);
  });

  it('keeps the client producer-only while no ask() topics exist', () => {
    const opts = kafkaOptions(config, 'client');

    expect(opts.options?.consumer?.groupId).toBe('svc-group-client');
    expect(opts.options?.producerOnlyMode).toBe(true);
  });
});
