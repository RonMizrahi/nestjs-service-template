import { ClientKafka } from '@nestjs/microservices';
import { of } from 'rxjs';
import { KafkaBus } from './kafka.bus';

describe('KafkaBus', () => {
  const emit = jest.fn(() => of(undefined));
  const send = jest.fn(() => of({ ok: true }));
  const connect = jest.fn(() => Promise.resolve());
  const close = jest.fn(() => Promise.resolve());
  const subscribeToResponseOf = jest.fn();
  const client = { emit, send, connect, close, subscribeToResponseOf } as unknown as ClientKafka;
  const bus = new KafkaBus(client);

  beforeEach(() => jest.clearAllMocks());

  it('publishes an event and awaits the broker ack (happy path)', async () => {
    const payload = { userId: crypto.randomUUID() };

    await expect(bus.publish('user.created', payload)).resolves.toBeUndefined();
    expect(emit).toHaveBeenCalledWith('user.created', payload);
  });

  it('asks and resolves with the first reply', async () => {
    await expect(bus.ask('some.query', { q: 1 })).resolves.toEqual({ ok: true });
    expect(send).toHaveBeenCalledWith('some.query', { q: 1 });
  });

  it('connects on module init', async () => {
    await bus.onModuleInit();
    expect(connect).toHaveBeenCalled();
  });

  it('closes the client on shutdown', async () => {
    await bus.onApplicationShutdown();
    expect(close).toHaveBeenCalled();
  });
});
