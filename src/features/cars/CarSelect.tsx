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
}: {
  value?: number
  onChange: (id: number | undefined) => void
  id?: string
  invalid?: boolean
  className?: string
}) {
  const { t } = useTranslation()
  const cars = useCars({ size: 100 })
  const items = (cars.data?.content ?? []).filter((c) => c.active !== false || c.id === value)
  const selected = items.find((c) => c.id === value)
  const empty = t('common.selectPlaceholder')

  return (
    <Select value={value != null ? String(value) : NONE} onValueChange={(v) => onChange(v && v !== NONE ? Number(v) : undefined)}>
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
