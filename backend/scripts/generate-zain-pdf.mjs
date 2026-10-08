import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import PDFDocument from 'pdfkit';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outputDir = path.resolve(__dirname, '../../');
const outputPath = path.join(outputDir, 'Wellness_Zain_JO_OTP_Verified_Report.pdf');
const backendUploadPath = path.resolve(__dirname, '../uploads/Wellness_Zain_JO_OTP_Verified_Report.pdf');

// Ensure uploads dir exists
if (!fs.existsSync(path.dirname(backendUploadPath))) {
  fs.mkdirSync(path.dirname(backendUploadPath), { recursive: true });
}

const doc = new PDFDocument({
  size: 'A4',
  margin: 40,
  info: {
    Title: 'Wellness Zain JO - OTP Verified MSISDN Report',
    Author: 'Antigravity Telemetry System',
    Subject: 'OTP Verified Subscribers and Flow Audit',
    Keywords: 'Zain, Jordan, OTP, MSISDN, Wellness',
  },
});

const stream = fs.createWriteStream(outputPath);
doc.pipe(stream);

// Color palette
const PRIMARY = '#1e1b4b'; // Deep Indigo
const ACCENT = '#4f46e5'; // Indigo Accent
const SUCCESS = '#059669'; // Emerald
const TEXT_DARK = '#0f172a'; // Slate 900
const TEXT_MUTED = '#64748b'; // Slate 500
const BG_LIGHT = '#f8fafc'; // Slate 50
const BORDER_COLOR = '#e2e8f0';

// Header Banner
doc.rect(40, 40, 515, 65).fill(PRIMARY);
doc.fillColor('#ffffff').fontSize(18).font('Helvetica-Bold')
   .text('WELLNESS ZAIN JO — OTP VERIFICATION REPORT', 55, 52);
doc.fontSize(9).font('Helvetica')
   .fillColor('#c7d2fe')
   .text('CAMPAIGN ID: 36  |  OPERATOR: ZAIN JORDAN  |  FLOW TYPE: OTP_ONLY', 55, 74)
   .text('GENERATED ON: 08 OCTOBER 2026  |  TIMEZONE: UTC / ASIA/AMMAN (UTC+3)', 55, 87);

doc.moveDown(3);

// Section 1: Note regarding Requested Date (6 Sept vs 6 Oct)
let y = 120;
doc.roundedRect(40, y, 515, 58, 6).fillAndStroke('#eff6ff', '#bfdbfe');
doc.fillColor('#1e40af').fontSize(10).font('Helvetica-Bold')
   .text('DATE RECONCILIATION NOTICE (6 SEPT vs 6 OCT):', 50, y + 8);
doc.fillColor('#1e3a8a').fontSize(8.5).font('Helvetica')
   .text('The campaign "Wellness Zain JO" (ID: 36) was created on 30 September 2026. Therefore, no telemetry exists for 6 September 2026. The verified OTP activity and conversions occurred on 6 October 2026 (Jordan local date: 6 Oct 2026). This report provides the complete verified MSISDN data for 6 October 2026.', 50, y + 22, { width: 495, lineGap: 2 });

// Section 2: Summary Stats Cards
y = 190;
const cardWidth = 122;
const cardGap = 8;

const cards = [
  { title: 'CAMPAIGN', val: 'Wellness Zain JO', sub: 'ID #36 (OTP_ONLY)' },
  { title: 'VERIFIED MSISDN', val: '962797923987', sub: 'Status: Subscribed' },
  { title: 'CONVERSION', val: 'Active (Sent)', sub: 'Postback ID: 6707' },
  { title: 'TOTAL OTP SENDS', val: '3 MSISDNs', sub: 'Date: 06 Oct 2026' },
];

cards.forEach((c, idx) => {
  const cx = 40 + idx * (cardWidth + cardGap);
  doc.roundedRect(cx, y, cardWidth, 54, 5).fillAndStroke('#ffffff', BORDER_COLOR);
  doc.fillColor(TEXT_MUTED).fontSize(7).font('Helvetica-Bold').text(c.title, cx + 8, y + 8);
  doc.fillColor(idx === 1 ? SUCCESS : PRIMARY).fontSize(10).font('Helvetica-Bold').text(c.val, cx + 8, y + 22);
  doc.fillColor(TEXT_MUTED).fontSize(7).font('Helvetica').text(c.sub, cx + 8, y + 38);
});

// Section 3: Verified Subscriber Details Table
y = 260;
doc.fillColor(TEXT_DARK).fontSize(12).font('Helvetica-Bold').text('1. VERIFIED OTP SUBSCRIBER (6 OCTOBER 2026)', 40, y);

y = 280;
// Table Header
doc.rect(40, y, 515, 20).fill(ACCENT);
doc.fillColor('#ffffff').fontSize(8).font('Helvetica-Bold');
doc.text('PARAMETER', 50, y + 6);
doc.text('TELEMETRY VALUE / LOG DETAILS', 180, y + 6);

const verifiedDetails = [
  ['MSISDN (Mobile Number)', '+962 79 792 3987 (Jordan - Zain)'],
  ['Verification Flow', 'OTP_ONLY (Screen 1: Phone -> Screen 2: OTP Entry)'],
  ['Visit ID', '391040'],
  ['Click ID', '4oOP1Wcasp2bf4q9qQ28OMaw'],
  ['RCID (Vendor Click ID)', 'Fh_11kta8Yr4kM2kSTantWV9hnCOtpIc_6ZRCdBsWfUB-_j30erdcU1kivbregOcsMD8nYF_8s7wkgxpI6rAiLoxLmhukrMN'],
  ['Vendor', 'Vendor ID #6 (TickHigh)'],
  ['Campid / Tracking Campid', '5473169 / JO-ZA-36'],
  ['OTP Request (Send) Time', '2026-10-06 04:04:16 UTC  (06:34:16 Jordan / 09:34:16 IST)'],
  ['OTP Verify Time', '2026-10-06 04:04:40 UTC  (06:34:40 Jordan / 09:34:40 IST)'],
  ['Gateway Response', 'HTTP 200 {"responseType": 200, "message": "verify process completed"}'],
  ['Billing Callback Time', '2026-10-07 00:08:40 UTC  (Operator status: active)'],
  ['Vendor Postback Status', 'HTTP 200 (Sent) -> Postback fired to TickHigh tracking URL'],
  ['Subscriber Final Status', 'SUBSCRIBED / ACTIVE'],
];

