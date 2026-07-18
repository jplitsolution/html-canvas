import { MigrationInterface, QueryRunner } from 'typeorm';

export class CampaignMultipleVendors1780000000000
  implements MigrationInterface
{
  name = 'CampaignMultipleVendors1780000000000';

  private async safeQuery(
    queryRunner: QueryRunner,
    sql: string,
  ): Promise<void> {
    try {
      await queryRunner.query(sql);
    } catch {
      // ignore
    }
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    const isPostgres = queryRunner.connection.options.type === 'postgres';

    if (isPostgres) {
      if (!(await queryRunner.hasTable('campaign_vendors'))) {
        await queryRunner.query(`
          CREATE TABLE "campaign_vendors" (
            "campaign_id" integer NOT NULL,
            "vendor_id" integer NOT NULL,
            CONSTRAINT "PK_campaign_vendors" PRIMARY KEY ("campaign_id", "vendor_id")
          )
        `);

        await this.safeQuery(
          queryRunner,
          `CREATE INDEX "IDX_campaign_vendors_campaign_id" ON "campaign_vendors" ("campaign_id")`,
        );

        await this.safeQuery(
          queryRunner,
          `CREATE INDEX "IDX_campaign_vendors_vendor_id" ON "campaign_vendors" ("vendor_id")`,
        );

        await this.safeQuery(
          queryRunner,
          `ALTER TABLE "campaign_vendors" ADD CONSTRAINT "FK_campaign_vendors_campaign" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
        );

        await this.safeQuery(
          queryRunner,
          `ALTER TABLE "campaign_vendors" ADD CONSTRAINT "FK_campaign_vendors_vendor" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
        );

        // Migrate existing data
        if (await queryRunner.hasColumn('campaigns', 'vendor_id')) {
          await this.safeQuery(
            queryRunner,
            `INSERT INTO "campaign_vendors" ("campaign_id", "vendor_id") SELECT "id", "vendor_id" FROM "campaigns" WHERE "vendor_id" IS NOT NULL ON CONFLICT DO NOTHING`,
          );
          await this.safeQuery(
            queryRunner,
            `ALTER TABLE "campaigns" DROP COLUMN "vendor_id"`,
          );
        }
      }
    } else {
      if (!(await queryRunner.hasTable('campaign_vendors'))) {
        await queryRunner.query(`
          CREATE TABLE \`campaign_vendors\` (
            \`campaign_id\` int NOT NULL,
            \`vendor_id\` int NOT NULL,
            PRIMARY KEY (\`campaign_id\`, \`vendor_id\`),
            INDEX \`IDX_campaign_vendors_campaign_id\` (\`campaign_id\`),
            INDEX \`IDX_campaign_vendors_vendor_id\` (\`vendor_id\`),
            CONSTRAINT \`FK_campaign_vendors_campaign\` FOREIGN KEY (\`campaign_id\`) REFERENCES \`campaigns\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
            CONSTRAINT \`FK_campaign_vendors_vendor\` FOREIGN KEY (\`vendor_id\`) REFERENCES \`vendors\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
          ) ENGINE=InnoDB
        `);

        // Migrate existing data
        if (await queryRunner.hasColumn('campaigns', 'vendor_id')) {
          await this.safeQuery(
            queryRunner,
            `INSERT IGNORE INTO \`campaign_vendors\` (\`campaign_id\`, \`vendor_id\`) SELECT \`id\`, \`vendor_id\` FROM \`campaigns\` WHERE \`vendor_id\` IS NOT NULL`,
          );
          await this.safeQuery(
            queryRunner,
            `ALTER TABLE \`campaigns\` DROP COLUMN \`vendor_id\``,
          );
        }
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const isPostgres = queryRunner.connection.options.type === 'postgres';

    if (isPostgres) {
      if (!(await queryRunner.hasColumn('campaigns', 'vendor_id'))) {
        await queryRunner.query(
          `ALTER TABLE "campaigns" ADD COLUMN "vendor_id" integer`,
        );
        // Best effort rollback: just take the first vendor for each campaign
        await this.safeQuery(
          queryRunner,
          `UPDATE "campaigns" c SET "vendor_id" = (SELECT "vendor_id" FROM "campaign_vendors" cv WHERE cv."campaign_id" = c."id" LIMIT 1)`,
        );
      }
      await this.safeQuery(queryRunner, `DROP TABLE "campaign_vendors"`);
    } else {
      if (!(await queryRunner.hasColumn('campaigns', 'vendor_id'))) {
        await queryRunner.query(
          `ALTER TABLE \`campaigns\` ADD COLUMN \`vendor_id\` int NULL`,
        );
        await this.safeQuery(
          queryRunner,
          `UPDATE \`campaigns\` c SET \`vendor_id\` = (SELECT \`vendor_id\` FROM \`campaign_vendors\` cv WHERE cv.\`campaign_id\` = c.\`id\` LIMIT 1)`,
        );
      }
      await this.safeQuery(queryRunner, `DROP TABLE \`campaign_vendors\``);
    }
  }
}
