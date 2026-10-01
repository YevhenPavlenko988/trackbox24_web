import JsBarcode from 'jsbarcode'
import { ArrowLeft, Printer } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router'
import { LinkButton } from '@/components/common/LinkButton'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import type { ParcelResponse } from '@/lib/api/types'
import { formatPhone } from '@/lib/format'
import { NotFoundPage } from '@/routes/ErrorPages'
import { useParcel } from './queries'

type LabelData = { code: string; seat?: number; total: number }

function labelsFor(p: ParcelResponse): LabelData[] {
  const total = p.seatsAmount ?? p.seats?.length ?? 1
  if (p.seats?.length) {
    return p.seats.filter((s) => s.barcode).map((s) => ({ code: s.barcode!, seat: s.seatNumber, total }))
  }
  return p.barcode ? [{ code: p.barcode, total }] : []
}

function Barcode({ value }: { value: string }) {
  const ref = useRef<SVGSVGElement>(null)
  useEffect(() => {
    if (ref.current) {
      JsBarcode(ref.current, value, { format: 'CODE128', displayValue: false, height: 60, width: 2, margin: 0 })
    }
  }, [value])
  return <svg ref={ref} className="max-w-full" />
}

export function LabelsPage() {
  const { id } = useParams()
  const { t } = useTranslation(['parcels', 'common'])
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
  const labels = labelsFor(p)

  return (
    <div className="p-6">
      <style>{`
        @media print {
          @page { margin: 6mm; }
          .no-print { display: none !important; }
          .label { page-break-after: always; border: none !important; margin: 0 !important; }
          .label:last-child { page-break-after: auto; }
        }
      `}</style>
      <div className="no-print mb-6 flex items-center gap-2">
        <LinkButton variant="outline" to={`/parcels/${p.id}`}>
          <ArrowLeft />
          {t('common:actions.back')}
        </LinkButton>
        <Button onClick={() => window.print()}>
          <Printer />
          {t('common:actions.print')}
        </Button>
      </div>
      <div className="flex flex-wrap gap-6">
        {labels.map((label) => (
          <div key={label.code} className="label flex w-[100mm] flex-col gap-2 rounded border p-4 text-black">
            <div className="flex items-baseline justify-between text-lg font-semibold">
              <span>TrackBox24</span>
              {label.seat != null && <span>{t('parcels:labels.seat', { n: label.seat, total: label.total })}</span>}
            </div>
            <Barcode value={label.code} />
            <div className="text-center font-mono text-xl tracking-widest">{label.code}</div>
            <div className="text-sm">
              <div className="font-semibold">{p.clientName ?? '—'}</div>
              <div>{formatPhone(p.clientPhone)}</div>
              {p.npTtn && (
                <div className="text-muted-foreground">
                  {t('parcels:fields.npTtnShort')} {p.npTtn}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