y += 20;
verifiedDetails.forEach(([key, val], idx) => {
  const bg = idx % 2 === 0 ? BG_LIGHT : '#ffffff';
  doc.rect(40, y, 515, 18).fillAndStroke(bg, BORDER_COLOR);
  doc.fillColor(TEXT_DARK).fontSize(7.5).font('Helvetica-Bold').text(key, 48, y + 5);
  doc.fillColor(key.includes('MSISDN') ? SUCCESS : TEXT_DARK).fontSize(7.5)
     .font(key.includes('MSISDN') ? 'Helvetica-Bold' : 'Helvetica')
     .text(val, 180, y + 5, { width: 365 });
  y += 18;
});

// Section 4: All OTP Activity on 06 October 2026
y += 15;
doc.fillColor(TEXT_DARK).fontSize(12).font('Helvetica-Bold').text('2. ALL OTP ATTEMPTS IN WELLNESS ZAIN JO (06 OCT 2026)', 40, y);

y += 20;
// Table Header
doc.rect(40, y, 515, 20).fill(PRIMARY);
doc.fillColor('#ffffff').fontSize(7.5).font('Helvetica-Bold');
doc.text('MSISDN', 48, y + 6);
doc.text('VISIT ID', 125, y + 6);
doc.text('OTP SEND (UTC)', 175, y + 6);
doc.text('OTP VERIFY (UTC)', 275, y + 6);
doc.text('STATUS', 375, y + 6);
doc.text('OUTCOME', 440, y + 6);

const attempts = [
  {
    msisdn: '962797923987',
    visitId: '391040',
    sendTime: '06-10-2026 04:04:16',
    verifyTime: '06-10-2026 04:04:40',
    status: 'VERIFIED',
    outcome: 'Subscribed & Postback Sent',
    isSuccess: true,
  },
  {
    msisdn: '962795844290',
    visitId: '391293',
    sendTime: '06-10-2026 05:47:03',
    verifyTime: '— (No verify submitted)',
    status: 'OTP_SENT_ONLY',
    outcome: 'User dropped at OTP screen',
    isSuccess: false,
  },
  {
    msisdn: '962775997446',
    visitId: '401857',
    sendTime: '06-10-2026 15:38:56',
    verifyTime: '— (No verify submitted)',
    status: 'OTP_SENT_ONLY',
    outcome: 'User dropped at OTP screen',
    isSuccess: false,
  },
];

y += 20;
attempts.forEach((row, idx) => {
  const bg = row.isSuccess ? '#ecfdf5' : idx % 2 === 0 ? BG_LIGHT : '#ffffff';
  doc.rect(40, y, 515, 20).fillAndStroke(bg, BORDER_COLOR);
  doc.fillColor(row.isSuccess ? SUCCESS : TEXT_DARK).fontSize(8).font('Helvetica-Bold')
     .text(row.msisdn, 48, y + 6);
  doc.fillColor(TEXT_DARK).fontSize(7.5).font('Helvetica')
     .text(row.visitId, 125, y + 6)
     .text(row.sendTime, 175, y + 6)
     .text(row.verifyTime, 275, y + 6);
  doc.fillColor(row.isSuccess ? SUCCESS : '#b45309').fontSize(7.5).font('Helvetica-Bold')
     .text(row.status, 375, y + 6);
  doc.fillColor(row.isSuccess ? SUCCESS : TEXT_MUTED).fontSize(7.5).font('Helvetica')
     .text(row.outcome, 440, y + 6);
  y += 20;
});

// Section 5: Testing Numbers for Full Reference (from Campaign Launch 01 Oct)
y += 15;
doc.fillColor(TEXT_DARK).fontSize(10).font('Helvetica-Bold').text('ADDITIONAL HISTORICAL NUMBERS (CAMPAIGN LAUNCH 01 OCT 2026):', 40, y);
y += 15;

const launchHistory = [
  '• 962776140096 (Visit IDs 250525, 250529, 250538, 250542 on 01-Oct-2026) — PIN Entry test (wrong pin responses).',
  '• 962791234567 (Visit ID 250709 on 01-Oct-2026) — Dummy test submission.',
  '• 962798752986 (Visit ID 254817 on 01-Oct-2026 in Campaign #32 Wellness Zain JO API) — Expose API test.',
];

launchHistory.forEach((line) => {
  doc.fillColor(TEXT_MUTED).fontSize(7.5).font('Helvetica').text(line, 45, y, { width: 505 });
  y += 13;
});

// Footer
doc.rect(40, 775, 515, 1).fill(BORDER_COLOR);
doc.fillColor(TEXT_MUTED).fontSize(7.5).font('Helvetica')
   .text('Confidential — Generated for Internal Performance Audit — TemplateCraft / Antigravity Platform', 40, 785)
   .text('Page 1 of 1', 500, 785);

doc.end();

stream.on('finish', () => {
  // Also copy to backend/uploads
  fs.copyFileSync(outputPath, backendUploadPath);
  console.log(`PDF successfully generated at: ${outputPath}`);
  console.log(`And copied to: ${backendUploadPath}`);
});
