import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { useParcels } from '@/features/parcels/queries'
import { useDebounce } from '@/hooks/use-debounce'
import { formatPhone } from '@/lib/format'

/** Multi-select of parcels ready for shipping (RECEIVED_BY_REPRESENTATIVE), with server-side search. */
export function ParcelPickList({
  selected,
  onChange,
  excludeIds = [],
}: {
  selected: number[]
  onChange: (ids: number[]) => void
  excludeIds?: number[]
}) {
  const { t } = useTranslation('shipments')
  const [search, setSearch] = useState('')
  const query = useDebounce(search)
  const parcels = useParcels({ status: 'RECEIVED_BY_REPRESENTATIVE', query, size: 50 })
  const rows = (parcels.data?.content ?? []).filter((p) => !excludeIds.includes(p.id!))

  const toggle = (id: number, checked: boolean) => {
    onChange(checked ? [...selected, id] : selected.filter((x) => x !== id))
  }

  return (
    <div className="flex flex-col gap-2">
      <Input placeholder={t('picker.search')} value={search} onChange={(e) => setSearch(e.target.value)} />
      <p className="text-xs text-muted-foreground">{t('picker.hint')}</p>
      <div className="max-h-72 overflow-y-auto rounded-lg border">
        {parcels.isPending ? (
          <div className="flex flex-col gap-2 p-3">
            <Skeleton className="h-5" />
            <Skeleton className="h-5" />
          </div>
        ) : rows.length === 0 ? (
          <p className="p-4 text-center text-sm text-muted-foreground">{t('picker.empty')}</p>
        ) : (
          rows.map((p) => {
            const checked = selected.includes(p.id!)
            return (
              <Label
                key={p.id}
                className="flex cursor-pointer items-center gap-3 border-b px-3 py-2 font-normal last:border-b-0 hover:bg-muted/50"
              >
                <Checkbox checked={checked} onCheckedChange={(c) => toggle(p.id!, c === true)} />
                <span className="flex flex-1 flex-col text-sm">
                  <span className="font-mono font-medium">{p.barcode}</span>
                  <span className="text-xs text-muted-foreground">
                    {p.clientName ?? '—'}
                    {p.clientPhone && ` · ${formatPhone(p.clientPhone)}`}
                    {p.seatsAmount && p.seatsAmount > 1 && ` · ${p.seatsAmount} м.`}
                  </span>
                </span>
                {p.plannedShipmentId != null && <Badge variant="outline">{t('picker.inShipment', { id: p.plannedShipmentId })}</Badge>}
              </Label>
            )
          })
        )}
      </div>
      <p className="text-sm text-muted-foreground">{t('picker.selected', { count: selected.length })}</p>
    </div>
  )
}
