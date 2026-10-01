import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { ParcelStatusBadge } from '@/features/parcels/ParcelStatusBadge'
import { useParcels } from '@/features/parcels/queries'
import { useDebounce } from '@/hooks/use-debounce'
import type { ParcelResponse } from '@/lib/api/types'
import { formatPhone } from '@/lib/format'

/** Multi-select of parcels that can be planned into a trip (received or at a warehouse). */
export function ParcelPickerDialog({
  open,
  onOpenChange,
  tripId,
  excludeIds,
  onAdd,
  pending,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  tripId: number
  excludeIds: number[]
  onAdd: (ids: number[]) => Promise<unknown>
  pending?: boolean
}) {
  const { t } = useTranslation(['trips', 'common'])
  const [selected, setSelected] = useState<number[]>([])
  const [search, setSearch] = useState('')
  const query = useDebounce(search)
  const received = useParcels({ status: 'RECEIVED_BY_REPRESENTATIVE', query, size: 50 })
  const atWarehouse = useParcels({ status: 'AT_WAREHOUSE', query, size: 50 })
  const rows: ParcelResponse[] = [...(received.data?.content ?? []), ...(atWarehouse.data?.content ?? [])].filter((p) => !excludeIds.includes(p.id!))
  const loading = received.isPending || atWarehouse.isPending

  const close = (o: boolean) => {
    if (!o) {
      setSelected([])
      setSearch('')
    }
    onOpenChange(o)
  }
  const toggle = (id: number, checked: boolean) => setSelected(checked ? [...selected, id] : selected.filter((x) => x !== id))

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{t('trips:picker.title')}</DialogTitle>
          <DialogDescription>{t('trips:picker.hint')}</DialogDescription>
        </DialogHeader>
        <Input placeholder={t('trips:picker.search')} value={search} onChange={(e) => setSearch(e.target.value)} />
        <div className="max-h-72 overflow-y-auto rounded-lg border">
          {loading ? (
            <div className="flex flex-col gap-2 p-3">
              <Skeleton className="h-5" />
              <Skeleton className="h-5" />
            </div>
          ) : rows.length === 0 ? (
            <p className="p-4 text-center text-sm text-muted-foreground">{t('trips:picker.empty')}</p>
          ) : (
            rows.map((p) => (
              <Label key={p.id} className="flex cursor-pointer items-center gap-3 border-b px-3 py-2 font-normal last:border-b-0 hover:bg-muted/50">
                <Checkbox checked={selected.includes(p.id!)} onCheckedChange={(c) => toggle(p.id!, c === true)} />
                <span className="flex flex-1 flex-col text-sm">
                  <span className="flex items-center gap-2">
                    <span className="font-mono font-medium">{p.barcode}</span>
                    <ParcelStatusBadge status={p.status} />
                    {p.warehouseName && <span className="text-xs text-muted-foreground">{p.warehouseName}</span>}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {p.clientName ?? '—'}
                    {p.clientPhone && ` · ${formatPhone(p.clientPhone)}`}
                    {p.seatsAmount && p.seatsAmount > 1 && ` · ${p.seatsAmount} м.`}
                  </span>
                </span>
                {p.plannedTripId != null && p.plannedTripId !== tripId && <Badge variant="outline">{t('trips:picker.inPlan', { id: p.plannedTripId })}</Badge>}
              </Label>
            ))
          )}
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm text-muted-foreground">{t('trips:picker.selected', { count: selected.length })}</span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => close(false)}>
              {t('common:actions.cancel')}
            </Button>
            <Button
              disabled={selected.length === 0 || pending}
              onClick={async () => {
                await onAdd(selected)
                close(false)
              }}
            >
              {t('common:actions.add')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
