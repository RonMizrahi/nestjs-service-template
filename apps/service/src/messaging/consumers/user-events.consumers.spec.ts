import type { PinoLogger } from 'nestjs-pino';
import { UserCreatedEvent } from '../events/user-created.event';
import { UserEventsController } from './user-events.controller';
import { UserEventsSqsHandler } from './user-events.sqs-handler';

describe('user.created consumers', () => {
  const info = jest.fn();
  const logger = { info } as unknown as PinoLogger;
  const userId = crypto.randomUUID();

  beforeEach(() => jest.clearAllMocks());

  it('Kafka consumer logs the consumed event (happy path)', () => {
    new UserEventsController(logger).handleUserCreated(
      new UserCreatedEvent(userId, 'ada@example.dev'),
    );

    expect(info).toHaveBeenCalledWith({ userId }, 'user.created consumed from Kafka');
  });

  it('SQS consumer parses the message body and logs the event (happy path)', () => {
    const body = JSON.stringify(new UserCreatedEvent(userId, 'ada@example.dev'));

    new UserEventsSqsHandler(logger).handleUserCreated({ Body: body });

    expect(info).toHaveBeenCalledWith({ userId }, 'user.created consumed from SQS');
  });

  it('SQS consumer rejects a malformed payload', () => {
    const handler = new UserEventsSqsHandler(logger);
    expect(() => handler.handleUserCreated({ Body: '{"not":"the-event"}' })).toThrow();
  });
});
