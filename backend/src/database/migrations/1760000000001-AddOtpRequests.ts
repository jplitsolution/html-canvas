import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOtpRequests1760000000001 implements MigrationInterface {
  name = 'AddOtpRequests1760000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const isPostgres = queryRunner.connection.options.type === 'postgres';

    if (isPostgres) {
      await queryRunner.query(`
        CREATE TABLE "otp_requests" (
          "id" SERIAL PRIMARY KEY,
          "phone" varchar NOT NULL,
          "otp_hash" varchar NOT NULL,
          "otp_salt" varchar NOT NULL,
          "visit_id" varchar,
          "attempts" integer NOT NULL DEFAULT 0,
          "used_at" TIMESTAMP,
          "expires_at" TIMESTAMP NOT NULL,
          "created_at" TIMESTAMP NOT NULL DEFAULT now()
        )
      `);
      await queryRunner.query(`
        CREATE INDEX "IDX_OTP_PHONE_CREATED" ON "otp_requests" ("phone", "created_at")
      `);
    } else {
      await queryRunner.query(`
        CREATE TABLE IF NOT EXISTS \`otp_requests\` (
          \`id\` int NOT NULL AUTO_INCREMENT,
          \`phone\` varchar(32) NOT NULL,
          \`otp_hash\` varchar(255) NOT NULL,
          \`otp_salt\` varchar(64) NOT NULL,
          \`visit_id\` varchar(64) NULL,
          \`attempts\` int NOT NULL DEFAULT 0,
          \`used_at\` datetime(6) NULL,
          \`expires_at\` datetime(6) NOT NULL,
          \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
          PRIMARY KEY (\`id\`),
          KEY \`IDX_OTP_PHONE_CREATED\` (\`phone\`, \`created_at\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const isPostgres = queryRunner.connection.options.type === 'postgres';

    if (isPostgres) {
      await queryRunner.query(`DROP TABLE IF EXISTS "otp_requests"`);
    } else {
      await queryRunner.query(`DROP TABLE IF EXISTS \`otp_requests\``);
    }
  }
}
