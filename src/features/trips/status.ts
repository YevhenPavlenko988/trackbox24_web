import type { ParcelResponse, TripResponse, TripStatus } from '@/lib/api/types'

export const TRIP_STATUSES: TripStatus[] = ['PLANNED', 'PREPARING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']

export const isOpen = (s?: TripStatus) => s === 'PLANNED' || s === 'PREPARING' || s === 'IN_PROGRESS'
export const acceptsLoading = (s?: TripStatus) => s === 'PLANNED' || s === 'PREPARING'

export function canDepart(trip: TripResponse): boolean {
  return acceptsLoading(trip.status) && trip.carId != null && trip.driverId != null
}

/**
 * Splits `GET /api/trips/{id}/parcels` ("plan and fact") into what the page shows; `unloaded` were in the car and left it
 * (to a warehouse, a transfer), the trip lists them by its history. Departure takes what was not loaded out of the plan,
 * so after it a parcel still planned here and not in the car is one unloaded (it keeps its plan).
 */
export function splitTripParcels(tripId: number, parcels: ParcelResponse[], status?: TripStatus) {
  const stillPlanning = acceptsLoading(status)
  const planned = parcels.filter((p) => p.plannedTripId === tripId && p.tripId == null && stillPlanning)
  const loaded = parcels.filter((p) => p.tripId === tripId)
  const unloaded = parcels.filter((p) => p.tripId !== tripId && (p.plannedTripId !== tripId || !stillPlanning))
  return { planned, loaded, unloaded }
}

/** Loaded without being in the trip's plan; a move is made and loaded on the spot, so it never is. */
export const isOutsidePlan = (tripId: number, p: ParcelResponse) => p.kind !== 'MOVE' && p.tripId === tripId && p.plannedTripId !== tripId

/** Seats of the parcels in the trip: `loaded` = ever loaded (still in the car or already delivered). */
export function seatProgress(parcels: ParcelResponse[]): { loaded: number; delivered: number; total: number } {
  let loaded = 0
  let delivered = 0
  let total = 0
  for (const p of parcels) {
    const seats = p.seats?.length ? p.seats : [{ status: p.status }]
    total += seats.length
    for (const s of seats) {
      if (s.status === 'IN_CAR' || s.status === 'DELIVERED_TO_CLIENT') loaded += 1
      if (s.status === 'DELIVERED_TO_CLIENT') delivered += 1
    }
  }
  return { loaded, delivered, total }
}

export function routeText(s: { origin?: string; destination?: string }): string {
  return [s.origin, s.destination].filter(Boolean).join(' → ') || '—'
}

/** Mirrors the backend: only a planned trip with nothing loaded, or a cancelled one. */
export function isTripDeletable(trip: Pick<TripResponse, 'status' | 'loadedCount'>): boolean {
  return (trip.status === 'PLANNED' && !trip.loadedCount) || trip.status === 'CANCELLED'
}

/** How people name a trip: «14», or «14.2» for the second leg of route 14. */
export function tripNo(t: { number?: number; id?: number; legNumber?: number }): string {
  const n = t.number ?? t.id
  return t.legNumber != null ? `${n}.${t.legNumber}` : String(n)
}

/** A parcel's trip by number and leg: «14» or «14.2». */
export function legNo(number: number | undefined, leg: number | undefined): string {
  return leg != null ? `${number}.${leg}` : String(number)
}

/**
 * The legs of one trip (№5.1, №5.2 …) together where the first of them stands in the list, in leg order, so a trip
 * that goes on reads as one thing and not as unrelated rows.
 */
export function groupLegs(trips: TripResponse[]): TripResponse[] {
  const out: TripResponse[] = []
  const placed = new Set<number>()
  for (const trip of trips) {
    if (trip.routeId == null) {
      out.push(trip)
      continue
    }
    if (placed.has(trip.routeId)) continue
    placed.add(trip.routeId)
    out.push(...trips.filter((x) => x.routeId === trip.routeId).sort((a, b) => (a.legNumber ?? 0) - (b.legNumber ?? 0)))
  }
  return out
}
