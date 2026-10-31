import { ArrowLeft, PackagePlus, Plus, Trash2, X } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { LinkButton } from '@/components/common/LinkButton'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useAccess } from '@/features/auth/access'
import { ParcelsTable } from '@/features/parcels/ParcelsTable'
import { deleteEntity } from '@/features/trash/api'
import { ParcelPickerDialog } from '@/features/trips/ParcelPickerDialog'
import { routeText, tripNo } from '@/features/trips/status'
import { TripDialog } from '@/features/trips/TripDialog'
import { TripStatusBadge } from '@/features/trips/TripStatusBadge'
import { NotFoundPage } from '@/routes/ErrorPages'
import { showApiError } from '@/lib/api/problem'
import { formatDateTime } from '@/lib/format'
import { useAddRouteLeg, usePlanRouteParcels, useRoute, useRouteParcels, useUnplanRouteParcel } from './queries'
import { RouteStatusBadge } from './RouteStatusBadge'

/**
 * A route: its legs in order (each a trip with its car and driver, 14.1, 14.2 …), where the cargo is now, adding cargo
 * and the next leg (prefilled with the car and driver of the last one), and deleting it while nothing is loaded.
 */
export function RoutePage() {
  const { id } = useParams()
  const routeId = Number(id)
  const { t } = useTranslation(['routes', 'trips', 'common', 'trash'])
  const { canEdit } = useAccess()
  const navigate = useNavigate()
  const query = useRoute(routeId)
  const parcels = useRouteParcels(routeId)
  const addLeg = useAddRouteLeg(routeId)
  const plan = usePlanRouteParcels(routeId)
  const unplan = useUnplanRouteParcel(routeId)
  const [addingLeg, setAddingLeg] = useState(false)
  const [picking, setPicking] = useState(false)
  const [deleting, setDeleting] = useState(false)

  if (query.isPending) return <Skeleton className="h-60 w-full" />
  if (query.isError || !query.data) return <NotFoundPage />
  const route = query.data
  const legs = route.legs ?? []
  const last = legs.at(-1)
  const open = route.status !== 'COMPLETED' && route.status !== 'CANCELLED'
  const untouched = legs.every((l) => (l.status === 'PLANNED' || l.status === 'CANCELLED') && (l.loadedCount ?? 0) === 0)
  const firstOpenLeg = legs.find((l) => l.status === 'PLANNED' || l.status === 'PREPARING')

  const counters = [
    [t('routes:counters.waiting'), route.waitingCount],
    [t('routes:counters.inCar'), route.inCarCount],
    [t('routes:counters.atWarehouse'), route.atWarehouseCount],
    [t('routes:counters.delivered'), route.deliveredCount],
  ] as const

  return (
    <>
      <LinkButton variant="ghost" size="sm" className="mb-2" to="/routes">
        <ArrowLeft />
        {t('routes:title')}
      </LinkButton>
      <PageHeader
        title={t('routes:one', { number: route.number })}
        badges={<RouteStatusBadge status={route.status} />}
        description={[routeText(route), route.notes].filter(Boolean).join(' · ') || undefined}
        actions={
          canEdit && (
            <>
              {open && (
                <Button variant="outline" onClick={() => setPicking(true)}>
                  <PackagePlus />
                  {t('routes:page.addCargo')}
                </Button>
              )}
              {open && (
                <Button variant="outline" onClick={() => setAddingLeg(true)}>
                  <Plus />
                  {t('routes:page.addLeg')}
                </Button>
              )}
              {untouched && (
                <Button variant="destructive" onClick={() => setDeleting(true)}>
                  <Trash2 />
                  {t('common:actions.delete')}
                </Button>
              )}
            </>
          )
        }
      />

      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {counters.map(([label, value]) => (
            <Card key={label} className="py-4">
              <CardContent className="flex flex-col gap-1">
                <span className="text-sm text-muted-foreground">{label}</span>
                <span className="text-2xl font-semibold tabular-nums">{value ?? 0}</span>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t('routes:fields.legs')}</CardTitle>
          </CardHeader>
          <CardContent>
            {legs.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('routes:page.noLegsYet')}</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">№</TableHead>
                    <TableHead>{t('trips:fields.status')}</TableHead>
                    <TableHead>{t('trips:fields.route')}</TableHead>
                    <TableHead>{t('trips:fields.car')}</TableHead>
                    <TableHead>{t('trips:fields.driver')}</TableHead>
                    <TableHead>{t('trips:fields.plannedDepartureAt')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {legs.map((l) => (
                    <TableRow key={l.id} className="cursor-pointer" onClick={() => navigate(`/trips/${l.id}`)}>
                      <TableCell className="font-semibold">
                        <Link to={`/trips/${l.id}`} className="underline underline-offset-4" onClick={(e) => e.stopPropagation()}>
                          {tripNo(l)}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <TripStatusBadge status={l.status} />
                      </TableCell>
                      <TableCell>{routeText(l) || '—'}</TableCell>
                      <TableCell>{l.carPlateNumber ?? '—'}</TableCell>
                      <TableCell>{l.driverName ?? '—'}</TableCell>
                      <TableCell>{formatDateTime(l.plannedDepartureAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              {t('routes:fields.cargo')} ({route.parcelCount ?? 0})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ParcelsTable
              rows={parcels.data ?? []}
              isLoading={parcels.isPending}
              emptyText={t('routes:page.noCargo')}
              actions={
                canEdit
                  ? (p) => (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={t('routes:page.remove')}
                        onClick={async (e) => {
                          e.stopPropagation()
                          try {
                            await unplan.mutateAsync(p.id!)
                            toast.success(t('routes:page.removed'))
                          } catch (err) {
                            showApiError(err)
                          }
                        }}
                      >
                        <X />
                      </Button>
                    )
                  : undefined
              }
            />
          </CardContent>
        </Card>
      </div>

      <TripDialog
        open={addingLeg}
        onOpenChange={setAddingLeg}
        title={t('routes:page.addLegTitle', { number: route.number, n: legs.length + 1 })}
        defaults={{
          carId: last?.carId,
          driverId: last?.driverId,
          coDriverId: last?.coDriverId,
          origin: last?.destination,
          plannedDepartureAt: last?.plannedArrivalAt ?? last?.plannedDepartureAt,
        }}
        onSubmit={(body) => addLeg.mutateAsync(body)}
      />
      <ParcelPickerDialog
        open={picking}
        onOpenChange={setPicking}
        tripId={firstOpenLeg?.id ?? 0}
        excludeIds={(parcels.data ?? []).map((p) => p.id!)}
        pending={plan.isPending}
        onAdd={async (ids) => {
          try {
            await plan.mutateAsync(ids)
            toast.success(t('routes:page.added', { count: ids.length }))
          } catch (e) {
            showApiError(e)
          }
        }}
      />
      <ConfirmDialog
        open={deleting}
        onOpenChange={setDeleting}
        title={t('trash:deleteConfirm.routes.title')}
        description={t('trash:deleteConfirm.routes.description')}
        confirmLabel={t('common:actions.delete')}
        destructive
        onConfirm={async () => {
          try {
            await deleteEntity('routes', routeId)
            toast.success(t('common:common.saved'))
            navigate('/routes')
          } catch (e) {
            showApiError(e)
          }
        }}
      />
    </>
  )
}
