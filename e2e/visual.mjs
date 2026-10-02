// Visual walkthrough: screenshots of every screen and dialog per role. Not a test — review the PNGs by eye.
import { ADMIN, apiAs, BASE, createRunner, ensureSeed, MANAGER, uniq } from './lib.mjs'

const u = uniq()
await ensureSeed()
const admin = await apiAs(ADMIN)
const manager = await apiAs(MANAGER)
const company = (await admin.get('/api/companies?size=100')).content.find((c) => c.name === 'Тест Логістик')

// ----- fixtures: driver, car, warehouse, parcels, trips in every status -----
// Users are reused between runs (no delete endpoint); their open trips are closed at the end so the next run can start fresh.
const existingUsers = (await admin.get(`/api/users?companyId=${company.id}&size=200`)).content ?? []
const ensureUser = async (api, body) => existingUsers.find((x) => x.email === body.email) ?? (await api.post('/api/users', body))
const driverEmail = 'vdrv@test.ua'
await ensureUser(manager, { email: driverEmail, password: 'driver123', firstName: 'Візуальний', lastName: 'Водій', roles: ['DRIVER'], phone: '380630000071' })
const driver = await apiAs({ email: driverEmail, password: 'driver123' })
const car = await manager.post('/api/cars', { plateNumber: 'VS' + u.slice(0, 4) + 'AA', brand: 'Renault', model: 'Master', active: true })
const warehouse =
  ((await manager.get('/api/warehouses?size=100')).content ?? []).find((w) => w.name === 'Центральний склад') ??
  (await manager.post('/api/warehouses', { name: 'Центральний склад', address: 'Київ, вул. Складська, 1' }))
