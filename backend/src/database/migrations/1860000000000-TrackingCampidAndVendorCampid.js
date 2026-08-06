/**
 * Dual campaign ids:
 * - visits.campid / conversion_postbacks.campid = vendor/network campid (postback {campid})
 * - visits.tracking_campid / conversion_postbacks.tracking_campid = our BF-OBF-11
 *
 * Legacy: conversion_postbacks already had campid — keep it as vendor column;
 * add tracking_campid alongside.
 */
export class TrackingCampidAndVendorCampid1860000000000 {
  name = 'TrackingCampidAndVendorCampid1860000000000';

  async safeQuery(queryRunner, sql) {
    try {
      await queryRunner.query(sql);
    } catch (err) {
      if (!/already exists|duplicate|does not exist/i.test(err.message)) throw err;
    }
  }

  async up(queryRunner) {
    const isPostgres = queryRunner.connection.options.type === 'postgres';

    if (isPostgres) {
      if (!(await queryRunner.hasColumn('visits', 'campid'))) {
        await queryRunner.query(
          `ALTER TABLE "visits" ADD COLUMN "campid" varchar(128)`,
        );
      }
      if (!(await queryRunner.hasColumn('visits', 'tracking_campid'))) {
        await queryRunner.query(
          `ALTER TABLE "visits" ADD COLUMN "tracking_campid" varchar(128)`,
        );
      }
      await this.safeQuery(
        queryRunner,
        `CREATE INDEX IF NOT EXISTS "IDX_VISIT_CAMPID" ON "visits" ("campid")`,
      );
      await this.safeQuery(
        queryRunner,
        `CREATE INDEX IF NOT EXISTS "IDX_VISIT_TRACKING_CAMPID" ON "visits" ("tracking_campid")`,
      );

      // Drop mistaken offer_id from aborted attempt (if present).
      if (await queryRunner.hasColumn('visits', 'offer_id')) {
        await queryRunner.query(
          `ALTER TABLE "visits" DROP COLUMN IF EXISTS "offer_id"`,
        );
      }
      if (await queryRunner.hasColumn('conversion_postbacks', 'offer_id')) {
        await queryRunner.query(
          `ALTER TABLE "conversion_postbacks" DROP COLUMN IF EXISTS "offer_id"`,
        );
      }

      // If campid was renamed to tracking_campid already, restore campid for vendor.
      if (
        !(await queryRunner.hasColumn('conversion_postbacks', 'campid')) &&
        (await queryRunner.hasColumn('conversion_postbacks', 'tracking_campid'))
      ) {
        await queryRunner.query(
          `ALTER TABLE "conversion_postbacks" ADD COLUMN "campid" varchar(128)`,
        );
        await queryRunner.query(
          `UPDATE "conversion_postbacks" SET "campid" = "tracking_campid" WHERE "campid" IS NULL`,
        );
      } else if (!(await queryRunner.hasColumn('conversion_postbacks', 'campid'))) {
        await queryRunner.query(
          `ALTER TABLE "conversion_postbacks" ADD COLUMN "campid" varchar(128)`,
        );
      }

      if (!(await queryRunner.hasColumn('conversion_postbacks', 'tracking_campid'))) {
        await queryRunner.query(
          `ALTER TABLE "conversion_postbacks" ADD COLUMN "tracking_campid" varchar(128)`,
        );
      }
      await this.safeQuery(
        queryRunner,
        `CREATE INDEX IF NOT EXISTS "IDX_postbacks_campid" ON "conversion_postbacks" ("campid")`,
      );
    } else {
      await this.safeQuery(
        queryRunner,
        `ALTER TABLE \`visits\` ADD COLUMN \`campid\` varchar(128) NULL`,
      );
      await this.safeQuery(
        queryRunner,
        `ALTER TABLE \`visits\` ADD COLUMN \`tracking_campid\` varchar(128) NULL`,
      );
      await this.safeQuery(
        queryRunner,
        `ALTER TABLE \`conversion_postbacks\` ADD COLUMN \`tracking_campid\` varchar(128) NULL`,
      );
    }
  }

  async down(queryRunner) {
    const isPostgres = queryRunner.connection.options.type === 'postgres';
    if (isPostgres) {
      await this.safeQuery(
        queryRunner,
        `ALTER TABLE "visits" DROP COLUMN IF EXISTS "campid"`,
      );
      await this.safeQuery(
        queryRunner,
        `ALTER TABLE "visits" DROP COLUMN IF EXISTS "tracking_campid"`,
      );
      await this.safeQuery(
        queryRunner,
        `ALTER TABLE "conversion_postbacks" DROP COLUMN IF EXISTS "tracking_campid"`,
      );
    }
  }
}
