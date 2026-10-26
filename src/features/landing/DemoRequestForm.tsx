import { zodResolver } from '@hookform/resolvers/zod'
import { CheckCircle2, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'
import { FieldErrorText } from '@/components/common/FieldErrorText'
import { Button } from '@/components/ui/button'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ContactLinks } from './ContactLinks'
import { hasContacts } from './contacts'

const digits = (s: string) => s.replace(/\D/g, '')

const schema = z.object({
  name: z.string().trim().min(1, 'required').max(100, 'max100'),
  phone: z
    .string()
    .trim()
    .min(1, 'required')
    .refine((s) => /^\d{8,15}$/.test(digits(s)), 'phone'),
  company: z.string().trim().max(100, 'max100'),
  comment: z.string().trim().max(500, 'max500'),
})

type FormValues = z.infer<typeof schema>

/**
 * A demo request from a visitor. The backend posts it to the company Telegram group; until that endpoint exists
 * (or when it is down) the visitor is pointed at the direct contacts instead of a dead end.
 */
export function DemoRequestForm() {
  const { t } = useTranslation('landing')
  const [state, setState] = useState<'idle' | 'sent' | 'failed'>('idle')
  /** The backend's own words for a refusal (too many requests, Telegram off); generic text otherwise. */
  const [detail, setDetail] = useState<string | null>(null)
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', phone: '', company: '', comment: '' },
  })
  const { errors, isSubmitting } = form.formState

  const onSubmit = form.handleSubmit(async (v) => {
    setState('idle')
    setDetail(null)
    try {
      const res = await fetch('/api/public/demo-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: v.name, phone: digits(v.phone), company: v.company || undefined, comment: v.comment || undefined }),
      })
      if (res.ok) {
        setState('sent')
        return
      }
      const problem = (await res.json().catch(() => null)) as { detail?: string; errors?: Record<string, string> } | null
      for (const [field, message] of Object.entries(problem?.errors ?? {})) {
        if (field in v) form.setError(field as keyof FormValues, { message })
      }
      if (problem?.errors && Object.keys(problem.errors).length) return
      setDetail(problem?.detail ?? null)
      setState('failed')
    } catch {
      setState('failed')
    }
  })

  if (state === 'sent') {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl bg-white/10 p-8 text-center text-white" role="status">
        <CheckCircle2 className="size-10 text-brand" />
        <p className="text-lg font-semibold">{t('cta.sentTitle')}</p>
        <p className="text-white/80">{t('cta.sentText')}</p>
      </div>
    )
  }

  const label = 'text-white'
  const input = 'h-10 border-white/20 bg-white text-navy placeholder:text-slate-400'

  return (
    <form onSubmit={onSubmit} noValidate className="rounded-2xl bg-white/10 p-6 sm:p-8">
      <FieldGroup>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field data-invalid={!!errors.name}>
            <FieldLabel htmlFor="demo-name" className={label}>
              {t('cta.name')}
            </FieldLabel>
            <Input id="demo-name" autoComplete="name" className={input} aria-invalid={!!errors.name} {...form.register('name')} />
            <FieldErrorText error={errors.name} />
          </Field>
          <Field data-invalid={!!errors.phone}>
            <FieldLabel htmlFor="demo-phone" className={label}>
              {t('cta.phone')}
            </FieldLabel>
            <Input
              id="demo-phone"
              type="tel"
              autoComplete="tel"
              placeholder="+380 67 123 45 67"
              className={input}
              aria-invalid={!!errors.phone}
              {...form.register('phone')}
            />
            <FieldErrorText error={errors.phone} />
          </Field>
        </div>
        <Field data-invalid={!!errors.company}>
          <FieldLabel htmlFor="demo-company" className={label}>
            {t('cta.company')}
          </FieldLabel>
          <Input id="demo-company" autoComplete="organization" className={input} aria-invalid={!!errors.company} {...form.register('company')} />
          <FieldErrorText error={errors.company} />
        </Field>
        <Field data-invalid={!!errors.comment}>
          <FieldLabel htmlFor="demo-comment" className={label}>
            {t('cta.comment')}
          </FieldLabel>
          <Textarea id="demo-comment" rows={3} placeholder={t('cta.commentHint')} className={input + ' h-auto'} aria-invalid={!!errors.comment} {...form.register('comment')} />
          <FieldErrorText error={errors.comment} />
        </Field>
        {state === 'failed' && (
          <div className="rounded-lg bg-white/10 p-4 text-sm text-white" role="alert">
            <p className={hasContacts() ? 'mb-3' : ''}>{detail ?? t(hasContacts() ? 'cta.failed' : 'cta.failedNoContacts')}</p>
            <ContactLinks />
          </div>
        )}
        <Button type="submit" size="lg" disabled={isSubmitting} className="h-12 bg-brand text-base font-semibold text-white hover:bg-brand/90">
          {isSubmitting && <Loader2 className="animate-spin" />}
          {isSubmitting ? t('cta.sending') : t('cta.submit')}
        </Button>
      </FieldGroup>
    </form>
  )
}
