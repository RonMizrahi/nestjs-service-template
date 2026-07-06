import { HttpService } from '@nestjs/axios';
import { ServiceUnavailableException } from '@nestjs/common';
import { BrokenCircuitError, IPolicy } from 'cockatiel';
import { of } from 'rxjs';
import { ExternalTodoDto } from './dto/external-todo.dto';
import { ExternalApiService } from './external-api.service';

describe('ExternalApiService', () => {
  const todo: ExternalTodoDto = { id: 1, userId: 1, title: 'test', completed: false };
  const get = jest.fn(() => of({ data: todo }));
  const http = { get } as unknown as HttpService;
  // pass-through policy — the pipeline itself is covered by resilience.spec
  const execute = jest.fn((fn: (ctx: { signal: AbortSignal }) => Promise<ExternalTodoDto>) =>
    fn({ signal: new AbortController().signal }),
  );
  const policy = { execute } as unknown as IPolicy;
  const service = new ExternalApiService(http, policy);

  beforeEach(() => jest.clearAllMocks());

  it('fetches through the policy and unwraps the response (happy path)', async () => {
    await expect(service.fetchTodo(1)).resolves.toEqual(todo);
    expect(get).toHaveBeenCalledWith('/todos/1', { signal: expect.any(AbortSignal) as AbortSignal });
  });

  it('maps an open circuit to 503', async () => {
    execute.mockRejectedValueOnce(new BrokenCircuitError());
    await expect(service.fetchTodo(1)).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('rethrows other errors untouched', async () => {
    const failure = new Error('http 500');
    execute.mockRejectedValueOnce(failure);
    await expect(service.fetchTodo(1)).rejects.toBe(failure);
  });
});
