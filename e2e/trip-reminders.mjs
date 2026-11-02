// A leg reminds what it waits for: everything planned loaded — «Виїхав»; the car emptied at a warehouse — «Завершити»,
// which for a leg nobody marked as departed records the departure too.
import { ADMIN, apiAs, BASE, createRunner, uniq } from './lib.mjs'

export async function run() {
  const u = uniq()
  const admin = await apiAs(ADMIN)
  const company = await admin.post('/api/companies', { name: 'Тест Плечі ' + u })
  await admin.put(`/api/companies/${company.id}/moves?value=true`)
  const mgr = { email: `rmgr${u}@test.ua`, password: 'manager123' }
  await admin.post('/api/users', { companyId: company.id, ...mgr, firstName: 'Олена', lastName: 'Плече', roles: ['MANAGER'] })
  const manager = await apiAs(mgr)
  const drv = { email: `rdrv${u}@test.ua`, password: 'driver123' }
  const driver = await manager.post('/api/users', { ...drv, firstName: 'Водій', lastName: 'Р' + u, roles: ['DRIVER'], phone: '38063' + u + '5' })
  const car = await manager.post('/api/cars', { plateNumber: 'RM' + u.slice(0, 4) + 'AA', defaultDriverId: driver.id, active: true })
  const warehouse = await manager.post('/api/warehouses', { name: 'Склад ' + u })
  const client = await manager.post('/api/clients', { type: 'PRIVATE_PERSON', firstName: 'Ірина', lastName: 'Клієнт', phone: '38067' + u + '2' })
  const leg = (from, to) => ({ carId: car.id, driverId: driver.id, plannedDepartureAt: '2026-11-05T06:00:00Z', origin: from, destination: to })
  const route = await manager.post('/api/routes', { origin: 'Варшава', destination: 'Валенсія', legs: [leg('Варшава', 'Склад'), leg('Склад', 'Валенсія')] })
  const first = route.legs[0]
  const move = await manager.post('/api/parcels', { kind: 'MOVE', clientId: client.id, seatDescriptions: ['Диван', 'Шафа'] })
  await manager.post(`/api/routes/${route.id}/parcels`, { parcelIds: [move.id] })
  const driverApi = await apiAs(drv)
  for (const n of [1, 2]) await driverApi.post('/api/scan/load', { code: `${move.barcode}-${n}`, tripId: first.id })

  const r = await createRunner('trip-reminders')
  const { page, ok, shot, dialog } = r
  try {
    await r.login(mgr)
    await page.goto(BASE + `/trips/${first.id}`)
    await page.waitForSelector('[data-slot=page-header]:has-text("Рейс №")')
    await page.waitForSelector('text=Усе завантажено')
    ok('everything loaded: the leg reminds to depart', (await page.locator('[data-slot=alert]').innerText()).includes('Виїхав'))
    await shot('01-depart')
    await page.goto(BASE + '/trips?open=true')
    await page.waitForSelector(`table tbody tr:has-text("${move.barcode}")`)
    ok('the trips list says what a trip of moves carries', (await page.locator(`table tbody tr:has-text("${move.barcode}")`).innerText()).includes('2 м.'))
    await shot('01b-trips-list')
    await page.goto(BASE + `/trips/${first.id}`)
    await page.waitForSelector('text=Усе завантажено')

    // unloaded at the warehouse without anyone pressing «Виїхав»
    for (const n of [1, 2]) await manager.post('/api/scan/to-warehouse', { code: `${move.barcode}-${n}`, warehouseId: warehouse.id })
    await page.reload()
    await page.waitForSelector('text=Машина порожня')
    ok('the car emptied: the leg reminds to complete, and says the departure was not marked', (await page.locator('[data-slot=alert]').innerText()).includes('не позначили'))
    await shot('02-complete')
    await page.locator('[data-slot=alert]').getByRole('button', { name: 'Завершити' }).click()
    await dialog().waitFor()
    await shot('03-complete-dialog')
    await dialog().getByRole('button', { name: 'Завершити' }).click()
    await page.waitForSelector('[data-slot=page-header]:has-text("Завершений")')
    const done = await manager.get(`/api/trips/${first.id}`)
    ok('completed with the missed departure recorded', done.status === 'COMPLETED' && !!done.departedAt, done.status)
    ok('no reminder on a completed leg', !(await page.locator('[data-slot=alert]').count()))
    await shot('04-done')

    // the move waits at the warehouse for leg 2: chosen items go into its car by hand
    const second = route.legs[1]
    await page.goto(BASE + `/moves/${move.id}`)
    await page.waitForSelector('text=Місця (2)')
    await page.getByRole('checkbox', { name: 'Вибрати місце 1' }).click()
    const bar = page.locator('div:has(> span:text-is("Вибрано: 1"))')
    await bar.waitFor()
    const barText = await bar.innerText()
    ok('an item at the warehouse: into the planned leg, another warehouse for a manager, hand-over', barText.includes(`У рейс №${second.number}.2`) && barText.includes('На інший склад') && barText.includes('Видати'), barText)
    await shot('05-chosen-at-warehouse')
    await bar.getByRole('button', { name: /У рейс/ }).click()
    await dialog().waitFor()
    await dialog().getByRole('button', { name: 'Перемістити' }).click()
    await page.waitForSelector('text=Переміщено місць: 1')
    const loaded = await manager.get(`/api/parcels/${move.id}`)
    ok('the item is in the car of leg 2', loaded.seats[0].status === 'IN_CAR' && loaded.tripId === second.id, loaded.seats[0].status)

    // a trip on its own goes on with a next leg: it becomes leg 1 of a route, the cargo at the warehouse follows
    const alone = await manager.post('/api/trips', leg('Mas Camarena', 'Склад'))
    const solo = await manager.post('/api/parcels', { kind: 'MOVE', clientId: client.id, seatsAmount: 1 })
    await driverApi.post('/api/scan/load', { code: solo.barcode, tripId: alone.id })
    await manager.post('/api/scan/to-warehouse', { code: solo.barcode, warehouseId: warehouse.id })
    await page.goto(BASE + `/trips/${alone.id}`)
    await page.waitForSelector(`[data-slot=page-header]:has-text("Рейс №${alone.number}")`)
    await page.getByRole('button', { name: 'Наступне плече' }).click()
    await dialog().waitFor()
    await shot('06-next-leg-dialog')
    await page.fill('#tr-destination', 'Малага')
    await dialog().locator('button[type=submit]').click()
    await page.waitForURL((url) => /\/trips\/\d+$/.test(url.pathname) && !url.pathname.endsWith(`/${alone.id}`))
    await page.waitForSelector(`text=${alone.number}.2`)
    await shot('07-route-from-trip')
    const solo2 = await manager.get(`/api/parcels/${solo.id}`)
    const was = await manager.get(`/api/trips/${alone.id}`)
    ok('the trip became leg 1 and the cargo is planned on leg 2', was.legNumber === 1 && solo2.tripLegNumber === 2 && solo2.plannedTripId != null, `${was.legNumber} ${solo2.tripLegNumber}`)
  } catch (e) {
    return await r.finish(e)
  }
  return await r.finish()
}

if (import.meta.url === `file://${process.argv[1]}`) process.exit((await run()) ? 0 : 1)