const client = (await manager.get('/api/clients?size=1')).content[0]
const mk = (desc, extra = {}) => manager.post('/api/parcels', { clientId: client.id, description: desc, senderName: 'ТОВ Постач', senderPhone: '380501234567', senderCity: 'Львів', deliveryPrice: 350, deliveryPriceCurrency: 'UAH', ...extra })
const pPlanned = await mk('Запчастини', { seatsAmount: 2 })
const pLoaded = await mk('Документи')
const pOutside = await mk('Побутова техніка', { seatsAmount: 3, weightKg: 24.5, declaredValue: 12000 })
const pDelivered = await mk('Одяг')
const pWarehouse = await mk('Взуття')
await mk('Скасована')
await manager.post(`/api/warehouses/${warehouse.id}/parcels`, { parcelIds: [pWarehouse.id] })
await fetch('http://localhost:8080/api/parcels/' + pWarehouse.id + '/payment', { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + (await (await fetch('http://localhost:8080/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(MANAGER) })).json()).accessToken }, body: JSON.stringify({ status: 'PAID' }) })

const dep = (h) => new Date(Date.now() + h * 3600e3).toISOString()
const tPlanned = await manager.post('/api/trips', { carId: car.id, driverId: (await driver.get('/api/auth/me')).id, plannedDepartureAt: dep(24), plannedArrivalAt: dep(36), origin: 'Київ', destination: 'Одеса', notes: 'Забрати документи на складі' })
await manager.post(`/api/trips/${tPlanned.id}/parcels`, { parcelIds: [pPlanned.id] })
const driverId = tPlanned.driverId
const tPreparing = await manager.post('/api/trips', { carId: car.id, driverId, plannedDepartureAt: dep(2), origin: 'Київ', destination: 'Львів' })
await manager.post(`/api/trips/${tPreparing.id}/parcels`, { parcelIds: [pLoaded.id, pDelivered.id] })
await driver.post('/api/scan/load', { code: pLoaded.barcode, tripId: tPreparing.id })
for (const s of pOutside.seats ?? []) await driver.post('/api/scan/load', { code: s.barcode, tripId: tPreparing.id })
// a separate driver for the in-progress / completed / cancelled trips (one active trip per driver)
const driver2Email = 'vdrv2@test.ua'
const d2 = await ensureUser(manager, { email: driver2Email, password: 'driver123', firstName: 'Другий', lastName: 'Водій', roles: ['DRIVER'], phone: '380630000072' })
const driver2 = await apiAs({ email: driver2Email, password: 'driver123' })
const car2 = await manager.post('/api/cars', { plateNumber: 'VS' + u.slice(0, 4) + 'BB', brand: 'Fiat', model: 'Ducato', active: true })
const pTrip2 = await mk('Косметика')
const tInProgress = await manager.post('/api/trips', { carId: car2.id, driverId: d2.id, plannedDepartureAt: dep(-1), origin: 'Київ', destination: 'Харків' })
await manager.post(`/api/trips/${tInProgress.id}/parcels`, { parcelIds: [pTrip2.id] })
await driver2.post('/api/scan/load', { code: pTrip2.barcode, tripId: tInProgress.id })
await driver2.post(`/api/trips/${tInProgress.id}/depart`, { startOdometerKm: 98000 })
await driver2.post('/api/scan/deliver', { code: pTrip2.barcode, paymentReceived: true })
const completed = (await manager.get('/api/trips?status=COMPLETED&size=1')).content[0]
const cancelled = (await manager.get('/api/trips?status=CANCELLED&size=1')).content[0]
const viewerEmail = 'vview@test.ua'
await ensureUser(admin, { companyId: company.id, email: viewerEmail, password: 'viewer123', firstName: 'Оксана', lastName: 'Бухгалтер', roles: ['VIEWER'] })

const r = await createRunner('visual')
const { page, shot, dialog } = r
const settle = (ms = 500) => page.waitForTimeout(ms)
const openDialog = async (name) => {
  await page.getByRole('button', { name }).first().click()
  await dialog().waitFor()
  await settle(300)
}
const closeDialog = async () => {
  await page.keyboard.press('Escape')
  await settle(300)
}
const go = async (path, waitFor) => {
  await page.goto(BASE + path)
  if (waitFor) await page.waitForSelector(waitFor)
  await settle()
}

try {
  await go('/login', '#email')
  await shot('00-login')

  await r.login(MANAGER)
  await go('/parcels', 'table tbody tr:has-text("PT")')
  await shot('01-parcels-list')
  await page.locator('table tbody tr').first().getByRole('checkbox').click()
  await page.locator('table tbody tr').nth(1).getByRole('checkbox').click()
  await settle(300)
  await shot('02-parcels-selection')
  await openDialog('Перемістити на склад')
  await shot('03-dialog-move-to-warehouse')
  await closeDialog()

  await go('/parcels/new', '#npTtn')
  await shot('04-parcel-new-ttn')
  await page.getByText('Без ТТН').click()
  await settle(300)
  await shot('05-parcel-new-manual')

  await go(`/parcels/${pOutside.id}`, 'h1:has-text("PT")')
  await shot('06-parcel-in-car')
  await openDialog('Редагувати')
  await shot('07-dialog-parcel-edit')
  await closeDialog()
  await openDialog('Змінити статус')
  await page.click('[data-slot=dialog-content] #status')
  await page.locator('[data-slot=select-item]', { hasText: 'На складі' }).click()
  await settle(300)
  await shot('08-dialog-status-warehouse')
  await closeDialog()

  await go(`/parcels/${pWarehouse.id}`, 'h1:has-text("PT")')
  await shot('09-parcel-at-warehouse-paid')
  await go(`/parcels/${pTrip2.id}`, 'h1:has-text("PT")')
  await shot('10-parcel-delivered')
  await go(`/parcels/${pPlanned.id}`, 'h1:has-text("PT")')
  await openDialog('Позначити оплаченою')
  await shot('11-dialog-mark-paid')
  await closeDialog()

  await page.addInitScript(() => {
    window.print = () => {}
  })
  await go(`/parcels/${pOutside.id}/labels`, 'svg rect')
  await shot('12-labels')

  await go('/clients', 'table tbody tr')
  await shot('13-clients-list')
  await go('/clients/new', '#lastName')
  await shot('14-client-new')
  await go(`/clients/${client.id}`, 'h1')
  await shot('15-client-info')
  await go(`/clients/${client.id}?tab=parcels`, 'table tbody tr')
  await shot('16-client-parcels')

  await go('/trips', 'table tbody tr')
  await shot('17-trips-list')
  await openDialog('Додати')
  await shot('18-dialog-trip-new')
  await closeDialog()
  await go(`/trips/${tPlanned.id}`, 'h1:has-text("Рейс #")')
  await shot('19-trip-planned')
  await openDialog('Запланувати посилки')
  await shot('20-dialog-parcel-picker')
  await closeDialog()
  await openDialog('Виїхав')
  await shot('21-dialog-depart')
  await closeDialog()
  await openDialog('Скасувати рейс')
  await shot('22-dialog-cancel-planned')
  await closeDialog()
  await go(`/trips/${tPreparing.id}`, 'h1:has-text("Рейс #")')
  await shot('23-trip-preparing')
  await openDialog('Редагувати план')
  await shot('24-dialog-trip-edit-locked')
  await closeDialog()
  await openDialog('Скасувати рейс')
  await page.getByText('На склад', { exact: true }).click()
  await settle(300)
  await shot('25-dialog-cancel-with-warehouse')
  await closeDialog()
  await go(`/trips/${tInProgress.id}`, 'h1:has-text("Рейс #")')
  await shot('26-trip-in-progress')
  await openDialog('Завершити')
  await shot('27-dialog-complete')
  await closeDialog()
  if (completed) {
    await go(`/trips/${completed.id}`, 'h1:has-text("Рейс #")')
    await shot('28-trip-completed')
  }
  if (cancelled) {
    await go(`/trips/${cancelled.id}`, 'h1:has-text("Рейс #")')
    await shot('29-trip-cancelled')
  }

  await go('/warehouses', 'table tbody tr')
  await shot('30-warehouses')
  await openDialog('Додати')
  await shot('31-dialog-warehouse')
  await closeDialog()

  await go('/users?size=100', 'table tbody tr')
  await shot('32-users')
  await openDialog('Додати')
  await shot('33-dialog-user-new')
  await closeDialog()
  await page.locator('table tbody tr:has-text("rep@test.ua")').getByRole('button', { name: 'Редагувати' }).click()
  await dialog().waitFor()
  await settle(300)
  await shot('34-dialog-user-edit')
  await closeDialog()
  await page.locator('table tbody tr:has-text("rep@test.ua")').getByRole('button', { name: 'Скинути пароль' }).click()
  await dialog().waitFor()
  await settle(300)
  await shot('35-dialog-reset-password')
  await closeDialog()
  await page.locator('table tbody tr:has-text("rep@test.ua")').getByRole('button', { name: 'Нова Пошта' }).click()
  await dialog().waitFor()
  await settle(300)
  await shot('36-dialog-user-np')
  await closeDialog()

  await go('/cars', 'table tbody tr')
  await shot('37-cars')
  await openDialog('Додати')
  await shot('38-dialog-car')
  await closeDialog()

  await go('/company', 'text=Тест Логістик')
  await shot('39-my-company')
  await openDialog('Ключ НП')
  await shot('40-dialog-company-np-key')
  await closeDialog()
  await openDialog('Змінити пароль')
  await shot('41-dialog-change-password')
  await closeDialog()
  await go('/nope')
  await settle()
  await shot('42-404')

  // ----- admin -----
  await r.login(ADMIN)
  await go('/companies', 'table tbody tr')
  await shot('50-admin-companies')
  await openDialog('Додати')
  await shot('51-dialog-company-new')
  await closeDialog()
  await go(`/companies/${company.id}`, 'h1')
  await shot('52-admin-company')
  await go(`/companies/${company.id}?tab=users`, 'table tbody tr')
  await shot('53-admin-company-users')
  await go(`/companies/${company.id}`, 'h1')
  await page.getByRole('button', { name: 'Відкрити компанію' }).click()
  await page.waitForURL('**/parcels')
  await page.waitForSelector('table tbody tr:has-text("PT")')
  await settle()
  await shot('54-admin-company-mode-parcels')
  await go(`/trips/${tPreparing.id}`, 'h1:has-text("Рейс #")')
  await shot('55-admin-company-mode-trip')
  await go('/users?size=100', 'table tbody tr')
  await shot('56-admin-company-mode-users')
  await go('/parcels')
  await settle()
  await page.goto(BASE + '/parcels')
  await settle()

  // ----- viewer -----
  await r.login({ email: viewerEmail, password: 'viewer123' })
  await go('/parcels', 'table tbody tr:has-text("PT")')
  await shot('60-viewer-parcels')
  await go(`/parcels/${pWarehouse.id}`, 'h1:has-text("PT")')
  await shot('61-viewer-parcel')
  await go(`/trips/${tPreparing.id}`, 'h1:has-text("Рейс #")')
  await shot('62-viewer-trip')
  await go('/company', 'text=Тест Логістик')
  await shot('63-viewer-company')

  // ----- pure driver -----
  await r.login({ email: driverEmail, password: 'driver123' })
  await page.waitForURL('**/mobile-only')
  await settle()
  await shot('70-driver-mobile-only')

  // ----- narrow viewport -----
  await page.setViewportSize({ width: 1024, height: 768 })
  await r.login(MANAGER)
  await go('/parcels', 'table tbody tr:has-text("PT")')
  await shot('80-narrow-parcels')
  await go(`/trips/${tPreparing.id}`, 'h1:has-text("Рейс #")')
  await shot('81-narrow-trip')
  console.log('visual walkthrough done')
} catch (e) {
  console.log('CRASH', e.message.split('\n')[0])
  await shot('99-crash').catch(() => {})
} finally {
  await r.browser.close()
  // free the drivers for the next run (one open trip per driver)
  await manager.post(`/api/trips/${tPlanned.id}/cancel`).catch(() => {})
  await manager.post(`/api/trips/${tPreparing.id}/cancel?warehouseId=${warehouse.id}`).catch(() => {})
  await driver2.post(`/api/trips/${tInProgress.id}/complete`, { endOdometerKm: 98420 }).catch(() => {})
}
