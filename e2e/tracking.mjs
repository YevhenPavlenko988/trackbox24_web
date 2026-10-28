// Public tracking: the page the label's QR code and a parcel's trackingUrl lead to, open without signing in.
// The admin turns the option on for the fixture company; a parcel planned into a trip gets a delivery estimate.
import { apiAs, ADMIN, BASE, createRunner, ensureSeed, MANAGER, uniq } from './lib.mjs'

const DEPARTURE = '2026-10-09T08:00:00Z' // a fixture departure: the seed cancels what a crashed run leaves behind

export async function run() {
  const { company } = await ensureSeed()
  const admin = await apiAs(ADMIN)
  const manager = await apiAs(MANAGER)
  const u = uniq()
  const enabled = await admin.put(`/api/companies/${company.id}/public-tracking?value=true`)
  const parcel = await manager.post('/api/parcels', { description: 'Відстежувана ' + u, weightKg: 1, senderName: 'Відправник ' + u })
  const trip = await manager.post('/api/trips', { plannedDepartureAt: DEPARTURE, plannedArrivalAt: '2099-01-15T18:00:00Z', origin: 'Київ', destination: 'Варшава' })
  await manager.post(`/api/trips/${trip.id}/parcels`, { parcelIds: [parcel.id] })

  const r = await createRunner('tracking')
  const { page, ok, shot } = r

  try {
    ok('admin turned public tracking on', enabled.publicTrackingEnabled === true, JSON.stringify(enabled).slice(0, 120))
    const seen = await manager.get(`/api/parcels/${parcel.id}`)
    ok('parcel carries its tracking link', typeof seen.trackingUrl === 'string' && seen.trackingUrl.endsWith('/track/' + parcel.barcode), seen.trackingUrl)

    // Found: the status in the client's words, the carrier, the estimate from the trip plan, the history.
    await page.goto(BASE + '/track/' + parcel.barcode)
    await page.waitForSelector('dl')
    let body = await page.textContent('body')
    ok('status is told in the client words', body.includes('Прийнято перевізником'))
    ok('carrier and barcode shown', body.includes('Тест Логістик') && body.includes(parcel.barcode))
    ok('delivery estimate from the trip plan', body.includes('Орієнтовна доставка') && body.includes('15.01.2099') && body.includes('за планом рейсу'))
    ok('history lists the first step', (await page.locator('ol li').count()) >= 1 && body.includes('Історія'))
    ok('no personal data on the page', !body.includes('Відправник ' + u))
    ok('tab title names the page', (await page.title()).startsWith('Відстеження посилки'))
    await shot('01-found')

    // Spaces and case are forgiven in the search box; a wrong shape is refused without a request.
    await page.goto(BASE + '/track')
    await page.fill('#tracking-code', 'abc')
    await page.click('button[type=submit]')
    await page.waitForSelector('#tracking-error')
    ok('malformed code refused with a hint', (await page.textContent('#tracking-error')).includes('PT і 10 цифр'))
    await page.fill('#tracking-code', ' ' + parcel.barcode.toLowerCase() + ' ')
    await page.click('button[type=submit]')
    await page.waitForURL((x) => x.pathname === '/track/' + parcel.barcode)
    await page.waitForSelector('dl')
    ok('search normalises the code and opens the parcel', true)
    await shot('02-search')

    // Unknown: one answer for unknown, malformed and hidden codes, in the backend's words.
    await page.goto(BASE + '/track/PT0000000000')
    await page.waitForSelector('#tracking-error')
    ok('unknown parcel says not found', (await page.textContent('#tracking-error')).includes('Посилку не знайдено'))
    await shot('03-not-found')

    // Hidden: the same parcel disappears once the company turns the page off.
    await admin.put(`/api/companies/${company.id}/public-tracking?value=false`)
    await page.goto(BASE + '/track/' + parcel.barcode)
    await page.waitForSelector('#tracking-error')
    ok('parcel hidden when the company turns tracking off', (await page.textContent('#tracking-error')).includes('Посилку не знайдено'))
    ok('no tracking link once off', (await manager.get(`/api/parcels/${parcel.id}`)).trackingUrl === undefined)

    // The front page leads here.
    await page.goto(BASE + '/')
    await page.click('header a[href="/track"]')
    await page.waitForURL((x) => x.pathname === '/track')
    ok('landing header links to tracking', await page.locator('#tracking-code').isVisible())
  } catch (e) {
    return r.finish(e)
  } finally {
    await admin.put(`/api/companies/${company.id}/public-tracking?value=true`).catch(() => {})
    await manager.post(`/api/trips/${trip.id}/cancel`).catch(() => {})
  }
  return r.finish()
}

if (import.meta.url === `file://${process.argv[1]}`) process.exit((await run()) ? 0 : 1)
