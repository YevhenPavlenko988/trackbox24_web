import type { ParcelResponse, TripResponse, TripStatus } from '@/lib/api/types'

export const TRIP_STATUSES: TripStatus[] = ['PLANNED', 'PREPARING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']

export const isOpen = (s?: TripStatus) => s === 'PLANNED' || s === 'PREPARING' || s === 'IN_PROGRESS'
export const acceptsLoading = (s?: TripStatus) => s === 'PLANNED' || s === 'PREPARING'

export function canDepart(trip: TripResponse): boolean {
  return acceptsLoading(trip.status) && trip.carId != null && trip.driverId != null
}

/** Splits `GET /api/trips/{id}/parcels` ("plan and fact") into what the page shows. */
export function splitTripParcels(tripId: number, parcels: ParcelResponse[]) {
  const planned = parcels.filter((p) => p.plannedTripId === tripId && p.tripId == null)
  const loaded = parcels.filter((p) => p.tripId === tripId)
  return { planned, loaded }
}

export const isOutsidePlan = (tripId: number, p: ParcelResponse) => p.tripId === tripId && p.plannedTripId !== tripId

export function seatProgress(parcels: ParcelResponse[]): { loaded: number; delivered: number; total: number } {
  let loaded = 0
  let delivered = 0
  let total = 0
  for (const p of parcels) {
    const seats = p.seats?.length ? p.seats : [{ status: p.status }]
    total += seats.length
    for (const s of seats) {
      if (s.status === 'IN_CAR') loaded += 1
      if (s.status === 'DELIVERED_TO_CLIENT') delivered += 1
    }
  }
  return { loaded, delivered, total }
}

export function routeText(s: { origin?: string; destination?: string }): string {
  return [s.origin, s.destination].filter(Boolean).join(' → ') || '—'
}
