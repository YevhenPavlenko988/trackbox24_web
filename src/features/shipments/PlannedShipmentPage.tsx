import { ArrowLeft, Check, Pencil, Play, Plus, Trash2, X } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { DetailsList } from '@/components/common/DetailsList'
import { LinkButton } from '@/components/common/LinkButton'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { ParcelsTable } from '@/features/parcels/ParcelsTable'
import { showApiError } from '@/lib/api/problem'
import { formatDateTime } from '@/lib/format'
import { NotFoundPage } from '@/routes/ErrorPages'
import { ParcelPickerDialog } from './ParcelPickerDialog'
import { PlannedShipmentDialog } from './PlannedShipmentDialog'
import {
  useAddPlannedParcels,
  useCancelPlanned,
  useConfirmPlanned,
  usePlannedParcels,
  usePlannedShipment,
  useRemovePlannedParcel,
  useUpdatePlanned,
} from './queries'
import { PlannedStatusBadge } from './ShipmentStatusBadge'
import { StartShipmentDialog } from './StartShipmentDialog'

export function PlannedShipmentPage() {
  const { id } = useParams()
  const shipmentId = Number(id)
  const { t } = useTranslation(['shipments', 'common'])
  const query = usePlannedShipment(shipmentId)
  const parcels = usePlannedParcels(shipmentId)
  const update = useUpdatePlanned(shipmentId)
  const confirm = useConfirmPlanned(shipmentId)
  const cancel = useCancelPlanned(shipmentId)
  const addParcels = useAddPlannedParcels(shipmentId)
  const removeParcel = useRemovePlannedParcel(shipmentId)
  const [editing, setEditing] = useState(false)
  const [picking, setPicking] = useState(false)
  const [starting, setStarting] = useState(false)
  const [cancelling, setCancelling] = useState(false)

  if (query.isPending) return <Skeleton className="h-60 w-full" />
  if (query.isError || !query.data) return <NotFoundPage />
  const s = query.data
  const editable = s.status === 'PLANNED' || s.status === 'CONFIRMED'
  const canConfirm = s.status === 'PLANNED' && s.carId != null && s.driverId != null
  const parcelIds = (parcels.data ?? []).map((p) => p.id!)

  const run = async (fn: () => Promise<unknown>) => {
    try {
      await fn()
      toast.success(t('common:common.saved'))
    } catch (e) {
      showApiError(e)
    }
  }

  return (
    <>
      <LinkButton variant="ghost" size="sm" className="mb-2" to="/planned-shipments">
        <ArrowLeft />
        {t('shipments:planned.title')}
      </LinkButton>
      <PageHeader
        title={
          <span className="flex items-center gap-3">
            {t('shipments:planned.one', { id: s.id })}
            <PlannedStatusBadge status={s.status} />
          </span>
        }
        description={`${t('shipments:fields.plannedDepartureAt')}: ${formatDateTime(s.plannedDepartureAt)}`}
        actions={
          <>
            {s.status === 'PLANNED' && (
              <Tooltip>
                <TooltipTrigger render={<span />}>
                  <Button variant="outline" disabled={!canConfirm || confirm.isPending} onClick={() => run(() => confirm.mutateAsync())}>
                    <Check />
                    {t('shipments:planned.actions.confirm')}
                  </Button>
                </TooltipTrigger>
                {!canConfirm && <TooltipContent>{t('shipments:planned.actions.confirmHint')}</TooltipContent>}
              </Tooltip>
            )}
            {s.status === 'CONFIRMED' && (
              <Button onClick={() => setStarting(true)}>
                <Play />
                {t('shipments:planned.actions.start')}
              </Button>
            )}
            {editable && (
              <>
                <Button variant="outline" onClick={() => setEditing(true)}>
                  <Pencil />
                  {t('common:actions.edit')}
                </Button>
                <Button variant="destructive" onClick={() => setCancelling(true)}>
                  <X />
                  {t('shipments:planned.actions.cancel')}
                </Button>
              </>
            )}
          </>
        }
      />

      <div className="flex flex-col gap-4">
        <Card>
          <CardContent>
            <DetailsList
              items={[
                { label: t('shipments:fields.car'), value: s.carPlateNumber },
                { label: t('shipments:fields.driver'), value: s.driverName },
                { label: t('shipments:fields.plannedDepartureAt'), value: formatDateTime(s.plannedDepartureAt) },
                { label: t('shipments:fields.plannedArrivalAt'), value: formatDateTime(s.plannedArrivalAt) },
                { label: t('shipments:fields.origin'), value: s.origin },
                { label: t('shipments:fields.destination'), value: s.destination },
                { label: t('shipments:fields.notes'), value: s.notes },
              ]}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div className="flex flex-col gap-1">
              <CardTitle>
                {t('shipments:planned.parcelsTitle')} ({parcelIds.length})
              </CardTitle>
              <CardDescription>{t('shipments:planned.parcelsHint')}</CardDescription>
            </div>
            {editable && (
              <Button size="sm" variant="outline" onClick={() => setPicking(true)}>
                <Plus />
                {t('shipments:planned.actions.addParcels')}
              </Button>
            )}
          </CardHeader>
          <CardContent>
            <ParcelsTable
              rows={parcels.data ?? []}
              isLoading={parcels.isPending}
              emptyText={t('shipments:planned.noParcels')}
              actions={
                editable
                  ? (p) => (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={t('shipments:planned.actions.removeParcel')}
                        disabled={removeParcel.isPending}
                        onClick={() => run(() => removeParcel.mutateAsync(p.id!))}
                      >
                        <Trash2 />
                      </Button>
                    )
                  : undefined
              }
            />
          </CardContent>
        </Card>
      </div>

      <PlannedShipmentDialog open={editing} onOpenChange={setEditing} shipment={s} onSubmit={(body) => update.mutateAsync(body)} />
      <ParcelPickerDialog open={picking} onOpenChange={setPicking} excludeIds={parcelIds} pending={addParcels.isPending} onAdd={(ids) => run(() => addParcels.mutateAsync(ids))} />
      <StartShipmentDialog open={starting} onOpenChange={setStarting} planned={s} />
      <ConfirmDialog
        open={cancelling}
        onOpenChange={setCancelling}
        title={t('shipments:planned.cancelConfirm.title')}
        description={t('shipments:planned.cancelConfirm.description')}
        confirmLabel={t('shipments:planned.actions.cancel')}
        destructive
        pending={cancel.isPending}
        onConfirm={() => run(() => cancel.mutateAsync()).then(() => setCancelling(false))}
      />
    </>
  )
}
