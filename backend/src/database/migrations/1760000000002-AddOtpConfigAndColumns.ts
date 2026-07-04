import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOtpConfigAndColumns1760000000002 implements MigrationInterface {
  name = 'AddOtpConfigAndColumns1760000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const isPostgres = queryRunner.connection.options.type === 'postgres';

    if (isPostgres) {
      await queryRunner.query(`
        ALTER TABLE "otp_requests" 
        ADD COLUMN "campaign_id" integer,
        ADD COLUMN "provider" varchar,
        ADD COLUMN "provider_request_id" varchar,
        ADD COLUMN "status" varchar NOT NULL DEFAULT 'pending',
        ADD COLUMN "verified_at" TIMESTAMP,
        ADD COLUMN "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        ALTER COLUMN "otp_salt" DROP NOT NULL,
        ALTER COLUMN "visit_id" TYPE integer USING (visit_id::integer)
      `);
      await queryRunner.query(`
        ALTER TABLE "api_configs" 
        ADD COLUMN "otp_provider" varchar,
        ADD COLUMN "otp_config_json" text
      `);
    } else {
      await queryRunner.query(`
        ALTER TABLE \`otp_requests\` 
        ADD COLUMN \`campaign_id\` int NULL,
        ADD COLUMN \`provider\` varchar(32) NULL,
        ADD COLUMN \`provider_request_id\` varchar(255) NULL,
        ADD COLUMN \`status\` varchar(32) NOT NULL DEFAULT 'pending',
        ADD COLUMN \`verified_at\` datetime(6) NULL,
        ADD COLUMN \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        MODIFY COLUMN \`otp_salt\` varchar(64) NULL,
        MODIFY COLUMN \`visit_id\` int NULL
      `);
      await queryRunner.query(`
        ALTER TABLE \`api_configs\`
        ADD COLUMN \`otp_provider\` varchar(32) NULL,
        ADD COLUMN \`otp_config_json\` text NULL
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const isPostgres = queryRunner.connection.options.type === 'postgres';

    if (isPostgres) {
      await queryRunner.query(`
        ALTER TABLE "otp_requests" 
        DROP COLUMN "campaign_id",
        DROP COLUMN "provider",
        DROP COLUMN "provider_request_id",
        DROP COLUMN "status",
        DROP COLUMN "verified_at",
        DROP COLUMN "updated_at",
        ALTER COLUMN "otp_salt" SET NOT NULL,
        ALTER COLUMN "visit_id" TYPE varchar
      `);
      await queryRunner.query(`
        ALTER TABLE "api_configs" 
        DROP COLUMN "otp_provider",
        DROP COLUMN "otp_config_json"
      `);
    } else {
      await queryRunner.query(`
        ALTER TABLE \`otp_requests\` 
        DROP COLUMN \`campaign_id\`,
        DROP COLUMN \`provider\`,
        DROP COLUMN \`provider_request_id\`,
        DROP COLUMN \`status\`,
        DROP COLUMN \`verified_at\`,
        DROP COLUMN \`updated_at\`,
        MODIFY COLUMN \`otp_salt\` varchar(64) NOT NULL,
        MODIFY COLUMN \`visit_id\` varchar(64) NULL
      `);
      await queryRunner.query(`
        ALTER TABLE \`api_configs\`
        DROP COLUMN \`otp_provider\`,
        DROP COLUMN \`otp_config_json\`
      `);
    }
  }
}
