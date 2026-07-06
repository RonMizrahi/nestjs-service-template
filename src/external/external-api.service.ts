import { HttpService } from '@nestjs/axios';
import { Inject, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { BrokenCircuitError, type IPolicy } from 'cockatiel';
import { firstValueFrom } from 'rxjs';
import { ExternalTodoDto } from './dto/external-todo.dto';
import { EXTERNAL_API_POLICY } from './external.constants';

/** Demo client for an external HTTP dependency, called through a resilience policy. */
@Injectable()
export class ExternalApiService {
  constructor(
    private readonly http: HttpService,
    @Inject(EXTERNAL_API_POLICY) private readonly policy: IPolicy,
  ) {}

  /**
   * Fetches one TODO through retry → breaker → timeout.
   * @throws ServiceUnavailableException when the circuit is open.
   */
  async fetchTodo(id: number): Promise<ExternalTodoDto> {
    try {
      return await this.policy.execute(async ({ signal }) => {
        const response = await firstValueFrom(
          this.http.get<ExternalTodoDto>(`/todos/${id}`, { signal }),
        );
        return response.data;
      });
    } catch (error) {
      if (error instanceof BrokenCircuitError) {
        throw new ServiceUnavailableException('External API is unavailable (circuit open)');
      }
      throw error;
    }
  }
}
