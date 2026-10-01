import type { ParcelResponse, ParcelStatus } from '@/lib/api/types'

// Mirrors ParcelStatus.TRANSITIONS on the backend.
export const TRANSITIONS: Record<ParcelStatus, ParcelStatus[]> = {
  IN_NOVA_POSHTA: ['RECEIVED_BY_REPRESENTATIVE', 'CANCELLED'],
  RECEIVED_BY_REPRESENTATIVE: ['IN_CAR', 'CANCELLED'],
  IN_CAR: ['DELIVERED_TO_CLIENT', 'RECEIVED_BY_REPRESENTATIVE'],
  DELIVERED_TO_CLIENT: [],
  CANCELLED: [],
}

export const PARCEL_STATUSES: ParcelStatus[] = [
  'IN_NOVA_POSHTA',
  'RECEIVED_BY_REPRESENTATIVE',
  'IN_CAR',
  'DELIVERED_TO_CLIENT',
  'CANCELLED',
]

export function isFinalStatus(status?: ParcelStatus): boolean {
  return status === 'DELIVERED_TO_CLIENT' || status === 'CANCELLED'
}

export function canEditParcel(p: ParcelResponse): boolean {
  return !isFinalStatus(p.status)
}

export function canEditSeatsAmount(p: ParcelResponse): boolean {
  if (!p.seats?.length) return p.status === 'IN_NOVA_POSHTA' || p.status === 'RECEIVED_BY_REPRESENTATIVE'
  return p.seats.every((s) => s.status === 'RECEIVED_BY_REPRESENTATIVE')
}

export function parseNumber(s?: string): number | undefined {
  if (!s) return undefined
  const trimmed = s.trim().replace(',', '.')
  if (trimmed === '') return undefined
  const n = Number(trimmed)
  return Number.isFinite(n) ? n : undefined
}

export const orUndefined = (s?: string) => (s && s.trim().length > 0 ? s.trim() : undefined)
