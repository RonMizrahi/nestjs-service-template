import { HttpService } from '@nestjs/axios';
import { Inject, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { BrokenCircuitError, type IPolicy } from 'cockatiel';
import { Span } from 'nestjs-otel';
import type { Histogram } from 'prom-client';
import { firstValueFrom } from 'rxjs';
import { EXTERNAL_API_DURATION_METRIC } from '../observability/observability.constants';
import { ExternalTodoDto } from './dto/external-todo.dto';
import { EXTERNAL_API_POLICY } from './external.constants';

/** Demo client for an external HTTP dependency, called through a resilience policy. */
@Injectable()
export class ExternalApiService {
  constructor(
    private readonly http: HttpService,
    @Inject(EXTERNAL_API_POLICY) private readonly policy: IPolicy,
    @InjectMetric(EXTERNAL_API_DURATION_METRIC) private readonly duration: Histogram,
  ) {}

  /**
   * Fetches one TODO through retry → breaker → timeout.
   * @throws ServiceUnavailableException when the circuit is open.
   */
  @Span('external-api.fetchTodo')
  async fetchTodo(id: number): Promise<ExternalTodoDto> {
    const endTimer = this.duration.startTimer({ operation: 'fetchTodo' });
    try {
      const todo = await this.policy.execute(async ({ signal }) => {
        const response = await firstValueFrom(
          this.http.get<ExternalTodoDto>(`/todos/${id}`, { signal }),
        );
        return response.data;
      });
      endTimer({ outcome: 'success' });
      return todo;
    } catch (error) {
      endTimer({ outcome: 'error' });
      if (error instanceof BrokenCircuitError) {
        throw new ServiceUnavailableException('External API is unavailable (circuit open)');
      }
      throw error;
    }
  }
}
