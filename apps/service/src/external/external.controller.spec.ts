import { ExternalTodoDto } from './dto/external-todo.dto';
import { ExternalApiService } from './external-api.service';
import { ExternalController } from './external.controller';

describe('ExternalController', () => {
  const todo: ExternalTodoDto = { id: 7, userId: 1, title: 'test', completed: true };
  const fetchTodo = jest.fn(() => Promise.resolve(todo));
  const controller = new ExternalController({ fetchTodo } as unknown as ExternalApiService);

  it('returns the fetched TODO (happy path)', async () => {
    await expect(controller.fetchTodo(7)).resolves.toEqual(todo);
    expect(fetchTodo).toHaveBeenCalledWith(7);
  });
});
