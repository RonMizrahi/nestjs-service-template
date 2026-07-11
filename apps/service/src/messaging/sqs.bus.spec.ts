import { NotImplementedException } from '@nestjs/common';
import { SqsService } from '@ssut/nestjs-sqs';
import { SqsBus } from './sqs.bus';

describe('SqsBus', () => {
  const send = jest.fn(() => Promise.resolve());
  const bus = new SqsBus({ send } as unknown as SqsService);

  beforeEach(() => jest.clearAllMocks());

  it('publishes to the producer registered under the topic name (happy path)', async () => {
    const payload = { userId: crypto.randomUUID() };

    await expect(bus.publish('user.created', payload)).resolves.toBeUndefined();
    expect(send).toHaveBeenCalledWith('user.created', {
      id: expect.any(String) as string,
      body: payload,
    });
  });

  it('rejects ask — SQS has no reply channel', () => {
    expect(() => bus.ask()).toThrow(NotImplementedException);
  });
});
