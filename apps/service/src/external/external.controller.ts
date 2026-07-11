import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ExternalTodoDto } from './dto/external-todo.dto';
import { ExternalApiService } from './external-api.service';

@ApiTags('external')
@ApiBearerAuth()
@Controller('external')
export class ExternalController {
  constructor(private readonly externalApi: ExternalApiService) {}

  @Get('todos/:id')
  @ApiOperation({
    summary: 'Fetch a TODO from the demo external API',
    description: 'Proxied through the resilience policy (retry + circuit breaker + timeout).',
  })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ type: ExternalTodoDto })
  @ApiResponse({ status: 400, description: 'id must be an integer' })
  @ApiResponse({ status: 401, description: 'Missing or invalid token' })
  @ApiResponse({ status: 503, description: 'Circuit open — external API unavailable' })
  fetchTodo(@Param('id', ParseIntPipe) id: number): Promise<ExternalTodoDto> {
    return this.externalApi.fetchTodo(id);
  }
}
