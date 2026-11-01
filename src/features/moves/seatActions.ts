import type { ParcelSeatResponse } from '@/lib/api/types'

type Status = ParcelSeatResponse['status']

/** The roles that decide what may be done to an item by hand; the same rules as the backend and the mobile app. */
export interface SeatActor {
  isManager: boolean
  isRepresentative: boolean
  isDriver: boolean
}

/**
 * Onto a warehouse by hand: from the representative — representative or manager; accepted by a driver or in the car —
 * any of the three; already at a warehouse (onto another one) — the manager only.
 */
export function canMoveToWarehouse(status: Status, u: SeatActor): boolean {
  switch (status) {
    case 'RECEIVED_BY_REPRESENTATIVE':
      return u.isRepresentative || u.isManager
    case 'ACCEPTED_BY_DRIVER':
    case 'IN_CAR':
      return u.isDriver || u.isRepresentative || u.isManager
    case 'AT_WAREHOUSE':
      return u.isManager
    default:
      return false
  }
}

/** Handed over by hand: a driver, a representative or a manager, of an item in the car or at a warehouse. */
export function canHandOver(status: Status, u: SeatActor): boolean {
  return (u.isDriver || u.isRepresentative || u.isManager) && (status === 'IN_CAR' || status === 'AT_WAREHOUSE')
}

/** Into a car by hand, as a typed loading scan: an item with us, by anyone who loads (a driver only into own trip). */
export function canLoadByHand(status: Status, u: SeatActor): boolean {
  return (
    (u.isDriver || u.isRepresentative || u.isManager) &&
    (status === 'RECEIVED_BY_REPRESENTATIVE' || status === 'ACCEPTED_BY_DRIVER' || status === 'AT_WAREHOUSE')
  )
}
