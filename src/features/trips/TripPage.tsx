import { ArrowLeft, FileSpreadsheet, Flag, Pencil, Play, Plus, Trash2, X } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { DetailsList } from '@/components/common/DetailsList'
import { LinkButton } from '@/components/common/LinkButton'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useAccess } from '@/features/auth/access'
import { ParcelsTable } from '@/features/parcels/ParcelsTable'
import { showApiError } from '@/lib/api/problem'
import { formatDateTime } from '@/lib/format'
import { NotFoundPage } from '@/routes/ErrorPages'
import { ParcelPickerDialog } from './ParcelPickerDialog'
import { downloadTripRegister } from './api'
import { useDeleteTrip, usePlanTripParcels, useTrip, useTripHistory, useTripParcels, useUnplanTripParcel, useUpdateTrip } from './queries'
import { acceptsLoading, canDepart, isOutsidePlan, isTripDeletable, seatProgress, splitTripParcels } from './status'
import { CancelTripDialog, CompleteDialog, DepartDialog } from './TripActionDialogs'
import { TripDialog } from './TripDialog'
import { TripHistory } from './TripHistory'
import { TripStatusBadge } from './TripStatusBadge'

export function TripPage() {
  const { id } = useParams()
  const tripId = Number(id)
  const { t } = useTranslation(['trips', 'common'])
  const { canEdit } = useAccess()
  const query = useTrip(tripId)
  const parcels = useTripParcels(tripId)
  const history = useTripHistory(tripId)
  const update = useUpdateTrip(tripId)
  const plan = usePlanTripParcels(tripId)
  const unplan = useUnplanTripParcel(tripId)
  const remove = useDeleteTrip()
  const navigate = useNavigate()
  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [picking, setPicking] = useState(false)
  const [departing, setDeparting] = useState(false)
  const [completing, setCompleting] = useState(false)
  const [cancelling, setCancelling] = useState(false)

  if (query.isPending) return <Skeleton className="h-60 w-full" />
  if (query.isError || !query.data) return <NotFoundPage />
  const trip = query.data
  const editable = canEdit && acceptsLoading(trip.status)
  const { planned, loaded } = splitTripParcels(tripId, parcels.data ?? [])
  const progress = seatProgress(loaded)
  const excludeIds = (parcels.data ?? []).map((p) => p.id!)
  // Backend rule: only a planned trip with nothing loaded, or a cancelled one, may be deleted.
  const deletable = canEdit && isTripDeletable(trip)

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
      <LinkButton variant="ghost" size="sm" className="mb-2" to="/trips">
        <ArrowLeft />
        {t('trips:title')}
      </LinkButton>
      <PageHeader
        title={t('trips:one', { id: trip.id })}
        badges={<TripStatusBadge status={trip.status} />}
        description={`${t('trips:fields.plannedDepartureAt')}: ${formatDateTime(trip.plannedDepartureAt)}${trip.departedAt ? ` · ${t('trips:fields.departedAt')}: ${formatDateTime(trip.departedAt)}` : ''}`}
        actions={
          <>
            <Button variant="outline" onClick={() => downloadTripRegister(tripId).catch(showApiError)}>
              <FileSpreadsheet />
              {t('trips:actions.register')}
            </Button>
            {canEdit && (
            <>
              {acceptsLoading(trip.status) && (
                <Tooltip>
                  <TooltipTrigger render={<span />}>
                    <Button disabled={!canDepart(trip)} onClick={() => setDeparting(true)}>
                      <Play />
                      {t('trips:actions.depart')}
                    </Button>
                  </TooltipTrigger>
                  {!canDepart(trip) && <TooltipContent>{t('trips:actions.departHint')}</TooltipContent>}
                </Tooltip>
              )}
              {trip.status === 'IN_PROGRESS' && (
                <Button onClick={() => setCompleting(true)}>
                  <Flag />
                  {t('trips:actions.complete')}
                </Button>
              )}
              {editable && (
                <Button variant="outline" onClick={() => setEditing(true)}>
                  <Pencil />
                  {t('trips:actions.edit')}
                </Button>
              )}
              {(acceptsLoading(trip.status) || trip.status === 'IN_PROGRESS') && (
                <Button variant="destructive" onClick={() => setCancelling(true)}>
                  <X />
                  {t('trips:actions.cancel')}
                </Button>
              )}
              {deletable && (
                <Button variant="destructive" onClick={() => setDeleting(true)}>
                  <Trash2 />
                  {t('trips:actions.delete')}
                </Button>
              )}
            </>
            )}
          </>
        }
      />
      <ConfirmDialog
        open={deleting}
        onOpenChange={setDeleting}
        title={t('trips:deleteConfirm.title')}
        description={t('trips:deleteConfirm.description')}
        confirmLabel={t('trips:actions.delete')}
        destructive
        pending={remove.isPending}
        onConfirm={async () => {
          try {
            await remove.mutateAsync(tripId)
            toast.success(t('common:common.saved'))
            navigate('/trips')
          } catch (e) {
            showApiError(e)
          }
        }}
      />

      <div className="flex flex-col gap-4">
        <Card>
          <CardContent>
            <DetailsList
              items={[
                { label: t('trips:fields.car'), value: trip.carPlateNumber },
                { label: t('trips:fields.driver'), value: trip.driverName },
                { label: t('trips:fields.plannedDepartureAt'), value: formatDateTime(trip.plannedDepartureAt) },
                { label: t('trips:fields.plannedArrivalAt'), value: formatDateTime(trip.plannedArrivalAt) },
                { label: t('trips:fields.departedAt'), value: formatDateTime(trip.departedAt) },
                { label: t('trips:fields.arrivedAt'), value: formatDateTime(trip.arrivedAt) },
                { label: t('trips:fields.origin'), value: trip.origin },
                { label: t('trips:fields.destination'), value: trip.destination },
                { label: t('trips:fields.startOdometerKm'), value: trip.startOdometerKm },
                { label: t('trips:fields.endOdometerKm'), value: trip.endOdometerKm },
                { label: t('trips:fields.notes'), value: trip.notes },
              ]}
            />
          </CardContent>
        </Card>

        {acceptsLoading(trip.status) && (
          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div className="flex flex-col gap-1">
                <CardTitle>
                  {t('trips:sections.plan')} ({planned.length})
                </CardTitle>
                <CardDescription>{t('trips:sections.planHint')}</CardDescription>
              </div>
              {editable && (
                <Button size="sm" variant="outline" onClick={() => setPicking(true)}>
                  <Plus />
                  {t('trips:actions.plan')}
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <ParcelsTable
                rows={planned}
                isLoading={parcels.isPending}
                emptyText={t('trips:sections.noPlan')}
                actions={
                  editable
                    ? (p) => (
                        <Button variant="ghost" size="icon-sm" aria-label={t('trips:actions.unplan')} disabled={unplan.isPending} onClick={() => run(() => unplan.mutateAsync(p.id!))}>
                          <Trash2 />
                        </Button>
                      )
                    : undefined
                }
              />
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>
              {t('trips:sections.loaded')} ({loaded.length})
            </CardTitle>
            <CardDescription>
              {t('trips:sections.loadedProgress', { loaded: progress.loaded, total: progress.total, delivered: progress.delivered })} · {t('trips:sections.loadedHint')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ParcelsTable
              rows={loaded}
              isLoading={parcels.isPending}
              emptyText={t(acceptsLoading(trip.status) ? 'trips:sections.noLoaded' : 'trips:sections.noLoadedClosed')}
              extra={(p) => (isOutsidePlan(tripId, p) ? <Badge variant="outline">{t('trips:sections.outsidePlan')}</Badge> : null)}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('trips:sections.history')}</CardTitle>
          </CardHeader>
          <CardContent>
            <TripHistory entries={history.data} isLoading={history.isPending} />
          </CardContent>
        </Card>
      </div>

      <TripDialog open={editing} onOpenChange={setEditing} trip={trip} onSubmit={(body) => update.mutateAsync(body)} />
      <ParcelPickerDialog open={picking} onOpenChange={setPicking} tripId={tripId} excludeIds={excludeIds} pending={plan.isPending} onAdd={(ids) => run(() => plan.mutateAsync(ids))} />
      <DepartDialog trip={trip} open={departing} onOpenChange={setDeparting} />
      <CompleteDialog trip={trip} open={completing} onOpenChange={setCompleting} />
      <CancelTripDialog trip={trip} open={cancelling} onOpenChange={setCancelling} />
    </>
  )
}
