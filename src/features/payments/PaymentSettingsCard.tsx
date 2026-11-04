import { CheckCircle2, CircleAlert, CreditCard, Landmark } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { showApiError } from '@/lib/api/problem'
import type { PaymentProvider, PaymentSettingsResponse } from '@/lib/api/types'
import { cn } from '@/lib/utils'
import { nbuQrUrl } from './nbuQr'
import { useCheckPaymentSettings, usePaymentSettings, useSavePaymentSettings } from './queries'

const PROVIDERS = ['MONO', 'LIQPAY', 'WAYFORPAY'] as const satisfies readonly PaymentProvider[]
/** What each provider bills in; the parcel's own currency first when it is among them. */
const PROVIDER_CURRENCIES: Record<(typeof PROVIDERS)[number], string> = { MONO: 'грн', LIQPAY: 'грн, €, $', WAYFORPAY: 'грн' }

type Form = {
  provider: '' | (typeof PROVIDERS)[number]
  monoToken: string
  liqpayPublicKey: string
  liqpayPrivateKey: string
  wfpMerchantAccount: string
  wfpSecretKey: string
  wfpDomain: string
  requisitesEnabled: boolean
  recipientName: string
  iban: string
  taxId: string
  bankName: string
  cardNumber: string
  cardLink: string
}

const toForm = (s: PaymentSettingsResponse): Form => ({
  provider: (s.provider as Form['provider']) ?? '',
  monoToken: '',
  liqpayPublicKey: s.liqpayPublicKey ?? '',
  liqpayPrivateKey: '',
  wfpMerchantAccount: s.wfpMerchantAccount ?? '',
  wfpSecretKey: '',
  wfpDomain: s.wfpDomain ?? '',
  requisitesEnabled: s.requisitesEnabled === true,
  recipientName: s.recipientName ?? '',
  iban: s.iban ?? '',
  taxId: s.taxId ?? '',
  bankName: s.bankName ?? '',
  cardNumber: s.cardNumber ?? '',
  cardLink: s.cardLink ?? '',
})

const blank = (s: string) => (s.trim() === '' ? undefined : s.trim())

/**
 * «Онлайн-оплата» on the company page: the carrier's own acquiring (one provider, its keys) and / or the requisites the
 * client transfers to, with the NBU QR as the client will see it. Secrets are write-only: saved ones show as «збережено».
 */
