import { Ellipsis, Globe, Handshake, Phone } from 'lucide-react'
import type { ReactNode } from 'react'
import { Controller, type FieldValues, type Path, type PathValue, type UseFormReturn } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { FieldErrorText } from '@/components/common/FieldErrorText'
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { Channel } from '@/lib/api/types'

/** Where a client or a parcel came from (messenger, social network, …). Order = order in selects. */
export const CHANNELS: Channel[] = ['TELEGRAM', 'VIBER', 'WHATSAPP', 'INSTAGRAM', 'FACEBOOK', 'TIKTOK', 'WEBSITE', 'PHONE_CALL', 'REFERRAL', 'OTHER']

export function isChannel(v: string | undefined | null): v is Channel {
  return !!v && (CHANNELS as string[]).includes(v)
}

/** Two-letter brand marks in brand colours (lucide has no brand icons); generic icons for the rest. */
const MARKS: Partial<Record<Channel, { text: string; className: string }>> = {
  TELEGRAM: { text: 'TG', className: 'bg-sky-500 text-white' },
  VIBER: { text: 'VB', className: 'bg-violet-600 text-white' },
  WHATSAPP: { text: 'WA', className: 'bg-green-500 text-white' },
  INSTAGRAM: { text: 'IG', className: 'bg-gradient-to-br from-amber-400 via-pink-500 to-purple-600 text-white' },
  FACEBOOK: { text: 'FB', className: 'bg-blue-600 text-white' },
  TIKTOK: { text: 'TT', className: 'bg-black text-white' },
}
const ICONS: Partial<Record<Channel, ReactNode>> = {
  WEBSITE: <Globe className="size-3.5" />,
  PHONE_CALL: <Phone className="size-3.5" />,
  REFERRAL: <Handshake className="size-3.5" />,
  OTHER: <Ellipsis className="size-3.5" />,
}

export function ChannelIcon({ channel, className = '' }: { channel: Channel; className?: string }) {
  const { t } = useTranslation('common')
  const mark = MARKS[channel]
  const title = t(`channel.${channel}`)
  if (mark) {
    return (
      <span title={title} aria-label={title} className={`inline-flex size-5 shrink-0 items-center justify-center rounded-full text-[9px] font-bold leading-none ${mark.className} ${className}`}>
        {mark.text}
      </span>
    )
  }
  return (
    <span title={title} aria-label={title} className={`inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground ${className}`}>
      {ICONS[channel]}
    </span>
  )
}

/** Icon + label, with the details (nick, link, group) as a second line; links become clickable. */
export function ChannelBadge({ channel, details, compact = false }: { channel?: Channel | null; details?: string | null; compact?: boolean }) {
  const { t } = useTranslation('common')
  if (!channel) return null
  return (
    <span className="inline-flex items-center gap-1.5">
      <ChannelIcon channel={channel} />
      {!compact && <span>{t(`channel.${channel}`)}</span>}
      {details && <ChannelDetails details={details} className="text-muted-foreground" />}
    </span>
  )
}

export function ChannelDetails({ details, className = '' }: { details: string; className?: string }) {
  const href = detailsHref(details)
  if (!href) return <span className={className}>{details}</span>
  return (
    <a href={href} target="_blank" rel="noreferrer" className={`underline underline-offset-4 ${className}`} onClick={(e) => e.stopPropagation()}>
      {details}
    </a>
  )
}

/** "https://…" and "t.me/…" style values open as links; "@nick" and free text stay text. */
function detailsHref(details: string): string | undefined {
  const v = details.trim()
  if (/^https?:\/\//i.test(v)) return v
  if (/^(www\.|t\.me\/|instagram\.com\/|facebook\.com\/|tiktok\.com\/|wa\.me\/|invite\.viber\.com\/)/i.test(v)) return `https://${v}`
  return undefined
}

const NONE = '__none__'

export function ChannelSelect({
  value,
  onChange,
  id,
  noneLabel,
  className = 'w-full',
  invalid,
}: {
  value?: Channel | ''
  onChange: (v: Channel | undefined) => void
  id?: string
  noneLabel: string
  className?: string
  invalid?: boolean
}) {
  const { t } = useTranslation('common')
  return (
    <Select value={value || NONE} onValueChange={(v) => onChange(isChannel(String(v)) ? (v as Channel) : undefined)}>
      <SelectTrigger id={id} className={className} aria-invalid={invalid}>
        <SelectValue>
          {value ? (
            <span className="inline-flex items-center gap-2">
              <ChannelIcon channel={value} />
              {t(`channel.${value}`)}
            </span>
          ) : (
            noneLabel
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NONE}>{noneLabel}</SelectItem>
        {CHANNELS.map((c) => (
          <SelectItem key={c} value={c}>
            <span className="inline-flex items-center gap-2">
              <ChannelIcon channel={c} />
              {t(`channel.${c}`)}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export type ChannelValues = { channel?: Channel | ''; channelDetails: string }

/** Channel select + details input for client and parcel forms (react-hook-form). */
export function ChannelFields<T extends FieldValues & ChannelValues>({ form, idPrefix = '', hint }: { form: UseFormReturn<T>; idPrefix?: string; hint?: ReactNode }) {
  const { t } = useTranslation('common')
  const errors = form.formState.errors as Partial<Record<keyof ChannelValues, { message?: string }>>
  const channel = form.watch('channel' as Path<T>) as Channel | ''
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Controller
        control={form.control}
        name={'channel' as Path<T>}
        render={({ field }) => (
          <Field data-invalid={!!errors.channel}>
            <FieldLabel htmlFor={`${idPrefix}channel`}>{t('channelField.label')}</FieldLabel>
            <ChannelSelect id={`${idPrefix}channel`} value={field.value as Channel | ''} onChange={(v) => field.onChange((v ?? '') as PathValue<T, Path<T>>)} noneLabel={t('channelField.none')} />
            {hint && <FieldDescription>{hint}</FieldDescription>}
            <FieldErrorText error={errors.channel} />
          </Field>
        )}
      />
      <Field data-invalid={!!errors.channelDetails}>
        <FieldLabel htmlFor={`${idPrefix}channelDetails`}>{t('channelField.details')}</FieldLabel>
        <Input
          id={`${idPrefix}channelDetails`}
          placeholder={channel === 'OTHER' ? t('channelField.detailsOtherPlaceholder') : t('channelField.detailsPlaceholder')}
          maxLength={255}
          aria-invalid={!!errors.channelDetails}
          {...form.register('channelDetails' as Path<T>)}
        />
        <FieldErrorText error={errors.channelDetails} />
      </Field>
    </div>
  )
}
