import { useTranslation } from 'react-i18next'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useActiveWarehouses } from './queries'

const NONE = '__none__'

export function WarehouseSelect({
  value,
  onChange,
  id,
  invalid,
  className,
  noneLabel,
}: {
  value?: number
  onChange: (id: number | undefined) => void
  id?: string
  invalid?: boolean
  className?: string
  noneLabel?: string
}) {
  const { t } = useTranslation('warehouses')
  const warehouses = useActiveWarehouses()
  const items = warehouses.data?.content ?? []
  const selected = items.find((w) => w.id === value)
  const empty = noneLabel ?? t('select')

  return (
    <Select value={value != null ? String(value) : NONE} onValueChange={(v) => onChange(v && v !== NONE ? Number(v) : undefined)}>
      <SelectTrigger id={id} aria-invalid={invalid} className={className ?? 'w-full'}>
        <SelectValue>{selected ? selected.name : empty}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NONE}>{empty}</SelectItem>
        {items.map((w) => (
          <SelectItem key={w.id} value={String(w.id)}>
            {w.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
