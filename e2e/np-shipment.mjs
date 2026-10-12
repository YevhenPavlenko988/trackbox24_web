// Phase 4: return parcels — outgoing Nova Poshta shipment of a parcel and our own waybill.
// The Nova Poshta directories need a real API key, so the refs are seeded through the API and the pickers are
// only checked for how they report that the directory is unavailable.
import { apiAs, BASE, createRunner, ensureSeed, MANAGER, uniq } from './lib.mjs'

const CITY = '8d5a980d-391c-11dd-90d9-001a92567626'
const BRANCH = '1ec09d88-e1c2-11e3-8c4a-0050568002cf'

export async function run() {
  await ensureSeed()
  const manager = await apiAs(MANAGER)
  const u = uniq()
  const client = await manager.post('/api/clients', { type: 'PRIVATE_PERSON', firstName: 'Ана', lastName: 'Поворотна ' + u, phone: '34611' + u })
  const parcel = await manager.post('/api/parcels', {
    clientId: client.id,
    description: 'Зворотний одяг',
    weightKg: 2.5,
    declaredValue: 1500,
    senderName: 'Повернення ' + u,
  })
  await manager.put(`/api/parcels/${parcel.id}/np-shipment`, {
    recipientLastName: 'Коваль',
    recipientFirstName: 'Іван',
    recipientPhone: '380671234567',
    deliveryType: 'WAREHOUSE',
    cityRef: CITY,
    cityName: 'Київ',
    warehouseRef: BRANCH,
    warehouseName: 'Відділення №1: вул. Пирогівський шлях, 135',
    codAmount: 1200,
  })

  const r = await createRunner('np-shipment')
  const { page, ok, shot, dialog } = r

  try {
    await r.login(MANAGER)
    await page.goto(BASE + `/parcels/${parcel.id}`)
    await page.waitForSelector('[data-slot=page-header]:has-text("PT")')
    let body = await page.textContent('body')
    ok('shipment card shows the recipient', body.includes('Відправка Новою Поштою') && body.includes('Коваль Іван'))
    ok('shipment card shows where it goes', body.includes('Київ') && body.includes('Відділення №1'))
    ok('shipment card shows who pays Nova Poshta', body.includes('Отримувач'))
    ok('shipment card shows the cash on delivery', /1\s?200/.test(body))
    ok('no waybill yet, so no number', !body.includes('Наша ЕН'))
    await shot('01-shipment-card')

    // A parcel without the shipment filled in must still say that it can be sent by Nova Poshta.
    const plain = await manager.post('/api/parcels', { description: 'Без відправки ' + u, senderName: 'Звичайний ' + u })
    await page.goto(BASE + `/parcels/${plain.id}`)
    await page.waitForSelector('[data-slot=page-header]:has-text("PT")')
    const empty = await page.textContent('body')
    ok('empty parcel offers to send it by Nova Poshta', empty.includes('Відправка Новою Поштою') && empty.includes('Відправити Новою Поштою'))
    ok('and says the company settings are missing', empty.includes('ключ Нової Пошти й відправник'))
    await shot('01b-empty-card')
    await page.goto(BASE + `/parcels/${parcel.id}`)
    await page.waitForSelector('[data-slot=page-header]:has-text("PT")')

    // Without the company key and sender the backend lists what is missing; the toast shows it as it came.
    await page.getByRole('button', { name: 'Створити ЕН' }).click()
    await page.waitForSelector('[data-sonner-toast]')
    const toast = await page.locator('[data-sonner-toast]').first().textContent()
    ok('creating the waybill reports what is missing', /Для створення ЕН заповніть|Нова Пошта/.test(toast), toast)
    await shot('02-waybill-missing')

    // The city picker cannot search without a Nova Poshta key: it must say so instead of staying empty.
    await page.getByRole('button', { name: 'Змінити відправку' }).click()
    await dialog().waitFor()
    await page.click('#np-city')
    await page.fill('[data-slot=command-input]', 'Київ')
    await page.waitForTimeout(1200)
    const picker = await page.locator('[data-slot=command-empty]').textContent()
    ok('city picker explains why the directory is silent', /Нової Пошти|Нічого не знайдено/.test(picker ?? ''), picker ?? '')
    await page.keyboard.press('Escape')
    await shot('03-city-picker')

    // A non-Ukrainian phone is refused in the form, before Nova Poshta ever sees it.
    await page.fill('#np-phone', '34612345678')
    await page.click('[data-slot=dialog-content] button[type=submit]')
    await page.waitForTimeout(400)
    ok('non-Ukrainian recipient phone blocked', (await dialog().locator('[data-slot=field-error]').count()) >= 1)

    // Saving replaces every field on the backend, so the untouched city and branch must still be sent.
    await page.fill('#np-phone', '380931112233')
    await page.fill('#np-last', 'Коваленко')
    await page.click('[data-slot=dialog-content] button[type=submit]')
    await dialog().waitFor({ state: 'hidden' })
    await page.waitForTimeout(600)
    const saved = await manager.get(`/api/parcels/${parcel.id}`)
    ok('edited recipient saved', saved.npShipment?.recipientLastName === 'Коваленко' && saved.npShipment?.recipientPhone === '380931112233')
    ok('untouched destination kept', saved.npShipment?.warehouseRef === BRANCH && saved.npShipment?.cityRef === CITY)
    ok('defaults filled by the backend', saved.npShipment?.cargoType === 'PARCEL' && saved.npShipment?.paymentMethod === 'CASH')

    // Switching to courier delivery drops the branch and asks for a street instead.
    await page.getByRole('button', { name: 'Змінити відправку' }).click()
    await dialog().waitFor()
    await page.getByText("Адреса (кур'єр)").click()
    await page.waitForSelector('#np-street')
    ok('courier delivery asks for street and building', (await dialog().locator('#np-building').count()) === 1 && (await dialog().locator('#np-branch').count()) === 0)
    await page.fill('#np-building', '12А')
    await page.click('[data-slot=dialog-content] button[type=submit]')
    await dialog().waitFor({ state: 'hidden' })
    await page.waitForTimeout(600)
    const toAddress = await manager.get(`/api/parcels/${parcel.id}`)
    ok('branch cleared when going to an address', toAddress.npShipment?.deliveryType === 'ADDRESS' && toAddress.npShipment?.warehouseRef == null)
    ok('building saved', toAddress.npShipment?.building === '12А')
    await shot('04-address-shipment')

    // The new status is a normal manual transition; its label comes from the parcel status list.
    await page.getByRole('button', { name: 'Змінити статус' }).click()
    await dialog().waitFor()
    await page.click('[data-slot=dialog-content] #status')
    await page.waitForSelector('[data-slot=select-item]')
    const options = await r.selectOptions()
    ok('"sent via Nova Poshta" offered as a transition', options.some((o) => o.includes('Відправлено Новою Поштою')), options.join(','))
    await page.locator('[data-slot=select-item]:visible', { hasText: 'Відправлено Новою Поштою' }).first().click()
    await page.click('[data-slot=dialog-content] button[type=submit]')
    await page.waitForTimeout(900)
    ok('parcel moved to "sent via Nova Poshta"', (await page.locator('[data-slot=page-header]').textContent()).includes('Відправлено Новою Поштою'))
    const sent = await manager.get(`/api/parcels/${parcel.id}`)
    ok('status saved on the backend', sent.status === 'SENT_VIA_NOVA_POSHTA')

    await page.reload()
    await page.waitForSelector('[data-slot=page-header]:has-text("PT")')
    body = await page.textContent('body')
    ok('shipment data stays readable after sending', body.includes('Коваленко Іван'))
    ok('no editing once the parcel left us', !body.includes('Змінити відправку'))
    await shot('05-sent')

    // A parcel Nova Poshta has taken is still ours to watch, so it must not fall out of the parcels list.
    await page.goto(BASE + '/parcels?tab=company&query=' + encodeURIComponent(sent.barcode))
    await page.waitForSelector(`table tbody tr:has-text("${sent.barcode}")`)
    const row = await page.locator(`table tbody tr:has-text("${sent.barcode}")`).textContent()
    ok('sent parcel stays in the company tab', /Відправлено\s*Новою\s*Поштою/.test(row), row)

    // --- company sender settings ---
    await page.goto(BASE + '/company')
    await page.waitForSelector('[data-slot=page-header]:has-text("Моя компанія")')
    ok('company card has a Nova Poshta sender row', (await page.textContent('body')).includes('Відправник НП'))
    await page.getByRole('button', { name: 'Відправник НП' }).click()
    await dialog().waitFor()
    await page.fill('#nps-phone', '123')
    await page.click('[data-slot=dialog-content] button[type=submit]')
    await page.waitForTimeout(400)
    ok('sender needs a city, a branch and a Ukrainian phone', (await dialog().locator('[data-slot=field-error]').count()) >= 2)
    await shot('06-sender-dialog')
    await page.keyboard.press('Escape')
  } catch (crash) {
    return r.finish(crash)
  }
  return r.finish()
}
