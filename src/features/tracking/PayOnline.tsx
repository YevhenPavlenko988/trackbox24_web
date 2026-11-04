import { useQuery } from '@tanstack/react-query'
import { Check, Copy, CreditCard, ExternalLink, Landmark, Loader2, Wallet } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { api } from '@/lib/api/client'
import { isApiError, unwrap } from '@/lib/api/problem'
import type { Currency, PublicCheckoutResponse, PublicPaymentResponse, PublicPaymentStatusResponse } from '@/lib/api/types'
import { nbuQrUrl } from '@/features/payments/nbuQr'
import { CURRENCY_SYMBOL, formatDateTime, formatMoney } from '@/lib/format'
import { cn } from '@/lib/utils'

/**
 * «Оплатити» on the tracking page. The client's phone (the one the carrier has) opens what is due and how: by card
 * through the carrier's own acquiring — off to the provider's page and back — or by transfer to the carrier's account
 * or card, with the NBU QR for a banking app and «Я оплатив» afterwards. The money never passes TrackBox24.
 */
export function PayOnline({ code }: { code: string }) {
  const { t } = useTranslation('tracking')
  const [open, setOpen] = useState(false)
  const [phone, setPhone] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()
  const [result, setResult] = useState<PublicPaymentResponse>()
  // a move may be paid in part — a prepayment; empty means the whole balance
  const [part, setPart] = useState('')
  // for the fiscal receipt the carrier's provider may send
  const [email, setEmail] = useState('')

  const due = result?.amount ?? 0
  const typed = part.trim() === '' ? undefined : Number(part.replace(',', '.'))
  const partValid = typed == null || (Number.isFinite(typed) && typed > 0 && typed <= due)
  const partAmount = result?.kind === 'MOVE' && typed != null && partValid && typed !== due ? Math.round(typed * 100) / 100 : undefined
  // what the chosen part makes of each sum shown for the whole balance
  const scale = (v?: number) => (v == null || partAmount == null || due <= 0 ? v : Math.round(((v * partAmount) / due) * 100) / 100)

  const call = async <T,>(fn: () => Promise<T>) => {
    setBusy(true)
    setError(undefined)
    try {
      return await fn()
    } catch (e) {
      setError(isApiError(e) ? (e.detail ?? e.title) : t('pay.error'))
      return undefined
    } finally {
      setBusy(false)
    }
  }

  const load = () =>
    call(async () =>
      setResult(await unwrap<PublicPaymentResponse>(api.POST('/api/public/tracking/{code}/payment', { params: { path: { code } }, body: { phone } }))),
    )

  const checkout = (currency?: Currency) =>
    call(async () => {
      const r = await unwrap<PublicCheckoutResponse>(
        api.POST('/api/public/tracking/{code}/payment/checkout', { params: { path: { code } }, body: { phone, currency, amount: partAmount, email: email.trim() || undefined } }),
      )
      if (r.url) window.location.assign(r.url)
    })

  const claim = () =>
    call(async () =>
      setResult(await unwrap<PublicPaymentResponse>(api.POST('/api/public/tracking/{code}/payment/claim', { params: { path: { code } }, body: { phone, amount: partAmount } }))),
    )

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-5 py-3 font-semibold text-white transition-colors hover:bg-brand/90 sm:w-auto"
      >
        <Wallet className="size-5" />
        {t('pay.open')}
      </button>
    )
  }

  if (!result) {
    return (
      <form
        className="mt-5 flex flex-col gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          void load()
        }}
      >
        <label htmlFor="pay-phone" className="text-sm font-medium">
          {t('pay.phoneLabel')}
        </label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            id="pay-phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="+380 50 123 45 67"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="h-11 flex-1 rounded-xl border border-navy/15 bg-white px-3 outline-none focus-visible:ring-2 focus-visible:ring-brand"
          />
          <button type="submit" disabled={busy || phone.trim().length < 9} className="h-11 rounded-xl bg-navy px-5 font-semibold text-white disabled:opacity-50">
            {t('pay.show')}
          </button>
        </div>
        <p className="text-sm text-navy/55">{t('pay.hint')}</p>
        {error && <p className="text-sm font-medium text-red-700">{error}</p>}
      </form>
    )
  }

  if (result.state === 'PAID' || result.state === 'NONE' || result.state === 'CLAIMED') {
    return (
      <p className={cn('mt-5 flex items-start gap-3 rounded-xl p-4', result.state === 'PAID' ? 'bg-emerald-50 text-emerald-900' : 'bg-navy/5')} role="status">
        {result.state === 'PAID' && <Check className="mt-0.5 size-5 shrink-0" />}
        {result.state === 'PAID' ? t('pay.paid') : result.state === 'NONE' ? t('pay.none') : t('pay.claimed', { date: formatDateTime(result.claimedAt) })}
      </p>
    )
  }

  const r = result.requisites
  const uah = scale(r?.amountUah)
  // a part paid: the QR carries that sum (the backend's carries the whole balance)
  const qr = r?.qrUrl && r.iban && r.recipientName && r.taxId && partAmount != null ? nbuQrUrl(r.recipientName, r.iban, uah, r.taxId, r.purpose ?? '') : r?.qrUrl
  const options = result.card?.options ?? []
  return (
    <div className="mt-5 flex flex-col gap-4">
      <p className="text-lg">
        {t('pay.due')}: <span className="text-2xl font-bold tabular-nums">{formatMoney(result.amount, result.currency)}</span>
      </p>
      {result.kind === 'MOVE' && (
        <div className="flex flex-col gap-1">
          <label htmlFor="pay-part" className="text-sm font-medium">
            {t('pay.partLabel')}
          </label>
          <div className="flex items-center gap-2">
            <input
              id="pay-part"
              inputMode="decimal"
              placeholder={String(due)}
              value={part}
              onChange={(e) => setPart(e.target.value)}
              aria-invalid={!partValid || undefined}
              className={cn(
                'h-11 w-40 rounded-xl border bg-white px-3 tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-brand',
                partValid ? 'border-navy/15' : 'border-red-400',
              )}
            />
            <span className="text-navy/60">{result.currency && CURRENCY_SYMBOL[result.currency]}</span>
          </div>
          <p className={cn('text-sm', partValid ? 'text-navy/55' : 'font-medium text-red-700')}>
            {partValid ? t('pay.partHint') : t('pay.partInvalid', { max: formatMoney(due, result.currency) })}
          </p>
        </div>
      )}

      {result.card && options.length > 0 && (
        <section className="flex flex-col gap-3 rounded-xl border border-navy/10 p-4">
          <h3 className="flex items-center gap-2 font-semibold">
            <CreditCard className="size-5 text-brand" />
            {t('pay.byCard')}
          </h3>
          <p className="text-sm text-navy/60">{t('pay.byCardHint', { provider: result.card.provider })}</p>
          <label htmlFor="pay-email" className="text-sm font-medium">
            {t('pay.email')}
          </label>
          <input
            id="pay-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="name@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="-mt-2 h-11 rounded-xl border border-navy/15 bg-white px-3 outline-none focus-visible:ring-2 focus-visible:ring-brand sm:max-w-xs"
          />
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            {options.map((o, i) => (
              <button
                key={o.currency}
                type="button"
                disabled={busy || !partValid}
                onClick={() => void checkout(o.currency)}
                className={cn(
                  'flex h-12 items-center justify-center gap-2 rounded-xl px-5 font-semibold transition-colors disabled:opacity-60',
                  i === 0 ? 'bg-brand text-white hover:bg-brand/90' : 'border border-navy/15 bg-white hover:bg-navy/5',
                )}
              >
                {busy && i === 0 && <Loader2 className="size-4 animate-spin" />}
                {t('pay.payIn', { amount: formatMoney(scale(o.amount), o.currency) })}
              </button>
            ))}
          </div>
        </section>
      )}

      {r && (
        <section className="flex flex-col gap-3 rounded-xl border border-navy/10 p-4">
          <h3 className="flex items-center gap-2 font-semibold">
            <Landmark className="size-5 text-brand" />
            {t('pay.byTransfer')}
          </h3>
          {qr && (
            <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start">
              <QRCodeSVG value={qr} size={168} marginSize={2} className="shrink-0 rounded-lg bg-white" title="QR НБУ" />
              <div className="flex flex-col gap-2 text-sm text-navy/70">
                <p>{t('pay.scanQr')}</p>
                {/* on a phone the link itself opens the banking app */}
                <a href={qr} className="inline-flex items-center gap-1 font-semibold text-brand hover:underline">
                  {t('pay.openBank')}
                  <ExternalLink className="size-3.5" />
                </a>
              </div>
            </div>
          )}
          <dl className="grid gap-x-4 gap-y-2 text-sm sm:grid-cols-[auto_1fr]">
            {r.recipientName && <Row label={t('pay.recipient')} value={r.recipientName} />}
            {r.iban && <Row label={t('pay.iban')} value={r.iban} mono copy />}
            {r.taxId && <Row label={t('pay.taxId')} value={r.taxId} mono copy />}
            {r.bankName && <Row label={t('pay.bank')} value={r.bankName} />}
            {r.cardNumber && <Row label={t('pay.card')} value={r.cardNumber.replace(/(\d{4})(?=\d)/g, '$1 ')} mono copy />}
            <Row
              label={t('pay.amount')}
              value={uah != null ? formatMoney(uah, 'UAH') : formatMoney(partAmount ?? result.amount, result.currency)}
              copy={uah != null ? String(uah) : undefined}
            />
            {r.purpose && <Row label={t('pay.purpose')} value={r.purpose} copy />}
          </dl>
          {r.amountUah == null && <p className="text-sm text-navy/55">{t('pay.noRate')}</p>}
          {r.cardLink && (
            <a
              href={r.cardLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 self-start rounded-xl border border-navy/15 px-4 py-2 font-semibold hover:bg-navy/5"
            >
              {t('pay.cardLink')}
              <ExternalLink className="size-4" />
            </a>
          )}
          <div className="flex flex-col gap-1 border-t border-navy/10 pt-3">
            <button
              type="button"
              disabled={busy || !partValid}
              onClick={() => void claim()}
              className="h-11 self-stretch rounded-xl bg-navy px-5 font-semibold text-white disabled:opacity-50 sm:self-start"
            >
              {t('pay.claim')}
            </button>
            <p className="text-sm text-navy/55">{t('pay.claimHint')}</p>
          </div>
        </section>
      )}
      {error && <p className="text-sm font-medium text-red-700">{error}</p>}
    </div>
  )
}

