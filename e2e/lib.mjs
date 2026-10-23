import { mkdirSync } from 'node:fs'
import { chromium } from 'playwright'

export const BASE = process.env.E2E_BASE_URL ?? 'http://localhost:5173'
export const API = process.env.E2E_API_URL ?? 'http://localhost:8080'
export const ADMIN = { email: 'admin@trackbox24.com', password: process.env.E2E_ADMIN_PASSWORD ?? 'admin12345' }
export const MANAGER = { email: 'manager@test.ua', password: 'manager123' }

export const uniq = () => String(Date.now()).slice(-6)

/** Direct backend calls for seeding; returns a `post`/`get` pair bound to a user's token. */
export async function apiAs({ email, password }) {
  const login = await fetch(API + '/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  }).then((r) => r.json())
  const headers = { Authorization: 'Bearer ' + login.accessToken, 'Content-Type': 'application/json' }
  return {
    get: (path) => fetch(API + path, { headers }).then((r) => r.json()),
    post: (path, body) => fetch(API + path, { method: 'POST', headers, body: JSON.stringify(body) }).then((r) => r.json()),
    put: (path, body) => fetch(API + path, { method: 'PUT', headers, body: JSON.stringify(body) }).then((r) => r.json()),
  }
}

/** Ensures the manager/representative/client/parcel fixtures exist (idempotent). */
export async function ensureSeed() {
  const admin = await apiAs(ADMIN)
  const companies = await admin.get('/api/companies?size=100')
  let company = (companies.content ?? []).find((c) => c.name === 'Тест Логістик')
  if (!company) company = await admin.post('/api/companies', { name: 'Тест Логістик', edrpou: '12345678' })
  const users = await admin.get(`/api/users?companyId=${company.id}&size=100`)
  if (!(users.content ?? []).some((u) => u.email === MANAGER.email)) {
    await admin.post('/api/users', { companyId: company.id, email: MANAGER.email, password: MANAGER.password, firstName: 'Олена', lastName: 'Менеджер', roles: ['MANAGER'] })
  }
  const manager = await apiAs(MANAGER)
  const reps = await manager.get('/api/users?role=REPRESENTATIVE&size=1')
  if (!reps.content?.length) {
    await manager.post('/api/users', { email: 'rep@test.ua', password: 'rep12345', firstName: 'Іван', lastName: 'Представник', roles: ['REPRESENTATIVE'], phone: '380501112233' })
  }
  const clients = await manager.get('/api/clients?size=1')
  if (!clients.content?.length) {
    await manager.post('/api/clients', { type: 'PRIVATE_PERSON', firstName: 'Петро', lastName: 'Коваль', phone: '380671234567', city: 'Київ' })
  }
  const parcels = await manager.get('/api/parcels?size=1')
  if (!parcels.content?.length) {
    const client = (await manager.get('/api/clients?size=1')).content[0]
    await manager.post('/api/parcels', { clientId: client.id, description: 'Документи', seatsAmount: 3, senderName: 'Петренко Олег', senderPhone: '380501234567', senderCity: 'Львів' })
    await manager.post('/api/parcels', { description: 'Взуття', weightKg: 2.5, declaredValue: 1500, senderName: 'Іваненко', senderPhone: '380671112233' })
  }
  await cancelLeftoverTrips(manager)
  return { company, manager }
}

/** Planned departures the scenarios use for the trips they open; a run that crashed leaves them behind. */
const FIXTURE_DEPARTURES = ['2026-10-06T08:00:00Z', '2026-10-07T08:00:00Z', '2026-10-09T08:00:00Z']

/**
 * Open trips pile up run after run, and the trip select loads only the first hundred: a fresh fixture trip then
 * never shows up. Cancelling the leftovers keeps the list short; their parcels go back to the representative.
 */
async function cancelLeftoverTrips(manager) {
  for (const status of ['PLANNED', 'PREPARING']) {
    const page = await manager.get(`/api/trips?status=${status}&size=200`)
    for (const t of page.content ?? []) {
      if (FIXTURE_DEPARTURES.includes(t.plannedDepartureAt)) await manager.post(`/api/trips/${t.id}/cancel`)
    }
  }
}

export async function createRunner(name) {
  const shotsDir = new URL(`./shots/${name}/`, import.meta.url).pathname
  mkdirSync(shotsDir, { recursive: true })
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } })
  const results = []
  const errors = []
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message))
  page.on('console', (m) => {
    if (m.type() === 'error' && !/status of 4\d\d/.test(m.text())) errors.push('console: ' + m.text())
  })

  const runner = {
    page,
    browser,
    results,
    ok: (label, cond, extra = '') => results.push(`${cond ? 'PASS' : 'FAIL'} ${label}${extra ? ' — ' + extra : ''}`),
    shot: (file) => page.screenshot({ path: `${shotsDir}${file}.png`, fullPage: true }),
    dialog: () => page.locator('[data-slot=dialog-content]'),
    async login({ email, password }) {
      await page.goto(BASE + '/login')
      await page.evaluate(() => localStorage.removeItem('tb24.token'))
      await page.goto(BASE + '/login')
      await page.fill('#email', email)
      await page.fill('#password', password)
      await page.click('button[type=submit]')
      await page.waitForURL((u) => !u.pathname.includes('/login'))
    },
    async pickSelect(triggerId, text) {
      await page.click('#' + triggerId)
      const item = page.locator('[data-slot=select-item]:visible', { hasText: text }).first()
      await item.waitFor()
      await item.scrollIntoViewIfNeeded()
      await item.click()
    },
    /** Texts of the open select's options; closed popups stay in the DOM and must not be read. */
    async selectOptions() {
      return page.locator('[data-slot=select-item]:visible').allTextContents()
    },
    async finish(crash) {
      if (crash) {
        results.push('CRASH ' + crash.message.split('\n')[0])
        await runner.shot('99-crash').catch(() => {})
      }
      await browser.close()
      const failed = results.filter((r) => !r.startsWith('PASS'))
      console.log(`\n=== ${name}: ${results.length - failed.length}/${results.length} passed ===`)
      console.log(results.join('\n'))
      if (errors.length) console.log('--- page errors ---\n' + errors.slice(0, 10).join('\n'))
      return failed.length === 0 && errors.length === 0
    },
  }
  return runner
}
