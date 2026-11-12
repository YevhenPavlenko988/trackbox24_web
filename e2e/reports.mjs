// «Звіти»: a driver takes cash for a parcel and delivers another unpaid; the manager sees the cash, takes it, sees the debt.
import { ADMIN, apiAs, BASE, createRunner, ensureSeed, MANAGER, uniq } from './lib.mjs'

export async function run() {
  const { company } = await ensureSeed()
  // «Звіти» is a module the platform team turns on
  await (await apiAs(ADMIN)).put(`/api/companies/${company.id}/reports?value=true`)
  const u = uniq()
  const manager = await apiAs(MANAGER)
  const driverEmail = `rpdrv${u}@test.ua`
  await manager.post('/api/users', { email: driverEmail, password: 'driver123', firstName: 'Каса', lastName: 'Водій' + u, roles: ['DRIVER'], phone: '38063' + u + '2' })
  const drv = (await manager.get('/api/users?role=DRIVER&size=300')).content.find((x) => x.email === driverEmail)
  const car = await manager.post('/api/cars', { plateNumber: 'RPT' + u.slice(0, 4), active: true })
  const client = (await manager.get('/api/clients?size=1')).content[0]
  const paid = await manager.post('/api/parcels', { clientId: client.id, description: 'Звіт ' + u, deliveryPrice: 77, deliveryPriceCurrency: 'EUR' })
  const unpaid = await manager.post('/api/parcels', { clientId: client.id, description: 'Борг ' + u, deliveryPrice: 333, deliveryPriceCurrency: 'UAH' })
  const trip = await manager.post('/api/trips', { carId: car.id, driverId: drv.id, plannedDepartureAt: '2026-10-06T08:00:00Z' })
  await manager.post(`/api/trips/${trip.id}/parcels`, { parcelIds: [paid.id, unpaid.id] })
  const driver = await apiAs({ email: driverEmail, password: 'driver123' })
  for (const p of [paid, unpaid]) await driver.post('/api/scan/load', { code: p.barcode, tripId: trip.id })
  await driver.post(`/api/trips/${trip.id}/depart`, {})
  await driver.post('/api/scan/deliver', { code: paid.barcode, paymentMethod: 'CASH' })
  await driver.post('/api/scan/deliver', { code: unpaid.barcode })
  const name = `Каса Водій${u}`

  const r = await createRunner('reports')
  const { page, ok, shot } = r
  try {
    await r.login(MANAGER)
    await page.goto(BASE + '/reports')
    await page.waitForSelector('[data-testid=cash-total]')
    ok('menu has «Звіти»', (await page.locator('[data-sidebar=menu-button]:has-text("Звіти")').count()) === 1)
    const card = (title) => page.locator('[data-slot=card]', { hasText: title })
    const row = card('Готівка на руках').locator('tr', { hasText: name })
    await row.waitFor()
    ok('the driver holds the cash he took', (await row.textContent()).includes('77'), await row.textContent())
    await shot('01-cash')
    await row.getByRole('button', { name: 'Прийняти' }).click()
    await page.waitForSelector('[role=dialog]')
    ok('the dialog offers all of it', (await page.inputValue('#ho-amount')) === '77')
    await page.locator('[role=dialog]').getByRole('button', { name: 'Прийняти' }).click()
    await page.waitForSelector('[role=dialog]', { state: 'detached' })
    await page.waitForTimeout(500)
    ok('nothing left in hand', (await row.count()) === 0)
    ok('the handover is listed', (await card('Здача каси').locator('tr', { hasText: name }).count()) === 1)

    await page.getByRole('tab', { name: 'Очікує оплати' }).click()
    await page.waitForSelector('[data-testid=debts-total]')
    const debt = page.locator('tr', { hasText: unpaid.barcode })
    await debt.waitFor()
    ok('the unpaid parcel is a debt', (await debt.textContent()).includes('333'), await debt.textContent())
    await shot('02-debts')

    // the trip of this run left this month: it is in «Рейси»
    await page.getByRole('tab', { name: 'Рейси' }).click()
    await page.waitForSelector('[data-testid=trips-count]')
    const tripRow = page.locator('tr', { hasText: 'RPT' + u.slice(0, 4) })
    await tripRow.first().waitFor()
    ok('the trip is in the trips report', (await tripRow.count()) >= 1)
    await shot('03-trips')
    await page.getByRole('tab', { name: 'Склади' }).click()
    await page.waitForTimeout(800)
    ok('the warehouses report opens', (await page.getByRole('tabpanel').textContent()).length > 0)
    await page.getByRole('tab', { name: 'Застряглі' }).click()
    await page.waitForSelector('[data-testid=stuck-title]')
    ok('the stuck report opens', true)

    // «Витрати»: the manager adds the trip's fuel on its page
    await page.goto(BASE + '/trips/' + trip.id)
    const expenses = page.locator('[data-slot=card]', { hasText: 'Витрати (' })
    await expenses.waitFor()
    await expenses.getByRole('button', { name: 'Додати витрату' }).click()
    await page.waitForSelector('[role=dialog]')
    await page.fill('#ex-amount', '7')
    await page.locator('[role=dialog]').getByRole('button', { name: 'Зберегти' }).click()
    await page.waitForSelector('[role=dialog]', { state: 'detached' })
    await expenses.locator('tr', { hasText: 'Пальне' }).waitFor()
    ok('the expense is on the trip', (await expenses.textContent()).includes('7 €'), await expenses.locator('[data-slot=card-description]').textContent())
    await shot('04-expenses')
  } catch (e) {
    return await r.finish(e)
  }
  return await r.finish()
}

if (import.meta.url === `file://${process.argv[1]}`) process.exit((await run()) ? 0 : 1)
