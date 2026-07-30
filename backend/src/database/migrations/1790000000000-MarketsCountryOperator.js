export class MarketsCountryOperator1790000000000 {
  name = 'MarketsCountryOperator1790000000000';

  async safeQuery(queryRunner, sql) {
    try {
      await queryRunner.query(sql);
    } catch {
      // ignore
    }
  }

  deriveCountryCode(name) {
    const trimmed = String(name || '').trim();
    if (!trimmed) return 'XX';
    if (/^[A-Za-z]{2,3}$/.test(trimmed)) return trimmed.toUpperCase();
    const known = {
      india: 'IN',
      pakistan: 'PK',
      bangladesh: 'BD',
      indonesia: 'ID',
      nigeria: 'NG',
      kenya: 'KE',
      ghana: 'GH',
      'south africa': 'ZA',
      egypt: 'EG',
      uae: 'AE',
      'united arab emirates': 'AE',
      'saudi arabia': 'SA',
    };
    const mapped = known[trimmed.toLowerCase()];
    if (mapped) return mapped;
    const slug = trimmed.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    return (slug.slice(0, 8) || 'XX').toUpperCase();
  }

  deriveOperatorCode(name) {
    const slug = String(name || '')
      .trim()
      .replace(/[^a-zA-Z0-9]/g, '')
      .toUpperCase();
    return (slug.slice(0, 32) || 'OP').toUpperCase();
  }

  async up(queryRunner) {
    const isPostgres = queryRunner.connection.options.type === 'postgres';

    if (isPostgres) {
      await this.safeQuery(
        queryRunner,
        `
        CREATE TABLE IF NOT EXISTS "countries" (
          "id" SERIAL NOT NULL,
          "name" character varying NOT NULL,
          "code" character varying(16) NOT NULL,
          "user_id" integer NOT NULL,
          "created_at" TIMESTAMP NOT NULL DEFAULT now(),
          "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
          CONSTRAINT "PK_countries" PRIMARY KEY ("id"),
          CONSTRAINT "UQ_countries_user_code" UNIQUE ("user_id", "code")
        )
      `,
      );

      await this.safeQuery(
        queryRunner,
        `
        CREATE TABLE IF NOT EXISTS "operators" (
          "id" SERIAL NOT NULL,
          "name" character varying NOT NULL,
          "code" character varying(64) NOT NULL,
          "country_id" integer NOT NULL,
          "user_id" integer NOT NULL,
          "created_at" TIMESTAMP NOT NULL DEFAULT now(),
          "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
          CONSTRAINT "PK_operators" PRIMARY KEY ("id"),
          CONSTRAINT "UQ_operators_country_code" UNIQUE ("country_id", "code"),
          CONSTRAINT "FK_operators_country" FOREIGN KEY ("country_id") REFERENCES "countries"("id") ON DELETE CASCADE ON UPDATE CASCADE
        )
      `,
      );

      await this.safeQuery(
        queryRunner,
        `ALTER TABLE "campaigns" ADD COLUMN IF NOT EXISTS "operator_id" integer`,
      );

      await this.safeQuery(
        queryRunner,
        `DROP INDEX IF EXISTS "IDX_CAMPAIGNS_COUNTRY_OPERATOR"`,
      );

      const rows = await queryRunner.query(
        `SELECT "id", "country", "operator", "user_id" FROM "campaigns" WHERE "operator_id" IS NULL`,
      );

      const countryCache = new Map();
      const operatorCache = new Map();

      for (const row of rows) {
        const countryCode = this.deriveCountryCode(row.country);
        const operatorCode = this.deriveOperatorCode(row.operator);
        const countryKey = `${row.user_id}:${countryCode}`;

        let countryId = countryCache.get(countryKey);
        if (!countryId) {
          const existing = await queryRunner.query(
            `SELECT "id" FROM "countries" WHERE "user_id" = $1 AND "code" = $2 LIMIT 1`,
            [row.user_id, countryCode],
          );
          if (existing[0]) {
            countryId = existing[0].id;
          } else {
            const inserted = await queryRunner.query(
              `INSERT INTO "countries" ("name", "code", "user_id") VALUES ($1, $2, $3) RETURNING "id"`,
              [row.country, countryCode, row.user_id],
            );
            countryId = inserted[0].id;
          }
          countryCache.set(countryKey, countryId);
        }

        const operatorKey = `${countryId}:${operatorCode}`;
        let operatorId = operatorCache.get(operatorKey);
        if (!operatorId) {
          const existingOp = await queryRunner.query(
            `SELECT "id" FROM "operators" WHERE "country_id" = $1 AND "code" = $2 LIMIT 1`,
            [countryId, operatorCode],
          );
          if (existingOp[0]) {
            operatorId = existingOp[0].id;
          } else {
            const insertedOp = await queryRunner.query(
              `INSERT INTO "operators" ("name", "code", "country_id", "user_id") VALUES ($1, $2, $3, $4) RETURNING "id"`,
              [row.operator, operatorCode, countryId, row.user_id],
            );
            operatorId = insertedOp[0].id;
          }
          operatorCache.set(operatorKey, operatorId);
        }

        await queryRunner.query(
          `UPDATE "campaigns" SET "operator_id" = $1 WHERE "id" = $2`,
          [operatorId, row.id],
        );
      }

      await this.safeQuery(
        queryRunner,
        `ALTER TABLE "campaigns" ADD CONSTRAINT "FK_campaigns_operator" FOREIGN KEY ("operator_id") REFERENCES "operators"("id") ON DELETE SET NULL ON UPDATE CASCADE`,
      );

      await this.safeQuery(
        queryRunner,
        `
        UPDATE "campaigns" c
        SET "name" = c."name" || ' (' || c."id" || ')'
        WHERE c."operator_id" IS NOT NULL
          AND EXISTS (
            SELECT 1 FROM "campaigns" c2
            WHERE c2."operator_id" = c."operator_id"
              AND c2."name" = c."name"
              AND c2."id" < c."id"
          )
      `,
      );

      await this.safeQuery(
        queryRunner,
        `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_campaigns_operator_name" ON "campaigns" ("operator_id", "name")`,
      );
    } else {
      await this.safeQuery(
        queryRunner,
        `
        CREATE TABLE IF NOT EXISTS \`countries\` (
          \`id\` int NOT NULL AUTO_INCREMENT,
          \`name\` varchar(255) NOT NULL,
          \`code\` varchar(16) NOT NULL,
          \`user_id\` int NOT NULL,
          \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
          \`updated_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (\`id\`),
          UNIQUE KEY \`UQ_countries_user_code\` (\`user_id\`, \`code\`)
        ) ENGINE=InnoDB
      `,
      );

      await this.safeQuery(
        queryRunner,
        `
        CREATE TABLE IF NOT EXISTS \`operators\` (
          \`id\` int NOT NULL AUTO_INCREMENT,
          \`name\` varchar(255) NOT NULL,
          \`code\` varchar(64) NOT NULL,
          \`country_id\` int NOT NULL,
          \`user_id\` int NOT NULL,
          \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
          \`updated_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (\`id\`),
          UNIQUE KEY \`UQ_operators_country_code\` (\`country_id\`, \`code\`),
          CONSTRAINT \`FK_operators_country\` FOREIGN KEY (\`country_id\`) REFERENCES \`countries\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
        ) ENGINE=InnoDB
      `,
      );

      const cols = await queryRunner.query(
        `SHOW COLUMNS FROM \`campaigns\` LIKE 'operator_id'`,
      );
      if (!cols || cols.length === 0) {
        await this.safeQuery(
          queryRunner,
          `ALTER TABLE \`campaigns\` ADD COLUMN \`operator_id\` int NULL`,
        );
      }

      await this.safeQuery(
        queryRunner,
        `DROP INDEX \`IDX_CAMPAIGNS_COUNTRY_OPERATOR\` ON \`campaigns\``,
      );

      const rows = await queryRunner.query(
        `SELECT \`id\`, \`country\`, \`operator\`, \`user_id\` FROM \`campaigns\` WHERE \`operator_id\` IS NULL`,
      );

      const countryCache = new Map();
      const operatorCache = new Map();

      for (const row of rows) {
        const countryCode = this.deriveCountryCode(row.country);
        const operatorCode = this.deriveOperatorCode(row.operator);
        const countryKey = `${row.user_id}:${countryCode}`;

        let countryId = countryCache.get(countryKey);
        if (!countryId) {
          const existing = await queryRunner.query(
            `SELECT \`id\` FROM \`countries\` WHERE \`user_id\` = ? AND \`code\` = ? LIMIT 1`,
            [row.user_id, countryCode],
          );
          if (existing[0]) {
            countryId = existing[0].id;
          } else {
            await queryRunner.query(
              `INSERT INTO \`countries\` (\`name\`, \`code\`, \`user_id\`) VALUES (?, ?, ?)`,
              [row.country, countryCode, row.user_id],
            );
            const inserted = await queryRunner.query(`SELECT LAST_INSERT_ID() AS id`);
            countryId = inserted[0].id;
          }
          countryCache.set(countryKey, countryId);
        }

        const operatorKey = `${countryId}:${operatorCode}`;
        let operatorId = operatorCache.get(operatorKey);
        if (!operatorId) {
          const existingOp = await queryRunner.query(
            `SELECT \`id\` FROM \`operators\` WHERE \`country_id\` = ? AND \`code\` = ? LIMIT 1`,
            [countryId, operatorCode],
          );
          if (existingOp[0]) {
            operatorId = existingOp[0].id;
          } else {
            await queryRunner.query(
              `INSERT INTO \`operators\` (\`name\`, \`code\`, \`country_id\`, \`user_id\`) VALUES (?, ?, ?, ?)`,
              [row.operator, operatorCode, countryId, row.user_id],
            );
            const insertedOp = await queryRunner.query(`SELECT LAST_INSERT_ID() AS id`);
            operatorId = insertedOp[0].id;
          }
          operatorCache.set(operatorKey, operatorId);
        }

        await queryRunner.query(
          `UPDATE \`campaigns\` SET \`operator_id\` = ? WHERE \`id\` = ?`,
          [operatorId, row.id],
        );
      }

      await this.safeQuery(
        queryRunner,
        `ALTER TABLE \`campaigns\` ADD CONSTRAINT \`FK_campaigns_operator\` FOREIGN KEY (\`operator_id\`) REFERENCES \`operators\`(\`id\`) ON DELETE SET NULL ON UPDATE CASCADE`,
      );

      await this.safeQuery(
        queryRunner,
        `
        UPDATE \`campaigns\` c
        JOIN \`campaigns\` c2
          ON c2.\`operator_id\` = c.\`operator_id\`
         AND c2.\`name\` = c.\`name\`
         AND c2.\`id\` < c.\`id\`
        SET c.\`name\` = CONCAT(c.\`name\`, ' (', c.\`id\`, ')')
        WHERE c.\`operator_id\` IS NOT NULL
      `,
      );

      await this.safeQuery(
        queryRunner,
        `CREATE UNIQUE INDEX \`IDX_campaigns_operator_name\` ON \`campaigns\` (\`operator_id\`, \`name\`)`,
      );
    }
  }

  async down(queryRunner) {
    const isPostgres = queryRunner.connection.options.type === 'postgres';
    if (isPostgres) {
      await this.safeQuery(queryRunner, `DROP INDEX IF EXISTS "IDX_campaigns_operator_name"`);
      await this.safeQuery(
        queryRunner,
        `ALTER TABLE "campaigns" DROP CONSTRAINT IF EXISTS "FK_campaigns_operator"`,
      );
      await this.safeQuery(
        queryRunner,
        `ALTER TABLE "campaigns" DROP COLUMN IF EXISTS "operator_id"`,
      );
      await this.safeQuery(queryRunner, `DROP TABLE IF EXISTS "operators"`);
      await this.safeQuery(queryRunner, `DROP TABLE IF EXISTS "countries"`);
      await this.safeQuery(
        queryRunner,
        `CREATE UNIQUE INDEX "IDX_CAMPAIGNS_COUNTRY_OPERATOR" ON "campaigns" ("country", "operator")`,
      );
    } else {
      await this.safeQuery(
        queryRunner,
        `DROP INDEX \`IDX_campaigns_operator_name\` ON \`campaigns\``,
      );
      await this.safeQuery(
        queryRunner,
        `ALTER TABLE \`campaigns\` DROP FOREIGN KEY \`FK_campaigns_operator\``,
      );
      await this.safeQuery(
        queryRunner,
        `ALTER TABLE \`campaigns\` DROP COLUMN \`operator_id\``,
      );
      await this.safeQuery(queryRunner, `DROP TABLE IF EXISTS \`operators\``);
      await this.safeQuery(queryRunner, `DROP TABLE IF EXISTS \`countries\``);
      await this.safeQuery(
        queryRunner,
        `CREATE UNIQUE INDEX \`IDX_CAMPAIGNS_COUNTRY_OPERATOR\` ON \`campaigns\` (\`country\`, \`operator\`)`,
      );
    }
  }
}
