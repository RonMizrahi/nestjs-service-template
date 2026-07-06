import 'reflect-metadata';
import { DataSource } from 'typeorm';

/**
 * Standalone DataSource for the TypeORM CLI only (migration generate/run/revert).
 * The runtime app wires its own DataSource via TypeOrmModule.forRootAsync.
 */
export default new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL ?? 'postgres://app:app@localhost:5432/app',
  entities: ['src/**/*.entity.ts'],
  migrations: ['src/migrations/*.ts'],
});
