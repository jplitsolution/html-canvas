/**
 * conversion_postbacks.msisdn nullable so click_id-only billing callbacks
 * still insert a conversion row before the operator sends the number.
 */
export class NullableMsisdnOnPostbacks1920000000000 {
  name = 'NullableMsisdnOnPostbacks1920000000000';

  async safeQuery(queryRunner, sql) {
    try {
      await queryRunner.query(sql);
    } catch (err) {
      if (!/already exists|does not exist|cannot drop/i.test(err.message)) {
        throw err;
      }
    }
  }

  async up(queryRunner) {
    const isPostgres = queryRunner.connection.options.type === 'postgres';
    if (isPostgres) {
      await this.safeQuery(
        queryRunner,
        `ALTER TABLE "conversion_postbacks" ALTER COLUMN "msisdn" DROP NOT NULL`,
      );
      await this.safeQuery(
        queryRunner,
        `CREATE INDEX IF NOT EXISTS "IDX_postbacks_click_id"
         ON "conversion_postbacks" ("click_id")`,
      );
    } else {
      await this.safeQuery(
        queryRunner,
        `ALTER TABLE \`conversion_postbacks\` MODIFY \`msisdn\` varchar(64) NULL`,
      );
      await this.safeQuery(
        queryRunner,
        `CREATE INDEX \`IDX_postbacks_click_id\`
         ON \`conversion_postbacks\` (\`click_id\`)`,
      );
    }
  }

  async down(queryRunner) {
    const isPostgres = queryRunner.connection.options.type === 'postgres';
    if (isPostgres) {
      await this.safeQuery(
        queryRunner,
        `DROP INDEX IF EXISTS "IDX_postbacks_click_id"`,
      );
    } else {
      await this.safeQuery(
        queryRunner,
        `DROP INDEX \`IDX_postbacks_click_id\` ON \`conversion_postbacks\``,
      );
    }
  }
}