export function PaymentSettingsCard() {
  const { t } = useTranslation(['companies', 'common'])
  const query = usePaymentSettings()
  const save = useSavePaymentSettings()
  const check = useCheckPaymentSettings()
  const [f, setF] = useState<Form>()
  useEffect(() => {
    if (query.data) setF(toForm(query.data))
  }, [query.data])

  if (!f || !query.data) return <Skeleton className="h-64 w-full" />
  const saved = query.data
  const set = (k: keyof Form) => (v: string) => setF({ ...f, [k]: v })

  const submit = async () => {
    try {
      await save.mutateAsync({
        provider: f.provider || undefined,
        monoToken: blank(f.monoToken),
        liqpayPublicKey: blank(f.liqpayPublicKey),
        liqpayPrivateKey: blank(f.liqpayPrivateKey),
        wfpMerchantAccount: blank(f.wfpMerchantAccount),
        wfpSecretKey: blank(f.wfpSecretKey),
        wfpDomain: blank(f.wfpDomain),
        requisitesEnabled: f.requisitesEnabled,
        recipientName: blank(f.recipientName),
        iban: blank(f.iban),
        taxId: blank(f.taxId),
        bankName: blank(f.bankName),
        cardNumber: blank(f.cardNumber),
        cardLink: blank(f.cardLink),
      })
      toast.success(t('common:common.saved'))
    } catch (e) {
      showApiError(e)
    }
  }

  const runCheck = async () => {
    try {
      const r = await check.mutateAsync()
      toast.success(r.message)
    } catch (e) {
      showApiError(e)
    }
  }

  const secret = (id: string, label: string, key: 'monoToken' | 'liqpayPrivateKey' | 'wfpSecretKey', isSaved?: boolean) => (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input
        id={id}
        type="password"
        autoComplete="off"
        placeholder={isSaved ? `•••••• ${t('companies:payments.saved')}` : ''}
        value={f[key]}
        onChange={(e) => set(key)(e.target.value)}
      />
    </Field>
  )
  const text = (id: string, label: string, key: keyof Form, placeholder?: string) => (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input id={id} value={f[key] as string} placeholder={placeholder} onChange={(e) => set(key)(e.target.value)} />
    </Field>
  )
  const ibanReady = f.iban.replace(/\s/g, '').length === 29 && f.recipientName.trim() && /^\d{8}$|^\d{10}$/.test(f.taxId.trim())

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="size-5 text-indigo-600" />
          {t('companies:payments.title')}
        </CardTitle>
        <CardDescription>{t('companies:payments.subtitle')}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p
          className={cn(
            'flex items-center gap-2 text-sm font-medium',
            saved.ready ? 'text-emerald-700 dark:text-emerald-300' : 'text-amber-700 dark:text-amber-300',
          )}
        >
          {saved.ready ? <CheckCircle2 className="size-4" /> : <CircleAlert className="size-4" />}
          {t(saved.ready ? 'companies:payments.ready' : 'companies:payments.notReady')}
        </p>

        <div className="grid gap-4 lg:grid-cols-2">
          <section className="flex flex-col gap-3 rounded-lg border p-4">
            <div>
              <p className="font-medium">{t('companies:payments.card')}</p>
              <p className="text-sm text-muted-foreground">{t('companies:payments.cardHint')}</p>
            </div>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={t('companies:payments.card')}>
              {(['', ...PROVIDERS] as const).map((p) => (
                <Button
                  key={p || 'none'}
                  type="button"
                  size="sm"
                  role="radio"
                  aria-checked={f.provider === p}
                  variant={f.provider === p ? 'default' : 'outline'}
                  onClick={() => setF({ ...f, provider: p })}
                >
                  {p ? t(`companies:payments.providers.${p}`) : t('companies:payments.none')}
                </Button>
              ))}
            </div>
            {f.provider === 'MONO' && (
              <>
                {secret('pay-mono', t('companies:payments.monoToken'), 'monoToken', saved.monoTokenSet)}
                <FieldDescription>{t('companies:payments.monoTokenHint')}</FieldDescription>
              </>
            )}
            {f.provider === 'LIQPAY' && (
              <>
                {text('pay-lp-pub', t('companies:payments.liqpayPublicKey'), 'liqpayPublicKey')}
                {secret('pay-lp-priv', t('companies:payments.liqpayPrivateKey'), 'liqpayPrivateKey', saved.liqpayPrivateKeySet)}
                <FieldDescription>{t('companies:payments.liqpayHint')}</FieldDescription>
              </>
            )}
            {f.provider === 'WAYFORPAY' && (
              <>
                {text('pay-wfp-acc', t('companies:payments.wfpMerchantAccount'), 'wfpMerchantAccount')}
                {secret('pay-wfp-key', t('companies:payments.wfpSecretKey'), 'wfpSecretKey', saved.wfpSecretKeySet)}
                {text('pay-wfp-domain', t('companies:payments.wfpDomain'), 'wfpDomain', 'trackbox24.com')}
                <FieldDescription>{t('companies:payments.wfpHint')}</FieldDescription>
              </>
            )}
            {f.provider && (
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
                <span>{t('companies:payments.currencies', { list: PROVIDER_CURRENCIES[f.provider] })}</span>
                {saved.provider === f.provider && (
                  <Button type="button" size="sm" variant="outline" disabled={check.isPending} onClick={runCheck}>
                    {t('companies:payments.check')}
                  </Button>
                )}
              </div>
            )}
            {f.provider && <p className="text-xs text-muted-foreground">{t('companies:payments.commission')}</p>}
          </section>

          <section className="flex flex-col gap-3 rounded-lg border p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="flex items-center gap-2 font-medium">
                  <Landmark className="size-4" />
                  {t('companies:payments.requisites')}
                </p>
                <p className="text-sm text-muted-foreground">{t('companies:payments.requisitesHint')}</p>
              </div>
              <Switch
                checked={f.requisitesEnabled}
                onCheckedChange={(c) => setF({ ...f, requisitesEnabled: c })}
                aria-label={t('companies:payments.requisites')}
              />
            </div>
            {f.requisitesEnabled && (
              <div className="flex flex-col gap-3">
                {text('pay-recipient', t('companies:payments.recipientName'), 'recipientName', t('companies:payments.recipientPlaceholder'))}
                <div className="grid gap-3 sm:grid-cols-[2fr_1fr]">
                  {text('pay-iban', t('companies:payments.iban'), 'iban', 'UA00 0000 0000 0000 0000 0000 0000 0')}
                  {text('pay-tax', t('companies:payments.taxId'), 'taxId')}
                </div>
                {text('pay-bank', t('companies:payments.bankName'), 'bankName')}
                <div className="grid gap-3 sm:grid-cols-2">
                  {text('pay-card', t('companies:payments.cardNumber'), 'cardNumber', '0000 0000 0000 0000')}
                  {text('pay-link', t('companies:payments.cardLink'), 'cardLink', t('companies:payments.cardLinkPlaceholder'))}
                </div>
                {ibanReady && (
                  <div className="flex items-center gap-4 rounded-lg bg-muted/50 p-3">
                    <QRCodeSVG
                      value={nbuQrUrl(f.recipientName, f.iban, 1000, f.taxId, 'Оплата доставки PT0000000000')}
                      size={96}
                      marginSize={2}
                      className="shrink-0 rounded bg-white"
                    />
                    <p className="text-sm text-muted-foreground">{t('companies:payments.qrPreview')}</p>
                  </div>
                )}
              </div>
            )}
          </section>
        </div>

        <div className="flex justify-end">
          <Button onClick={submit} disabled={save.isPending}>
            {t('common:actions.save')}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
