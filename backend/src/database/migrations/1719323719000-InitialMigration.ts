import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialMigration1719323719000 implements MigrationInterface {
  name = 'InitialMigration1719323719000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const isPostgres = queryRunner.connection.options.type === 'postgres';

    if (isPostgres) {
      // Postgres implementation
      // 1. Add slug and service_id to projects
      await queryRunner.query(`
        ALTER TABLE "projects" 
        ADD COLUMN "slug" varchar, 
        ADD COLUMN "service_id" varchar
      `);
      await queryRunner.query(`
        CREATE UNIQUE INDEX "IDX_PROJECTS_SLUG" ON "projects" ("slug")
      `);

      // 2. Create pages table
      await queryRunner.query(`
        CREATE TABLE "pages" (
          "id" SERIAL PRIMARY KEY,
          "project_id" integer NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
          "template_id" integer REFERENCES "templates"("id") ON DELETE SET NULL,
          "name" varchar NOT NULL,
          "slug" varchar NOT NULL,
          "page_type" varchar NOT NULL DEFAULT 'PLAN',
          "created_at" TIMESTAMP NOT NULL DEFAULT now(),
          "updated_at" TIMESTAMP NOT NULL DEFAULT now()
        )
      `);
      await queryRunner.query(`
        CREATE INDEX "IDX_PAGES_PROJECT_TYPE" ON "pages" ("project_id", "page_type")
      `);

      // 3. Create blocklist_entries table
      await queryRunner.query(`
        CREATE TABLE "blocklist_entries" (
          "id" SERIAL PRIMARY KEY,
          "phone" varchar NOT NULL,
          "reason" varchar,
          "active" boolean NOT NULL DEFAULT true,
          "created_at" TIMESTAMP NOT NULL DEFAULT now()
        )
      `);
      await queryRunner.query(`
        CREATE INDEX "IDX_BLOCKLIST_PHONE" ON "blocklist_entries" ("phone")
      `);

      // 4. Create subscriptions table
      await queryRunner.query(`
        CREATE TABLE "subscriptions" (
          "id" SERIAL PRIMARY KEY,
          "phone" varchar NOT NULL,
          "service_id" varchar NOT NULL,
          "status" varchar NOT NULL DEFAULT 'PENDING',
          "created_at" TIMESTAMP NOT NULL DEFAULT now(),
          "updated_at" TIMESTAMP NOT NULL DEFAULT now()
        )
      `);
      await queryRunner.query(`
        CREATE INDEX "IDX_SUBSCRIPTIONS_PHONE_SERVICE" ON "subscriptions" ("phone", "service_id")
      `);

      // 5. Create api_configs table
      await queryRunner.query(`
        CREATE TABLE "api_configs" (
          "id" SERIAL PRIMARY KEY,
          "project_id" integer NOT NULL UNIQUE REFERENCES "projects"("id") ON DELETE CASCADE,
          "user_api" varchar,
          "blocklist_api" varchar,
          "subscription_api" varchar,
          "subscribe_api" varchar,
          "headers_json" text,
          "created_at" TIMESTAMP NOT NULL DEFAULT now(),
          "updated_at" TIMESTAMP NOT NULL DEFAULT now()
        )
      `);

      // 6. Create visits table
      await queryRunner.query(`
        CREATE TABLE "visits" (
          "id" SERIAL PRIMARY KEY,
          "project_id" integer NOT NULL,
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
        CREATE INDEX "IDX_VISITS_PROJECT" ON "visits" ("project_id")
      `);

      // 7. Create visit_events table
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
      // MySQL / default implementation
      // 1. Add slug and service_id to projects
      // First check if columns already exist (to avoid seed/sync conflicts in local development)
      const tableInfo = await queryRunner.query(`DESCRIBE \`projects\``);
      const hasSlug = tableInfo.some((col: any) => col.Field === 'slug');
      const hasServiceId = tableInfo.some((col: any) => col.Field === 'service_id');

      if (!hasSlug) {
        await queryRunner.query(`
          ALTER TABLE \`projects\` 
          ADD COLUMN \`slug\` varchar(255) NULL,
          ADD UNIQUE INDEX \`IDX_PROJECTS_SLUG\` (\`slug\`)
        `);
      }
      if (!hasServiceId) {
        await queryRunner.query(`
          ALTER TABLE \`projects\` 
          ADD COLUMN \`service_id\` varchar(255) NULL
        `);
      }

      // 2. Create pages table
      await queryRunner.query(`
        CREATE TABLE IF NOT EXISTS \`pages\` (
          \`id\` int NOT NULL AUTO_INCREMENT,
          \`project_id\` int NOT NULL,
          \`template_id\` int NULL,
          \`name\` varchar(255) NOT NULL,
          \`slug\` varchar(255) NOT NULL,
          \`page_type\` varchar(255) NOT NULL DEFAULT 'PLAN',
          \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
          \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
          PRIMARY KEY (\`id\`),
          KEY \`IDX_PAGES_PROJECT_TYPE\` (\`project_id\`, \`page_type\`),
          CONSTRAINT \`FK_PAGES_PROJECT\` FOREIGN KEY (\`project_id\`) REFERENCES \`projects\` (\`id\`) ON DELETE CASCADE,
          CONSTRAINT \`FK_PAGES_TEMPLATE\` FOREIGN KEY (\`template_id\`) REFERENCES \`templates\` (\`id\`) ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);

      // 3. Create blocklist_entries table
      await queryRunner.query(`
        CREATE TABLE IF NOT EXISTS \`blocklist_entries\` (
          \`id\` int NOT NULL AUTO_INCREMENT,
          \`phone\` varchar(255) NOT NULL,
          \`reason\` varchar(255) NULL,
          \`active\` tinyint NOT NULL DEFAULT 1,
          \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
          PRIMARY KEY (\`id\`),
          KEY \`IDX_BLOCKLIST_PHONE\` (\`phone\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);

      // 4. Create subscriptions table
      await queryRunner.query(`
        CREATE TABLE IF NOT EXISTS \`subscriptions\` (
          \`id\` int NOT NULL AUTO_INCREMENT,
          \`phone\` varchar(255) NOT NULL,
          \`service_id\` varchar(255) NOT NULL,
          \`status\` varchar(255) NOT NULL DEFAULT 'PENDING',
          \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
          \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
          PRIMARY KEY (\`id\`),
          KEY \`IDX_SUBSCRIPTIONS_PHONE_SERVICE\` (\`phone\`, \`service_id\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);

      // 5. Create api_configs table
      await queryRunner.query(`
        CREATE TABLE IF NOT EXISTS \`api_configs\` (
          \`id\` int NOT NULL AUTO_INCREMENT,
          \`project_id\` int NOT NULL UNIQUE,
          \`user_api\` varchar(255) NULL,
          \`blocklist_api\` varchar(255) NULL,
          \`subscription_api\` varchar(255) NULL,
          \`subscribe_api\` varchar(255) NULL,
          \`headers_json\` text NULL,
          \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
          \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
          PRIMARY KEY (\`id\`),
          CONSTRAINT \`FK_API_CONFIGS_PROJECT\` FOREIGN KEY (\`project_id\`) REFERENCES \`projects\` (\`id\`) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);

      // 6. Create visits table
      await queryRunner.query(`
        CREATE TABLE IF NOT EXISTS \`visits\` (
          \`id\` int NOT NULL AUTO_INCREMENT,
          \`project_id\` int NOT NULL,
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
          KEY \`IDX_VISITS_PROJECT\` (\`project_id\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);

      // 7. Create visit_events table
      await queryRunner.query(`
        CREATE TABLE IF NOT EXISTS \`visit_events\` (
          \`id\` int NOT NULL AUTO_INCREMENT,
          \`visit_id\` int NOT NULL,
          \`event_type\` varchar(255) NOT NULL,
          \`metadata\` json NULL,
          \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
          PRIMARY KEY (\`id\`),
          KEY \`IDX_EVENTS_VISIT\` (\`visit_id\`),
          CONSTRAINT \`FK_EVENTS_VISIT\` FOREIGN KEY (\`visit_id\`) REFERENCES \`visits\` (\`id\`) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const isPostgres = queryRunner.connection.options.type === 'postgres';

    if (isPostgres) {
      await queryRunner.query(`DROP TABLE "visit_events"`);
      await queryRunner.query(`DROP TABLE "visits"`);
      await queryRunner.query(`DROP TABLE "api_configs"`);
      await queryRunner.query(`DROP TABLE "subscriptions"`);
      await queryRunner.query(`DROP TABLE "blocklist_entries"`);
      await queryRunner.query(`DROP TABLE "pages"`);
      await queryRunner.query(`DROP INDEX "IDX_PROJECTS_SLUG"`);
      await queryRunner.query(`ALTER TABLE "projects" DROP COLUMN "service_id"`);
      await queryRunner.query(`ALTER TABLE "projects" DROP COLUMN "slug"`);
    } else {
      await queryRunner.query(`DROP TABLE IF EXISTS \`visit_events\``);
      await queryRunner.query(`DROP TABLE IF EXISTS \`visits\``);
      await queryRunner.query(`DROP TABLE IF EXISTS \`api_configs\``);
      await queryRunner.query(`DROP TABLE IF EXISTS \`subscriptions\``);
      await queryRunner.query(`DROP TABLE IF EXISTS \`blocklist_entries\``);
      await queryRunner.query(`DROP TABLE IF EXISTS \`pages\``);
      await queryRunner.query(`ALTER TABLE \`projects\` DROP INDEX \`IDX_PROJECTS_SLUG\``);
      await queryRunner.query(`ALTER TABLE \`projects\` DROP COLUMN \`service_id\``);
      await queryRunner.query(`ALTER TABLE \`projects\` DROP COLUMN \`slug\``);
    }
  }
}
