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
  } catch (e) {
    return await r.finish(e)
  }
  return await r.finish()
}

if (import.meta.url === `file://${process.argv[1]}`) process.exit((await run()) ? 0 : 1)
