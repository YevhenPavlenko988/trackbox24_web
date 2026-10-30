import JsBarcode from 'jsbarcode'
import { ArrowLeft, Printer } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams, useSearchParams } from 'react-router'
import { LinkButton } from '@/components/common/LinkButton'
import { NpNumber } from '@/components/common/NpNumber'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import type { ParcelResponse } from '@/lib/api/types'
import { formatPhone, formatWeight } from '@/lib/format'
import { NotFoundPage } from '@/routes/ErrorPages'
import { destinationLine, labelsFor, parseSeatList, type LabelData } from './labelText'
import { useParcel } from './queries'

/** `a4` — the 100 mm labels for an office printer; `70x40` — the tape of a NIIMBOT B3S the driver carries. */
type Size = 'a4' | '70x40'

function Barcode({ value, height, className }: { value: string; height?: string; className?: string }) {
  const ref = useRef<SVGSVGElement>(null)
  useEffect(() => {
    const svg = ref.current
    if (!svg) return
    JsBarcode(svg, value, { format: 'CODE128', displayValue: false, height: 60, width: 2, margin: 0 })
    // JsBarcode draws in pixels while the labels are laid out in millimetres, so the drawing is stretched to fit.
    // Stretching keeps the bar ratios, which is all a scanner reads.
    if (height) {
      if (!svg.getAttribute('viewBox')) svg.setAttribute('viewBox', `0 0 ${svg.getAttribute('width')} ${svg.getAttribute('height')}`)
      svg.setAttribute('preserveAspectRatio', 'none')
    }
  }, [value, height])
  return <svg ref={ref} className={className ?? 'max-w-full'} style={height ? { height, width: '100%' } : undefined} />
}

/** The office label: our barcode big, the client, and both Nova Poshta numbers the parcel may carry. */
function OfficeLabel({ p, label }: { p: ParcelResponse; label: LabelData }) {
  const { t } = useTranslation('parcels')
  const waybill = p.npShipment?.waybillNumber
  return (
    <div className="label flex w-[100mm] flex-col gap-2 rounded border p-4 text-black">
      <div className="flex items-baseline justify-between text-lg font-semibold">
        <span>TrackBox24</span>
        {label.seat != null && <span>{t('labels.seat', { n: label.seat, total: label.total })}</span>}
      </div>
      <Barcode value={label.code} />
      <div className="text-center font-mono text-xl tracking-widest">{label.code}</div>
      <div className="text-sm">
        <div className="font-semibold">{p.clientName ?? '—'}</div>
        <div>{formatPhone(p.clientPhone)}</div>
        {p.npTtn && (
          <div className="text-muted-foreground">
            {t('fields.npTtnShort')} <NpNumber value={p.npTtn} grouped />
          </div>
        )}
      </div>
      {waybill && (
        <>
          <Barcode value={waybill} />
          <div className="text-center text-sm font-semibold">
            {t('labels.npWaybill')} <NpNumber value={waybill} grouped />
          </div>
          {destinationLine(p) && <div className="text-sm">{destinationLine(p)}</div>}
        </>
      )}
    </div>
  )
}

/** A move's item on A4/100 mm: its number out of all big, what it is, where it goes. */
function MoveOfficeLabel({ p, label }: { p: ParcelResponse; label: LabelData }) {
  return (
    <div className="label flex w-[100mm] flex-col gap-2 rounded border p-4 text-black">
      <div className="flex items-baseline justify-between">
        <span className="text-lg font-semibold">TrackBox24</span>
        <span className="text-3xl font-bold tabular-nums">
          {label.seat} / {label.total}
        </span>
      </div>
      <div className="line-clamp-2 min-h-[3.5rem] text-2xl leading-tight font-bold">{label.description ?? '—'}</div>
      <Barcode value={label.code} />
      <div className="text-center font-mono text-xl tracking-widest">{label.code}</div>
      <div className="text-sm">
        <div className="font-semibold">{p.clientName ?? '—'}</div>
        <div>{[p.deliveryCity, p.clientAddress].filter(Boolean).join(', ') || '—'}</div>
      </div>
    </div>
  )
}

/** A move's item on the 70×40 tape: the number and the description on top, the short code below. */
function MoveTapeLabel({ p, label }: { p: ParcelResponse; label: LabelData }) {
  return (
    <div className="label label-70x40 flex flex-col justify-between overflow-hidden bg-white text-black" style={{ width: '70mm', height: '40mm', padding: '2mm 2.5mm' }}>
      <div className="flex items-baseline justify-between leading-none" style={{ gap: '2mm' }}>
        <span className="font-bold tabular-nums" style={{ fontSize: '6mm' }}>
          {label.seat}/{label.total}
        </span>
        <span className="truncate" style={{ fontSize: '2.9mm' }}>
          {p.deliveryCity ?? p.clientName ?? ''}
        </span>
      </div>
      <div className="line-clamp-2 leading-tight font-semibold" style={{ fontSize: '3.6mm' }}>
        {label.description ?? '—'}
      </div>
      <div className="flex items-center" style={{ gap: '2mm', height: '13mm' }}>
        <Barcode value={label.code} height="13mm" className="min-w-0 flex-1" />
        <div className="shrink-0 font-mono font-semibold" style={{ fontSize: '3.2mm' }}>
          {label.code}
        </div>
      </div>
    </div>
  )
}

