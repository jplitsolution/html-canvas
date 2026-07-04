#!/usr/bin/env node
/**
 * Resets all campaigns in the database to use 'local' Mock OTP provider.
 * Usage: node scripts/reset-otp-local.mjs
 */
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import mysql from 'mysql2/promise'

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
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1)
      }
      env[key] = value
    }
  } catch {
    console.error('Could not read .env file')
    process.exit(1)
  }
  return env
}

const env = loadEnv()
const host = env.DB_HOST || 'localhost'
const port = Number(env.DB_PORT || 3306)
const user = env.DB_USERNAME || 'root'
const password = env.DB_PASSWORD ?? ''
const database = env.DB_DATABASE || 'templatecraft'

async function main() {
  console.log(`Connecting to database ${database} as ${user}...`)
  const connection = await mysql.createConnection({
    host,
    port,
    user,
    password,
    database,
  })

  console.log('Resetting existing api_configs to "local" provider...')
  const [updateResult] = await connection.query(
    `UPDATE api_configs SET otp_provider = 'local', otp_config_json = '{}'`
  )
  console.log(`Updated existing configurations. Rows affected: ${updateResult.affectedRows}`)

  console.log('Fetching all campaigns to ensure they have local OTP configured...')
  const [campaigns] = await connection.query('SELECT id, name FROM campaigns')
  
  let insertedCount = 0
  for (const campaign of campaigns) {
    const [configs] = await connection.query(
      'SELECT id FROM api_configs WHERE campaign_id = ?',
      [campaign.id]
    )
    if (configs.length === 0) {
      console.log(`Creating default local OTP config for campaign: "${campaign.name}" (ID: ${campaign.id})`)
      await connection.query(
        'INSERT INTO api_configs (campaign_id, otp_provider, otp_config_json, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())',
        [campaign.id, 'local', '{}']
      )
      insertedCount++
    }
  }

  console.log(`Successfully completed! Reset existing: ${updateResult.affectedRows}, Created new: ${insertedCount}`)
  await connection.end()
}

main().catch((err) => {
  console.error('Failed to reset OTP provider configs:', err.message)
  process.exit(1)
})
