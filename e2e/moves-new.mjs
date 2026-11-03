// Moves end to end: a moves-only company; the move's loaders, storage, payments, currency and bill; labels with the
// recipient's phone; the loaders directory by city; a route in two legs with cargo and its trash; public tracking of an
// M… code; a representative without a phone; and the representative's web.
import { ADMIN, apiAs, BASE, createRunner, uniq } from './lib.mjs'

export async function run() {
  const u = uniq()
  const admin = await apiAs(ADMIN)
  const company = await admin.post('/api/companies', { name: 'Тест Переїзди ' + u })
  await admin.put(`/api/companies/${company.id}/moves?value=true`)
  await admin.put(`/api/companies/${company.id}/public-tracking?value=true`)
  await admin.put(`/api/companies/${company.id}/parcels?value=false`)
  const mgr = { email: `mvmgr${u}@test.ua`, password: 'manager123' }
  await admin.post('/api/users', { companyId: company.id, ...mgr, firstName: 'Олена', lastName: 'Переїзд', roles: ['MANAGER'] })
  const manager = await apiAs(mgr)
  const driver = await manager.post('/api/users', { email: `mvdrv${u}@test.ua`, password: 'driver123', firstName: 'Водій', lastName: 'Д' + u, roles: ['DRIVER'], phone: '38063' + u + '7' })
  const plate = 'MV' + u.slice(0, 4) + 'AA'
  await manager.post('/api/cars', { plateNumber: plate, defaultDriverId: driver.id, active: true })
  await manager.post('/api/warehouses', { name: 'Склад Львів ' + u })
  const sender = await manager.post('/api/clients', { type: 'PRIVATE_PERSON', firstName: 'Петро', lastName: 'Відправник', phone: '38050' + u + '1', city: 'Київ' })
  const recipient = await manager.post('/api/clients', { type: 'PRIVATE_PERSON', firstName: 'Ірина', lastName: 'Отримувач', phone: '38067' + u + '2', city: 'Варшава' })
  const move = await manager.post('/api/parcels', {
    kind: 'MOVE', clientId: recipient.id, senderClientId: sender.id, deliveryCity: 'Варшава',
    seatDescriptions: ['Диван', 'Шафа', 'Зайве'], deliveryPrice: 800, deliveryPriceCurrency: 'EUR',
  })
  await manager.post('/api/loaders', { firstName: 'Костя', city: 'Варшава' })

  const r = await createRunner('moves-new')
  const { page, ok, shot, dialog } = r
  const text = () => page.locator('body').innerText()
  try {
    await r.login(mgr)
    ok('moves-only company: no «Посилки» in the menu', !(await page.locator('[data-sidebar=menu] >> text=Посилки').count()))

    // the new move form: sender and recipient both clients
    await page.goto(BASE + '/moves/new')
    await page.waitForSelector('text=Відправник (клієнт)')
    ok('new move asks for the sender and the recipient as clients', (await page.locator('text=Отримувач (клієнт)').count()) > 0)

    // the move card: sender filled from the client, the bill block
    await page.goto(BASE + `/moves/${move.id}`)
    await page.waitForSelector('text=Вантажники, склад, оплати')
    ok('sender came from the client card', (await text()).includes('Відправник Петро'))
    await shot('01-move-card')

    // a seat entered by mistake goes; the others keep their numbers (labels may be printed already)
    await page.getByRole('button', { name: 'Видалити місце 3' }).click()
    await dialog().getByRole('button', { name: 'Видалити' }).click()
    await page.waitForSelector('text=Місце №3 видалено')
    const afterDelete = await manager.get(`/api/parcels/${move.id}`)
    ok('a seat is deleted, the rest keep their numbers', afterDelete.seats.map((x) => x.seatNumber).join(',') === '1,2' && afterDelete.seatsAmount === 2)
    ok('the deletion is in the history', (await manager.get(`/api/parcels/${move.id}/history`)).content.some((h) => h.comment?.includes('Видалено місце №3 «Зайве»')))

    // a work with a loader added on the spot
    await page.getByRole('button', { name: 'Робота' }).click()
    await dialog().waitFor()
    await page.fill('#wk-hours', '3')
    await page.fill('#wk-client', '15')
    await page.fill('#wk-loader', '10')
    await page.getByRole('button', { name: 'Новий вантажник' }).click()
    await page.fill('#ld-first', 'Андрій')
    await page.fill('#ld-city', 'Київ')
    await page.locator('[data-slot=dialog-content]:has(#ld-first) button[type=submit]').click()
    await page.locator('#ld-first').waitFor({ state: 'detached' })
    ok('the new loader is ticked in the work', await page.locator('label:has-text("Андрій") [data-slot=checkbox][data-checked]').count() > 0 || await page.locator('label:has-text("Андрій") button[aria-checked=true], label:has-text("Андрій") [data-state=checked]').count() > 0)
    await shot('02-work-dialog')
    await page.locator('[data-slot=dialog-content]:has(#wk-hours) button[type=submit]').click()
    await page.locator('#wk-hours').waitFor({ state: 'detached' })
    await page.waitForSelector('text=Андрій')
    ok('total = transport 800 + 3 h × 15 = 845', (await text()).includes('845'))

    // actual hours and paid
    const hours = page.locator('input[aria-label="Факт, год"]').first()
    await hours.fill('4')
    await hours.blur()
    await page.waitForFunction(() => document.body.innerText.includes('860'))
    ok('actual 4 h replace the planned: 860', true)
    ok('the plan shows next to the fact, read-only', (await text()).includes('3 год'))
    await page.getByRole('button', { name: 'Не виплачено' }).first().click()
    await page.waitForFunction(() => /виплачено 40/.test(document.body.innerText))
    ok('the loader marked paid: 40 paid out', (await page.getByRole('button', { name: 'Виплачено ✓' }).count()) === 1)

    // storage and a prepayment
    await page.getByRole('button', { name: 'Склад' }).click()
    await page.fill('#st-days', '10')
    await page.fill('#st-rate', '5')
    await page.locator('[data-slot=dialog-content] button[type=submit]').click()
    await page.waitForFunction(() => document.body.innerText.includes('910'))
    ok('storage 10 × 5 adds 50: 910', true)
    await page.getByRole('button', { name: 'Оплата клієнта' }).first().click() // the bill's; «Оплата» has the same
    await page.fill('#pm-amount', '200')
    await page.locator('[data-slot=dialog-content] button[type=submit]').click()
    await page.waitForFunction(() => document.body.innerText.includes('710'))
    ok('prepayment 200: due 710', true)
    await shot('03-bill')

    // currency: asked first, the prices are recalculated at the rate; back to euros gives the same sums
    await page.getByRole('button', { name: 'грн', exact: true }).click()
    ok('switching the currency asks first', await page.getByText('Перевести переїзд у грн?').isVisible())
    await page.getByRole('button', { name: 'Перерахувати' }).click()
    await page.waitForFunction(() => !document.body.innerText.includes('710 €') && /\d грн/.test(document.body.innerText))
    ok('the bill switches to UAH, recalculated', true)
    await page.getByRole('button', { name: '€', exact: true }).click()
    await page.getByRole('button', { name: 'Перерахувати' }).click()
    await page.waitForFunction(() => document.body.innerText.includes('710 €'))

    // the invoice
    await page.goto(BASE + `/moves/${move.id}/invoice`)
    await page.waitForSelector('text=До сплати')
    const invoice = await page.innerText('body')
    ok('invoice: client, services, due', invoice.includes('Отримувач Ірина') && invoice.includes('Зберігання') && invoice.includes('710'))
    await shot('04-invoice')
    const [xlsx] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Завантажити Excel' }).click()])
    ok('the bill downloads as an Excel file', xlsx.suggestedFilename().endsWith('.xlsx') && xlsx.suggestedFilename().includes(move.barcode), xlsx.suggestedFilename())

    // labels with the recipient's phone
    await page.goto(BASE + `/parcels/${move.id}/labels`)
    await page.waitForSelector('.label')
    const labels = await page.innerText('body')
    ok('labels show the route and the recipient with the phone', labels.includes('→') && labels.includes('Отримувач Ірина') && labels.replace(/\s/g, '').includes(u + '2'))
    await shot('05-labels')

    // loaders by city
    await page.goto(BASE + '/loaders')
    await page.waitForSelector('text=Андрій')
    await page.getByRole('button', { name: 'Варшава', exact: true }).click()
    const byCity = await page.locator('table').innerText()
    ok('city filter: Warsaw shows Kostya, not Andriy', byCity.includes('Костя') && !byCity.includes('Андрій'))
    await shot('06-loaders')

    // a trip in two legs on the same car: no «Маршрути» page, the legs live on the trip; cargo for the whole way, trash
    const cars = await manager.get('/api/cars?size=50')
    const legCar = cars.content.find((c) => c.plateNumber === plate)
    const first = await manager.post('/api/trips', { carId: legCar.id, driverId: driver.id, plannedDepartureAt: '2026-11-20T08:00:00Z', origin: 'Київ', destination: 'Склад' })
    await page.goto(BASE + `/trips/${first.id}`)
    await page.waitForSelector(`[data-slot=page-header]:has-text("Рейс №${first.number}")`)
    await page.getByRole('button', { name: 'Наступне плече' }).click()
    await dialog().waitFor()
    await page.fill('#tr-destination', 'Варшава')
    await dialog().locator('button[type=submit]').click()
    await page.waitForURL((url) => /\/trips\/\d+$/.test(url.pathname) && !url.pathname.endsWith(`/${first.id}`))
    await page.waitForSelector(`text=Рейс №${first.number}: 2 плеча`)
    const legPage = await text()
    ok('the next leg opens as a trip with its legs', legPage.includes(`${first.number}.1`) && legPage.includes(`${first.number}.2`) && legPage.includes('це плече') && (legPage.match(new RegExp(plate, 'g')) ?? []).length >= 2)
    ok('no «Маршрути» in the menu', !(await page.locator('[data-slot=sidebar-menu-button]').allTextContents()).some((x) => x.includes('Маршрути')))
    await page.getByRole('button', { name: 'Додати вантаж' }).click()
    await page.fill('[data-slot=dialog-content] input[placeholder*="Штрих-код"]', move.barcode)
    await page.locator(`[data-slot=dialog-content] label:has-text("${move.barcode}")`).click()
    await page.locator('[data-slot=dialog-content]').getByRole('button', { name: 'Додати' }).click()
    await page.locator('[data-slot=dialog-content]').waitFor({ state: 'detached' })
    await page.waitForSelector(`table >> text=${move.barcode}`)
    ok('the move is cargo for the whole way', (await text()).includes('Вантаж на всю дорогу (1)'))
    await shot('07-trip-legs')
    await page.goto(BASE + '/trips')
    await page.waitForSelector(`text=↳ ${first.number}.2`)
    const listText = await page.locator('table').innerText()
    ok('the trips list keeps the legs together', listText.indexOf(`${first.number}.1`) < listText.indexOf(`↳ ${first.number}.2`))
    await shot('08-trips-legs')
    await page.goto(BASE + `/trips/${first.id}`)
    await page.getByRole('button', { name: 'Видалити рейс з усіма плечима' }).click()
    await page.locator('[role=alertdialog] button, [data-slot=dialog-content] button').filter({ hasText: 'Видалити' }).last().click()
    await page.waitForURL(/\/trips$/)
    await page.goto(BASE + '/trash?entity=routes')
    await page.waitForSelector('text=Рейси з плечима')
    await page.waitForSelector('text=Київ → Варшава')
    ok('the deleted trip with legs is in the trash', true)

    // a representative without a phone in a moves-only company
    await page.goto(BASE + '/users')
    await page.getByRole('button', { name: 'Додати' }).click()
    await page.fill('#u-email', `mvrep${u}@test.ua`)
    await page.fill('#u-password', 'rep12345')
    await page.fill('#u-lastName', 'Представник')
    await page.fill('#u-firstName', 'Тарас')
    await page.locator('label:has-text("Менеджер") button, label:has-text("Менеджер") [role=checkbox]').first().click()
    await page.locator('label:has-text("Представник") button, label:has-text("Представник") [role=checkbox]').first().click()
    await page.locator('[data-slot=dialog-content] button[type=submit]').click()
    await page.locator('#u-email').waitFor({ state: 'detached', timeout: 8000 }).catch(() => {})
    ok('a representative is saved without a phone', !(await page.locator('#u-email').count()))
  } catch (e) {
    return await r.finish(e)
  }

  // public tracking of an M… code
  await page.goto(BASE + `/track/${move.barcode}`)
  await page.waitForSelector('main section, [role=alert]')
  ok('public tracking finds the move by its M code', !(await page.locator('[role=alert]').count()))
  await page.waitForSelector('text=Речі (2)')
  const tracked = await page.locator('body').innerText()
  ok('tracking lists the move\'s items with their status', tracked.includes('1 / 2') && tracked.includes('Диван') && tracked.includes('Шафа'))
  await shot('09-tracking')

  // the representative's web
  try {
    await r.login({ email: `mvrep${u}@test.ua`, password: 'rep12345' })
    await page.waitForURL(/\/moves/)
    ok('the representative lands on moves', page.url().includes('/moves'))
    const menu = await page.locator('[data-sidebar=menu]').innerText()
    ok('no users, cars or company settings for them', !menu.includes('Користувачі') && !menu.includes('Машини') && !menu.includes('Маршрути') && menu.includes('Рейси'))
    await page.goto(BASE + '/trips')
    await page.waitForSelector('[data-slot=page-header]')
    ok('they may add a trip', (await page.getByRole('button', { name: 'Додати' }).count()) > 0)
    await page.goto(BASE + `/moves/${move.id}`)
    await page.waitForSelector('text=Вантажники, склад, оплати')
    ok('they see the bill and may add a work', (await page.getByRole('button', { name: 'Робота' }).count()) > 0 && (await text()).includes('710'))
    await shot('10-rep-move')
  } catch (e) {
    return await r.finish(e)
  }
  return await r.finish()
}

if (import.meta.url === `file://${process.argv[1]}`) {
  process.exit((await run()) ? 0 : 1)
}
