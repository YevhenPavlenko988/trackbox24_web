import { ChevronLeft, ChevronRight, ImagePlus, Loader2, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState, type DragEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { useAccess } from '@/features/auth/access'
import { useCurrentCompany } from '@/features/companies/queries'
import { showApiError } from '@/lib/api/problem'
import type { ParcelPhotoResponse, ParcelResponse } from '@/lib/api/types'
import { formatDateTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useAddParcelPhotos, useDeleteParcelPhoto, useParcelPhotos } from './queries'

export const MAX_PHOTOS = 3
/** Days after delivery the backend keeps the photos. */
const PURGE_DAYS = 14

/**
 * Up to three photos of a parcel. Files are sent as picked — the backend turns anything (HEIC too) into WebP — in one
 * request, which the backend accepts or rejects as a whole. Links are presigned and expire in an hour: an `<img>` that
 * fails is a sign to refetch the list, not a broken photo.
 */
export function ParcelPhotosCard({ parcel }: { parcel: ParcelResponse }) {
  const { t } = useTranslation(['parcels', 'common'])
  const { canEdit } = useAccess()
  const company = useCurrentCompany()
  const parcelId = parcel.id!
  const photos = useParcelPhotos(parcelId)
  const add = useAddParcelPhotos(parcelId)
  const remove = useDeleteParcelPhoto(parcelId)
  const [viewing, setViewing] = useState<number | null>(null)
  const [deleting, setDeleting] = useState<ParcelPhotoResponse | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const enabled = company.data?.photosEnabled === true
  // a move's item photos live in its seats table; this card is the parcel's own
  const list = (photos.data ?? []).filter((ph) => ph.seatNumber == null)
  const left = MAX_PHOTOS - list.length
  const canAdd = canEdit && enabled && left > 0

  // Photos are off for this company and there is nothing to look at: no card at all.
  if (!enabled && (photos.isPending || list.length === 0)) return null

  const pick = async (files: File[]) => {
    if (!files.length) return
    if (left <= 0) {
      toast.error(t('parcels:photos.full'))
      return
    }
    if (files.length > left) {
      toast.error(t('parcels:photos.tooMany', { left, picked: files.length }))
      return
    }
    try {
      await add.mutateAsync({ files })
      toast.success(t('parcels:photos.added'))
    } catch (e) {
      showApiError(e)
    }
  }

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragOver(false)
    if (!canAdd) return
    void pick(Array.from(e.dataTransfer.files))
  }

  const onDelete = async () => {
    if (!deleting?.id) return
    try {
      await remove.mutateAsync(deleting.id)
      toast.success(t('parcels:photos.deleted'))
      setDeleting(null)
      setViewing(null)
    } catch (e) {
      showApiError(e)
    }
  }

  // The backend wipes a delivered parcel's photos 14 days after hand-over: until then an empty list is just empty.
  const deliveredAt = parcel.status === 'DELIVERED_TO_CLIENT' && parcel.statusChangedAt ? new Date(parcel.statusChangedAt).getTime() : null
  const photosPurged = deliveredAt != null && Date.now() - deliveredAt > PURGE_DAYS * 86400e3
  const emptyText = photosPurged ? t('parcels:photos.emptyDelivered') : t('parcels:photos.empty')
  const purgeHint = deliveredAt != null && !photosPurged ? t('parcels:photos.purgeHint') : null

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <CardTitle>{t('parcels:sections.photos')}</CardTitle>
          {canAdd && (
            <>
              <input
                ref={inputRef}
                type="file"
                accept="image/*,.heic,.heif"
                multiple
                className="hidden"
                onChange={(e) => {
                  void pick(Array.from(e.target.files ?? []))
                  e.target.value = ''
                }}
              />
              <Button variant="outline" size="sm" onClick={() => inputRef.current?.click()} disabled={add.isPending}>
                {add.isPending ? <Loader2 className="animate-spin" /> : <ImagePlus />}
                {list.length ? t('parcels:photos.addMore', { left }) : t('parcels:photos.add')}
              </Button>
            </>
          )}
        </CardHeader>
        <CardContent
          onDragOver={(e) => {
            if (!canAdd) return
            e.preventDefault()
            setDragOver(true)
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          className={cn('rounded-b-xl transition-colors', dragOver && 'bg-primary/5 ring-2 ring-primary/40 ring-inset')}
        >
          {photos.isPending ? (
            <div className="grid grid-cols-3 gap-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="aspect-square animate-pulse rounded-md bg-muted" />
              ))}
            </div>
          ) : list.length === 0 && !add.isPending ? (
            <p className="text-sm text-muted-foreground">{emptyText}</p>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {list.map((ph, i) => (
                <button
                  key={ph.id}
                  type="button"
                  title={t('parcels:photos.open')}
                  onClick={() => setViewing(i)}
                  className="group relative aspect-square overflow-hidden rounded-md bg-muted outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <img
                    src={ph.thumbnailUrl}
                    alt=""
                    loading="lazy"
                    className="size-full object-cover transition-transform group-hover:scale-105"
                    onError={() => photos.refetch()}
                  />
                </button>
              ))}
              {add.isPending && (
                <div className="flex aspect-square items-center justify-center rounded-md bg-muted text-muted-foreground">
                  <Loader2 className="animate-spin" />
                </div>
              )}
            </div>
          )}
          {purgeHint && <p className="mt-3 text-xs text-muted-foreground">{purgeHint}</p>}
          {canAdd && <p className="mt-3 text-xs text-muted-foreground">{t('parcels:photos.hint')}</p>}
        </CardContent>
      </Card>

      <PhotoLightbox
        photos={list}
        index={viewing}
        onIndexChange={setViewing}
        onDelete={canEdit ? (ph) => setDeleting(ph) : undefined}
        onExpired={() => photos.refetch()}
      />

      <ConfirmDialog
        open={deleting != null}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={t('parcels:photos.deleteConfirmTitle')}
        description={t('parcels:photos.deleteConfirmBody')}
        confirmLabel={t('common:actions.delete')}
        destructive
        pending={remove.isPending}
        onConfirm={onDelete}
      />
    </>
  )
}

