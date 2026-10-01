import { ArrowLeft, Flag, X } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { DetailsList } from '@/components/common/DetailsList'
import { LinkButton } from '@/components/common/LinkButton'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ParcelsTable } from '@/features/parcels/ParcelsTable'
import { showApiError } from '@/lib/api/problem'
import { formatDateTime } from '@/lib/format'
import { NotFoundPage } from '@/routes/ErrorPages'
import { CompleteShipmentDialog } from './CompleteShipmentDialog'
import { useActualParcels, useActualShipment, useCancelActual } from './queries'
import { ActualStatusBadge } from './ShipmentStatusBadge'

export function ShipmentPage() {
  const { id } = useParams()
  const shipmentId = Number(id)
  const { t } = useTranslation(['shipments', 'common'])
  const query = useActualShipment(shipmentId)
  const parcels = useActualParcels(shipmentId)
  const cancel = useCancelActual(shipmentId)
  const [completing, setCompleting] = useState(false)
  const [cancelling, setCancelling] = useState(false)

  if (query.isPending) return <Skeleton className="h-60 w-full" />
  if (query.isError || !query.data) return <NotFoundPage />
  const s = query.data
  const active = s.status === 'IN_PROGRESS'

  const onCancel = async () => {
    try {
      await cancel.mutateAsync()
      toast.success(t('common:common.saved'))
      setCancelling(false)
    } catch (e) {
      showApiError(e)
    }
  }

  return (
    <>
      <LinkButton variant="ghost" size="sm" className="mb-2" to="/shipments">
        <ArrowLeft />
        {t('shipments:actual.title')}
      </LinkButton>
      <PageHeader
        title={
          <span className="flex items-center gap-3">
            {t('shipments:actual.one', { id: s.id })}
            <ActualStatusBadge status={s.status} />
          </span>
        }
        description={`${t('shipments:fields.departedAt')}: ${formatDateTime(s.departedAt)}`}
        actions={
          active && (
            <>
              <Button onClick={() => setCompleting(true)}>
                <Flag />
                {t('shipments:actual.actions.complete')}
              </Button>
              <Button variant="destructive" onClick={() => setCancelling(true)}>
                <X />
                {t('shipments:actual.actions.cancel')}
              </Button>
            </>
          )
        }
      />

      <div className="flex flex-col gap-4">
        <Card>
          <CardContent>
            <DetailsList
              items={[
                {
                  label: t('shipments:fields.plannedShipment'),
                  value: s.plannedShipmentId != null ? (
                    <Link to={`/planned-shipments/${s.plannedShipmentId}`} className="underline underline-offset-4">
                      {t('shipments:planned.one', { id: s.plannedShipmentId })}
                    </Link>
                  ) : undefined,
                },
                { label: t('shipments:fields.car'), value: s.carPlateNumber },
                { label: t('shipments:fields.driver'), value: s.driverName },
                { label: t('shipments:fields.departedAt'), value: formatDateTime(s.departedAt) },
                { label: t('shipments:fields.arrivedAt'), value: formatDateTime(s.arrivedAt) },
                { label: t('shipments:fields.startOdometerKm'), value: s.startOdometerKm },
                { label: t('shipments:fields.endOdometerKm'), value: s.endOdometerKm },
                { label: t('shipments:fields.notes'), value: s.notes },
              ]}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              {t('shipments:actual.parcelsTitle')} ({parcels.data?.length ?? 0})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ParcelsTable rows={parcels.data ?? []} isLoading={parcels.isPending} emptyText={t('shipments:actual.noParcels')} />
          </CardContent>
        </Card>
      </div>

      <CompleteShipmentDialog shipment={s} open={completing} onOpenChange={setCompleting} />
      <ConfirmDialog
        open={cancelling}
        onOpenChange={setCancelling}
        title={t('shipments:actual.cancelConfirm.title')}
        description={t('shipments:actual.cancelConfirm.description')}
        confirmLabel={t('shipments:actual.actions.cancel')}
        destructive
        pending={cancel.isPending}
        onConfirm={onCancel}
      />
    </>
  )
}
