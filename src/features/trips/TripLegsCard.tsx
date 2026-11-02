import { PackagePlus, Plus, Trash2, X } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useAccess } from '@/features/auth/access'
import { ParcelsTable } from '@/features/parcels/ParcelsTable'
import { useAddRouteLeg, usePlanRouteParcels, useRoute, useRouteParcels, useUnplanRouteParcel } from '@/features/routes/queries'
import { deleteEntity } from '@/features/trash/api'
import { showApiError } from '@/lib/api/problem'
import { formatDateTime } from '@/lib/format'
import { ParcelPickerDialog } from './ParcelPickerDialog'
import { routeText, tripNo } from './status'
import { TripDialog } from './TripDialog'
import { TripStatusBadge } from './TripStatusBadge'

/**
 * A trip that goes on in legs (№5.1, №5.2 …): every leg with its car and driver, this one marked, and the cargo that
 * rides the whole way — added once, it changes cars at the warehouses. What was handed over on the way stays only in
 * the leg it rode. There is no separate «route» for the user: it is one trip with legs.
 */
export function TripLegsCard({ routeId, tripId }: { routeId: number; tripId: number }) {
  const { t } = useTranslation(['trips', 'routes', 'common', 'trash'])
  const { canEditMoves: canEdit, canEdit: isManagerEdit } = useAccess()
  const navigate = useNavigate()
  const query = useRoute(routeId)
  const parcels = useRouteParcels(routeId)
  const addLeg = useAddRouteLeg(routeId)
  const plan = usePlanRouteParcels(routeId)
  const unplan = useUnplanRouteParcel(routeId)
  const [addingLeg, setAddingLeg] = useState(false)
  const [picking, setPicking] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const route = query.data
  if (!route) return null
  const legs = route.legs ?? []
  const last = legs.at(-1)
  const open = route.status !== 'COMPLETED' && route.status !== 'CANCELLED'
  const untouched = legs.every((l) => (l.status === 'PLANNED' || l.status === 'CANCELLED') && (l.loadedCount ?? 0) === 0)
  const firstOpenLeg = legs.find((l) => l.status === 'PLANNED' || l.status === 'PREPARING')

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <CardTitle>{t('trips:legs.title', { number: route.number, count: legs.length })}</CardTitle>
            <CardDescription>{[routeText(route), t('trips:legs.hint')].filter(Boolean).join(' · ')}</CardDescription>
          </div>
          {canEdit && (
            <div className="flex flex-wrap justify-end gap-2">
              {open && (
                <Button size="sm" variant="outline" onClick={() => setAddingLeg(true)}>
                  <Plus />
                  {t('trips:actions.nextLeg')}
                </Button>
              )}
              {isManagerEdit && untouched && (
                <Button size="sm" variant="ghost" aria-label={t('trips:legs.deleteAll')} onClick={() => setDeleting(true)}>
                  <Trash2 />
                </Button>
              )}
            </div>
          )}
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-20">№</TableHead>
                <TableHead>{t('trips:fields.status')}</TableHead>
                <TableHead>{t('trips:fields.route')}</TableHead>
                <TableHead>{t('trips:fields.car')}</TableHead>
                <TableHead>{t('trips:fields.driver')}</TableHead>
                <TableHead>{t('trips:fields.plannedDepartureAt')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {legs.map((l) => {
                const current = l.id === tripId
                return (
                  <TableRow key={l.id} className={current ? 'bg-muted/60' : 'cursor-pointer'} onClick={() => !current && navigate(`/trips/${l.id}`)}>
                    <TableCell className="font-semibold">
                      {current ? (
                        <span className="flex items-center gap-2">
                          {tripNo(l)}
                          <Badge variant="secondary">{t('trips:legs.current')}</Badge>
                        </span>
                      ) : (
                        <Link to={`/trips/${l.id}`} className="underline underline-offset-4" onClick={(e) => e.stopPropagation()}>
                          {tripNo(l)}
                        </Link>
                      )}
                    </TableCell>
                    <TableCell>
                      <TripStatusBadge status={l.status} />
                    </TableCell>
                    <TableCell>{routeText(l) || '—'}</TableCell>
                    <TableCell>{l.carPlateNumber ?? '—'}</TableCell>
                    <TableCell>{l.driverName ?? '—'}</TableCell>
                    <TableCell>{formatDateTime(l.plannedDepartureAt)}</TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <CardTitle>
              {t('trips:legs.cargo')} ({route.parcelCount ?? 0})
            </CardTitle>
            <CardDescription>{t('trips:legs.cargoHint')}</CardDescription>
          </div>
          {canEdit && open && (
            <Button size="sm" variant="outline" onClick={() => setPicking(true)}>
              <PackagePlus />
              {t('routes:page.addCargo')}
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <ParcelsTable
            hideNp
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
        onSubmit={async (body) => {
          const updated = await addLeg.mutateAsync(body)
          const added = updated.legs?.at(-1)
          toast.success(t('trips:nextLeg.done', { number: tripNo(added ?? {}) }))
          if (added?.id) navigate(`/trips/${added.id}`)
        }}
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
            navigate('/trips')
          } catch (e) {
            showApiError(e)
          }
        }}
      />
    </>
  )
}
