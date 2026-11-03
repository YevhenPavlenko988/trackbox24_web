import { parsePhoneNumberFromString } from 'libphonenumber-js'
import { format, parseISO } from 'date-fns'
import { uk } from 'date-fns/locale'

export function formatDateTime(iso?: string): string {
  return iso ? format(parseISO(iso), 'dd.MM.yyyy HH:mm', { locale: uk }) : '—'
}

export function formatDate(iso?: string): string {
  return iso ? format(parseISO(iso), 'dd.MM.yyyy', { locale: uk }) : '—'
}

export function formatTime(iso?: string): string {
  return iso ? format(parseISO(iso), 'HH:mm', { locale: uk }) : ''
}

/**
 * Digits as stored by the backend → a readable international number.
 * Ukrainian numbers keep the grouping people here are used to; everything else goes through libphonenumber.
 */
export function formatPhone(phone?: string): string {
  if (!phone) return '—'
  const ua = /^380(\d{2})(\d{3})(\d{2})(\d{2})$/.exec(phone)
  if (ua) return `+380 ${ua[1]} ${ua[2]} ${ua[3]} ${ua[4]}`
  const parsed = parsePhoneNumberFromString(`+${phone.replace(/\D/g, '')}`)
  return parsed?.isValid() ? parsed.formatInternational() : phone
}

/** ISO instant → value for <input type="datetime-local"> in the browser's timezone. */
export function toDateTimeLocal(iso?: string): string {
  return iso ? format(parseISO(iso), "yyyy-MM-dd'T'HH:mm") : ''
}

export function fromDateTimeLocal(local: string): string | undefined {
  return local ? new Date(local).toISOString() : undefined
}

export type MoneyCurrency = 'UAH' | 'EUR' | 'USD' | 'PLN'

export const CURRENCY_SYMBOL: Record<MoneyCurrency, string> = { UAH: 'грн', EUR: '€', USD: '$', PLN: 'zł' }

/** «1 $ = 0,9107 €»: how many of [to] one [from] is worth. */
export function rateLine(from: MoneyCurrency, to: MoneyCurrency, k?: number): string {
  return k == null ? '' : `1 ${CURRENCY_SYMBOL[from]} = ${k.toLocaleString('uk-UA', { maximumFractionDigits: 4 })} ${CURRENCY_SYMBOL[to]}`
}

/** How currencies are listed everywhere: euro, hryvnia, dollar, zloty. */
export const MONEY_ORDER: MoneyCurrency[] = ['EUR', 'UAH', 'USD', 'PLN']

/** A move's currency: euro or hryvnia; with «Курси валют» also dollar and zloty. */
export const moveCurrencies = (multi: boolean): MoneyCurrency[] => (multi ? MONEY_ORDER : ['EUR', 'UAH'])

export function formatMoney(value?: number, currency: MoneyCurrency = 'UAH'): string {
  if (value == null) return '—'
  return `${value.toLocaleString('uk-UA')} ${CURRENCY_SYMBOL[currency] ?? currency}`
}

export function formatWeight(kg?: number): string {
  return kg == null ? '—' : `${kg.toLocaleString('uk-UA')} кг`
}
