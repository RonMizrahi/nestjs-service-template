import { Inject, Injectable, OnApplicationShutdown, OnModuleInit } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { firstValueFrom, lastValueFrom } from 'rxjs';
import { MessageBus } from './message-bus';
import { ASK_TOPICS, KAFKA_CLIENT } from './messaging.constants';

/** Kafka-backed MessageBus over the built-in Nest transport. */
@Injectable()
export class KafkaBus implements MessageBus, OnModuleInit, OnApplicationShutdown {
  constructor(@Inject(KAFKA_CLIENT) private readonly client: ClientKafka) {}

  /** Registers reply topics for ask(), then connects the producer. */
  async onModuleInit(): Promise<void> {
    ASK_TOPICS.forEach((topic) => this.client.subscribeToResponseOf(topic));
    await this.client.connect();
  }

  async onApplicationShutdown(): Promise<void> {
    await this.client.close();
  }

  /** Emits an event; resolves once the broker acknowledges the write. */
  async publish<T>(topic: string, payload: T): Promise<void> {
    await lastValueFrom(this.client.emit(topic, payload));
  }

  /** Sends a request and resolves with the first reply. */
  ask<TReply>(topic: string, payload: unknown): Promise<TReply> {
    return firstValueFrom(this.client.send<TReply>(topic, payload));
  }
}
