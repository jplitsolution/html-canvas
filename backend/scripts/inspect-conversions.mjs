import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const client = new pg.Client({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432', 10),
  user: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
});

async function run() {
  await client.connect();

  console.log('--- OTP VERIFY & CONVERSION QUERY ---');
  const res = await client.query(`
    SELECT 
      v.id as visit_id,
      v.phone,
      v.click_id,
      v.rcid,
      v.campid,
      v.tracking_campid,
      v.vid_raw,
      v.aff_raw,
      v.ip_address,
      v.user_agent,
      v.visit_status,
      v.page_type,
      v.vendor_id,
      TO_CHAR(v.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI:SS') as visit_time_utc,
      TO_CHAR(v.otp_verified_at AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI:SS') as otp_verified_at_utc,
      TO_CHAR(v.updated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI:SS') as updated_at_utc,
      sub_ev.first_sub_time,
      otp_ev.first_otp_time,
      cp.status as postback_status,
      cp.msisdn as postback_msisdn,
      cp.operator_status as postback_operator_status,
      cp.http_status as postback_http_status,
      cp.sent_at as postback_sent_at
    FROM visits v
    LEFT JOIN (
      SELECT visit_id, TO_CHAR(MIN(created_at) AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI:SS') as first_otp_time
      FROM visit_events
      WHERE event_type = 'OTP_VERIFY'
      GROUP BY visit_id
    ) otp_ev ON otp_ev.visit_id = v.id
    LEFT JOIN (
      SELECT visit_id, TO_CHAR(MIN(created_at) AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI:SS') as first_sub_time
      FROM visit_events
      WHERE event_type = 'SUBSCRIBE_SUCCESS'
      GROUP BY visit_id
    ) sub_ev ON sub_ev.visit_id = v.id
    LEFT JOIN (
      SELECT DISTINCT ON (click_id) 
        click_id, status, msisdn, operator_status, http_status, sent_at
      FROM conversion_postbacks
      ORDER BY click_id, id DESC
    ) cp ON cp.click_id = v.click_id
    WHERE (v.country ILIKE '%Burkina%' OR v.campaign_id = 17)
      AND v.created_at >= '2026-09-01 00:00:00+00'
      AND v.created_at < '2026-10-01 00:00:00+00'
      AND (
        otp_ev.first_otp_time IS NOT NULL 
        OR sub_ev.first_sub_time IS NOT NULL 
        OR v.visit_status = 'SUBSCRIBED' 
        OR v.visit_status = 'SUCCESS'
        OR v.otp_verified_at IS NOT NULL
      )
    ORDER BY v.created_at DESC
  `);

  console.log(`Total OTP Verified / Converted rows in Sept: ${res.rows.length}`);
  console.log('Sample row with everything:', res.rows[0]);
  
  let withPhone = 0;
  let withClickId = 0;
  let withRcid = 0;
  let withOtpTime = 0;
  let withSubTime = 0;
  let withPostback = 0;

  res.rows.forEach(r => {
    if (r.phone || r.postback_msisdn) withPhone++;
    if (r.click_id) withClickId++;
    if (r.rcid) withRcid++;
    if (r.first_otp_time || r.otp_verified_at_utc) withOtpTime++;
    if (r.first_sub_time || r.visit_status === 'SUBSCRIBED') withSubTime++;
    if (r.postback_status) withPostback++;
  });

  console.log({
    total_conversions_or_otp_verified: res.rows.length,
    withPhone,
    withClickId,
    withRcid,
    withOtpTime,
    withSubTime,
    withPostback
  });

  await client.end();
}

run().catch(console.error);