/**
 * The 70×40 mm tape label (NIIMBOT B3S): Nova Poshta's own 100×100 sticker does not fit the tape, so the label
 * is drawn from the parcel — our barcode plus the outgoing waybill once it exists, both scannable.
 */
function TapeLabel({ p, label }: { p: ParcelResponse; label: LabelData }) {
  const { t } = useTranslation('parcels')
  const waybill = p.npShipment?.waybillNumber
  const meta = [label.seat != null ? `${label.seat}/${label.total}` : undefined, p.weightKg ? formatWeight(p.weightKg) : undefined].filter(Boolean).join(' · ')
  const codeHeight = waybill ? '11mm' : '19mm'
  return (
    <div className="label label-70x40 flex flex-col justify-between overflow-hidden bg-white text-black" style={{ width: '70mm', height: '40mm', padding: '2mm 2.5mm' }}>
      {waybill && (
        <div className="flex items-center" style={{ gap: '2mm', height: '11mm' }}>
          <Barcode value={waybill} height="11mm" className="min-w-0 flex-1" />
          <div className="shrink-0 text-right leading-tight font-semibold" style={{ fontSize: '2.9mm' }}>
            <div>{t('labels.npWaybillShort')}</div>
            <NpNumber value={waybill} grouped />
          </div>
        </div>
      )}
      <div className="flex items-baseline justify-between leading-tight" style={{ fontSize: '2.9mm', gap: '2mm' }}>
        <span className="truncate">{destinationLine(p) ?? '—'}</span>
        <span className="shrink-0 font-semibold">{meta}</span>
      </div>
      <div className="flex items-center" style={{ gap: '2mm', height: codeHeight }}>
        <Barcode value={label.code} height={codeHeight} className="min-w-0 flex-1" />
        <div className="shrink-0 font-mono font-semibold" style={{ fontSize: '3mm' }}>
          {label.code}
        </div>
      </div>
    </div>
  )
}

export function LabelsPage() {
  const { id } = useParams()
  const { t } = useTranslation(['parcels', 'common'])
  const [params, setParams] = useSearchParams()
  const size: Size = params.get('size') === '70x40' ? '70x40' : 'a4'
  const query = useParcel(Number(id))
  const printed = useRef(false)

  useEffect(() => {
    if (query.data && !printed.current) {
      printed.current = true
      const timer = setTimeout(() => window.print(), 400)
      return () => clearTimeout(timer)
    }
  }, [query.data])

  if (query.isPending) return <Skeleton className="m-6 h-40" />
  if (query.isError || !query.data) return <NotFoundPage />
  const p = query.data
  const move = p.kind === 'MOVE'
  const labels = labelsFor(p, parseSeatList(params.get('seats')))
  const setSize = (s: Size) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (s === 'a4') next.delete('size')
        else next.set('size', s)
        return next
      },
      { replace: true },
    )

  return (
    <div className="p-6">
      <style>{`
        @media print {
          @page { ${size === '70x40' ? 'size: 70mm 40mm; margin: 0;' : 'margin: 6mm;'} }
          body { margin: 0; }
          .no-print { display: none !important; }
          .label { page-break-after: always; border: none !important; margin: 0 !important; box-shadow: none !important; }
          .label:last-child { page-break-after: auto; }
        }
      `}</style>
      <div className="no-print mb-6 flex flex-wrap items-center gap-2">
        <LinkButton variant="outline" to={`/${move ? 'moves' : 'parcels'}/${p.id}`}>
          <ArrowLeft />
          {t('common:actions.back')}
        </LinkButton>
        <Button onClick={() => window.print()}>
          <Printer />
          {t('common:actions.print')}
        </Button>
        <div className="ml-auto flex gap-1 rounded-md border p-1" role="radiogroup" aria-label={t('parcels:labels.format70x40')}>
          <Button size="sm" variant={size === 'a4' ? 'default' : 'ghost'} role="radio" aria-checked={size === 'a4'} onClick={() => setSize('a4')}>
            {t('parcels:labels.formatA4')}
          </Button>
          <Button size="sm" variant={size === '70x40' ? 'default' : 'ghost'} role="radio" aria-checked={size === '70x40'} onClick={() => setSize('70x40')}>
            {t('parcels:labels.format70x40')}
          </Button>
        </div>
      </div>
      {size === '70x40' && !move && <p className="no-print mb-4 max-w-2xl text-sm text-muted-foreground">{t('parcels:labels.format70x40Hint')}</p>}
      <div className="flex flex-wrap gap-6">
        {labels.map((label) =>
          size === '70x40' ? (
            <div key={label.code} className="rounded border shadow-sm">
              {move ? <MoveTapeLabel p={p} label={label} /> : <TapeLabel p={p} label={label} />}
            </div>
          ) : move ? (
            <MoveOfficeLabel key={label.code} p={p} label={label} />
          ) : (
            <OfficeLabel key={label.code} p={p} label={label} />
          ),
        )}
      </div>
    </div>
  )
}
