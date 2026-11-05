import { useQuery } from '@tanstack/react-query'
import { ExternalLink, Loader2, Search, Send, Truck } from 'lucide-react'
import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import { NpNumber } from '@/components/common/NpNumber'
import { PARCEL_STATUS_STYLES } from '@/features/parcels/statusStyles'
import { isApiError } from '@/lib/api/problem'
import type { PublicTrackingResponse } from '@/lib/api/types'
import { formatDate, formatDateTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import { telegramWebUrl } from './telegram'
import { PaymentReturn, PayOnline } from './PayOnline'
import { PointsCheck } from './PointsCheck'
import { normalizeTrackingCode, npTrackingUrl, TRACKING_CODE, trackParcel } from './api'

/**
 * Public parcel lookup for senders and recipients, no sign-in: /track with a search field, /track/{code} opens
 * straight on the result (the link a manager or driver shares). Only status transitions with dates — no people,
 * addresses or sums; the backend answers 404 for unknown codes and companies without the option.
 */
export function TrackingPage() {
  const { t } = useTranslation('tracking')
  const { code: rawCode } = useParams()
  const navigate = useNavigate()
  // back from the provider's payment page
  const paymentToken = useSearchParams()[0].get('payment')
  const code = rawCode ? normalizeTrackingCode(rawCode) : undefined
  const valid = code != null && TRACKING_CODE.test(code)
  const [input, setInput] = useState(code ?? '')
  // Back/forward or a pasted link changes the code; the field follows it.
  const [shownCode, setShownCode] = useState(code)
  if (shownCode !== code) {
    setShownCode(code)
    setInput(code ?? '')
  }

  useEffect(() => {
    const previous = document.title
    document.title = `${t('pageTitle')} — TrackBox24`
    return () => {
      document.title = previous
    }
  }, [t])

  const query = useQuery({
    queryKey: ['public-tracking', code],
    queryFn: () => trackParcel(code!),
    enabled: valid,
    // A miss counts against the visitor's attempts on the backend, so never repeat a request on our own.
    retry: false,
    refetchOnWindowFocus: false,
  })

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    const next = normalizeTrackingCode(input)
    if (!next) return
    if (next === code) void query.refetch()
    else navigate(`/track/${encodeURIComponent(next)}`)
  }

  // An obviously wrong code is answered here: no request, no attempt spent.
  const error = code && !valid ? t('invalid') : query.error ? errorText(query.error, t('failed')) : undefined

  return (
    <div className="min-h-screen bg-sand/40 text-navy">
      <header className="border-b border-navy/10 bg-white">
        <div className="mx-auto flex h-16 w-full max-w-2xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2.5 text-lg font-bold">
            <img src="/logo.png" alt="" className="size-8 object-contain" />
            <span>
              Trackbox<span className="text-brand">24</span>
            </span>
          </Link>
          <Link to="/login" className="text-sm font-semibold hover:text-brand">
            {t('login')}
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6 sm:py-14">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{t('pageTitle')}</h1>
        <p className="mt-2 text-navy/70">{t('lead')}</p>

        <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-2 sm:flex-row" role="search">
          <label htmlFor="tracking-code" className="sr-only">
            {t('codeLabel')}
          </label>
          <input
            id="tracking-code"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t('codePlaceholder')}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            autoFocus={!code}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? 'tracking-error' : undefined}
            className="h-12 w-full min-w-0 rounded-xl sm:flex-1 border border-navy/20 bg-white px-4 font-mono text-base outline-none focus:border-brand focus:ring-2 focus:ring-brand/30"
          />
          <button
            type="submit"
            disabled={query.isFetching}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-brand px-6 text-base font-semibold text-white transition-colors hover:bg-brand/90 disabled:opacity-60"
          >
            {query.isFetching ? <Loader2 className="size-5 animate-spin" /> : <Search className="size-5" />}
            {t('find')}
          </button>
        </form>

        {error && (
          <p id="tracking-error" role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-800">
            {error}
          </p>
        )}

        {query.isLoading && (
          <div className="mt-8 space-y-3" aria-busy="true">
            <div className="h-28 animate-pulse rounded-2xl bg-navy/5" />
            <div className="h-40 animate-pulse rounded-2xl bg-navy/5" />
          </div>
        )}

        {paymentToken && (
          <div className="mt-6">
            <PaymentReturn token={paymentToken} />
          </div>
        )}

        {query.data && !error && <Result data={query.data} />}
      </main>
    </div>
  )
}

/** The backend's 404 and 429 carry text written for the visitor (the 429 says when to try again); anything else is ours. */
function errorText(e: unknown, fallback: string): string {
  if (isApiError(e) && (e.status === 404 || e.status === 429) && e.detail) return e.detail
  return fallback
}

