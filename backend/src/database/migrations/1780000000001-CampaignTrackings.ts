import { MigrationInterface, QueryRunner } from 'typeorm';

export class CampaignTrackings1780000000001 implements MigrationInterface {
  name = 'CampaignTrackings1780000000001';

  private async safeQuery(queryRunner: QueryRunner, sql: string): Promise<void> {
    try {
      await queryRunner.query(sql);
    } catch {
      // ignore
    }
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    const isPostgres = queryRunner.connection.options.type === 'postgres';

    if (isPostgres) {
      if (!(await queryRunner.hasTable('campaign_trackings'))) {
        await queryRunner.query(`
          CREATE TABLE "campaign_trackings" (
            "id" SERIAL NOT NULL,
            "campaign_id" integer NOT NULL,
            "vendor_id" integer NOT NULL,
            "affiliate_id" integer,
            "created_at" TIMESTAMP NOT NULL DEFAULT now(),
            CONSTRAINT "PK_campaign_trackings" PRIMARY KEY ("id")
          )
        `);

        await this.safeQuery(queryRunner, `CREATE INDEX "IDX_campaign_trackings_campaign_id" ON "campaign_trackings" ("campaign_id")`);
        await this.safeQuery(queryRunner, `CREATE INDEX "IDX_campaign_trackings_vendor_id" ON "campaign_trackings" ("vendor_id")`);
        await this.safeQuery(queryRunner, `CREATE INDEX "IDX_campaign_trackings_affiliate_id" ON "campaign_trackings" ("affiliate_id")`);

        await this.safeQuery(queryRunner, `ALTER TABLE "campaign_trackings" ADD CONSTRAINT "FK_campaign_trackings_campaign" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await this.safeQuery(queryRunner, `ALTER TABLE "campaign_trackings" ADD CONSTRAINT "FK_campaign_trackings_vendor" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await this.safeQuery(queryRunner, `ALTER TABLE "campaign_trackings" ADD CONSTRAINT "FK_campaign_trackings_affiliate" FOREIGN KEY ("affiliate_id") REFERENCES "affiliates"("id") ON DELETE CASCADE ON UPDATE CASCADE`);

        // Migrate existing data
        if (await queryRunner.hasTable('campaign_vendors')) {
          await this.safeQuery(
            queryRunner,
            `INSERT INTO "campaign_trackings" ("campaign_id", "vendor_id") SELECT "campaign_id", "vendor_id" FROM "campaign_vendors"`
          );
          await this.safeQuery(queryRunner, `DROP TABLE "campaign_vendors"`);
        }
      }
    } else {
      if (!(await queryRunner.hasTable('campaign_trackings'))) {
        await queryRunner.query(`
          CREATE TABLE \`campaign_trackings\` (
            \`id\` int NOT NULL AUTO_INCREMENT,
            \`campaign_id\` int NOT NULL,
            \`vendor_id\` int NOT NULL,
            \`affiliate_id\` int NULL,
            \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (\`id\`),
            INDEX \`IDX_campaign_trackings_campaign_id\` (\`campaign_id\`),
            INDEX \`IDX_campaign_trackings_vendor_id\` (\`vendor_id\`),
            INDEX \`IDX_campaign_trackings_affiliate_id\` (\`affiliate_id\`),
            CONSTRAINT \`FK_campaign_trackings_campaign\` FOREIGN KEY (\`campaign_id\`) REFERENCES \`campaigns\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
            CONSTRAINT \`FK_campaign_trackings_vendor\` FOREIGN KEY (\`vendor_id\`) REFERENCES \`vendors\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
            CONSTRAINT \`FK_campaign_trackings_affiliate\` FOREIGN KEY (\`affiliate_id\`) REFERENCES \`affiliates\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
          ) ENGINE=InnoDB
        `);

        // Migrate existing data
        if (await queryRunner.hasTable('campaign_vendors')) {
          await this.safeQuery(
            queryRunner,
            `INSERT INTO \`campaign_trackings\` (\`campaign_id\`, \`vendor_id\`) SELECT \`campaign_id\`, \`vendor_id\` FROM \`campaign_vendors\``
          );
          await this.safeQuery(queryRunner, `DROP TABLE \`campaign_vendors\``);
        }
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Basic rollback
    await this.safeQuery(queryRunner, `DROP TABLE \`campaign_trackings\``);
  }
}