function PhotoLightbox({
  photos,
  index,
  onIndexChange,
  onDelete,
  onExpired,
}: {
  photos: ParcelPhotoResponse[]
  index: number | null
  onIndexChange: (i: number | null) => void
  onDelete?: (ph: ParcelPhotoResponse) => void
  onExpired: () => void
}) {
  const { t } = useTranslation(['parcels', 'common'])
  const open = index != null && index < photos.length
  const ph = open ? photos[index] : undefined
  const prev = () => index != null && onIndexChange((index + photos.length - 1) % photos.length)
  const next = () => index != null && onIndexChange((index + 1) % photos.length)

  // The card may have been open for longer than the links live; refresh them before showing a dead image.
  useEffect(() => {
    if (ph?.urlExpiresAt && new Date(ph.urlExpiresAt).getTime() < Date.now()) onExpired()
  }, [ph?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onIndexChange(null)}>
      <DialogContent
        className="max-w-[calc(100%-1rem)] gap-2 bg-black p-2 text-white ring-white/20 sm:max-w-5xl"
        onKeyDown={(e) => {
          if (e.key === 'ArrowLeft') prev()
          if (e.key === 'ArrowRight') next()
        }}
      >
        <DialogTitle className="sr-only">{t('parcels:sections.photos')}</DialogTitle>
        {ph && (
          <>
            <div className="flex items-center justify-center" style={{ minHeight: '40vh' }}>
              <img
                key={ph.id}
                src={ph.url}
                alt=""
                width={ph.width}
                height={ph.height}
                className="max-h-[80vh] w-auto max-w-full rounded-md object-contain"
                onError={onExpired}
              />
            </div>
            <div className="flex items-center justify-between gap-2 px-1 text-xs text-white/80">
              <span>
                {t('parcels:photos.counter', { index: (index ?? 0) + 1, total: photos.length })}
                {ph.createdBy && ` · ${t('parcels:photos.by', { name: ph.createdBy, date: formatDateTime(ph.createdAt) })}`}
              </span>
              <div className="flex items-center gap-1">
                {photos.length > 1 && (
                  <>
                    <Button variant="ghost" size="icon-sm" className="text-white hover:bg-white/10 hover:text-white" onClick={prev} title={t('parcels:photos.prev')}>
                      <ChevronLeft />
                    </Button>
                    <Button variant="ghost" size="icon-sm" className="text-white hover:bg-white/10 hover:text-white" onClick={next} title={t('parcels:photos.next')}>
                      <ChevronRight />
                    </Button>
                  </>
                )}
                {onDelete && (
                  <Button variant="ghost" size="sm" className="text-red-300 hover:bg-white/10 hover:text-red-200" onClick={() => onDelete(ph)}>
                    <Trash2 />
                    {t('common:actions.delete')}
                  </Button>
                )}
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
