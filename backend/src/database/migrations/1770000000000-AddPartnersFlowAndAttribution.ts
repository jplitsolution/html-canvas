import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Idempotent migration: each step checks for existing tables/columns before
 * creating them, so it can safely resume after a partial/failed run.
 */
export class AddPartnersFlowAndAttribution1770000000000
  implements MigrationInterface
{
  name = 'AddPartnersFlowAndAttribution1770000000000';

  private async addColumnIfMissing(
    queryRunner: QueryRunner,
    table: string,
    column: string,
    ddl: string,
  ): Promise<void> {
    const has = await queryRunner.hasColumn(table, column);
    if (!has) {
      await queryRunner.query(ddl);
    }
  }

  private async safeQuery(
    queryRunner: QueryRunner,
    sql: string,
  ): Promise<void> {
    try {
      await queryRunner.query(sql);
    } catch {
      // ignore (e.g. index already exists) — keeps the migration idempotent
    }
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    const isPostgres = queryRunner.connection.options.type === 'postgres';

    if (isPostgres) {
      if (!(await queryRunner.hasTable('vendors'))) {
        await queryRunner.query(`
          CREATE TABLE "vendors" (
            "id" SERIAL PRIMARY KEY,
            "name" varchar NOT NULL,
            "code" varchar NOT NULL,
            "user_id" integer NOT NULL,
            "active" boolean NOT NULL DEFAULT true,
            "created_at" TIMESTAMP NOT NULL DEFAULT now(),
            "updated_at" TIMESTAMP NOT NULL DEFAULT now()
          )
        `);
        await this.safeQuery(
          queryRunner,
          `CREATE UNIQUE INDEX "IDX_vendors_user_code" ON "vendors" ("user_id", "code")`,
        );
      }

      if (!(await queryRunner.hasTable('affiliates'))) {
        await queryRunner.query(`
          CREATE TABLE "affiliates" (
            "id" SERIAL PRIMARY KEY,
            "vendor_id" integer NOT NULL,
            "name" varchar NOT NULL,
            "code" varchar NOT NULL,
            "user_id" integer NOT NULL,
            "active" boolean NOT NULL DEFAULT true,
            "created_at" TIMESTAMP NOT NULL DEFAULT now(),
            "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
            CONSTRAINT "FK_affiliates_vendor" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE CASCADE
          )
        `);
        await this.safeQuery(
          queryRunner,
          `CREATE UNIQUE INDEX "IDX_affiliates_user_code" ON "affiliates" ("user_id", "code")`,
        );
        await this.safeQuery(
          queryRunner,
          `CREATE INDEX "IDX_affiliates_vendor" ON "affiliates" ("vendor_id")`,
        );
      }

      await this.addColumnIfMissing(
        queryRunner,
        'campaigns',
        'vendor_id',
        `ALTER TABLE "campaigns" ADD COLUMN "vendor_id" integer`,
      );
      await this.addColumnIfMissing(
        queryRunner,
        'campaigns',
        'verification_mode',
        `ALTER TABLE "campaigns" ADD COLUMN "verification_mode" varchar(16)`,
      );
      await this.addColumnIfMissing(
        queryRunner,
        'campaigns',
        'flow_config',
        `ALTER TABLE "campaigns" ADD COLUMN "flow_config" text`,
      );

      await this.addColumnIfMissing(
        queryRunner,
        'visits',
        'vendor_id',
        `ALTER TABLE "visits" ADD COLUMN "vendor_id" integer`,
      );
      await this.addColumnIfMissing(
        queryRunner,
        'visits',
        'affiliate_id',
        `ALTER TABLE "visits" ADD COLUMN "affiliate_id" integer`,
      );
      await this.addColumnIfMissing(
        queryRunner,
        'visits',
        'click_id',
        `ALTER TABLE "visits" ADD COLUMN "click_id" varchar`,
      );
      await this.addColumnIfMissing(
        queryRunner,
        'visits',
        'vid_raw',
        `ALTER TABLE "visits" ADD COLUMN "vid_raw" varchar`,
      );
      await this.addColumnIfMissing(
        queryRunner,
        'visits',
        'aff_raw',
        `ALTER TABLE "visits" ADD COLUMN "aff_raw" varchar`,
      );
      await this.safeQuery(
        queryRunner,
        `CREATE INDEX "IDX_visits_vendor" ON "visits" ("vendor_id")`,
      );
      await this.safeQuery(
        queryRunner,
        `CREATE INDEX "IDX_visits_affiliate" ON "visits" ("affiliate_id")`,
      );
      await this.safeQuery(
        queryRunner,
        `CREATE INDEX "IDX_visits_click" ON "visits" ("click_id")`,
      );

      await this.addColumnIfMissing(
        queryRunner,
        'api_configs',
        'resolve_msisdn_url',
        `ALTER TABLE "api_configs" ADD COLUMN "resolve_msisdn_url" varchar`,
      );
    } else {
      if (!(await queryRunner.hasTable('vendors'))) {
        await queryRunner.query(`
          CREATE TABLE \`vendors\` (
            \`id\` int NOT NULL AUTO_INCREMENT,
            \`name\` varchar(255) NOT NULL,
            \`code\` varchar(255) NOT NULL,
            \`user_id\` int NOT NULL,
            \`active\` tinyint NOT NULL DEFAULT 1,
            \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
            \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
            PRIMARY KEY (\`id\`),
            UNIQUE INDEX \`IDX_vendors_user_code\` (\`user_id\`, \`code\`)
          ) ENGINE=InnoDB
        `);
      }

      if (!(await queryRunner.hasTable('affiliates'))) {
        await queryRunner.query(`
          CREATE TABLE \`affiliates\` (
            \`id\` int NOT NULL AUTO_INCREMENT,
            \`vendor_id\` int NOT NULL,
            \`name\` varchar(255) NOT NULL,
            \`code\` varchar(255) NOT NULL,
            \`user_id\` int NOT NULL,
            \`active\` tinyint NOT NULL DEFAULT 1,
            \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
            \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
            PRIMARY KEY (\`id\`),
            UNIQUE INDEX \`IDX_affiliates_user_code\` (\`user_id\`, \`code\`),
            INDEX \`IDX_affiliates_vendor\` (\`vendor_id\`),
            CONSTRAINT \`FK_affiliates_vendor\` FOREIGN KEY (\`vendor_id\`) REFERENCES \`vendors\`(\`id\`) ON DELETE CASCADE
          ) ENGINE=InnoDB
        `);
      }

      await this.addColumnIfMissing(
        queryRunner,
        'campaigns',
        'vendor_id',
        `ALTER TABLE \`campaigns\` ADD COLUMN \`vendor_id\` int NULL`,
      );
      await this.addColumnIfMissing(
        queryRunner,
        'campaigns',
        'verification_mode',
        `ALTER TABLE \`campaigns\` ADD COLUMN \`verification_mode\` varchar(16) NULL`,
      );
      await this.addColumnIfMissing(
        queryRunner,
        'campaigns',
        'flow_config',
        `ALTER TABLE \`campaigns\` ADD COLUMN \`flow_config\` text NULL`,
      );

      await this.addColumnIfMissing(
        queryRunner,
        'visits',
        'vendor_id',
        `ALTER TABLE \`visits\` ADD COLUMN \`vendor_id\` int NULL`,
      );
      await this.addColumnIfMissing(
        queryRunner,
        'visits',
        'affiliate_id',
        `ALTER TABLE \`visits\` ADD COLUMN \`affiliate_id\` int NULL`,
      );
      await this.addColumnIfMissing(
        queryRunner,
        'visits',
        'click_id',
        `ALTER TABLE \`visits\` ADD COLUMN \`click_id\` varchar(255) NULL`,
      );
      await this.addColumnIfMissing(
        queryRunner,
        'visits',
        'vid_raw',
        `ALTER TABLE \`visits\` ADD COLUMN \`vid_raw\` varchar(255) NULL`,
      );
      await this.addColumnIfMissing(
        queryRunner,
        'visits',
        'aff_raw',
        `ALTER TABLE \`visits\` ADD COLUMN \`aff_raw\` varchar(255) NULL`,
      );
      await this.safeQuery(
        queryRunner,
        `CREATE INDEX \`IDX_visits_vendor\` ON \`visits\` (\`vendor_id\`)`,
      );
      await this.safeQuery(
        queryRunner,
        `CREATE INDEX \`IDX_visits_affiliate\` ON \`visits\` (\`affiliate_id\`)`,
      );
      await this.safeQuery(
        queryRunner,
        `CREATE INDEX \`IDX_visits_click\` ON \`visits\` (\`click_id\`)`,
      );

      await this.addColumnIfMissing(
        queryRunner,
        'api_configs',
        'resolve_msisdn_url',
        `ALTER TABLE \`api_configs\` ADD COLUMN \`resolve_msisdn_url\` varchar(1024) NULL`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const isPostgres = queryRunner.connection.options.type === 'postgres';

    if (isPostgres) {
      await this.safeQuery(
        queryRunner,
        `ALTER TABLE "api_configs" DROP COLUMN "resolve_msisdn_url"`,
      );
      await this.safeQuery(queryRunner, `DROP INDEX IF EXISTS "IDX_visits_click"`);
      await this.safeQuery(queryRunner, `DROP INDEX IF EXISTS "IDX_visits_affiliate"`);
      await this.safeQuery(queryRunner, `DROP INDEX IF EXISTS "IDX_visits_vendor"`);
      await this.safeQuery(
        queryRunner,
        `ALTER TABLE "visits" DROP COLUMN "vendor_id", DROP COLUMN "affiliate_id", DROP COLUMN "click_id", DROP COLUMN "vid_raw", DROP COLUMN "aff_raw"`,
      );
      await this.safeQuery(
        queryRunner,
        `ALTER TABLE "campaigns" DROP COLUMN "vendor_id", DROP COLUMN "verification_mode", DROP COLUMN "flow_config"`,
      );
      await this.safeQuery(queryRunner, `DROP TABLE "affiliates"`);
      await this.safeQuery(queryRunner, `DROP TABLE "vendors"`);
    } else {
      await this.safeQuery(
        queryRunner,
        `ALTER TABLE \`api_configs\` DROP COLUMN \`resolve_msisdn_url\``,
      );
      await this.safeQuery(queryRunner, `DROP INDEX \`IDX_visits_click\` ON \`visits\``);
      await this.safeQuery(queryRunner, `DROP INDEX \`IDX_visits_affiliate\` ON \`visits\``);
      await this.safeQuery(queryRunner, `DROP INDEX \`IDX_visits_vendor\` ON \`visits\``);
      await this.safeQuery(
        queryRunner,
        `ALTER TABLE \`visits\` DROP COLUMN \`vendor_id\`, DROP COLUMN \`affiliate_id\`, DROP COLUMN \`click_id\`, DROP COLUMN \`vid_raw\`, DROP COLUMN \`aff_raw\``,
      );
      await this.safeQuery(
        queryRunner,
        `ALTER TABLE \`campaigns\` DROP COLUMN \`vendor_id\`, DROP COLUMN \`verification_mode\`, DROP COLUMN \`flow_config\``,
      );
      await this.safeQuery(queryRunner, `DROP TABLE \`affiliates\``);
      await this.safeQuery(queryRunner, `DROP TABLE \`vendors\``);
    }
  }
}
