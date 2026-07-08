#!/usr/bin/env node
/**
 * Backfill historical visits + visit_events from the SQL database into
 * Elasticsearch so the in-app Campaign Logs viewer has past data.
 *
 * Usage: node scripts/reindex-logs.mjs
 * Requires ELASTICSEARCH_NODE (and DB_* / MySQL) to be configured in .env.
 */
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import mysql from 'mysql2/promise'
import { Client } from '@elastic/elasticsearch'

const __dirname = dirname(fileURLToPath(import.meta.url))
const envPath = resolve(__dirname, '../.env')

function loadEnv() {
  const env = {}
  try {
    const raw = readFileSync(envPath, 'utf8')
    for (const line of raw.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eq = trimmed.indexOf('=')
      if (eq === -1) continue
      const key = trimmed.slice(0, eq).trim()
      let value = trimmed.slice(eq + 1).trim()
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1)
      }
      env[key] = value
    }
  } catch {
    console.error('Could not read .env file')
    process.exit(1)
  }
  return { ...env, ...process.env }
}

function maskPhone(phone) {
  if (!phone) return undefined
  const t = String(phone).trim()
  if (t.length <= 4) return '****'
  return `${t.slice(0, 3)}****${t.slice(-2)}`
}

async function main() {
  const env = loadEnv()
  const node = env.ELASTICSEARCH_NODE
  if (!node) {
    console.error('ELASTICSEARCH_NODE is not set; nothing to do.')
    process.exit(1)
  }
  const index = env.ELASTICSEARCH_INDEX || 'campaign_events'

  const conn = await mysql.createConnection({
    host: env.DB_HOST || 'localhost',
    port: Number(env.DB_PORT || 3306),
    user: env.DB_USERNAME || 'root',
    password: env.DB_PASSWORD || '',
    database: env.DB_DATABASE || 'templatecraft',
  })
  const es = new Client({ node })

  // Mapping must match SearchService.ensureIndex so aggregations on keyword
  // fields (eventType, status, etc.) work.
  const mappings = {
    properties: {
      campaignId: { type: 'integer' },
      visitId: { type: 'integer' },
      vendorId: { type: 'integer' },
      affiliateId: { type: 'integer' },
      clickId: { type: 'keyword' },
      vidRaw: { type: 'keyword' },
      affRaw: { type: 'keyword' },
      phoneMasked: { type: 'keyword' },
      country: { type: 'keyword' },
      operator: { type: 'keyword' },
      pageType: { type: 'keyword' },
      eventType: { type: 'keyword' },
      status: { type: 'keyword' },
      ip: { type: 'keyword' },
      userAgent: { type: 'text' },
      timestamp: { type: 'date' },
    },
  }

  const existsRes = await es.indices.exists({ index })
  if (!existsRes) {
    await es.indices.create({ index, mappings })
    console.log(`Created index ${index} with mapping`)
  } else {
    // Verify the existing index uses keyword mapping for eventType. If it was
    // created with a dynamic (text) mapping, recreate it so aggregations work.
    try {
      const current = await es.indices.getMapping({ index })
      const props =
        current[index]?.mappings?.properties ||
        Object.values(current)[0]?.mappings?.properties ||
        {}
      if (props?.eventType?.type !== 'keyword') {
        console.log(
          `Index ${index} has an incompatible mapping (eventType=${props?.eventType?.type}). Recreating...`,
        )
        await es.indices.delete({ index })
        await es.indices.create({ index, mappings })
        console.log(`Recreated index ${index} with correct mapping`)
      }
    } catch (err) {
      console.warn(`Could not verify mapping: ${err.message}`)
    }
  }

  const [rows] = await conn.query(
    `SELECT e.id as eventId, e.event_type as eventType, e.created_at as eventAt,
            v.id as visitId, v.campaign_id as campaignId, v.vendor_id as vendorId,
            v.affiliate_id as affiliateId, v.click_id as clickId, v.vid_raw as vidRaw,
            v.aff_raw as affRaw, v.phone as phone, v.country as country,
            v.operator as operator, v.page_type as pageType, v.visit_status as status,
            v.ip_address as ip, v.user_agent as userAgent
     FROM visit_events e
     JOIN visits v ON v.id = e.visit_id
     ORDER BY e.id ASC`,
  )

  console.log(`Found ${rows.length} events to index...`)

  const batchSize = 500
  let indexed = 0
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize)
    const operations = batch.flatMap((r) => [
      { index: { _index: index } },
      {
        campaignId: r.campaignId,
        visitId: r.visitId,
        vendorId: r.vendorId ?? undefined,
        affiliateId: r.affiliateId ?? undefined,
        clickId: r.clickId ?? undefined,
        vidRaw: r.vidRaw ?? undefined,
        affRaw: r.affRaw ?? undefined,
        phoneMasked: maskPhone(r.phone),
        country: r.country ?? undefined,
        operator: r.operator ?? undefined,
        pageType: r.pageType ?? undefined,
        eventType: r.eventType ?? undefined,
        status: r.status ?? undefined,
        ip: r.ip ?? undefined,
        userAgent: r.userAgent ?? undefined,
        timestamp: new Date(r.eventAt).toISOString(),
      },
    ])
    const res = await es.bulk({ operations, refresh: false })
    if (res.errors) console.warn(`Batch ${i / batchSize} had errors`)
    indexed += batch.length
    console.log(`Indexed ${indexed}/${rows.length}`)
  }

  await es.indices.refresh({ index })
  await conn.end()
  console.log(`Done. Indexed ${indexed} events into ${index}.`)
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
