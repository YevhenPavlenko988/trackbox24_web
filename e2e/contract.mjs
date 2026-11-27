// The contract with a carrier: filled from the company card, corrected, made into Word, kept with the signed copy.
import { writeFileSync } from 'node:fs'
import { ADMIN, apiAs, BASE, createRunner, uniq } from './lib.mjs'

export async function run() {
  const u = uniq()
  const admin = await apiAs(ADMIN)
  const name = `Перевізник ${u}`
  const edrpou = '4' + u.padStart(7, '0')
  const company = await admin.post('/api/companies', { name, edrpou, address: 'м. Київ, вул. Тестова, 5', email: `c${u}@test.ua` })
  await admin.put('/api/crm/requisites', {
    name: 'ФОП Тестова Олена Іванівна', taxId: '3012345678', address: 'м. Львів, вул. Тестова, 1', iban: 'UA213223130000026007233566001',
    bank: 'АТ «Тестбанк»', email: 'billing@test.ua', edrRecord: 'від 01.02.2020 № 2 415 000 0000 012345',
    taxGroup: 'платник єдиного податку 3 групи, не платник ПДВ', signer: 'Тестова О. І.', city: 'Львів',
  })

  const r = await createRunner('contract')
  const { page, ok, shot } = r
  try {
    await r.login(ADMIN)
    await page.goto(BASE + `/companies/${company.id}?tab=contract`)
    await page.waitForSelector('#contract-clientName')
    ok('filled from the company card', (await page.inputValue('#contract-clientName')) === name && (await page.inputValue('#contract-clientTaxId')) === edrpou)
    await page.fill('#contract-signedOn', '2026-12-01')
    await page.fill('#contract-city', 'Львів')
    await page.fill('#contract-clientIban', 'UA21 3052 9900 0002 6006 0000 0001 2')
    await page.fill('#contract-signerPosition', 'директор')
    await page.fill('#contract-signerName', 'Петренко Олег Іванович')
    await page.fill('#contract-signerInPerson', 'директора Петренка Олега Івановича')
    await page.fill('#contract-signerBasis', 'Статуту')
    await page.fill('#contract-paymentDays', '5')

    // the sum in the contract is the company's own price
    const base = page.locator('[data-testid=company-price-BASE]')
    await base.locator('input').fill('150')
    await base.getByRole('button', { name: 'Зберегти' }).click()
    await page.waitForSelector('text=Ціну збережено')
    await shot('01-form')

    const download = page.waitForEvent('download')
    await page.locator('[data-testid=contract-word]').click()
    const file = await download
    const path = new URL('./shots/contract/contract.docx', import.meta.url).pathname
    await file.saveAs(path)
    ok('the Word is named after the contract', file.suggestedFilename().startsWith('Договір 1') || file.suggestedFilename().includes(name), file.suggestedFilename())
    await page.locator('li', { hasText: 'згенерований' }).first().waitFor()
    ok('the Word is kept in the files', (await page.locator('li', { hasText: 'згенерований' }).count()) >= 1)

    // the signed copy
    const signed = new URL('./shots/contract/signed.pdf', import.meta.url).pathname
    writeFileSync(signed, '%PDF-1.4\n% signed copy\n')
    await page.locator('[data-testid=contract-upload]').setInputFiles(signed)
    await page.waitForSelector('text=Підписаний договір збережено')
    await page.locator('li', { hasText: 'signed.pdf' }).waitFor()
    ok('the signed copy is kept', (await page.locator('li', { hasText: 'signed.pdf' }).filter({ hasText: 'підписаний' }).count()) === 1)

    // saved: a reload shows what was entered
    await page.reload()
    await page.waitForSelector('#contract-signerName')
    ok('the form is saved', (await page.inputValue('#contract-signerName')) === 'Петренко Олег Іванович' && (await page.inputValue('#contract-paymentDays')) === '5')
    await shot('02-saved')
  } catch (e) {
    return r.finish(e)
  }
  return r.finish()
}

if (import.meta.url === `file://${process.argv[1]}`) process.exit((await run()) ? 0 : 1)
