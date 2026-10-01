import { format, parseISO } from 'date-fns'
import { uk } from 'date-fns/locale'

export function formatDateTime(iso?: string): string {
  return iso ? format(parseISO(iso), 'dd.MM.yyyy HH:mm', { locale: uk }) : '—'
}

export function formatDate(iso?: string): string {
  return iso ? format(parseISO(iso), 'dd.MM.yyyy', { locale: uk }) : '—'
}

/** 380501234567 → +380 50 123 45 67 */
export function formatPhone(phone?: string): string {
  if (!phone) return '—'
  const m = /^380(\d{2})(\d{3})(\d{2})(\d{2})$/.exec(phone)
  return m ? `+380 ${m[1]} ${m[2]} ${m[3]} ${m[4]}` : phone
}

export function formatMoney(value?: number): string {
  return value == null ? '—' : `${value.toLocaleString('uk-UA')} грн`
}

export function formatWeight(kg?: number): string {
  return kg == null ? '—' : `${kg.toLocaleString('uk-UA')} кг`
}
