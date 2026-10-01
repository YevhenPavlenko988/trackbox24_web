import type { ParcelResponse, ParcelStatus } from '@/lib/api/types'

// Mirrors ParcelStatus.TRANSITIONS on the backend.
export const TRANSITIONS: Record<ParcelStatus, ParcelStatus[]> = {
  IN_NOVA_POSHTA: ['RECEIVED_BY_REPRESENTATIVE', 'CANCELLED'],
  RECEIVED_BY_REPRESENTATIVE: ['AT_WAREHOUSE', 'IN_CAR', 'CANCELLED'],
  AT_WAREHOUSE: ['AT_WAREHOUSE', 'IN_CAR', 'DELIVERED_TO_CLIENT', 'CANCELLED'],
  IN_CAR: ['DELIVERED_TO_CLIENT', 'AT_WAREHOUSE', 'RECEIVED_BY_REPRESENTATIVE'],
  DELIVERED_TO_CLIENT: [],
  CANCELLED: [],
}

export const PARCEL_STATUSES: ParcelStatus[] = [
  'IN_NOVA_POSHTA',
  'RECEIVED_BY_REPRESENTATIVE',
  'AT_WAREHOUSE',
  'IN_CAR',
  'DELIVERED_TO_CLIENT',
  'CANCELLED',
]

/** Statuses from which a parcel can be planned into a trip or moved to a warehouse. */
export const SHIPPABLE_STATUSES: ParcelStatus[] = ['RECEIVED_BY_REPRESENTATIVE', 'AT_WAREHOUSE']

export function isFinalStatus(status?: ParcelStatus): boolean {
  return status === 'DELIVERED_TO_CLIENT' || status === 'CANCELLED'
}

export function canEditParcel(p: ParcelResponse): boolean {
  return !isFinalStatus(p.status)
}

export function canEditSeatsAmount(p: ParcelResponse): boolean {
  const unloaded = (s?: ParcelStatus) => s === 'IN_NOVA_POSHTA' || s === 'RECEIVED_BY_REPRESENTATIVE' || s === 'AT_WAREHOUSE'
  if (!p.seats?.length) return unloaded(p.status)
  return p.seats.every((s) => unloaded(s.status))
}

export function parseNumber(s?: string): number | undefined {
  if (!s) return undefined
  const trimmed = s.trim().replace(',', '.')
  if (trimmed === '') return undefined
  const n = Number(trimmed)
  return Number.isFinite(n) ? n : undefined
}

export const orUndefined = (s?: string) => (s && s.trim().length > 0 ? s.trim() : undefined)
