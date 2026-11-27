// «Оплати» in the platform admin: a partial payment in hryvnias from the ledger, the rest from the invoice, the balance.
import { ADMIN, apiAs, BASE, createRunner, uniq } from './lib.mjs'

export async function run() {
  const u = uniq()
  const admin = await apiAs(ADMIN)
  const companyName = `Захід Експрес ${u}`
  const company = await admin.post('/api/companies', { name: companyName })
  // billed from today: no trial
  await admin.put(`/api/crm/companies/${company.id}/trial`, { trialEndsOn: null })
  const now = new Date()
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  await admin.post(`/api/crm/invoices/generate?period=${month}`)
  const invoice = (await admin.get(`/api/crm/invoices?companyId=${company.id}`)).content[0]
  await admin.post(`/api/crm/invoices/${invoice.id}/send`)
  const part = Math.round(invoice.amountEur * 50) / 100
  const comma = (n) => String(n).replace('.', ',')

  const r = await createRunner('billing-payments')
  const { page, ok, shot, dialog } = r
  try {
    await r.login(ADMIN)
    await page.goto(BASE + '/crm/payments')
    await page.waitForSelector('[data-testid=payments-total]')
    ok('menu has «Оплати»', (await page.locator('[data-sidebar=menu-button]:has-text("Оплати")').count()) === 1)

    // our details, then the invoice as a document in hryvnias at the official rate
    await page.goto(BASE + '/crm/invoices')
    await page.getByRole('button', { name: 'Реквізити' }).click()
    await page.fill('#req-name', 'ФОП Тестова Олена Іванівна')
    await page.fill('#req-taxId', '3012345678')
    await page.fill('#req-address', 'м. Львів, вул. Тестова, 1')
    await page.fill('#req-iban', 'UA21 3223 1300 0002 6007 2335 6600 1')
    await page.fill('#req-bank', 'АТ «Тестбанк»')
    await page.fill('#req-notes', 'Платник єдиного податку 3 групи, не платник ПДВ')
    await dialog().getByRole('button', { name: 'Зберегти' }).click()
    await page.waitForSelector('text=Реквізити збережено')
    await page.goto(BASE + `/crm/invoices/${invoice.id}/print`)
    await page.waitForSelector('text=Рахунок на оплату')
    ok('the document has our IBAN and the client', (await page.locator('text=UA213223130000026007233566001').count()) === 1 && (await page.locator('article', { hasText: companyName }).count()) === 1)
    // hryvnias by default, at the bank's sell rate
    await page.waitForSelector('text=Курс продажу')
    ok('in hryvnias at the bank rate', (await page.locator('article', { hasText: 'грн' }).count()) === 1)
    await shot('08-invoice-uah')
    await page.emulateMedia({ media: 'print' })
    await page.pdf({ path: new URL('./shots/billing-payments/invoice.pdf', import.meta.url).pathname, format: 'A4', printBackground: true })
    await page.emulateMedia({ media: 'screen' })

    // a partial payment, in hryvnias, by cash
    await page.goto(BASE + '/crm/payments')
    await page.waitForSelector('[data-testid=payments-total]')
    await page.getByRole('button', { name: 'Внести оплату' }).click()
    await page.click('#payment-company')
    await page.locator('[data-slot=command-input]').fill(companyName)
    await page.locator('[data-slot=command-item]', { hasText: companyName }).click()
    await r.pickSelect('payment-invoice', `№${invoice.id}`)
    ok('the amount is what is left on the invoice', (await page.inputValue('#payment-amount')) === comma(invoice.amountEur), await page.inputValue('#payment-amount'))
    await page.fill('#payment-amount', comma(part))
    await dialog().getByRole('radio', { name: 'Готівка' }).click()
    await page.fill('#payment-received', '1200')
    await page.fill('#payment-reference', 'КВ-' + u)
    await shot('01-new-payment')
    await dialog().getByRole('button', { name: 'Внести оплату' }).click()
    await page.waitForSelector('text=Оплату внесено')
    const row = page.locator('tr', { hasText: companyName })
    await row.waitFor()
    ok('the client comes first in the row', (await row.locator('td').first().textContent()) === companyName)
    const text = (await row.textContent()).replace(/\s/g, ' ')
    ok('the ledger shows the payment, the cash and the hryvnias', text.includes('Готівка') && text.includes('1 200') && text.includes('№' + invoice.id), text)
    await shot('02-ledger')

    // the client's page: what is still owed
    await page.goto(BASE + `/companies/${company.id}?tab=billing`)
    await page.waitForFunction(() => /\d/.test(document.querySelector('[data-testid=company-balance]')?.textContent ?? ''))
    const debt = await page.locator('[data-testid=company-balance]').textContent()
    ok('the balance is the debt left', debt.replace(/\s/g, '').startsWith(comma(Math.round((invoice.amountEur - part) * 100) / 100)), debt)
    ok('the debt is named', (await page.locator('dt', { hasText: 'Борг' }).count()) === 1)
    ok('the open invoice says what is paid', (await page.locator('tr', { hasText: 'сплачено' }).count()) === 1)
    await shot('03-company')

    // the rest from the invoice itself, by bank transfer
    await page.locator('tr', { hasText: 'сплачено' }).click()
    await dialog().getByRole('button', { name: 'Позначити оплаченим' }).click()
    const pay = page.locator('[data-slot=dialog-content]').last()
    await pay.getByRole('radio', { name: 'Банківський переказ' }).click()
    await shot('04-pay-rest')
    await pay.getByRole('button', { name: 'Позначити оплаченим' }).click()
    await page.waitForSelector('text=Оплату внесено')
    await page.waitForFunction(() => document.querySelector('[data-testid=company-balance]')?.textContent?.replace(/\s/g, '').startsWith('0'))
    ok('settled', (await page.locator('dt', { hasText: 'Розраховано' }).count()) === 1)
    ok('the invoice is paid', (await page.locator('tr', { hasText: 'Оплачено' }).count()) >= 1)
    await shot('05-settled')

    // the list of ways to pay
    await page.goto(BASE + '/crm/payments')
    await page.getByRole('button', { name: 'Форми оплати' }).click()
    await page.fill('input[placeholder="Наприклад, PayPal"]', 'Крипта ' + u)
    await dialog().getByRole('button', { name: 'Додати' }).click()
    await page.waitForSelector('text=Форму оплати додано')
    ok('a new way to pay is added', (await dialog().locator(`input[value="Крипта ${u}"]`).count()) === 1)
    await shot('06-methods')

    // the client's own price instead of the general one
    await page.goto(BASE + `/companies/${company.id}?tab=billing`)
    const base = page.locator('[data-testid=company-price-BASE]')
    await base.locator('input').fill('150')
    await base.getByRole('button', { name: 'Зберегти' }).click()
    await page.waitForSelector('text=Ціну збережено')
    await base.locator('text=своя ціна').waitFor()
    ok('the own price is marked', (await base.locator('text=своя ціна').count()) === 1)
    ok('the month costs by it', (await page.locator('text=180 €').count()) >= 1)
    await base.scrollIntoViewIfNeeded()
    await shot('07-own-price')
    await base.getByRole('button', { name: 'Повернути загальну ціну' }).click()
    await page.waitForSelector('text=Повернуто загальну ціну')
    await base.locator('text=своя ціна').waitFor({ state: 'detached' })
    ok('back to the general price', (await page.locator('text=200 €').count()) >= 1)
  } catch (e) {
    return r.finish(e)
  }
  return r.finish()
}

if (import.meta.url === `file://${process.argv[1]}`) process.exit((await run()) ? 0 : 1)
