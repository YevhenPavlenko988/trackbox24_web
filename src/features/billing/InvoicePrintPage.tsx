import { ArrowLeft, Printer, Send } from 'lucide-react'
import { type ReactNode, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router'
import { toast } from 'sonner'
import { LinkButton } from '@/components/common/LinkButton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { useCompany } from '@/features/companies/queries'
import { parseNumber } from '@/features/parcels/status'
import { NotFoundPage } from '@/routes/ErrorPages'
import { showApiError } from '@/lib/api/problem'
import type { InvoiceLineResponse } from '@/lib/api/types'
import { CURRENCY_SYMBOL, formatDate, formatPhone, MONEY_ORDER, type MoneyCurrency } from '@/lib/format'
import { formatEur, formatPeriod, invoiceNo, isoDate } from './format'
import { useInvoice, useInvoiceRate, useRequisites, useSendInvoice } from './queries'

const round2 = (v: number) => Math.round(v * 100) / 100
const rateText = (v: number) => v.toLocaleString('uk-UA', { maximumFractionDigits: 4 })
/** A document's sums always with the kopecks: «8 498,30 грн». */
const amount = (v: number, currency: MoneyCurrency) =>
  `${v.toLocaleString('uk-UA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${CURRENCY_SYMBOL[currency]}`

/**
 * The invoice a carrier gets, to print or save as PDF from the browser: our details and theirs, the month's lines with
 * the days billed, the total and what to write in the payment. Shown in euros or, at the official rate of the invoice
 * day (or one typed in), in hryvnias, dollars or zlotys.
 */
export function InvoicePrintPage() {
  const { id } = useParams()
  const invoiceId = Number(id)
  const { t } = useTranslation(['billing', 'common'])
  const invoice = useInvoice(invoiceId)
  const company = useCompany(invoice.data?.company?.id)
  const requisites = useRequisites().data
  const send = useSendInvoice()
  // the FOP's account is in hryvnias: that is what the carrier pays, at the bank's rate to the euro
  const [currency, setCurrency] = useState<MoneyCurrency>('UAH')
  const [typedRate, setTypedRate] = useState('')
  const [today] = useState(() => isoDate(new Date()))
  const i = invoice.data
  // the day the invoice went out; a draft is dated today
  const date = i ? (i.sentAt ? isoDate(new Date(i.sentAt)) : today) : undefined
  const bank = useInvoiceRate(invoiceId, currency, currency !== 'EUR')

  const bankRate = bank.data?.perEur
  const bankDate = bank.data?.at ? formatDate(bank.data.at) : formatDate(date)
  const bankName = bank.data?.source === 'PRIVATBANK' ? 'ПриватБанку' : 'Monobank'
  const rate = currency === 'EUR' ? 1 : (parseNumber(typedRate) ?? bankRate)
  const rateIsBank = currency !== 'EUR' && !typedRate && bankRate != null

  // the PDF saved from the browser is named after the page title
  useEffect(() => {
    if (!i) return
    const previous = document.title
    document.title = `Рахунок ${i.number ?? 'чернетка'} TrackBox24 ${formatPeriod(i.period)}`
    return () => {
      document.title = previous
    }
  }, [i])

  if (invoice.isPending) return <Skeleton className="m-6 h-96" />
  if (!i) return <NotFoundPage />
  const c = company.data
  const money = (eur?: number) => (rate == null || eur == null ? '—' : amount(round2(eur * rate), currency))
  const lines = i.lines ?? []
  const total = rate == null ? undefined : round2(lines.reduce((sum, l) => sum + round2((l.amountEur ?? 0) * rate), 0))
  const paid = i.status === 'PAID' ? i.amountEur : i.paidAmountEur
  const due = i.status === 'PAID' ? 0 : (i.remainingEur ?? i.amountEur)
  const missing = !requisites?.name || !requisites?.iban
  const purpose = t('billing:document.purposeText', { no: invoiceNo(i), date: formatDate(date), period: formatPeriod(i.period) })

  const markSent = async () => {
    try {
      const sent = await send.mutateAsync(i.id!)
      toast.success(t('billing:toasts.sent', { date: formatDate(sent.dueOn) }))
      invoice.refetch()
    } catch (e) {
      showApiError(e)
    }
  }

  return (
    <div className="min-h-screen bg-neutral-100 py-6 print:bg-white print:py-0">
      <style>{`
        @media print {
          @page { size: A4; margin: 14mm 14mm 12mm; }
          body { margin: 0; }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="no-print mx-auto mb-4 flex max-w-[210mm] flex-col gap-3 px-4">
        <div className="flex flex-wrap items-center gap-2">
          <LinkButton variant="outline" to={`/companies/${i.company?.id}?tab=billing`}>
            <ArrowLeft />
            {t('common:actions.back')}
          </LinkButton>
          <div className="flex items-center gap-1" role="radiogroup" aria-label={t('billing:document.currency')}>
            <span className="mr-1 text-sm text-muted-foreground">{t('billing:document.currency')}</span>
            {MONEY_ORDER.map((cur) => (
              <Button key={cur} size="sm" role="radio" aria-checked={cur === currency} variant={cur === currency ? 'default' : 'outline'} onClick={() => {
                  setCurrency(cur)
                  setTypedRate('')
                }}>
                {CURRENCY_SYMBOL[cur]}
              </Button>
            ))}
          </div>
          {currency !== 'EUR' && (
            <label className="flex items-center gap-1.5 text-sm text-muted-foreground">
              1 € =
              <Input
                id="invoice-rate"
                inputMode="decimal"
                className="h-8 w-28 text-right tabular-nums"
                placeholder={bankRate != null ? rateText(bankRate) : ''}
                value={typedRate}
                onChange={(e) => setTypedRate(e.target.value)}
              />
              {CURRENCY_SYMBOL[currency]}
            </label>
          )}
          <div className="ml-auto flex gap-2">
            {i.status === 'DRAFT' && (
              <Button variant="outline" disabled={send.isPending} onClick={markSent}>
                <Send />
                {t('billing:actions.send')}
              </Button>
            )}
            <Button disabled={rate == null} onClick={() => window.print()}>
              <Printer />
              {t('billing:document.print')}
            </Button>
          </div>
        </div>
        {currency !== 'EUR' && (
          <p className="text-sm text-muted-foreground">
            {bank.isError && !typedRate
              ? t('billing:document.rateFailed')
              : rateIsBank
                ? t('billing:document.rateBankHint', { bank: bankName, date: bankDate })
                : t('billing:document.rateOwnHint')}
          </p>
        )}
        {missing && (
          <Alert>
            <AlertDescription>{t('billing:document.noRequisites')}</AlertDescription>
          </Alert>
        )}
        {i.status === 'DRAFT' && <p className="text-sm text-muted-foreground">{t('billing:document.draftHint')}</p>}
      </div>

      <article className="mx-auto flex max-w-[210mm] flex-col gap-7 bg-white px-[14mm] py-[12mm] text-[10.5pt] leading-snug text-[#0d2049] shadow-sm print:max-w-none print:p-0 print:shadow-none">
        <header className="flex items-start justify-between gap-6 border-b-2 border-[#f28c1e] pb-5">
          <img src="/logo-full.png" alt="TrackBox24" className="h-16 w-auto" />
          <div className="text-right">
            <h1 className="text-[17pt] font-semibold">{i.number != null ? t('billing:document.title', { number: i.number }) : t('billing:document.draftTitle')}</h1>
            <p>{t('billing:document.from', { date: formatDate(date) })}</p>
            {i.dueOn && <p className="font-medium">{t('billing:document.dueOn', { date: formatDate(i.dueOn) })}</p>}
          </div>
        </header>

        <section className="grid grid-cols-2 gap-8">
          <Party title={t('billing:document.seller')}>
            <p className="font-semibold">{requisites?.name ?? '—'}</p>
            {requisites?.taxId && <p>{t('billing:document.taxId', { code: requisites.taxId })}</p>}
            {requisites?.address && <p>{requisites.address}</p>}
            {requisites?.iban && <p className="tabular-nums">IBAN {requisites.iban}</p>}
            {requisites?.bank && <p>{requisites.bank}</p>}
            {(requisites?.email || requisites?.phone) && <p>{[requisites.email, requisites.phone].filter(Boolean).join(', ')}</p>}
          </Party>
          <Party title={t('billing:document.buyer')}>
            <p className="font-semibold">{c?.name ?? i.company?.name}</p>
            {c?.edrpou && <p>{t('billing:document.taxId', { code: c.edrpou })}</p>}
            {c?.address && <p>{c.address}</p>}
            {(c?.email || c?.phone) && <p>{[c.email, c.phone ? formatPhone(c.phone) : undefined].filter(Boolean).join(', ')}</p>}
          </Party>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-[12pt] font-semibold first-letter:uppercase">{t('billing:document.services', { period: formatPeriod(i.period) })}</h2>
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-[#0d2049] text-left text-[9pt] text-neutral-600">
                <th className="w-8 py-1.5 font-medium">№</th>
                <th className="py-1.5 font-medium">{t('billing:fields.item')}</th>
                <th className="py-1.5 font-medium">{t('billing:fields.days')}</th>
                <th className="py-1.5 text-right font-medium">{t('billing:fields.monthlyPrice')}</th>
                <th className="py-1.5 text-right font-medium">{t('billing:fields.amount')}</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l, n) => (
                <tr key={n} className="border-b border-neutral-200 align-top">
                  <td className="py-2 tabular-nums text-neutral-500">{n + 1}</td>
                  <td className="py-2 pr-3">{lineName(l)}</td>
                  <td className="py-2 pr-3 whitespace-nowrap text-neutral-600">{lineDays(l)}</td>
                  <td className="py-2 text-right tabular-nums whitespace-nowrap">{money(l.monthlyPriceEur)}</td>
                  <td className="py-2 text-right tabular-nums whitespace-nowrap">{money(l.amountEur)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={4} className="pt-3 text-right">
                  {t('billing:fields.total')}
                </td>
                <td className="pt-3 text-right tabular-nums">{total == null ? '—' : amount(total, currency)}</td>
              </tr>
              {!!paid && i.status !== 'PAID' && (
                <tr>
                  <td colSpan={4} className="text-right text-neutral-600">
                    {t('billing:document.paid')}
                  </td>
                  <td className="text-right tabular-nums text-neutral-600">−{money(paid)}</td>
                </tr>
              )}
              <tr className="text-[13pt]">
                <td colSpan={4} className="pt-2 text-right font-semibold">
                  {i.status === 'PAID' ? t('billing:document.paidInFull') : t('billing:document.due')}
                </td>
                <td className="pt-2 text-right font-semibold tabular-nums whitespace-nowrap">
                  {paid && i.status !== 'PAID' ? money(due) : total == null ? '—' : amount(total, currency)}
                </td>
              </tr>
            </tfoot>
          </table>
          {currency !== 'EUR' && rate != null && (
            <p className="text-right text-[9pt] text-neutral-600">
              {t(rateIsBank ? 'billing:document.rateBank' : 'billing:document.rateOwn', { bank: bankName, rate: rateText(rate), cur: CURRENCY_SYMBOL[currency], date: bankDate })}
              {' · '}
              {t('billing:document.inEur', { amount: formatEur(i.amountEur) })}
            </p>
          )}
          <p className="text-[9pt] text-neutral-600">{t('billing:document.howBilled')}</p>
        </section>

        {i.status !== 'PAID' && (
          <section className="rounded-md border border-neutral-300 p-4">
            <p className="text-[9pt] text-neutral-600">{t('billing:document.purpose')}</p>
            <p className="font-medium">{purpose}</p>
          </section>
        )}

        <footer className="mt-auto flex flex-col gap-1 border-t border-neutral-200 pt-3 text-[9pt] text-neutral-600">
          {requisites?.notes && <p>{requisites.notes}</p>}
          <p>{t('billing:document.footer')}</p>
        </footer>
      </article>
    </div>
  )

  function lineName(l: InvoiceLineResponse) {
    return l.adjustmentFor ? t('billing:lines.adjustment', { item: l.label, period: formatPeriod(l.adjustmentFor) }) : l.label
  }

  function lineDays(l: InvoiceLineResponse) {
    return l.adjustmentFor
      ? t('billing:lines.adjustmentDays', { sign: (l.days ?? 0) > 0 ? '+' : '', days: l.days })
      : t('billing:lines.days', { days: l.days, total: l.daysInMonth })
  }
}

function Party({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <p className="mb-1 text-[9pt] text-neutral-600">{title}</p>
      {children}
    </div>
  )
}
