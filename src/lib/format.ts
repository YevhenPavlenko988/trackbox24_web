import { parsePhoneNumberFromString } from 'libphonenumber-js'
import { format, parseISO } from 'date-fns'
import { uk } from 'date-fns/locale'

export function formatDateTime(iso?: string): string {
  return iso ? format(parseISO(iso), 'dd.MM.yyyy HH:mm', { locale: uk }) : '—'
}

export function formatDate(iso?: string): string {
  return iso ? format(parseISO(iso), 'dd.MM.yyyy', { locale: uk }) : '—'
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

export function formatMoney(value?: number, currency: 'UAH' | 'EUR' = 'UAH'): string {
  if (value == null) return '—'
  return `${value.toLocaleString('uk-UA')} ${currency === 'EUR' ? '€' : 'грн'}`
}

export function formatWeight(kg?: number): string {
  return kg == null ? '—' : `${kg.toLocaleString('uk-UA')} кг`
}
