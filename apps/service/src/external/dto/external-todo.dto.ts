import { ApiProperty } from '@nestjs/swagger';

/** Shape returned by the demo external API (jsonplaceholder /todos). */
export class ExternalTodoDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 1 })
  userId!: number;

  @ApiProperty({ example: 'delectus aut autem' })
  title!: string;

  @ApiProperty({ example: false })
  completed!: boolean;
}
