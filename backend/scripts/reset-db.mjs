#!/usr/bin/env node
/**
 * Drops and recreates the database for a fresh migration run.
 * Usage: node scripts/reset-db.mjs
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
    console.error('Could not read .env — copy .env.example to .env first')
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
  console.log(`Resetting database "${database}" on ${host}:${port}...`)
  const connection = await mysql.createConnection({
    host,
    port,
    user,
    password,
    multipleStatements: true,
  })

  await connection.query(`DROP DATABASE IF EXISTS \`${database}\``)
  await connection.query(
    `CREATE DATABASE \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
  )
  await connection.end()

  console.log(`Database "${database}" reset. Start the backend: npm run start:dev`)
}

main().catch((err) => {
  console.error('Database reset failed:', err.message)
  process.exit(1)
})
