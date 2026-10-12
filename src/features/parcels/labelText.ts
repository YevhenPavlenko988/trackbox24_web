import type { ParcelResponse } from '@/lib/api/types'

export type LabelData = { code: string; seat?: number; total: number }

/** One label per seat; a parcel without seats yet gets one for its own barcode. */
export function labelsFor(p: ParcelResponse): LabelData[] {
  const total = p.seatsAmount ?? p.seats?.length ?? 1
  if (p.seats?.length) {
    return p.seats.filter((s) => s.barcode).map((s) => ({ code: s.barcode!, seat: s.seatNumber, total }))
  }
  return p.barcode ? [{ code: p.barcode, total }] : []
}

/** "20451558819168" → "20 4515 5881 9168", the way Nova Poshta prints its numbers. */
export function groupWaybill(number: string): string {
  const digits = number.replace(/\s+/g, '')
  if (!/^\d{14}$/.test(digits)) return number
  return `${digits.slice(0, 2)} ${digits.slice(2, 6)} ${digits.slice(6, 10)} ${digits.slice(10)}`
}

/** "Коваль", "Іван" → "Коваль І." — what fits on a 70 mm label next to the city. */
export function shortName(last?: string, first?: string): string | undefined {
  if (!last) return first || undefined
  return first ? `${last} ${first.charAt(0)}.` : last
}

/** "Відділення №1: вул. Пирогівський шлях, 135" → "Відд. №1"; a locker keeps its name. */
export function shortWarehouse(name?: string): string | undefined {
  if (!name) return undefined
  const head = name.split(':')[0].trim()
  return head.replace(/^(Поштове )?відділення/i, 'Відд.')
}

/** The middle line of the tape label: who gets the parcel and where, or the client while nothing else is known. */
export function destinationLine(p: ParcelResponse): string | undefined {
  const s = p.npShipment
  if (s) {
    const where = s.deliveryType === 'ADDRESS' ? [s.streetName, s.building].filter(Boolean).join(', ') : shortWarehouse(s.warehouseName)
    const parts = [shortName(s.recipientLastName, s.recipientFirstName), s.cityName, where].filter(Boolean)
    if (parts.length) return parts.join(', ')
  }
  return [p.clientName, p.clientCity].filter(Boolean).join(', ') || undefined
}
