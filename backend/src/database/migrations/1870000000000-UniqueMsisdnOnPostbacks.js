/**
 * conversion_postbacks: one row per msisdn (SAFWAP callback_manage parity).
 * Dedupe keeping latest id, then UNIQUE(msisdn).
 */
export class UniqueMsisdnOnPostbacks1870000000000 {
  name = 'UniqueMsisdnOnPostbacks1870000000000';

  async safeQuery(queryRunner, sql) {
    try {
      await queryRunner.query(sql);
    } catch (err) {
      if (!/already exists|duplicate|does not exist/i.test(err.message)) {
        throw err;
      }
    }
  }

  async up(queryRunner) {
    const isPostgres = queryRunner.connection.options.type === 'postgres';

    if (isPostgres) {
      // Keep highest id per msisdn; drop older duplicates.
      await queryRunner.query(`
        DELETE FROM "conversion_postbacks" a
        USING "conversion_postbacks" b
        WHERE a.msisdn = b.msisdn
          AND a.id < b.id
      `);

      await this.safeQuery(
        queryRunner,
        `DROP INDEX IF EXISTS "IDX_postbacks_msisdn_status"`,
      );
      await this.safeQuery(
        queryRunner,
        `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_conversion_postbacks_msisdn"
         ON "conversion_postbacks" ("msisdn")`,
      );
    } else {
      await queryRunner.query(`
        DELETE a FROM \`conversion_postbacks\` a
        INNER JOIN \`conversion_postbacks\` b
          ON a.msisdn = b.msisdn AND a.id < b.id
      `);
      await this.safeQuery(
        queryRunner,
        `DROP INDEX \`IDX_postbacks_msisdn_status\` ON \`conversion_postbacks\``,
      );
      await this.safeQuery(
        queryRunner,
        `CREATE UNIQUE INDEX \`UQ_conversion_postbacks_msisdn\`
         ON \`conversion_postbacks\` (\`msisdn\`)`,
      );
    }
  }

  async down(queryRunner) {
    const isPostgres = queryRunner.connection.options.type === 'postgres';

    if (isPostgres) {
      await this.safeQuery(
        queryRunner,
        `DROP INDEX IF EXISTS "UQ_conversion_postbacks_msisdn"`,
      );
      await this.safeQuery(
        queryRunner,
        `CREATE INDEX IF NOT EXISTS "IDX_postbacks_msisdn_status"
         ON "conversion_postbacks" ("msisdn", "status")`,
      );
    } else {
      await this.safeQuery(
        queryRunner,
        `DROP INDEX \`UQ_conversion_postbacks_msisdn\` ON \`conversion_postbacks\``,
      );
      await this.safeQuery(
        queryRunner,
        `CREATE INDEX \`IDX_postbacks_msisdn_status\`
         ON \`conversion_postbacks\` (\`msisdn\`, \`status\`)`,
      );
    }
  }
}