function Result({ data }: { data: PublicTrackingResponse }) {
  const { t } = useTranslation('tracking')
  const history = [...(data.history ?? [])].reverse()
  const items = data.items ?? []
  return (
    <div className="mt-8 space-y-4">
      <section className="rounded-2xl border border-navy/10 bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-3">
          <span className={cn('rounded-full px-3 py-1 text-base font-semibold', data.status && PARCEL_STATUS_STYLES[data.status])}>
            {data.statusLabel}
          </span>
          {data.statusChangedAt && <span className="text-sm text-navy/60">{t('since', { date: formatDateTime(data.statusChangedAt) })}</span>}
        </div>
        {/* a route's cargo: where it is now and where it goes next */}
        {data.routeNote && (
          <p className="mt-3 flex items-center gap-2 font-medium">
            <Truck className="size-5 shrink-0 text-brand" />
            {data.routeNote}
          </p>
        )}

        <dl className="mt-5 grid gap-x-6 gap-y-3 sm:grid-cols-2">
          {data.barcode && <Item label={t('barcode')} value={<span className="font-mono">{data.barcode}</span>} />}
          {data.npTtn && <Item label={t('npTtn')} value={<NpNumber value={data.npTtn} grouped />} />}
          {data.carrier && <Item label={t('carrier')} value={data.carrier} />}
          {data.npStatus && <Item label={t('npStatus')} value={data.npStatus} />}
          {data.expectedDeliveryOn ? (
            <Item
              label={t('expectedDelivery')}
              value={
                <span className="flex flex-col">
                  <span>{formatDate(data.expectedDeliveryOn)}</span>
                  {data.expectedDeliverySource && <span className="text-sm font-normal text-navy/55">{t(`estimateSource.${data.expectedDeliverySource}`)}</span>}
                </span>
              }
            />
          ) : (
            data.expectedArrivalAt && <Item label={t('expectedArrival')} value={formatDateTime(data.expectedArrivalAt)} />
          )}
          {data.outgoingWaybill && (
            <Item
              label={t('outgoingWaybill')}
              value={
                <span className="flex flex-col gap-1">
                  <NpNumber value={data.outgoingWaybill} grouped />
                  <a
                    href={npTrackingUrl(data.outgoingWaybill)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm font-semibold text-brand hover:underline"
                  >
                    {t('npTrack')}
                    <ExternalLink className="size-3.5" />
                  </a>
                </span>
              }
            />
          )}
        </dl>

        {data.telegramUrl && (
          // one row: the app button, and beside it a quiet link for those with Telegram Web only (t.me hands over to the
          // app; without it — a tablet with Telegram Web — the browser says the address is invalid)
          <div className="mt-5 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:gap-5">
            <a
              href={data.telegramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 rounded-xl bg-[#2AABEE] px-5 py-3 font-semibold text-white transition-colors hover:bg-[#229ED9]"
            >
              <Send className="size-5" />
              {t('telegram')}
            </a>
            {telegramWebUrl(data.telegramUrl) && (
              <a
                href={telegramWebUrl(data.telegramUrl)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-center text-sm font-medium text-[#1F8BC2] underline underline-offset-4 hover:text-[#16729F] sm:text-left"
              >
                {t('telegramWeb')}
              </a>
            )}
          </div>
        )}
        {data.telegramUrl && <p className="mt-2 text-sm text-navy/55">{t('telegramHint')}</p>}
        {/* «Реферальна програма»: the recipient or the sender sees their points after typing their phone */}
        {data.pointsAvailable && (data.barcode ?? data.npTtn) && <PointsCheck code={(data.barcode ?? data.npTtn)!} />}
        {/* «Онлайн-оплата»: the client's phone opens what is due, by card through the carrier's provider or by transfer */}
        {data.paymentAvailable && (data.barcode ?? data.npTtn) && <PayOnline code={(data.barcode ?? data.npTtn)!} />}
      </section>

      {items.length > 0 && (
        // a move: where each item is, so the client does not have to ask about the sofa
        <section className="rounded-2xl border border-navy/10 bg-white p-5 sm:p-6">
          <h2 className="text-lg font-bold">{t('items', { count: items.length })}</h2>
          <p className="mt-1 text-sm text-navy/55">
            {itemSummary(items)}
          </p>
          <ul className="mt-4 divide-y divide-navy/10">
            {items.map((it) => (
              <li key={it.number} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5">
                <span className="w-16 shrink-0 font-mono text-sm text-navy/55">
                  {it.number} / {items.length}
                </span>
                <span className="min-w-0 flex-1 basis-28 break-words">{it.description || t('itemNoDescription')}</span>
                <span className={cn('shrink-0 rounded-full px-2.5 py-0.5 text-sm font-semibold', it.status && PARCEL_STATUS_STYLES[it.status])}>{it.label}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {history.length > 0 && (
        <section className="rounded-2xl border border-navy/10 bg-white p-5 sm:p-6">
          <h2 className="text-lg font-bold">{t('history')}</h2>
          <ol className="mt-4">
            {history.map((step, i) => (
              <li key={`${step.at}-${step.status}`} className="relative flex gap-4 pb-5 last:pb-0">
                {i < history.length - 1 && <span aria-hidden className="absolute top-4 bottom-0 left-[5px] w-px bg-navy/15" />}
                <span aria-hidden className={cn('relative mt-1.5 size-[11px] shrink-0 rounded-full', i === 0 ? 'bg-brand ring-4 ring-brand/20' : 'bg-navy/25')} />
                <div className="min-w-0">
                  <div className={cn('font-semibold', i > 0 && 'text-navy/75')}>{step.label}</div>
                  <div className="text-sm text-navy/55">{formatDateTime(step.at)}</div>
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  )
}

function Item({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-sm text-navy/55">{label}</dt>
      <dd className="mt-0.5 font-medium break-words">{value}</dd>
    </div>
  )
}

/** «В дорозі: 7 · На складі: 2 · Видано: 1», in the order the statuses first appear. */
function itemSummary(items: { label?: string }[]): string {
  const counts = new Map<string, number>()
  for (const it of items) counts.set(it.label ?? '', (counts.get(it.label ?? '') ?? 0) + 1)
  return [...counts].map(([label, n]) => `${label}: ${n}`).join(' · ')
}
