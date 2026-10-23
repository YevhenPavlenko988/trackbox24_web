// Parcel photos: admin switches them on per company, manager adds/views/deletes in the parcel page.
// Images are generated here (plain PNGs); the backend converts them to WebP and signs the links.
import { mkdirSync, writeFileSync } from 'node:fs'
import { deflateSync } from 'node:zlib'
import { ADMIN, apiAs, BASE, createRunner, ensureSeed, MANAGER } from './lib.mjs'

function png(w, h, [r, g, b]) {
  const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0 })
  const crc = (buf) => { let c = 0xffffffff; for (const x of buf) c = crcTable[(c ^ x) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0 }
  const chunk = (type, data) => { const t = Buffer.from(type); const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const c = Buffer.alloc(4); c.writeUInt32BE(crc(Buffer.concat([t, data]))); return Buffer.concat([len, t, data, c]) }
  const row = Buffer.concat([Buffer.from([0]), Buffer.alloc(w * 3, Buffer.from([r, g, b]))])
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(Buffer.concat(Array(h).fill(row)))), chunk('IEND', Buffer.alloc(0))])
}

export async function run() {
  await ensureSeed()
  const IMG = new URL('./shots/photos/img/', import.meta.url).pathname
  mkdirSync(IMG, { recursive: true })
  writeFileSync(`${IMG}/red.png`, png(640, 480, [200, 40, 40]))
  writeFileSync(`${IMG}/blue.png`, png(480, 800, [40, 80, 200]))
  writeFileSync(`${IMG}/green.png`, png(300, 300, [40, 160, 80]))
  writeFileSync(`${IMG}/notimage.txt`, 'not an image')
  const admin = await apiAs(ADMIN)
const manager = await apiAs(MANAGER)
const company = (await admin.get('/api/companies?size=100')).content.find((c) => c.name === 'Тест Логістик')
const client = (await manager.get('/api/clients?size=1')).content[0]
const parcel = await manager.post('/api/parcels', { clientId: client.id, description: 'Фото-тест', senderName: 'ТОВ Фото', senderPhone: '380501234599', senderCity: 'Львів' })
const r = await createRunner('photos')
try {
  // admin: switch photos on for the company from the company page
  await r.login(ADMIN)
  await r.page.goto(`${BASE}/companies/${company.id}`)
  const sw = r.page.getByRole('switch', { name: 'Фото посилок' })
  await sw.waitFor()
  const wasOn = (await sw.getAttribute('aria-checked')) === 'true'
  if (!wasOn) { await sw.click(); await r.page.getByText('Збережено').first().waitFor() }
  await r.shot('01-admin-company')
  r.ok('admin sees photos switch on', (await sw.getAttribute('aria-checked')) === 'true')

  await r.login(MANAGER)
  await r.page.goto(`${BASE}/parcels/${parcel.id}`)
  await r.page.getByText('Фото ще немає').waitFor()
  await r.shot('02-empty')
  await r.page.locator('input[type=file]').setInputFiles([`${IMG}/red.png`, `${IMG}/blue.png`])
  await r.page.getByText('Фото додано').waitFor()
  await r.page.locator('img[src*="thumb"]').nth(1).waitFor()
  await r.shot('03-two-photos')
  r.ok('two thumbnails', (await r.page.locator('img[src*="thumb"]').count()) === 2)
  r.ok('add-more label', await r.page.getByRole('button', { name: /Додати ще \(1\)/ }).isVisible())
  // over the limit: 2 picked, 1 left
  await r.page.locator('input[type=file]').setInputFiles([`${IMG}/green.png`, `${IMG}/red.png`])
  await r.page.waitForTimeout(500)
  r.ok('too many toast', (await r.page.locator('[data-sonner-toast]').allTextContents()).join(' ').includes('можна додати ще 1 фото з 3, а вибрано 2'))
  // not an image → backend 400 toast
  await r.page.locator('input[type=file]').setInputFiles([`${IMG}/notimage.txt`])
  await r.page.waitForTimeout(2000)
  r.ok('non-image rejected', (await r.page.locator('[data-sonner-toast]').allTextContents()).join(' ').includes('не є зображенням'))
  // lightbox
  await r.page.locator('img[src*="thumb"]').first().click()
  const dlg = r.dialog()
  await dlg.locator('img').waitFor()
  await r.shot('04-lightbox')
  r.ok('counter 1 of 2', await dlg.getByText('1 з 2').isVisible())
  await r.page.keyboard.press('ArrowRight')
  r.ok('counter 2 of 2 after arrow', await dlg.getByText('2 з 2').isVisible())
  await dlg.getByRole('button', { name: 'Видалити' }).click()
  await r.page.locator('[data-slot=dialog-content]', { hasText: 'Видалити фото?' }).getByRole('button', { name: 'Видалити' }).click()
  await r.page.getByText('Фото видалено').waitFor()
  r.ok('one thumbnail left', (await r.page.locator('img[src*="thumb"]').count()) === 1)
  const hist = await manager.get(`/api/parcels/${parcel.id}/history?size=50`)
  r.ok('history has photo events', JSON.stringify(hist).includes('Додано фото: 2') && JSON.stringify(hist).includes('Видалено фото'))
  await r.shot('05-after-delete')
  // history card on the page
  await r.page.getByText('Видалено фото').first().waitFor({ timeout: 5000 }).catch(() => {})
  r.ok('history on page', await r.page.getByText('Видалено фото').first().isVisible().catch(() => false))
  // VIEWER-like check: photos off → no card for a parcel without photos
  await admin.put(`/api/companies/${company.id}/photos?value=false`)
  const p2 = await manager.post('/api/parcels', { clientId: client.id, description: 'Без фото', senderName: 'ТОВ Фото', senderPhone: '380501234598', senderCity: 'Львів' })
  await r.page.goto(`${BASE}/parcels/${p2.id}`)
  await r.page.getByText('Дані посилки').waitFor()
  r.ok('card hidden when disabled & empty', (await r.page.getByText('Фото', { exact: true }).count()) === 0)
  await r.page.goto(`${BASE}/parcels/${parcel.id}`)
  await r.page.locator('img[src*="thumb"]').first().waitFor()
  r.ok('card shown when disabled but has photos, no add button', (await r.page.getByRole('button', { name: /Додати/ }).count()) === 0)
  await r.shot('06-disabled-with-photo')
  await admin.put(`/api/companies/${company.id}/photos?value=true`)
  } catch (crash) {
    return r.finish(crash)
  }
  return r.finish()
}
