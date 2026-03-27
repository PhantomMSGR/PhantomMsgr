#!/usr/bin/env node
// PhantomMsgr — cross-platform dev startup
// Usage:  node scripts/dev.js [--mobile]
'use strict'

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')
const net = require('net')

const ROOT = path.resolve(__dirname, '..')
const MOBILE = process.argv.includes('--mobile')

// ── Colours ──────────────────────────────────────────────────────────────────
const c = {
  cyan:   (s) => `\x1b[36m${s}\x1b[0m`,
  green:  (s) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  bold:   (s) => `\x1b[1m${s}\x1b[0m`,
}

const log  = (msg) => console.log(`${c.cyan('[dev]')} ${msg}`)
const ok   = (msg) => console.log(`${c.green('[dev]')} ${msg}`)
const warn = (msg) => console.log(`${c.yellow('[dev]')} ${msg}`)

// ── Helpers ───────────────────────────────────────────────────────────────────
function run(cmd, opts = {}) {
  execSync(cmd, { stdio: 'inherit', cwd: ROOT, ...opts })
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

/** Wait until a TCP port accepts connections */
function waitForPort(host, port, timeoutMs = 60_000) {
  const start = Date.now()
  return new Promise((resolve, reject) => {
    const attempt = () => {
      const sock = new net.Socket()
      sock.setTimeout(1000)
      sock
        .connect(port, host, () => { sock.destroy(); resolve() })
        .on('error', () => {
          sock.destroy()
          if (Date.now() - start > timeoutMs) {
            reject(new Error(`Timeout waiting for ${host}:${port}`))
          } else {
            setTimeout(attempt, 1000)
          }
        })
        .on('timeout', () => {
          sock.destroy()
          setTimeout(attempt, 1000)
        })
    }
    attempt()
  })
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  // 1. Ensure .env exists
  const envPath = path.join(ROOT, '.env')
  if (!fs.existsSync(envPath)) {
    warn('.env not found — copying from .env.example')
    fs.copyFileSync(path.join(ROOT, '.env.example'), envPath)
    warn('Edit .env and set a secure JWT_SECRET!')
  }

  // Parse POSTGRES_PORT from .env (default 5432)
  const envContent = fs.readFileSync(envPath, 'utf8')
  const pgPortMatch = envContent.match(/^POSTGRES_PORT\s*=\s*(\d+)/m)
  const PG_PORT = pgPortMatch ? parseInt(pgPortMatch[1]) : 5432

  // 2. Install root deps if needed
  if (!fs.existsSync(path.join(ROOT, 'node_modules'))) {
    log('Installing root dependencies…')
    run('npm install')
  }

  if (MOBILE && !fs.existsSync(path.join(ROOT, 'apps/mobile/node_modules'))) {
    log('Installing mobile dependencies…')
    run('npm install', { cwd: path.join(ROOT, 'apps/mobile') })
  }

  // 3. Start infra
  log('Starting infrastructure (postgres, redis, minio)…')
  run('docker compose -f docker-compose.infra.yml up -d')

  // 4. Wait for Postgres
  log(`Waiting for Postgres on :${PG_PORT}…`)
  await waitForPort('127.0.0.1', PG_PORT)
  // Extra buffer — Postgres accepts TCP before it's fully ready for queries
  await sleep(2000)
  ok('Postgres is ready')

  // 5. Run migrations
  log('Running database migrations…')
  run('npm run db:migrate')
  ok('Migrations done')

  // 6. Start all services via Nx
  console.log('')
  console.log(c.bold('Starting all backend services with hot-reload…'))
  console.log('')

  const projects = MOBILE
    ? 'tag:type:app'
    : 'tag:type:app,!mobile'

  run(`npx nx run-many -t serve --projects=${projects} --parallel=7`)
}

main().catch((err) => {
  console.error(`\x1b[31m[dev] Fatal: ${err.message}\x1b[0m`)
  process.exit(1)
})
