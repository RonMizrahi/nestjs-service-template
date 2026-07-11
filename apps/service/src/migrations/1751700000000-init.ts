import { MigrationInterface, QueryRunner } from 'typeorm';

/** Initial schema: users table with enum-array roles and audit timestamps. */
export class Init1751700000000 implements MigrationInterface {
  name = 'Init1751700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE "users_roles_enum" AS ENUM ('user', 'admin')`);
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "email" character varying NOT NULL,
        "passwordHash" character varying NOT NULL,
        "roles" "users_roles_enum"[] NOT NULL DEFAULT '{user}',
        "isActive" boolean NOT NULL DEFAULT true,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_users_email" UNIQUE ("email")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TYPE "users_roles_enum"`);
  }
}
