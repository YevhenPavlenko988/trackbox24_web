import { useTranslation } from 'react-i18next'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatDateTime } from '@/lib/format'
import type { TripResponse } from '@/lib/api/types'
import { useTrips } from './queries'

const NONE = '__none__'

/** A trip can only be loaded into before it departs, and only once it has a car and a driver. */
export const canLoadInto = (trip: TripResponse) => trip.carId != null && trip.driverId != null

export function tripLabel(trip: TripResponse, unnamed: string): string {
  const parts = [trip.carPlateNumber, trip.driverName, formatDateTime(trip.plannedDepartureAt)].filter(Boolean)
  return `#${trip.id}` + (parts.length ? ' · ' + parts.join(' · ') : ` · ${unnamed}`)
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
        <SelectValue>{selected ? tripLabel(selected, t('trips:select.noCar')) : empty}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NONE}>{empty}</SelectItem>
        {items.map((s) => (
          // A trip without a car and driver is shown but cannot be chosen: the backend refuses to load into it.
          <SelectItem key={s.id} value={String(s.id)} disabled={!canLoadInto(s)}>
            {tripLabel(s, t('trips:select.noCar'))}
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
