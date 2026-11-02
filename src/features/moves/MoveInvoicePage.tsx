import { ArrowLeft, FileSpreadsheet, Printer } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router'
import { LinkButton } from '@/components/common/LinkButton'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useCurrentCompany } from '@/features/companies/queries'
import { useParcel } from '@/features/parcels/queries'
import { NotFoundPage } from '@/routes/ErrorPages'
import { showApiError } from '@/lib/api/problem'
import { formatDate, formatMoney, formatPhone } from '@/lib/format'
import { downloadInvoiceXlsx, useMoveBill } from './billApi'

/**
 * The client's bill of a move, for printing (or saving as PDF from the browser): who, from where to where, the services
 * with their amounts, what was paid and what is left. Just the sums and the client's minimal details for now.
 */
export function MoveInvoicePage() {
  const { id } = useParams()
  const parcelId = Number(id)
  const { t } = useTranslation(['moves', 'common'])
  const parcel = useParcel(parcelId)
  const bill = useMoveBill(parcelId)
  const company = useCurrentCompany()

  if (parcel.isPending || bill.isPending) return <Skeleton className="m-6 h-96" />
  if (!parcel.data || !bill.data) return <NotFoundPage />
  const p = parcel.data
  const b = bill.data
  const money = (v?: number) => formatMoney(v, b.currency)
  const today = new Date()
  const number = `${p.barcode}-${today.toISOString().slice(0, 10).replaceAll('-', '')}`
  const route = [p.senderCity, p.deliveryCity].filter(Boolean).join(' → ')

  type Line = { name: string; qty?: string; price?: string; sum?: number }
  const lines: Line[] = []
  if ((b.transport ?? 0) > 0) lines.push({ name: t('moves:invoice.transportLine', { route }).trim(), qty: '1', price: money(b.transport), sum: b.transport })
  for (const w of b.works ?? []) {
    const hours = (w.loaders ?? []).reduce((s, l) => s + (l.hours ?? 0), 0)
    lines.push({
      // «× 3 год» only when everyone did the same hours; otherwise the total in «Кількість» says it
      name: (() => {
        const each = [...new Set((w.loaders ?? []).map((l) => l.hours ?? 0))]
        const base = t('moves:invoice.loadersCount', { kind: w.kindLabel, count: w.loaders?.length ?? 0 })
        return each.length === 1 ? `${base} × ${each[0]} год` : base
      })(),
      qty: `${hours} год`,
      price: money(w.clientRate),
      sum: w.clientAmount,
    })
  }
  for (const s of b.storages ?? []) {
    lines.push({
      name: t('moves:invoice.storageLine', { where: s.warehouseName ? ` (${s.warehouseName})` : '', days: s.days }),
      qty: `${s.days} дн`,
      price: money(s.rate),
      sum: s.amount,
    })
  }

  return (
    <div className="mx-auto max-w-3xl p-6 text-black">
      <style>{`
        @media print {
          @page { margin: 14mm; }
          body { margin: 0; }
          .no-print { display: none !important; }
        }
      `}</style>
      <div className="no-print mb-6 flex flex-wrap gap-2">
        <LinkButton variant="outline" to={`/moves/${parcelId}`}>
          <ArrowLeft />
          {t('common:actions.back')}
        </LinkButton>
        <Button onClick={() => window.print()}>
          <Printer />
          {t('moves:invoice.print')}
        </Button>
        <Button variant="outline" onClick={() => downloadInvoiceXlsx(parcelId, `Рахунок-${p.barcode}.xlsx`).catch(showApiError)}>
          <FileSpreadsheet />
          {t('moves:invoice.xlsx')}
        </Button>
      </div>

      <div className="flex flex-col gap-6 bg-white">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{t('moves:invoice.number', { number, date: formatDate(today.toISOString()) })}</h1>
            {route && <p className="mt-1 text-neutral-600">{route}</p>}
          </div>
          <div className="text-right text-sm">
            <div className="text-neutral-500">{t('moves:invoice.carrier')}</div>
            <div className="font-semibold">{company.data?.name}</div>
            {company.data?.phone && <div>{formatPhone(company.data.phone)}</div>}
            {company.data?.email && <div>{company.data.email}</div>}
          </div>
        </div>

        <div className="text-sm">
          <div className="text-neutral-500">{t('moves:invoice.client')}</div>
          <div className="font-semibold">{p.clientName ?? '—'}</div>
          {p.clientPhone && <div>{formatPhone(p.clientPhone)}</div>}
          {(p.clientCity || p.clientAddress) && <div>{[p.clientCity, p.clientAddress].filter(Boolean).join(', ')}</div>}
        </div>

        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b-2 border-black text-left">
              <th className="py-2">{t('moves:invoice.service')}</th>
              <th className="py-2 text-right">{t('moves:invoice.qty')}</th>
              <th className="py-2 text-right">{t('moves:invoice.price')}</th>
              <th className="py-2 text-right">{t('moves:invoice.sum')}</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l, i) => (
              <tr key={i} className="border-b border-neutral-300">
                <td className="py-2 pr-2">{l.name}</td>
                <td className="py-2 text-right tabular-nums">{l.qty}</td>
                <td className="py-2 text-right tabular-nums">{l.price}</td>
                <td className="py-2 text-right tabular-nums">{money(l.sum)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={3} className="pt-3 text-right font-semibold">
                {t('moves:bill.total')}
              </td>
              <td className="pt-3 text-right font-semibold tabular-nums">{money(b.total)}</td>
            </tr>
            {(b.payments ?? []).map((pm, i) => (
              <tr key={pm.id ?? `own-${i}`} className="text-neutral-600">
                <td colSpan={3} className="text-right">
                  {t('moves:bill.paidTotal')} {formatDate(pm.paidOn)}
                  {pm.note ? ` (${pm.note})` : ''}
                </td>
                <td className="text-right tabular-nums">−{money(pm.amount)}</td>
              </tr>
            ))}
            <tr className="text-lg">
              <td colSpan={3} className="pt-2 text-right font-bold">
                {t('moves:bill.due')}
              </td>
              <td className="pt-2 text-right font-bold tabular-nums">{money(b.due)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
