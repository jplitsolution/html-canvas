import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import ExcelJS from 'exceljs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const client = new pg.Client({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432', 10),
  user: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
});

async function main() {
  console.log('Connecting to database...');
  await client.connect();

  const septFilter = `
    (v.country ILIKE '%Burkina%' OR v.campaign_id = 17)
    AND v.created_at >= '2026-09-01 00:00:00+00'
    AND v.created_at < '2026-10-01 00:00:00+00'
  `;

  // 1. Fetch Vendor Map
  const vendorsQuery = await client.query('SELECT id, name FROM vendors');
  const vendorMap = {};
  vendorsQuery.rows.forEach(v => { vendorMap[v.id] = v.name; });

  // 2. Fetch Overall September Summary
  console.log('Fetching September overall metrics...');
  const overallQuery = await client.query(`
    SELECT 
      COUNT(DISTINCT v.id) as total_visits,
      COUNT(DISTINCT v.ip_address) as unique_ips,
      COUNT(DISTINCT v.click_id) as unique_clicks,
      COUNT(DISTINCT CASE WHEN v.phone IS NOT NULL AND v.phone != '' THEN v.id END) as visits_with_phone,
      COUNT(DISTINCT CASE WHEN v.phone IS NOT NULL AND v.phone != '' THEN v.phone END) as unique_phones,
      COUNT(DISTINCT CASE WHEN ve.event_type = 'CONFIRM_VIEW' THEN v.id END) as confirm_views,
      COUNT(DISTINCT CASE WHEN ve.event_type = 'SUBSCRIBE_CLICK' THEN ve.id END) as total_subscribe_clicks,
      COUNT(DISTINCT CASE WHEN ve.event_type = 'SUBSCRIBE_CLICK' THEN v.id END) as unique_users_subscribe_click,
      COUNT(DISTINCT CASE WHEN ve.event_type = 'SUBSCRIBE_CLICK' AND v.phone IS NOT NULL AND v.phone != '' THEN v.phone END) as phones_clicking_subscribe,
      COUNT(DISTINCT CASE WHEN ve.event_type = 'OTP_VERIFY' THEN v.id END) as otp_verified,
      COUNT(DISTINCT CASE WHEN ve.event_type = 'SUBSCRIBE_SUCCESS' OR v.visit_status = 'SUBSCRIBED' THEN v.id END) as subscribed_users,
      COUNT(DISTINCT CASE WHEN (ve.event_type = 'SUBSCRIBE_SUCCESS' OR v.visit_status = 'SUBSCRIBED') AND v.phone IS NOT NULL AND v.phone != '' THEN v.phone END) as subscribed_phones,
      MIN(v.created_at) as earliest_visit,
      MAX(v.created_at) as latest_visit
    FROM visits v
    LEFT JOIN visit_events ve ON ve.visit_id = v.id
    WHERE ${septFilter}
  `);
  const overall = overallQuery.rows[0];

  // 3. Fetch Comprehensive Converted & OTP Verified Leads with ALL Fields
  console.log('Fetching detailed Converted & OTP Verified Leads...');
  const conversionsQuery = await client.query(`
    SELECT 
      v.id as visit_id,
      COALESCE(NULLIF(v.phone, ''), cp.msisdn) as phone_number,
      v.click_id,
      COALESCE(v.rcid, cp.rcid) as rcid,
      COALESCE(v.campid, cp.campid) as vendor_campid,
      COALESCE(v.tracking_campid, cp.tracking_campid, 'BF-OR-17') as tracking_campid,
      v.vid_raw as vendor_subid,
      v.vendor_id,
      TO_CHAR(v.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI:SS') as visit_time_utc,
      COALESCE(otp_ev.first_otp_time, TO_CHAR(v.otp_verified_at AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI:SS')) as otp_verified_time_utc,
      COALESCE(sub_ev.first_sub_time, TO_CHAR(v.updated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI:SS')) as conversion_time_utc,
      CASE WHEN otp_ev.first_otp_time IS NOT NULL OR v.otp_verified_at IS NOT NULL THEN 'Yes' ELSE 'No' END as is_otp_verified,
      CASE WHEN sub_ev.first_sub_time IS NOT NULL OR v.visit_status = 'SUBSCRIBED' OR v.visit_status = 'SUCCESS' THEN 'Yes' ELSE 'No' END as is_conversion,
      v.visit_status,
      cp.status as postback_status,
      cp.operator_status,
      cp.http_status as postback_http_status,
      TO_CHAR(cp.sent_at AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI:SS') as postback_sent_time_utc,
      v.ip_address,
      v.user_agent,
      COALESCE(v.operator, 'Orange') as operator,
      COALESCE(v.country, 'Burkina Faso') as country
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
        click_id, rcid, campid, tracking_campid, status, msisdn, operator_status, http_status, sent_at
      FROM conversion_postbacks
      ORDER BY click_id, id DESC
    ) cp ON cp.click_id = v.click_id
    WHERE ${septFilter}
      AND (
        otp_ev.first_otp_time IS NOT NULL 
        OR sub_ev.first_sub_time IS NOT NULL 
        OR v.visit_status = 'SUBSCRIBED' 
        OR v.visit_status = 'SUCCESS'
        OR v.otp_verified_at IS NOT NULL
      )
    ORDER BY v.created_at DESC
  `);
  console.log(`Found ${conversionsQuery.rows.length} converted/OTP-verified leads.`);

  // 4. Fetch September Daily Breakdown
  console.log('Fetching September daily stats...');
  const dailyQuery = await client.query(`
    SELECT 
      TO_CHAR(v.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS date_utc,
      COUNT(DISTINCT v.id) as total_visits,
      COUNT(DISTINCT v.ip_address) as unique_ips,
      COUNT(DISTINCT v.click_id) as unique_clicks,
      COUNT(DISTINCT CASE WHEN v.phone IS NOT NULL AND v.phone != '' THEN v.id END) as visits_with_phone,
      COUNT(DISTINCT CASE WHEN v.phone IS NOT NULL AND v.phone != '' THEN v.phone END) as unique_phones,
      COUNT(DISTINCT CASE WHEN ve.event_type = 'CONFIRM_VIEW' THEN v.id END) as confirm_views,
      COUNT(DISTINCT CASE WHEN ve.event_type = 'SUBSCRIBE_CLICK' THEN ve.id END) as total_subscribe_clicks,
      COUNT(DISTINCT CASE WHEN ve.event_type = 'SUBSCRIBE_CLICK' THEN v.id END) as unique_users_subscribe_click,
      COUNT(DISTINCT CASE WHEN ve.event_type = 'OTP_VERIFY' THEN v.id END) as otp_verified,
      COUNT(DISTINCT CASE WHEN ve.event_type = 'SUBSCRIBE_SUCCESS' OR v.visit_status = 'SUBSCRIBED' THEN v.id END) as subscribed_users
    FROM visits v
    LEFT JOIN visit_events ve ON ve.visit_id = v.id
    WHERE ${septFilter}
    GROUP BY TO_CHAR(v.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD')
    ORDER BY date_utc ASC
  `);

  // 5. Fetch Detailed Subscribe Click Events with Phone & Click ID
  console.log('Fetching September Subscribe Click details...');
  const subClicksQuery = await client.query(`
    SELECT 
      v.id as visit_id,
      TO_CHAR(MIN(ve.created_at) AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI:SS') as first_click_time_utc,
      v.phone,
      v.click_id,
      v.rcid,
      v.vendor_id,
      v.ip_address,
      v.visit_status,
      v.page_type,
      COUNT(ve.id) as subscribe_click_count,
      CASE WHEN MAX(CASE WHEN ve2.event_type = 'OTP_VERIFY' THEN 1 ELSE 0 END) = 1 THEN 'Yes' ELSE 'No' END as otp_verified,
      CASE WHEN v.visit_status = 'SUBSCRIBED' OR MAX(CASE WHEN ve2.event_type = 'SUBSCRIBE_SUCCESS' THEN 1 ELSE 0 END) = 1 THEN 'Yes' ELSE 'No' END as is_subscribed
    FROM visits v
    JOIN visit_events ve ON ve.visit_id = v.id AND ve.event_type = 'SUBSCRIBE_CLICK'
    LEFT JOIN visit_events ve2 ON ve2.visit_id = v.id
    WHERE ${septFilter}
    GROUP BY v.id, v.phone, v.click_id, v.rcid, v.vendor_id, v.ip_address, v.visit_status, v.page_type
    ORDER BY MIN(ve.created_at) DESC
  `);

  // 6. Fetch All Landing Page Visits with Phone & Click ID
  console.log('Fetching September All Landing Page visits...');
  const allVisitsQuery = await client.query(`
    SELECT 
      v.id as visit_id,
      TO_CHAR(v.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI:SS') as visit_time_utc,
      v.phone,
      v.click_id,
      v.rcid,
      v.vendor_id,
      v.ip_address,
      v.visit_status,
      v.page_type,
      CASE WHEN ve.sub_clicks > 0 THEN 'Yes' ELSE 'No' END as clicked_subscribe,
      COALESCE(ve.sub_clicks, 0) as subscribe_clicks,
      CASE WHEN v.visit_status = 'SUBSCRIBED' OR ve.sub_success > 0 THEN 'Yes' ELSE 'No' END as is_subscribed
    FROM visits v
    LEFT JOIN (
      SELECT 
        visit_id, 
        COUNT(CASE WHEN event_type = 'SUBSCRIBE_CLICK' THEN 1 END) as sub_clicks,
        COUNT(CASE WHEN event_type = 'SUBSCRIBE_SUCCESS' THEN 1 END) as sub_success
      FROM visit_events
      GROUP BY visit_id
    ) ve ON ve.visit_id = v.id
    WHERE ${septFilter}
    ORDER BY v.created_at DESC
  `);

  // 7. Fetch September Vendor Breakdown
  console.log('Fetching September vendor breakdown...');
  const vendorBreakdownQuery = await client.query(`
    SELECT 
      v.vendor_id,
      COUNT(DISTINCT v.id) as total_visits,
      COUNT(DISTINCT v.ip_address) as unique_ips,
      COUNT(DISTINCT CASE WHEN v.phone IS NOT NULL AND v.phone != '' THEN v.id END) as visits_with_phone,
      COUNT(DISTINCT CASE WHEN ve.event_type = 'SUBSCRIBE_CLICK' THEN ve.id END) as total_subscribe_clicks,
      COUNT(DISTINCT CASE WHEN ve.event_type = 'SUBSCRIBE_CLICK' THEN v.id END) as unique_users_subscribe_click,
      COUNT(DISTINCT CASE WHEN ve.event_type = 'SUBSCRIBE_SUCCESS' OR v.visit_status = 'SUBSCRIBED' THEN v.id END) as subscribed_users
    FROM visits v
    LEFT JOIN visit_events ve ON ve.visit_id = v.id
    WHERE ${septFilter}
    GROUP BY v.vendor_id
    ORDER BY total_visits DESC
  `);

  await client.end();
  console.log('All DB queries completed. Building Excel workbook for September...');

  // Create Workbook
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Analytics Engine';
  workbook.created = new Date();

  // Styles
  const HEADER_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1E293B' } };
  const HEADER_FONT = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFF' } };
  const ACCENT_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: '0284C7' } };
  const TOTAL_ROW_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'E2E8F0' } };
  const KPI_LABEL_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F1F5F9' } };
  const HIGHLIGHT_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'E0F2FE' } };
  const THIN_BORDER = {
    top: { style: 'thin', color: { argb: 'CBD5E1' } },
    left: { style: 'thin', color: { argb: 'CBD5E1' } },
    bottom: { style: 'thin', color: { argb: 'CBD5E1' } },
    right: { style: 'thin', color: { argb: 'CBD5E1' } },
  };

  const formatHeader = (row, headers) => {
    row.height = 28;
    headers.forEach((h, idx) => {
      const cell = row.getCell(idx + 1);
      cell.value = h;
      cell.font = HEADER_FONT;
      cell.fill = HEADER_FILL;
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = THIN_BORDER;
    });
  };

  // ==========================================
  // SHEET 1: Executive Summary (September)
  // ==========================================
  console.log('Writing Sheet 1: Executive Summary (September)...');
  const wsSummary = workbook.addWorksheet('Executive Summary', { views: [{ showGridLines: true }] });

  wsSummary.mergeCells('B2:G2');
  const titleCell = wsSummary.getCell('B2');
  titleCell.value = 'BURKINA FASO (ORANGE) - SEPTEMBER 2026 PERFORMANCE REPORT';
  titleCell.font = { name: 'Calibri', size: 16, bold: true, color: { argb: 'FFFFFF' } };
  titleCell.fill = HEADER_FILL;
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  wsSummary.getRow(2).height = 40;

  wsSummary.mergeCells('B3:G3');
  const subTitleCell = wsSummary.getCell('B3');
  subTitleCell.value = 'Report Period: September 2026 (01-Sep-2026 to 30-Sep-2026) | Operator: Orange Burkina Faso | Includes Converted / OTP Verified Details';
  subTitleCell.font = { name: 'Calibri', size: 10, italic: true, color: { argb: '475569' } };
  subTitleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  wsSummary.getRow(3).height = 22;

  // Metadata Table
  const metaStartRow = 5;
  wsSummary.mergeCells(`B${metaStartRow}:C${metaStartRow}`);
  wsSummary.getCell(`B${metaStartRow}`).value = 'CAMPAIGN CONFIGURATION (SEPTEMBER)';
  wsSummary.getCell(`B${metaStartRow}`).font = { bold: true, color: { argb: 'FFFFFF' } };
  wsSummary.getCell(`B${metaStartRow}`).fill = ACCENT_FILL;

  const metadata = [
    ['Country', 'Burkina Faso (BF)'],
    ['Telecom Operator', 'Orange (Operator ID: 19)'],
    ['Campaign Name', 'HealthPortal_OBF'],
    ['Campaign ID', '17'],
    ['Tracking Campaign ID', 'BF-OR-17'],
    ['Verification Mode', 'ORANGE_BF (Direct Carrier Billing)'],
    ['Reporting Period', 'September 2026 (01-Sep to 30-Sep)'],
    ['Converted & OTP Verified Leads', `${conversionsQuery.rows.length.toLocaleString()} leads (with Phone, Click ID & RCID)`],
    ['Total Captured Phones (Sept)', `${Number(overall.visits_with_phone).toLocaleString()} visits (${Number(overall.unique_phones).toLocaleString()} unique)`],
    ['Total Click IDs Tracked (Sept)', `${Number(overall.unique_clicks).toLocaleString()} click IDs (100% tracked)`],
  ];

  metadata.forEach((row, i) => {
    const rIdx = metaStartRow + 1 + i;
    wsSummary.getCell(`B${rIdx}`).value = row[0];
    wsSummary.getCell(`B${rIdx}`).font = { bold: true, color: { argb: '334155' } };
    wsSummary.getCell(`B${rIdx}`).fill = KPI_LABEL_FILL;
    wsSummary.getCell(`B${rIdx}`).border = THIN_BORDER;

    wsSummary.getCell(`C${rIdx}`).value = row[1];
    wsSummary.getCell(`C${rIdx}`).border = THIN_BORDER;
  });

  // KPI Table
  const kpiStartRow = 5;
  wsSummary.mergeCells(`E${kpiStartRow}:G${kpiStartRow}`);
  wsSummary.getCell(`E${kpiStartRow}`).value = 'SEPTEMBER 2026 PERFORMANCE METRICS';
  wsSummary.getCell(`E${kpiStartRow}`).font = { bold: true, color: { argb: 'FFFFFF' } };
  wsSummary.getCell(`E${kpiStartRow}`).fill = ACCENT_FILL;

  const totalVisits = Number(overall.total_visits);
  const uniqueIps = Number(overall.unique_ips);
  const totalSubClicks = Number(overall.total_subscribe_clicks);
  const uniqueSubClicks = Number(overall.unique_users_subscribe_click);
  const confirmViews = Number(overall.confirm_views);
  const otpVerified = Number(overall.otp_verified);
  const subUsers = Number(overall.subscribed_users);
  const visitsWithPhone = Number(overall.visits_with_phone);
  const uniquePhones = Number(overall.unique_phones);

  const kpis = [
    ['September Landing Visits (Traffic / Clicks)', totalVisits, '#,##0', 'Total landing page pageviews/clicks in Sept'],
    ['Unique Visitors (Distinct IP Addresses)', uniqueIps, '#,##0', 'Distinct individual IPs reached in Sept'],
    ['Unique Ad Click IDs (Tracking Clicks)', Number(overall.unique_clicks), '#,##0', 'Unique incoming click IDs tracked in Sept'],
    ['Total Subscribe Button Clicks', totalSubClicks, '#,##0', 'Total times "Subscribe" CTA was clicked'],
    ['Unique Users Clicking Subscribe Button', uniqueSubClicks, '#,##0', 'Unique visitors that clicked Subscribe'],
    ['Subscribe Click-Through Rate (CTR %)', totalSubClicks / totalVisits, '0.00%', 'Subscribe Clicks ÷ Landing Visits'],
    ['OTP Verifications (Pin Completed)', otpVerified, '#,##0', 'Users that completed OTP verification'],
    ['Total Subscribed Users (Conversions)', subUsers, '#,##0', 'Successfully billed / active subscribers'],
    ['Converted & OTP Verified Leads Total', conversionsQuery.rows.length, '#,##0', 'Total leads with OTP verify / conversion in Sept'],
    ['Overall Conversion Rate (% of Visits)', subUsers / totalVisits, '0.00%', 'Subscribed Users ÷ Landing Page Visits'],
    ['Conversion Rate (% of Subscribe Clicks)', subUsers / totalSubClicks, '0.00%', 'Subscribed Users ÷ Subscribe Clicks'],
  ];

  kpis.forEach((row, i) => {
    const rIdx = kpiStartRow + 1 + i;
    wsSummary.getCell(`E${rIdx}`).value = row[0];
    wsSummary.getCell(`E${rIdx}`).font = { bold: true, color: { argb: '1E293B' } };
    wsSummary.getCell(`E${rIdx}`).fill = (i === 0 || i === 3 || i === 7 || i === 8) ? HIGHLIGHT_FILL : KPI_LABEL_FILL;
    wsSummary.getCell(`E${rIdx}`).border = THIN_BORDER;

    const valCell = wsSummary.getCell(`F${rIdx}`);
    valCell.value = row[1];
    valCell.numFmt = row[2];
    valCell.font = { bold: true, size: 11, color: (i === 0 || i === 3 || i === 7 || i === 8) ? { argb: '0369A1' } : { argb: '0F172A' } };
    valCell.alignment = { horizontal: 'right' };
    valCell.border = THIN_BORDER;

    const noteCell = wsSummary.getCell(`G${rIdx}`);
    noteCell.value = row[3];
    noteCell.font = { italic: true, size: 9, color: { argb: '64748B' } };
    noteCell.border = THIN_BORDER;
  });

  // Funnel Table Below
  const funnelStartRow = 19;
  wsSummary.mergeCells(`B${funnelStartRow}:G${funnelStartRow}`);
  wsSummary.getCell(`B${funnelStartRow}`).value = 'SEPTEMBER CONVERSION FUNNEL (LANDING TO SUBSCRIPTION)';
  wsSummary.getCell(`B${funnelStartRow}`).font = { bold: true, color: { argb: 'FFFFFF' } };
  wsSummary.getCell(`B${funnelStartRow}`).fill = HEADER_FILL;

  const funnelHeaders = ['Stage', 'Funnel Step Description', 'Volume', '% of Landing Visits', '% of Previous Step', 'Drop-off Volume'];
  funnelHeaders.forEach((h, idx) => {
    const colLetter = String.fromCharCode(66 + idx);
    const cell = wsSummary.getCell(`${colLetter}${funnelStartRow + 1}`);
    cell.value = h;
    cell.font = HEADER_FONT;
    cell.fill = ACCENT_FILL;
    cell.border = THIN_BORDER;
    cell.alignment = { horizontal: idx >= 2 ? 'right' : 'left' };
  });

  const funnelSteps = [
    ['Stage 1', 'Landing Page Visits (Ad Traffic)', totalVisits, 1.0, 1.0, 0],
    ['Stage 2', 'Confirm / Action Page Rendered', confirmViews, confirmViews / totalVisits, confirmViews / totalVisits, totalVisits - confirmViews],
    ['Stage 3', 'Subscribe Button Click (Unique Users)', uniqueSubClicks, uniqueSubClicks / totalVisits, uniqueSubClicks / confirmViews, confirmViews - uniqueSubClicks],
    ['Stage 4', 'OTP Verification Completed', otpVerified, otpVerified / totalVisits, otpVerified / uniqueSubClicks, uniqueSubClicks - otpVerified],
    ['Stage 5', 'Successful Subscriptions (Conversions)', subUsers, subUsers / totalVisits, subUsers / otpVerified, otpVerified - subUsers],
  ];

  funnelSteps.forEach((fs, i) => {
    const rIdx = funnelStartRow + 2 + i;
    wsSummary.getCell(`B${rIdx}`).value = fs[0];
    wsSummary.getCell(`B${rIdx}`).font = { bold: true };
    wsSummary.getCell(`B${rIdx}`).border = THIN_BORDER;

    wsSummary.getCell(`C${rIdx}`).value = fs[1];
    wsSummary.getCell(`C${rIdx}`).border = THIN_BORDER;

    const vCell = wsSummary.getCell(`D${rIdx}`);
    vCell.value = fs[2];
    vCell.numFmt = '#,##0';
    vCell.border = THIN_BORDER;
    vCell.alignment = { horizontal: 'right' };

    const p1Cell = wsSummary.getCell(`E${rIdx}`);
    p1Cell.value = fs[3];
    p1Cell.numFmt = '0.00%';
    p1Cell.border = THIN_BORDER;
    p1Cell.alignment = { horizontal: 'right' };

    const p2Cell = wsSummary.getCell(`F${rIdx}`);
    p2Cell.value = fs[4];
    p2Cell.numFmt = '0.00%';
    p2Cell.border = THIN_BORDER;
    p2Cell.alignment = { horizontal: 'right' };

    const dCell = wsSummary.getCell(`G${rIdx}`);
    dCell.value = fs[5];
    dCell.numFmt = '#,##0';
    dCell.border = THIN_BORDER;
    dCell.alignment = { horizontal: 'right' };
  });

  wsSummary.getColumn('A').width = 4;
  wsSummary.getColumn('B').width = 24;
  wsSummary.getColumn('C').width = 38;
  wsSummary.getColumn('D').width = 18;
  wsSummary.getColumn('E').width = 40;
  wsSummary.getColumn('F').width = 18;
  wsSummary.getColumn('G').width = 40;

  // ==========================================
  // SHEET 2: OTP Verified & Conversions (PRIMARY NEW SHEET)
  // ==========================================
  console.log('Writing Sheet 2: OTP Verified & Conversions (Comprehensive Details)...');
  const wsConvDetails = workbook.addWorksheet('OTP Verified & Conversions', { views: [{ showGridLines: true }] });

  const convDetailHeaders = [
    'Visit ID',
    'Phone Number (MSISDN)',
    'Click ID',
    'Vendor RCID (Original Click ID)',
    'Vendor Camp ID',
    'Tracking Camp ID',
    'Vendor Sub ID / VID',
    'Vendor Name',
    'OTP Verified?',
    'OTP Verification Time (UTC)',
    'Subscribed?',
    'Conversion / Sub Time (UTC)',
    'Visit Time (UTC)',
    'Visit Status',
    'Postback Status',
    'Operator Status',
    'Postback HTTP Status',
    'Postback Sent Time (UTC)',
    'IP Address',
    'Device / User Agent',
    'Operator',
    'Country',
  ];

  formatHeader(wsConvDetails.getRow(2), convDetailHeaders);

  let curConvRow = 3;
  conversionsQuery.rows.forEach((r, idx) => {
    const row = wsConvDetails.getRow(curConvRow);
    row.height = 20;

    row.getCell(1).value = Number(r.visit_id);
    row.getCell(1).alignment = { horizontal: 'center' };

    // Phone Number (MSISDN)
    row.getCell(2).value = r.phone_number || 'N/A';
    row.getCell(2).font = { bold: true, size: 11, color: { argb: '0369A1' } };
    row.getCell(2).alignment = { horizontal: 'center' };

    // Click ID
    row.getCell(3).value = r.click_id;
    row.getCell(3).font = { name: 'Consolas', size: 10 };

    // RCID
    row.getCell(4).value = r.rcid;
    row.getCell(4).font = { name: 'Consolas', size: 9, color: { argb: '475569' } };

    // Vendor Camp ID
    row.getCell(5).value = r.vendor_campid || '';
    row.getCell(5).alignment = { horizontal: 'center' };

    // Tracking Camp ID
    row.getCell(6).value = r.tracking_campid || 'BF-OR-17';
    row.getCell(6).alignment = { horizontal: 'center' };

    // Vendor Sub ID
    row.getCell(7).value = r.vendor_subid || '';
    row.getCell(7).alignment = { horizontal: 'center' };

    // Vendor Name
    row.getCell(8).value = vendorMap[r.vendor_id] || 'Track My Ads';

    // OTP Verified?
    row.getCell(9).value = r.is_otp_verified;
    row.getCell(9).alignment = { horizontal: 'center' };
    if (r.is_otp_verified === 'Yes') {
      row.getCell(9).font = { bold: true, color: { argb: '166534' } };
    }

    // OTP Time
    row.getCell(10).value = r.otp_verified_time_utc || '';
    row.getCell(10).alignment = { horizontal: 'center' };

    // Subscribed?
    row.getCell(11).value = r.is_conversion;
    row.getCell(11).alignment = { horizontal: 'center' };
    if (r.is_conversion === 'Yes') {
      row.getCell(11).font = { bold: true, color: { argb: '15803D' } };
      row.getCell(11).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'DCFCE7' } };
    }

    // Conversion Time
    row.getCell(12).value = r.conversion_time_utc || '';
    row.getCell(12).alignment = { horizontal: 'center' };

    // Visit Time
    row.getCell(13).value = r.visit_time_utc;
    row.getCell(13).alignment = { horizontal: 'center' };

    // Visit Status
    row.getCell(14).value = r.visit_status;
    row.getCell(14).alignment = { horizontal: 'center' };

    // Postback Status
    row.getCell(15).value = r.postback_status || 'not_sent';
    row.getCell(15).alignment = { horizontal: 'center' };
    if (r.postback_status === 'sent') {
      row.getCell(15).font = { bold: true, color: { argb: '15803D' } };
    }

    // Operator Status
    row.getCell(16).value = r.operator_status || '';
    row.getCell(16).alignment = { horizontal: 'center' };

    // Postback HTTP Status
    row.getCell(17).value = r.postback_http_status || '';
    row.getCell(17).alignment = { horizontal: 'center' };

    // Postback Sent Time
    row.getCell(18).value = r.postback_sent_time_utc || '';
    row.getCell(18).alignment = { horizontal: 'center' };

    // IP Address
    row.getCell(19).value = r.ip_address;
    row.getCell(19).font = { name: 'Consolas', size: 9 };

    // User Agent / Device
    row.getCell(20).value = r.user_agent;
    row.getCell(20).font = { name: 'Calibri', size: 9, color: { argb: '475569' } };

    // Operator & Country
    row.getCell(21).value = r.operator;
    row.getCell(21).alignment = { horizontal: 'center' };
    row.getCell(22).value = r.country;
    row.getCell(22).alignment = { horizontal: 'center' };

    for (let c = 1; c <= convDetailHeaders.length; c++) {
      const cell = row.getCell(c);
      cell.border = THIN_BORDER;
      if (idx % 2 === 1 && r.is_conversion !== 'Yes') {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F8FAFC' } };
      }
    }

    curConvRow++;
  });

  // Totals Row for Converted/OTP Verified
  const convTotalRow = wsConvDetails.getRow(curConvRow);
  convTotalRow.height = 24;
  convTotalRow.getCell(1).value = 'TOTAL LEADS';
  convTotalRow.getCell(1).font = { bold: true };
  convTotalRow.getCell(2).value = `${curConvRow - 3} records`;
  convTotalRow.getCell(2).font = { bold: true, size: 11, color: { argb: '0369A1' } };

  for (let c = 1; c <= convDetailHeaders.length; c++) {
    const cell = convTotalRow.getCell(c);
    cell.fill = TOTAL_ROW_FILL;
    cell.border = {
      top: { style: 'medium', color: { argb: '64748B' } },
      bottom: { style: 'double', color: { argb: '64748B' } },
      left: { style: 'thin', color: { argb: 'CBD5E1' } },
      right: { style: 'thin', color: { argb: 'CBD5E1' } },
    };
  }

  wsConvDetails.columns = [
    { width: 14 }, // Visit ID
    { width: 25 }, // Phone Number
    { width: 30 }, // Click ID
    { width: 36 }, // RCID
    { width: 18 }, // Vendor Camp ID
    { width: 18 }, // Tracking Camp ID
    { width: 18 }, // Vendor Sub ID
    { width: 20 }, // Vendor Name
    { width: 15 }, // OTP Verified?
    { width: 24 }, // OTP Time
    { width: 15 }, // Subscribed?
    { width: 24 }, // Conversion Time
    { width: 22 }, // Visit Time
    { width: 18 }, // Visit Status
    { width: 18 }, // Postback Status
    { width: 18 }, // Operator Status
    { width: 18 }, // HTTP Status
    { width: 24 }, // Postback Sent Time
    { width: 18 }, // IP Address
    { width: 45 }, // User Agent
    { width: 14 }, // Operator
    { width: 16 }, // Country
  ];

  // ==========================================
  // SHEET 3: September Daily Breakdown
  // ==========================================
  console.log('Writing Sheet 3: September Daily Breakdown...');
  const wsDaily = workbook.addWorksheet('Daily Breakdown', { views: [{ showGridLines: true }] });

  const dailyHeaders = [
    'Date (UTC)',
    'Landing Page Visits',
    'Unique Visitors (IP)',
    'Unique Click IDs',
    'Captured Phone Numbers',
    'Confirm Views',
    'Total Subscribe Clicks',
    'Unique Subscribe Clickers',
    'Subscribe CTR (%)',
    'OTP Verified',
    'Subscribed Users',
    'Conversion Rate (%)',
  ];

  formatHeader(wsDaily.getRow(2), dailyHeaders);

  let currentDailyRow = 3;
  dailyQuery.rows.forEach((r, idx) => {
    const row = wsDaily.getRow(currentDailyRow);
    row.height = 20;

    const visits = Number(r.total_visits);
    const uips = Number(r.unique_ips);
    const uclicks = Number(r.unique_clicks);
    const phones = Number(r.visits_with_phone);
    const cviews = Number(r.confirm_views);
    const subClicks = Number(r.total_subscribe_clicks);
    const uSubClicks = Number(r.unique_users_subscribe_click);
    const otp = Number(r.otp_verified);
    const subs = Number(r.subscribed_users);

    row.getCell(1).value = r.date_utc;
    row.getCell(1).alignment = { horizontal: 'center' };

    row.getCell(2).value = visits;
    row.getCell(2).numFmt = '#,##0';

    row.getCell(3).value = uips;
    row.getCell(3).numFmt = '#,##0';

    row.getCell(4).value = uclicks;
    row.getCell(4).numFmt = '#,##0';

    row.getCell(5).value = phones;
    row.getCell(5).numFmt = '#,##0';

    row.getCell(6).value = cviews;
    row.getCell(6).numFmt = '#,##0';

    row.getCell(7).value = subClicks;
    row.getCell(7).numFmt = '#,##0';

    row.getCell(8).value = uSubClicks;
    row.getCell(8).numFmt = '#,##0';

    row.getCell(9).value = visits > 0 ? subClicks / visits : 0;
    row.getCell(9).numFmt = '0.00%';

    row.getCell(10).value = otp;
    row.getCell(10).numFmt = '#,##0';

    row.getCell(11).value = subs;
    row.getCell(11).numFmt = '#,##0';

    row.getCell(12).value = visits > 0 ? subs / visits : 0;
    row.getCell(12).numFmt = '0.00%';

    for (let c = 1; c <= dailyHeaders.length; c++) {
      const cell = row.getCell(c);
      cell.border = THIN_BORDER;
      if (idx % 2 === 1) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F8FAFC' } };
      }
    }
    currentDailyRow++;
  });

  // Daily Totals Row
  const dTotalRow = wsDaily.getRow(currentDailyRow);
  dTotalRow.height = 24;
  dTotalRow.getCell(1).value = 'SEPTEMBER TOTAL';
  dTotalRow.getCell(1).font = { bold: true };
  dTotalRow.getCell(1).alignment = { horizontal: 'center' };

  dTotalRow.getCell(2).value = { formula: `SUM(B3:B${currentDailyRow - 1})` };
  dTotalRow.getCell(2).numFmt = '#,##0';

  dTotalRow.getCell(3).value = uniqueIps;
  dTotalRow.getCell(3).numFmt = '#,##0';

  dTotalRow.getCell(4).value = { formula: `SUM(D3:D${currentDailyRow - 1})` };
  dTotalRow.getCell(4).numFmt = '#,##0';

  dTotalRow.getCell(5).value = { formula: `SUM(E3:E${currentDailyRow - 1})` };
  dTotalRow.getCell(5).numFmt = '#,##0';

  dTotalRow.getCell(6).value = { formula: `SUM(F3:F${currentDailyRow - 1})` };
  dTotalRow.getCell(6).numFmt = '#,##0';

  dTotalRow.getCell(7).value = { formula: `SUM(G3:G${currentDailyRow - 1})` };
  dTotalRow.getCell(7).numFmt = '#,##0';

  dTotalRow.getCell(8).value = { formula: `SUM(H3:H${currentDailyRow - 1})` };
  dTotalRow.getCell(8).numFmt = '#,##0';

  dTotalRow.getCell(9).value = { formula: `G${currentDailyRow}/B${currentDailyRow}` };
  dTotalRow.getCell(9).numFmt = '0.00%';

  dTotalRow.getCell(10).value = { formula: `SUM(J3:J${currentDailyRow - 1})` };
  dTotalRow.getCell(10).numFmt = '#,##0';

  dTotalRow.getCell(11).value = { formula: `SUM(K3:K${currentDailyRow - 1})` };
  dTotalRow.getCell(11).numFmt = '#,##0';

  dTotalRow.getCell(12).value = { formula: `K${currentDailyRow}/B${currentDailyRow}` };
  dTotalRow.getCell(12).numFmt = '0.00%';

  for (let c = 1; c <= dailyHeaders.length; c++) {
    const cell = dTotalRow.getCell(c);
    cell.font = { bold: true, color: { argb: '0F172A' } };
    cell.fill = TOTAL_ROW_FILL;
    cell.border = {
      top: { style: 'medium', color: { argb: '64748B' } },
      bottom: { style: 'double', color: { argb: '64748B' } },
      left: { style: 'thin', color: { argb: 'CBD5E1' } },
      right: { style: 'thin', color: { argb: 'CBD5E1' } },
    };
  }

  wsDaily.columns = [
    { width: 14 },
    { width: 20 },
    { width: 22 },
    { width: 18 },
    { width: 24 },
    { width: 16 },
    { width: 22 },
    { width: 25 },
    { width: 18 },
    { width: 16 },
    { width: 18 },
    { width: 20 },
  ];

  // ==========================================
  // SHEET 4: September Subscribe Clicks Data (With Phone & Click ID)
  // ==========================================
  console.log('Writing Sheet 4: September Subscribe Clicks Details...');
  const wsSubClicks = workbook.addWorksheet('Subscribe Clicks Data', { views: [{ showGridLines: true }] });

  const subClicksHeaders = [
    'Visit ID',
    'Click Timestamp (UTC)',
    'Phone Number (MSISDN)',
    'Click ID',
    'Vendor RCID (Original Click ID)',
    'Vendor Name',
    'IP Address',
    'Page Type',
    'Visit Status',
    'Times Clicked',
    'OTP Verified?',
    'Subscribed?',
  ];

  formatHeader(wsSubClicks.getRow(2), subClicksHeaders);

  let curSubRow = 3;
  subClicksQuery.rows.forEach((r, idx) => {
    const row = wsSubClicks.getRow(curSubRow);
    row.height = 19;

    row.getCell(1).value = Number(r.visit_id);
    row.getCell(1).alignment = { horizontal: 'center' };

    row.getCell(2).value = r.first_click_time_utc;
    row.getCell(2).alignment = { horizontal: 'center' };

    row.getCell(3).value = r.phone || 'Not Captured';
    if (r.phone) {
      row.getCell(3).font = { bold: true, color: { argb: '0369A1' } };
    } else {
      row.getCell(3).font = { italic: true, color: { argb: '94A3B8' } };
    }

    row.getCell(4).value = r.click_id;
    row.getCell(4).font = { name: 'Consolas', size: 10 };

    row.getCell(5).value = r.rcid;
    row.getCell(5).font = { name: 'Consolas', size: 9, color: { argb: '475569' } };

    row.getCell(6).value = vendorMap[r.vendor_id] || 'Direct/Unknown';

    row.getCell(7).value = r.ip_address;
    row.getCell(7).font = { name: 'Consolas', size: 10 };

    row.getCell(8).value = r.page_type || 'CONFIRM';
    row.getCell(8).alignment = { horizontal: 'center' };

    row.getCell(9).value = r.visit_status;
    row.getCell(9).alignment = { horizontal: 'center' };

    row.getCell(10).value = Number(r.subscribe_click_count);
    row.getCell(10).alignment = { horizontal: 'center' };

    row.getCell(11).value = r.otp_verified;
    row.getCell(11).alignment = { horizontal: 'center' };
    if (r.otp_verified === 'Yes') {
      row.getCell(11).font = { bold: true, color: { argb: '166534' } };
    }

    row.getCell(12).value = r.is_subscribed;
    row.getCell(12).alignment = { horizontal: 'center' };
    if (r.is_subscribed === 'Yes') {
      row.getCell(12).font = { bold: true, color: { argb: '15803D' } };
      row.getCell(12).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'DCFCE7' } };
    }

    for (let c = 1; c <= subClicksHeaders.length; c++) {
      const cell = row.getCell(c);
      cell.border = THIN_BORDER;
      if (idx % 2 === 1 && r.is_subscribed !== 'Yes') {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F8FAFC' } };
      }
    }

    curSubRow++;
  });

  wsSubClicks.columns = [
    { width: 14 },
    { width: 22 },
    { width: 24 },
    { width: 30 },
    { width: 36 },
    { width: 20 },
    { width: 18 },
    { width: 14 },
    { width: 18 },
    { width: 15 },
    { width: 15 },
    { width: 15 },
  ];

  // ==========================================
  // SHEET 5: September All Landing Page Visits (36,959 rows)
  // ==========================================
  console.log('Writing Sheet 5: September All Landing Page Visits Log...');
  const wsAllVisits = workbook.addWorksheet('All Landing Visits Log', { views: [{ showGridLines: true }] });

  const allVisitsHeaders = [
    'Visit ID',
    'Visit Timestamp (UTC)',
    'Phone Number (MSISDN)',
    'Click ID',
    'Vendor RCID',
    'Vendor Name',
    'IP Address',
    'Page Type',
    'Visit Status',
    'Clicked Subscribe?',
    'Subscribe Clicks',
    'Subscribed?',
  ];

  formatHeader(wsAllVisits.getRow(2), allVisitsHeaders);

  let curVisitRow = 3;
  allVisitsQuery.rows.forEach((r, idx) => {
    const row = wsAllVisits.getRow(curVisitRow);
    row.height = 18;

    row.getCell(1).value = Number(r.visit_id);
    row.getCell(1).alignment = { horizontal: 'center' };

    row.getCell(2).value = r.visit_time_utc;
    row.getCell(2).alignment = { horizontal: 'center' };

    row.getCell(3).value = r.phone || '';
    if (r.phone) {
      row.getCell(3).font = { bold: true, color: { argb: '0369A1' } };
    }

    row.getCell(4).value = r.click_id;
    row.getCell(4).font = { name: 'Consolas', size: 9 };

    row.getCell(5).value = r.rcid;
    row.getCell(5).font = { name: 'Consolas', size: 9, color: { argb: '64748B' } };

    row.getCell(6).value = vendorMap[r.vendor_id] || 'Direct/Unknown';

    row.getCell(7).value = r.ip_address;
    row.getCell(7).font = { name: 'Consolas', size: 9 };

    row.getCell(8).value = r.page_type || 'HOME';
    row.getCell(8).alignment = { horizontal: 'center' };

    row.getCell(9).value = r.visit_status;
    row.getCell(9).alignment = { horizontal: 'center' };

    row.getCell(10).value = r.clicked_subscribe;
    row.getCell(10).alignment = { horizontal: 'center' };
    if (r.clicked_subscribe === 'Yes') {
      row.getCell(10).font = { bold: true, color: { argb: '0284C7' } };
    }

    row.getCell(11).value = Number(r.subscribe_clicks);
    row.getCell(11).alignment = { horizontal: 'center' };

    row.getCell(12).value = r.is_subscribed;
    row.getCell(12).alignment = { horizontal: 'center' };
    if (r.is_subscribed === 'Yes') {
      row.getCell(12).font = { bold: true, color: { argb: '15803D' } };
      row.getCell(12).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'DCFCE7' } };
    }

    if (idx % 2 === 1 && r.is_subscribed !== 'Yes') {
      for (let c = 1; c <= allVisitsHeaders.length; c++) {
        row.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F8FAFC' } };
      }
    }

    curVisitRow++;
  });

  wsAllVisits.columns = [
    { width: 14 },
    { width: 22 },
    { width: 24 },
    { width: 30 },
    { width: 36 },
    { width: 20 },
    { width: 18 },
    { width: 14 },
    { width: 18 },
    { width: 18 },
    { width: 16 },
    { width: 15 },
  ];

  // ==========================================
  // SHEET 6: September Vendor Breakdown
  // ==========================================
  console.log('Writing Sheet 6: September Vendor Breakdown...');
  const wsVendor = workbook.addWorksheet('Vendor & Traffic Source', { views: [{ showGridLines: true }] });

  const vendorHeaders = [
    'Vendor ID',
    'Vendor Name',
    'Landing Page Visits',
    'Unique Visitors (IP)',
    'Captured Phone Numbers',
    'Total Subscribe Clicks',
    'Unique Subscribe Clickers',
    'Subscribe CTR (%)',
    'Subscribed Users',
    'Conversion Rate (%)',
  ];

  formatHeader(wsVendor.getRow(2), vendorHeaders);

  let currentVendorRow = 3;
  vendorBreakdownQuery.rows.forEach((r, idx) => {
    const row = wsVendor.getRow(currentVendorRow);
    row.height = 22;

    const visits = Number(r.total_visits);
    const uips = Number(r.unique_ips);
    const phones = Number(r.visits_with_phone);
    const subClicks = Number(r.total_subscribe_clicks);
    const uSubClicks = Number(r.unique_users_subscribe_click);
    const subs = Number(r.subscribed_users);

    row.getCell(1).value = r.vendor_id || 'N/A';
    row.getCell(1).alignment = { horizontal: 'center' };

    row.getCell(2).value = vendorMap[r.vendor_id] || 'Direct / Organic';
    row.getCell(2).font = { bold: true };

    row.getCell(3).value = visits;
    row.getCell(3).numFmt = '#,##0';

    row.getCell(4).value = uips;
    row.getCell(4).numFmt = '#,##0';

    row.getCell(5).value = phones;
    row.getCell(5).numFmt = '#,##0';

    row.getCell(6).value = subClicks;
    row.getCell(6).numFmt = '#,##0';

    row.getCell(7).value = uSubClicks;
    row.getCell(7).numFmt = '#,##0';

    row.getCell(8).value = visits > 0 ? subClicks / visits : 0;
    row.getCell(8).numFmt = '0.00%';

    row.getCell(9).value = subs;
    row.getCell(9).numFmt = '#,##0';

    row.getCell(10).value = visits > 0 ? subs / visits : 0;
    row.getCell(10).numFmt = '0.00%';

    for (let c = 1; c <= vendorHeaders.length; c++) {
      const cell = row.getCell(c);
      cell.border = THIN_BORDER;
      if (idx % 2 === 1) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F8FAFC' } };
      }
    }
    currentVendorRow++;
  });

  // Vendor Totals
  const vTotalRow = wsVendor.getRow(currentVendorRow);
  vTotalRow.height = 24;
  vTotalRow.getCell(1).value = '-';
  vTotalRow.getCell(1).alignment = { horizontal: 'center' };
  vTotalRow.getCell(2).value = 'TOTAL';
  vTotalRow.getCell(2).font = { bold: true };

  vTotalRow.getCell(3).value = { formula: `SUM(C3:C${currentVendorRow - 1})` };
  vTotalRow.getCell(3).numFmt = '#,##0';

  vTotalRow.getCell(4).value = uniqueIps;
  vTotalRow.getCell(4).numFmt = '#,##0';

  vTotalRow.getCell(5).value = { formula: `SUM(E3:E${currentVendorRow - 1})` };
  vTotalRow.getCell(5).numFmt = '#,##0';

  vTotalRow.getCell(6).value = { formula: `SUM(F3:F${currentVendorRow - 1})` };
  vTotalRow.getCell(6).numFmt = '#,##0';

  vTotalRow.getCell(7).value = { formula: `SUM(G3:G${currentVendorRow - 1})` };
  vTotalRow.getCell(7).numFmt = '#,##0';

  vTotalRow.getCell(8).value = { formula: `F${currentVendorRow}/C${currentVendorRow}` };
  vTotalRow.getCell(8).numFmt = '0.00%';

  vTotalRow.getCell(9).value = { formula: `SUM(I3:I${currentVendorRow - 1})` };
  vTotalRow.getCell(9).numFmt = '#,##0';

  vTotalRow.getCell(10).value = { formula: `I${currentVendorRow}/C${currentVendorRow}` };
  vTotalRow.getCell(10).numFmt = '0.00%';

  for (let c = 1; c <= vendorHeaders.length; c++) {
    const cell = vTotalRow.getCell(c);
    cell.font = { bold: true, color: { argb: '0F172A' } };
    cell.fill = TOTAL_ROW_FILL;
    cell.border = {
      top: { style: 'medium', color: { argb: '64748B' } },
      bottom: { style: 'double', color: { argb: '64748B' } },
      left: { style: 'thin', color: { argb: 'CBD5E1' } },
      right: { style: 'thin', color: { argb: 'CBD5E1' } },
    };
  }

  wsVendor.columns = [
    { width: 14 },
    { width: 22 },
    { width: 20 },
    { width: 22 },
    { width: 25 },
    { width: 22 },
    { width: 25 },
    { width: 18 },
    { width: 18 },
    { width: 20 },
  ];

  // Save Workbook to disk
  const pathSeptNamed = path.resolve('d:/dddd/Burkina_Faso_September_Analytics_Report.xlsx');
  const pathMainOverwritten = path.resolve('d:/dddd/Burkina_Faso_Analytics_Report.xlsx');
  const pathArtifactSept = path.resolve('C:/Users/gjais/.gemini/antigravity-ide/brain/9db2e6c0-3779-4972-b535-8c074346209e/Burkina_Faso_September_Analytics_Report.xlsx');

  console.log(`Writing workbook to ${pathSeptNamed}...`);
  await workbook.xlsx.writeFile(pathSeptNamed);
  console.log(`Successfully saved: ${pathSeptNamed}`);

  console.log(`Overwriting main report with September data: ${pathMainOverwritten}...`);
  await workbook.xlsx.writeFile(pathMainOverwritten);
  console.log(`Successfully updated: ${pathMainOverwritten}`);

  try {
    await workbook.xlsx.writeFile(pathArtifactSept);
    console.log(`Successfully saved artifact copy: ${pathArtifactSept}`);
  } catch (e) {
    console.warn('Artifact write warning:', e.message);
  }

  console.log('Finished updating September Excel Report with full OTP Verified & Conversion details!');
}

main().catch(console.error);
