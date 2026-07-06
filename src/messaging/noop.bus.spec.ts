import { NotImplementedException } from '@nestjs/common';
import type { PinoLogger } from 'nestjs-pino';
import { NoopBus } from './noop.bus';

describe('NoopBus', () => {
  const debug = jest.fn();
  const bus = new NoopBus({ debug } as unknown as PinoLogger);

  it('drops the event and logs at debug (happy path)', async () => {
    await expect(bus.publish('user.created')).resolves.toBeUndefined();
    expect(debug).toHaveBeenCalledWith(
      { topic: 'user.created' },
      'Messaging disabled — event dropped',
    );
  });

  it('rejects ask — no transport configured', () => {
    expect(() => bus.ask()).toThrow(NotImplementedException);
  });
});
