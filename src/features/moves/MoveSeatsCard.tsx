import { ClipboardCheck, FileSpreadsheet, ImagePlus, Loader2, Plus, Printer } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { LinkButton } from '@/components/common/LinkButton'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useAccess } from '@/features/auth/access'
import { downloadSeatRegister } from '@/features/parcels/api'
import { MAX_PHOTOS } from '@/features/parcels/ParcelPhotosCard'
import { ParcelStatusBadge } from '@/features/parcels/ParcelStatusBadge'
import { useAddParcelPhotos, useDescribeSeat, useParcelPhotos } from '@/features/parcels/queries'
import { showApiError } from '@/lib/api/problem'
import type { ParcelPhotoResponse, ParcelResponse, ParcelSeatResponse } from '@/lib/api/types'
import { formatDateTime } from '@/lib/format'
import { AddItemsDialog } from './AddItemsDialog'
import { SeatCheckDialog } from './SeatCheckDialog'

/**
 * The items of a move: number, short code, what it is (edited in place), status, where it is, who scanned it last,
 * its photos. A filter for long lists; adding forgotten items, the scan check, the register and the labels.
 */
export function MoveSeatsCard({ parcel }: { parcel: ParcelResponse }) {
  const { t } = useTranslation(['moves', 'parcels', 'common'])
  const { canEdit } = useAccess()
  const parcelId = parcel.id!
  const seats = useMemo(() => parcel.seats ?? [], [parcel.seats])
  const photos = useParcelPhotos(parcelId)
  const [filter, setFilter] = useState('')
  const [adding, setAdding] = useState(false)
  const [checking, setChecking] = useState(false)
  const editable = canEdit && parcel.status !== 'DELIVERED_TO_CLIENT' && parcel.status !== 'CANCELLED'

  const photosBySeat = useMemo(() => {
    const map = new Map<number, ParcelPhotoResponse[]>()
    for (const ph of photos.data ?? []) {
      if (ph.seatNumber == null) continue
      map.set(ph.seatNumber, [...(map.get(ph.seatNumber) ?? []), ph])
    }
    return map
  }, [photos.data])

  const byStatus = useMemo(() => {
    const counts = new Map<string, number>()
    for (const s of seats) counts.set(s.status!, (counts.get(s.status!) ?? 0) + 1)
    return [...counts.entries()]
  }, [seats])

  const q = filter.trim().toLowerCase()
  const shown = q
    ? seats.filter((s) => String(s.seatNumber) === q || s.barcode?.toLowerCase().includes(q) || s.description?.toLowerCase().includes(q))
    : seats

  const register = async () => {
    try {
      await downloadSeatRegister(parcelId, `${parcel.barcode}-seats.xlsx`)
    } catch (e) {
      showApiError(e)
    }
  }

  return (
    <Card className="lg:col-span-2">
      <CardHeader className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle>{t('moves:seats.title', { count: seats.length })}</CardTitle>
          <div className="flex flex-wrap gap-2">
            {editable && (
              <Button variant="outline" size="sm" onClick={() => setAdding(true)}>
                <Plus />
                {t('moves:add.action')}
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => setChecking(true)}>
              <ClipboardCheck />
              {t('moves:check.action')}
            </Button>
            <LinkButton variant="outline" size="sm" to={`/parcels/${parcelId}/labels`}>
              <Printer />
              {t('moves:labels')}
            </LinkButton>
            <Button variant="outline" size="sm" onClick={register}>
              <FileSpreadsheet />
              {t('moves:register')}
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Input className="max-w-xs" placeholder={t('moves:seats.filter')} value={filter} onChange={(e) => setFilter(e.target.value)} aria-label={t('moves:seats.filter')} />
          {byStatus.map(([status, count]) => (
            <span key={status} className="flex items-center gap-1 text-sm text-muted-foreground">
              <ParcelStatusBadge status={status as ParcelSeatResponse['status']} />
              <span className="tabular-nums">{count}</span>
            </span>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">№</TableHead>
              <TableHead>{t('parcels:fields.barcode')}</TableHead>
              <TableHead className="w-full">{t('moves:seats.description')}</TableHead>
              <TableHead>{t('parcels:fields.status')}</TableHead>
              <TableHead>{t('parcels:fields.statusChangedAt')}</TableHead>
              <TableHead>{t('moves:seats.photos')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {shown.map((s) => (
              <TableRow key={s.seatNumber}>
                <TableCell className="font-semibold tabular-nums">{s.seatNumber}</TableCell>
                <TableCell className="font-mono">{s.barcode}</TableCell>
                <TableCell className="whitespace-normal">
                  <SeatDescription parcelId={parcelId} seat={s} editable={editable} />
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-0.5">
                    <ParcelStatusBadge status={s.status} />
                    {s.warehouseName && <span className="text-xs text-muted-foreground">{s.warehouseName}</span>}
                  </div>
                </TableCell>
                <TableCell className="whitespace-normal text-muted-foreground">
                  <div className="flex flex-col">
                    <span>{formatDateTime(s.statusChangedAt)}</span>
                    {s.statusChangedBy && <span className="text-xs">{s.statusChangedBy}</span>}
                  </div>
                </TableCell>
                <TableCell>
                  <SeatPhotos parcelId={parcelId} seatNumber={s.seatNumber!} photos={photosBySeat.get(s.seatNumber!) ?? []} editable={canEdit} />
                </TableCell>
              </TableRow>
            ))}
            {shown.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  {t('moves:seats.nothingFound')}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
      <AddItemsDialog parcel={parcel} open={adding} onOpenChange={setAdding} />
      {checking && <SeatCheckDialog parcel={parcel} onOpenChange={setChecking} />}
    </Card>
  )
}

/** What the item is; a click turns it into a field, Enter or leaving it saves. */
function SeatDescription({ parcelId, seat, editable }: { parcelId: number; seat: ParcelSeatResponse; editable: boolean }) {
  const { t } = useTranslation('moves')
  const describe = useDescribeSeat(parcelId)
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(seat.description ?? '')

  const save = async () => {
    setEditing(false)
    if (value.trim() === (seat.description ?? '')) return
    try {
      await describe.mutateAsync({ seatNumber: seat.seatNumber!, description: value.trim() })
      toast.success(t('seats.saved'))
    } catch (e) {
      setValue(seat.description ?? '')
      showApiError(e)
    }
  }

  if (!editable) return <span>{seat.description ?? '—'}</span>
  if (editing) {
    return (
      <Input
        autoFocus
        maxLength={200}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === 'Enter') void save()
          if (e.key === 'Escape') {
            setValue(seat.description ?? '')
            setEditing(false)
          }
        }}
        aria-label={t('seats.description')}
      />
    )
  }
  return (
    <button type="button" className="w-full rounded px-1 py-0.5 text-left hover:bg-muted" onClick={() => setEditing(true)}>
      {seat.description ?? <span className="text-muted-foreground italic">{t('seats.noDescription')}</span>}
    </button>
  )
}

/** Up to three photos of one item: thumbnails open the photo, the button adds more. */
function SeatPhotos({ parcelId, seatNumber, photos, editable }: { parcelId: number; seatNumber: number; photos: ParcelPhotoResponse[]; editable: boolean }) {
  const { t } = useTranslation('moves')
  const add = useAddParcelPhotos(parcelId)
  const input = useRef<HTMLInputElement>(null)
  const left = MAX_PHOTOS - photos.length

  const pick = async (files: File[]) => {
    if (!files.length) return
    try {
      await add.mutateAsync({ files: files.slice(0, left), seatNumber })
      toast.success(t('seats.photoAdded'))
    } catch (e) {
      showApiError(e)
    }
  }

  return (
    <div className="flex items-center gap-1">
      {photos.map((ph) => (
        <a key={ph.id} href={ph.url} target="_blank" rel="noreferrer" className="block size-9 overflow-hidden rounded border">
          <img src={ph.thumbnailUrl} alt="" className="size-full object-cover" />
        </a>
      ))}
      {editable && left > 0 && (
        <>
          <input
            ref={input}
            type="file"
            accept="image/*,.heic,.heif"
            multiple
            className="hidden"
            onChange={(e) => {
              void pick(Array.from(e.target.files ?? []))
              e.target.value = ''
            }}
          />
          <Button variant="ghost" size="icon-sm" aria-label={t('seats.addPhoto', { n: seatNumber })} disabled={add.isPending} onClick={() => input.current?.click()}>
            {add.isPending ? <Loader2 className="animate-spin" /> : <ImagePlus />}
          </Button>
        </>
      )}
      {photos.length === 0 && !editable && <Badge variant="outline">—</Badge>}
    </div>
  )
}
