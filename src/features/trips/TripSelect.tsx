import { useTranslation } from 'react-i18next'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatDateTime } from '@/lib/format'
import { tripNo } from './status'
import type { TripResponse } from '@/lib/api/types'
import { useTrips } from './queries'

const NONE = '__none__'

/** A trip can only be loaded into before it departs, and only once it has a car and a driver. */
export const canLoadInto = (trip: TripResponse) => trip.carId != null && trip.driverId != null

/** «№12 · Київ → Варшава»: the number and where it goes — what the trip is found by. */
export function tripTitle(trip: TripResponse): string {
  const way = [trip.origin, trip.destination].filter(Boolean).join(' → ')
  return `№${tripNo(trip)}` + (way ? ` · ${way}` : '')
}

/** «AA1234BB · Петренко · 05.11 08:00», or the hint that the trip has no car yet. */
export function tripDetails(trip: TripResponse, unnamed: string): string {
  const parts = [trip.carPlateNumber, trip.driverName, formatDateTime(trip.plannedDepartureAt)].filter(Boolean)
  return parts.length ? parts.join(' · ') : unnamed
}

export function tripLabel(trip: TripResponse, unnamed: string): string {
  return `${tripTitle(trip)} · ${tripDetails(trip, unnamed)}`
}

/** Picks a trip to load into: the ones still being prepared, with the car that will carry the parcel. */
export function TripSelect({
  value,
  onChange,
  id,
  invalid,
}: {
  value?: number
  onChange: (id: number | undefined) => void
  id?: string
  invalid?: boolean
}) {
  const { t } = useTranslation('trips')
  const trips = useTrips({ status: ['PLANNED', 'PREPARING'], size: 100, sort: 'plannedDepartureAt,asc' })
  const items = trips.data?.content ?? []
  const selected = items.find((s) => s.id === value)
  const empty = t('trips:select.placeholder')

  return (
    <Select value={value != null ? String(value) : NONE} onValueChange={(v) => onChange(v && v !== NONE ? Number(v) : undefined)}>
      <SelectTrigger id={id} aria-invalid={invalid} className="w-full">
        <SelectValue>
          <span className="truncate">{selected ? tripLabel(selected, t('trips:select.noCar')) : empty}</span>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NONE}>{empty}</SelectItem>
        {items.map((s) => (
          // A trip without a car and driver is shown but cannot be chosen: the backend refuses to load into it.
          // two lines, so a long route, car and driver fit a dialog's width
          <SelectItem key={s.id} value={String(s.id)} disabled={!canLoadInto(s)}>
            <span className="flex min-w-0 flex-col">
              <span className="truncate">{tripTitle(s)}</span>{' '}
              <span className="truncate text-xs text-muted-foreground">{tripDetails(s, t('trips:select.noCar'))}</span>
            </span>
          </SelectItem>
        ))}
        {items.length === 0 && !trips.isPending && (
          <SelectItem value="__empty__" disabled>
            {t('trips:select.none')}
          </SelectItem>
        )}
      </SelectContent>
    </Select>
  )
}
