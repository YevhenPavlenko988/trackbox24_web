import { ArrowLeft, FileSpreadsheet, Flag, PackageOpen, Pencil, Play, Plus, Route, ScanLine, Trash2, X } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { DetailsList } from '@/components/common/DetailsList'
import { LinkButton } from '@/components/common/LinkButton'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertAction, AlertDescription, AlertTitle } from '@/components/ui/alert'
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
import {
  useDeleteTrip,
  usePlanTripParcels,
  useStartLoadingTrip,
  useTrip,
  useTripHistory,
  useTripParcels,
  useUnplanTripParcel,
  useUpdateTrip,
} from './queries'
import { acceptsLoading, canDepart, isOutsidePlan, isTripDeletable, seatProgress, splitTripParcels, tripNo } from './status'
import { CancelTripDialog, CompleteDialog, DepartDialog } from './TripActionDialogs'
import { useNextLegAfterTrip } from '@/features/routes/queries'
import { TripDialog } from './TripDialog'
import { TripHistory } from './TripHistory'
import { TripLegsCard } from './TripLegsCard'
import { TripPaymentsSummary } from './TripPaymentsSummary'
import { TripStatusBadge } from './TripStatusBadge'

export function TripPage() {
  const { id } = useParams()
  const tripId = Number(id)
  const { t } = useTranslation(['trips', 'common'])
  const { canEdit, canEditMoves, movesEnabled } = useAccess()
  const query = useTrip(tripId)
  const parcels = useTripParcels(tripId)
  const history = useTripHistory(tripId)
  const update = useUpdateTrip(tripId)
  const plan = usePlanTripParcels(tripId)
  const unplan = useUnplanTripParcel(tripId)
  const startLoading = useStartLoadingTrip(tripId)
  const remove = useDeleteTrip()
  const navigate = useNavigate()
  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [picking, setPicking] = useState(false)
  const [departing, setDeparting] = useState(false)
  const [completing, setCompleting] = useState(false)
  const [nextLeg, setNextLeg] = useState(false)
  const addNextLeg = useNextLegAfterTrip(tripId)
  const [cancelling, setCancelling] = useState(false)

  if (query.isPending) return <Skeleton className="h-60 w-full" />
  if (query.isError || !query.data) return <NotFoundPage />
  const trip = query.data
  const editable = canEditMoves && acceptsLoading(trip.status)
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
        title={t('trips:one', { number: tripNo(trip) })}
        badges={<TripStatusBadge status={trip.status} />}
        description={`${t('trips:fields.plannedDepartureAt')}: ${formatDateTime(trip.plannedDepartureAt)}${trip.departedAt ? ` · ${t('trips:fields.departedAt')}: ${formatDateTime(trip.departedAt)}` : ''}`}
        actions={
          <>
            <Button variant="outline" onClick={() => downloadTripRegister(tripId).catch(showApiError)}>
              <FileSpreadsheet />
              {t('trips:actions.register')}
            </Button>
            {canEditMoves && (
            <>
              {/* Loading usually starts with the first scan; this is for when the car is packed away from the scanner. */}
              {canEdit && trip.status === 'PLANNED' && (
                <Tooltip>
                  <TooltipTrigger render={<span />}>
                    <Button variant="outline" disabled={!canDepart(trip)} onClick={() => run(() => startLoading.mutateAsync())}>
                      <PackageOpen />
                      {t('trips:actions.startLoading')}
                    </Button>
                  </TooltipTrigger>
                  {!canDepart(trip) && <TooltipContent>{t('trips:actions.startLoadingHint')}</TooltipContent>}
                </Tooltip>
              )}
              {canEdit && acceptsLoading(trip.status) && (
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
              {canEdit && (trip.status === 'IN_PROGRESS' || trip.reminder === 'COMPLETE') && (
                <Button onClick={() => setCompleting(true)}>
                  <Flag />
                  {t('trips:actions.complete')}
                </Button>
              )}
              {/* the way goes on with another car or after a warehouse: a trip on its own becomes leg 1 of a route */}
              {movesEnabled && trip.routeId == null && trip.status !== 'CANCELLED' && (
                <Button variant="outline" onClick={() => setNextLeg(true)}>
                  <Route />
                  {t('trips:actions.nextLeg')}
                </Button>
              )}
              {editable && (
                <Button variant="outline" onClick={() => setEditing(true)}>
                  <Pencil />
                  {t('trips:actions.edit')}
                </Button>
              )}
              {canEdit && (acceptsLoading(trip.status) || trip.status === 'IN_PROGRESS') && (
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
      {/* What the trip waits for, so a leg does not hang in «Завантаження» once its cargo went on. */}
      {canEdit && canEditMoves && trip.reminder && (
        <Alert className="mb-4 border-primary/40">
          {trip.reminder === 'LOAD' ? <ScanLine /> : trip.reminder === 'DEPART' ? <Play /> : <Flag />}
          <AlertTitle>{t(`trips:reminder.${trip.reminder}.title`)}</AlertTitle>
          <AlertDescription>
            {t(`trips:reminder.${trip.reminder}.${trip.reminder === 'COMPLETE' && trip.status === 'PREPARING' ? 'textNotDeparted' : 'text'}`)}
          </AlertDescription>
          {trip.reminder !== 'LOAD' && (
            <AlertAction>
              <Button size="sm" onClick={() => (trip.reminder === 'DEPART' ? setDeparting(true) : setCompleting(true))}>
                {trip.reminder === 'DEPART' ? t('trips:actions.depart') : t('trips:actions.complete')}
              </Button>
            </AlertAction>
          )}
        </Alert>
      )}
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
                { label: t('trips:fields.coDriver'), value: trip.coDriverName },
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

        {trip.routeId != null && <TripLegsCard routeId={trip.routeId} tripId={tripId} />}

        {trip.payments && (
          <Card>
            <CardHeader>
              <CardTitle>{t('trips:payments.title')}</CardTitle>
            </CardHeader>
            <CardContent>
              <TripPaymentsSummary payments={trip.payments} />
              {!trip.payments.received?.length && !trip.payments.notReceived?.length && (
                <p className="text-sm text-muted-foreground">{t('trips:payments.empty')}</p>
              )}
            </CardContent>
          </Card>
        )}

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
                hideNp
                hidePlan
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
              hideNp
              hidePlan
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
      <TripDialog
        open={nextLeg}
        onOpenChange={setNextLeg}
        title={t('trips:nextLeg.title', { number: trip.number })}
        defaults={{
          carId: trip.carId,
          driverId: trip.driverId,
          coDriverId: trip.coDriverId,
          origin: trip.destination,
          plannedDepartureAt: trip.plannedArrivalAt ?? trip.plannedDepartureAt,
        }}
        onSubmit={async (body) => {
          const route = await addNextLeg.mutateAsync(body)
          toast.success(t('trips:nextLeg.done', { number: tripNo(route.legs?.at(-1) ?? trip) }))
          const added = route.legs?.at(-1)
          if (added?.id) navigate(`/trips/${added.id}`)
        }}
      />
      <DepartDialog trip={trip} open={departing} onOpenChange={setDeparting} />
      <CompleteDialog trip={trip} open={completing} onOpenChange={setCompleting} />
      <CancelTripDialog trip={trip} open={cancelling} onOpenChange={setCancelling} />
    </>
  )
}
