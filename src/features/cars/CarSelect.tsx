import { useTranslation } from 'react-i18next'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { carDisplayName } from './api'
import { useCars } from './queries'

const NONE = '__none__'

export function CarSelect({
  value,
  onChange,
  id,
  invalid,
  className,
  disabled,
}: {
  value?: number
  onChange: (id: number | undefined) => void
  id?: string
  invalid?: boolean
  className?: string
  disabled?: boolean
}) {
  const { t } = useTranslation()
  // `/api/cars` has no `active` filter, so deactivated cars come back too and are dropped here — the page has to
  // be large enough that they cannot push the active ones out of it (same budget as the user picker).
  const cars = useCars({ size: 500 })
  const items = (cars.data?.content ?? []).filter((c) => c.active !== false || c.id === value)
  const selected = items.find((c) => c.id === value)
  const empty = t('common.selectPlaceholder')

  return (
    <Select value={value != null ? String(value) : NONE} onValueChange={(v) => onChange(v && v !== NONE ? Number(v) : undefined)} disabled={disabled}>
      <SelectTrigger id={id} aria-invalid={invalid} className={className ?? 'w-full'}>
        <SelectValue>{selected ? carDisplayName(selected) : empty}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NONE}>{empty}</SelectItem>
        {items.map((c) => (
          <SelectItem key={c.id} value={String(c.id)}>
            {carDisplayName(c)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
