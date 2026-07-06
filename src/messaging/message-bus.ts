/** Injection token for the transport-agnostic message bus. */
export const MESSAGE_BUS = Symbol('MESSAGE_BUS');

/** Messaging port — publishers depend on this, never on a concrete transport. */
export interface MessageBus {
  /** Publishes a fire-and-forget event to a topic/queue. */
  publish<T>(topic: string, payload: T): Promise<void>;

  /**
   * Request-reply over the bus.
   * @throws NotImplementedException on drivers without a reply channel (SQS, none).
   */
  ask<TReply>(topic: string, payload: unknown): Promise<TReply>;
}
