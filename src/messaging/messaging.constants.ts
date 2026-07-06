/** Injection token for the Kafka client registered by ClientsModule. */
export const KAFKA_CLIENT = Symbol('KAFKA_CLIENT');

/** Topic/queue-name for the user-created domain event. */
export const USER_CREATED_TOPIC = 'user.created';

/** Topics used with MessageBus.ask() — Kafka subscribes to their reply topics before connecting. */
export const ASK_TOPICS: readonly string[] = [];