function Row({ label, value, mono, copy }: { label: string; value: string; mono?: boolean; copy?: boolean | string }) {
  const { t } = useTranslation('tracking')
  const [done, setDone] = useState(false)
  const text = typeof copy === 'string' ? copy : value.replace(/\s/g, mono ? '' : ' ')
  return (
    <>
      <dt className="text-navy/55">{label}</dt>
      <dd className="flex min-w-0 items-center gap-2">
        <span className={cn('min-w-0 break-all', mono && 'font-mono')}>{value}</span>
        {copy && (
          <button
            type="button"
            className="shrink-0 rounded-md p-1 text-navy/50 hover:bg-navy/5 hover:text-navy"
            aria-label={done ? t('pay.copied') : t('pay.copy')}
            title={done ? t('pay.copied') : t('pay.copy')}
            onClick={() => {
              void navigator.clipboard?.writeText(text).then(() => {
                setDone(true)
                setTimeout(() => setDone(false), 1500)
              })
            }}
          >
            {done ? <Check className="size-4 text-emerald-600" /> : <Copy className="size-4" />}
          </button>
        )}
      </dd>
    </>
  )
}

/** Back from the provider's page (`?payment=`): what became of the payment, asked a few times while it is going on. */
export function PaymentReturn({ token }: { token: string }) {
  const { t } = useTranslation('tracking')
  const query = useQuery({
    queryKey: ['public-payment', token],
    queryFn: () => unwrap<PublicPaymentStatusResponse>(api.GET('/api/public/payments/{token}', { params: { path: { token } } })),
    retry: false,
    refetchInterval: (q) => (q.state.data?.status === 'PENDING' && q.state.dataUpdateCount < 12 ? 5000 : false),
  })
  const status = query.data?.status ?? 'PENDING'
  if (query.isError) return null
  return (
    <p
      className={cn(
        'flex items-center gap-3 rounded-2xl p-4 font-medium',
        status === 'PAID' ? 'bg-emerald-50 text-emerald-900' : status === 'PENDING' ? 'bg-navy/5' : 'bg-red-50 text-red-800',
      )}
      role="status"
    >
      {status === 'PENDING' ? <Loader2 className="size-5 shrink-0 animate-spin" /> : status === 'PAID' ? <Check className="size-5 shrink-0" /> : null}
      {t(`pay.back.${status}`)}
    </p>
  )
}
