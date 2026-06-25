import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1730000000000 implements MigrationInterface {
  name = 'InitialSchema1730000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const isPostgres = queryRunner.connection.options.type === 'postgres';

    if (isPostgres) {
      await queryRunner.query(`
        CREATE TABLE "users" (
          "id" SERIAL PRIMARY KEY,
          "email" varchar NOT NULL UNIQUE,
          "password" varchar NOT NULL,
          "name" varchar NOT NULL,
          "avatar" varchar,
          "created_at" TIMESTAMP NOT NULL DEFAULT now(),
          "updated_at" TIMESTAMP NOT NULL DEFAULT now()
        )
      `);

      await queryRunner.query(`
        CREATE TABLE "templates" (
          "id" SERIAL PRIMARY KEY,
          "name" varchar NOT NULL,
          "data" json NOT NULL,
          "user_id" integer,
          "is_prebuilt" boolean NOT NULL DEFAULT false,
          "created_at" TIMESTAMP NOT NULL DEFAULT now(),
          "updated_at" TIMESTAMP NOT NULL DEFAULT now()
        )
      `);

      await queryRunner.query(`
        CREATE TABLE "campaigns" (
          "id" SERIAL PRIMARY KEY,
          "name" varchar NOT NULL,
          "country" varchar NOT NULL,
          "operator" varchar NOT NULL,
          "service_id" varchar,
          "active" boolean NOT NULL DEFAULT false,
          "user_id" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
          "created_at" TIMESTAMP NOT NULL DEFAULT now(),
          "updated_at" TIMESTAMP NOT NULL DEFAULT now()
        )
      `);
      await queryRunner.query(`
        CREATE UNIQUE INDEX "IDX_CAMPAIGNS_COUNTRY_OPERATOR" ON "campaigns" ("country", "operator")
      `);

      await queryRunner.query(`
        CREATE TABLE "campaign_pages" (
          "id" SERIAL PRIMARY KEY,
          "campaign_id" integer NOT NULL REFERENCES "campaigns"("id") ON DELETE CASCADE,
          "page_type" varchar NOT NULL,
          "template_id" integer REFERENCES "templates"("id") ON DELETE SET NULL,
          "created_at" TIMESTAMP NOT NULL DEFAULT now(),
          "updated_at" TIMESTAMP NOT NULL DEFAULT now()
        )
      `);
      await queryRunner.query(`
        CREATE UNIQUE INDEX "IDX_CAMPAIGN_PAGES_TYPE" ON "campaign_pages" ("campaign_id", "page_type")
      `);

      await queryRunner.query(`
        CREATE TABLE "api_configs" (
          "id" SERIAL PRIMARY KEY,
          "campaign_id" integer NOT NULL UNIQUE REFERENCES "campaigns"("id") ON DELETE CASCADE,
          "user_api" varchar,
          "blocklist_api" varchar,
          "subscription_api" varchar,
          "subscribe_api" varchar,
          "headers_json" text,
          "created_at" TIMESTAMP NOT NULL DEFAULT now(),
          "updated_at" TIMESTAMP NOT NULL DEFAULT now()
        )
      `);

      await queryRunner.query(`
        CREATE TABLE "visits" (
          "id" SERIAL PRIMARY KEY,
          "campaign_id" integer,
          "phone" varchar,
          "country" varchar,
          "operator" varchar,
          "ip_address" varchar,
          "user_agent" varchar,
          "landing_url" text,
          "visit_status" varchar NOT NULL DEFAULT 'VISIT',
          "page_type" varchar,
          "created_at" TIMESTAMP NOT NULL DEFAULT now(),
          "updated_at" TIMESTAMP NOT NULL DEFAULT now()
        )
      `);
      await queryRunner.query(`
        CREATE INDEX "IDX_VISITS_CAMPAIGN" ON "visits" ("campaign_id")
      `);

      await queryRunner.query(`
        CREATE TABLE "visit_events" (
          "id" SERIAL PRIMARY KEY,
          "visit_id" integer NOT NULL REFERENCES "visits"("id") ON DELETE CASCADE,
          "event_type" varchar NOT NULL,
          "metadata" jsonb,
          "created_at" TIMESTAMP NOT NULL DEFAULT now()
        )
      `);
      await queryRunner.query(`
        CREATE INDEX "IDX_EVENTS_VISIT" ON "visit_events" ("visit_id")
      `);
    } else {
      await queryRunner.query(`
        CREATE TABLE IF NOT EXISTS \`users\` (
          \`id\` int NOT NULL AUTO_INCREMENT,
          \`email\` varchar(255) NOT NULL,
          \`password\` varchar(255) NOT NULL,
          \`name\` varchar(255) NOT NULL,
          \`avatar\` varchar(255) NULL,
          \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
          \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
          PRIMARY KEY (\`id\`),
          UNIQUE KEY \`UQ_users_email\` (\`email\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);

      await queryRunner.query(`
        CREATE TABLE IF NOT EXISTS \`templates\` (
          \`id\` int NOT NULL AUTO_INCREMENT,
          \`name\` varchar(255) NOT NULL,
          \`data\` json NOT NULL,
          \`user_id\` int NULL,
          \`is_prebuilt\` tinyint NOT NULL DEFAULT 0,
          \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
          \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
          PRIMARY KEY (\`id\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);

      await queryRunner.query(`
        CREATE TABLE IF NOT EXISTS \`campaigns\` (
          \`id\` int NOT NULL AUTO_INCREMENT,
          \`name\` varchar(255) NOT NULL,
          \`country\` varchar(255) NOT NULL,
          \`operator\` varchar(255) NOT NULL,
          \`service_id\` varchar(255) NULL,
          \`active\` tinyint NOT NULL DEFAULT 0,
          \`user_id\` int NOT NULL,
          \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
          \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
          PRIMARY KEY (\`id\`),
          UNIQUE KEY \`IDX_CAMPAIGNS_COUNTRY_OPERATOR\` (\`country\`, \`operator\`),
          CONSTRAINT \`FK_campaigns_user\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\` (\`id\`) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);

      await queryRunner.query(`
        CREATE TABLE IF NOT EXISTS \`campaign_pages\` (
          \`id\` int NOT NULL AUTO_INCREMENT,
          \`campaign_id\` int NOT NULL,
          \`page_type\` varchar(255) NOT NULL,
          \`template_id\` int NULL,
          \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
          \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
          PRIMARY KEY (\`id\`),
          UNIQUE KEY \`IDX_CAMPAIGN_PAGES_TYPE\` (\`campaign_id\`, \`page_type\`),
          CONSTRAINT \`FK_campaign_pages_campaign\` FOREIGN KEY (\`campaign_id\`) REFERENCES \`campaigns\` (\`id\`) ON DELETE CASCADE,
          CONSTRAINT \`FK_campaign_pages_template\` FOREIGN KEY (\`template_id\`) REFERENCES \`templates\` (\`id\`) ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);

      await queryRunner.query(`
        CREATE TABLE IF NOT EXISTS \`api_configs\` (
          \`id\` int NOT NULL AUTO_INCREMENT,
          \`campaign_id\` int NOT NULL,
          \`user_api\` varchar(255) NULL,
          \`blocklist_api\` varchar(255) NULL,
          \`subscription_api\` varchar(255) NULL,
          \`subscribe_api\` varchar(255) NULL,
          \`headers_json\` text NULL,
          \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
          \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
          PRIMARY KEY (\`id\`),
          UNIQUE KEY \`UQ_api_configs_campaign\` (\`campaign_id\`),
          CONSTRAINT \`FK_api_configs_campaign\` FOREIGN KEY (\`campaign_id\`) REFERENCES \`campaigns\` (\`id\`) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);

      await queryRunner.query(`
        CREATE TABLE IF NOT EXISTS \`visits\` (
          \`id\` int NOT NULL AUTO_INCREMENT,
          \`campaign_id\` int NULL,
          \`phone\` varchar(255) NULL,
          \`country\` varchar(255) NULL,
          \`operator\` varchar(255) NULL,
          \`ip_address\` varchar(255) NULL,
          \`user_agent\` varchar(255) NULL,
          \`landing_url\` text NULL,
          \`visit_status\` varchar(255) NOT NULL DEFAULT 'VISIT',
          \`page_type\` varchar(255) NULL,
          \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
          \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
          PRIMARY KEY (\`id\`),
          KEY \`IDX_VISITS_CAMPAIGN\` (\`campaign_id\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);

      await queryRunner.query(`
        CREATE TABLE IF NOT EXISTS \`visit_events\` (
          \`id\` int NOT NULL AUTO_INCREMENT,
          \`visit_id\` int NOT NULL,
          \`event_type\` varchar(255) NOT NULL,
          \`metadata\` json NULL,
          \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
          PRIMARY KEY (\`id\`),
          KEY \`IDX_EVENTS_VISIT\` (\`visit_id\`),
          CONSTRAINT \`FK_events_visit\` FOREIGN KEY (\`visit_id\`) REFERENCES \`visits\` (\`id\`) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const isPostgres = queryRunner.connection.options.type === 'postgres';

    if (isPostgres) {
      await queryRunner.query(`DROP TABLE IF EXISTS "visit_events"`);
      await queryRunner.query(`DROP TABLE IF EXISTS "visits"`);
      await queryRunner.query(`DROP TABLE IF EXISTS "api_configs"`);
      await queryRunner.query(`DROP TABLE IF EXISTS "campaign_pages"`);
      await queryRunner.query(`DROP TABLE IF EXISTS "campaigns"`);
      await queryRunner.query(`DROP TABLE IF EXISTS "templates"`);
      await queryRunner.query(`DROP TABLE IF EXISTS "users"`);
    } else {
      await queryRunner.query(`SET FOREIGN_KEY_CHECKS = 0`);
      await queryRunner.query(`DROP TABLE IF EXISTS \`visit_events\``);
      await queryRunner.query(`DROP TABLE IF EXISTS \`visits\``);
      await queryRunner.query(`DROP TABLE IF EXISTS \`api_configs\``);
      await queryRunner.query(`DROP TABLE IF EXISTS \`campaign_pages\``);
      await queryRunner.query(`DROP TABLE IF EXISTS \`campaigns\``);
      await queryRunner.query(`DROP TABLE IF EXISTS \`templates\``);
      await queryRunner.query(`DROP TABLE IF EXISTS \`users\``);
      await queryRunner.query(`SET FOREIGN_KEY_CHECKS = 1`);
    }
  }
}
