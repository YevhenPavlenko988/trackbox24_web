import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { z } from 'zod'
import { FieldErrorText } from '@/components/common/FieldErrorText'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { parseNumber } from '@/features/parcels/status'
import { useMutationError } from '@/lib/api/problem'
import type { CompanyOption, CrmDealRequest, CrmDealResponse, CrmDealSource } from '@/lib/api/types'
import { OptionsCheckboxes } from './OptionsCheckboxes'
import { useCreateDeal, useUpdateDeal } from './queries'
import { TeamSelect } from './TeamSelect'

const SOURCES: CrmDealSource[] = ['SITE_FORM', 'REFERRAL', 'CALL', 'SOCIAL', 'OTHER']

const schema = z.object({
  title: z.string().trim().min(1, 'required'),
  fullName: z.string().trim(),
  phone: z.string().trim(),
  email: z.union([z.literal(''), z.string().trim().email('email')]),
  jobTitle: z.string().trim(),
  ownerId: z.number().optional(),
  source: z.enum(SOURCES),
  interestedOptions: z.array(z.enum(['PHOTOS', 'PUBLIC_TRACKING'])),
  expectedMonthlyEur: z.string().trim().refine((s) => s === '' || (parseNumber(s) ?? -1) >= 0, 'number'),
  notes: z.string().trim(),
})

type FormValues = z.infer<typeof schema>

/** New deal (with its contact) or edit of an existing one; the contact of an existing deal is edited on its page. */
export function DealDialog({ open, onOpenChange, deal }: { open: boolean; onOpenChange: (o: boolean) => void; deal?: CrmDealResponse | null }) {
  const { t } = useTranslation('crm')
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{deal ? t('deals.editTitle') : t('deals.new')}</DialogTitle>
        </DialogHeader>
        {open && <DealForm deal={deal ?? undefined} onClose={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  )
}

function DealForm({ deal, onClose }: { deal?: CrmDealResponse; onClose: () => void }) {
  const { t } = useTranslation(['crm', 'common'])
  const navigate = useNavigate()
  const create = useCreateDeal()
  const update = useUpdateDeal(deal?.id ?? 0)
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: deal?.title ?? '',
      fullName: '',
      phone: '',
      email: '',
      jobTitle: '',
      ownerId: deal?.owner?.id,
      source: deal?.source ?? 'OTHER',
      interestedOptions: deal?.interestedOptions ?? [],
      expectedMonthlyEur: deal?.expectedMonthlyEur != null ? String(deal.expectedMonthlyEur) : '',
      notes: deal?.notes ?? '',
    },
  })
  const { errors, isSubmitting } = form.formState
  const onError = useMutationError(form)

  const submit = form.handleSubmit(async (v) => {
    const body: CrmDealRequest = {
      title: v.title,
      contactId: deal?.contact?.id,
      contact: !deal && v.fullName ? { fullName: v.fullName, phone: v.phone || undefined, email: v.email || undefined, jobTitle: v.jobTitle || undefined } : undefined,
      ownerId: v.ownerId,
      source: v.source,
      interestedOptions: v.interestedOptions as CompanyOption[],
      expectedMonthlyEur: parseNumber(v.expectedMonthlyEur),
      notes: v.notes || undefined,
    }
    try {
      const saved = await (deal ? update.mutateAsync(body) : create.mutateAsync(body))
      toast.success(t('common:common.saved'))
      onClose()
      if (!deal && saved.id) navigate(`/crm/deals/${saved.id}`)
    } catch (e) {
      onError(e)
    }
  })

  return (
    <form onSubmit={submit} noValidate>
      <FieldGroup>
        <Field data-invalid={!!errors.title}>
          <FieldLabel htmlFor="deal-title">{t('crm:fields.title')}</FieldLabel>
          <Input id="deal-title" aria-invalid={!!errors.title} {...form.register('title')} />
          <FieldErrorText error={errors.title} />
        </Field>
        {!deal && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="deal-name">{t('crm:fields.fullName')}</FieldLabel>
              <Input id="deal-name" {...form.register('fullName')} />
            </Field>
            <Field>
              <FieldLabel htmlFor="deal-job">{t('crm:fields.jobTitle')}</FieldLabel>
              <Input id="deal-job" {...form.register('jobTitle')} />
            </Field>
            <Field>
              <FieldLabel htmlFor="deal-phone">{t('crm:fields.phone')}</FieldLabel>
              <Input id="deal-phone" inputMode="tel" {...form.register('phone')} />
            </Field>
            <Field data-invalid={!!errors.email}>
              <FieldLabel htmlFor="deal-email">{t('crm:fields.email')}</FieldLabel>
              <Input id="deal-email" type="email" aria-invalid={!!errors.email} {...form.register('email')} />
              <FieldErrorText error={errors.email} />
            </Field>
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <Controller
            control={form.control}
            name="ownerId"
            render={({ field }) => (
              <Field>
                <FieldLabel htmlFor="deal-owner">{t('crm:fields.owner')}</FieldLabel>
                <TeamSelect id="deal-owner" className="w-full" value={field.value} onChange={field.onChange} noneLabel={t('common:common.selectPlaceholder')} />
              </Field>
            )}
          />
          <Controller
            control={form.control}
            name="source"
            render={({ field }) => (
              <Field>
                <FieldLabel htmlFor="deal-source">{t('crm:fields.source')}</FieldLabel>
                <Select value={field.value} onValueChange={(v) => field.onChange(v)}>
                  <SelectTrigger id="deal-source" className="w-full">
                    <SelectValue>{t(`crm:source.${field.value}`)}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {SOURCES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {t(`crm:source.${s}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            )}
          />
        </div>
        <Controller
          control={form.control}
          name="interestedOptions"
          render={({ field }) => (
            <Field>
              <FieldLabel>{t('crm:fields.interestedOptions')}</FieldLabel>
              <OptionsCheckboxes idPrefix="deal-option" value={field.value} onChange={field.onChange} />
            </Field>
          )}
        />
        <Field data-invalid={!!errors.expectedMonthlyEur}>
          <FieldLabel htmlFor="deal-eur">{t('crm:fields.expectedMonthlyEur')}</FieldLabel>
          <Input id="deal-eur" inputMode="decimal" className="w-40" aria-invalid={!!errors.expectedMonthlyEur} {...form.register('expectedMonthlyEur')} />
          <FieldErrorText error={errors.expectedMonthlyEur} />
        </Field>
        <Field>
          <FieldLabel htmlFor="deal-notes">{t('crm:fields.notes')}</FieldLabel>
          <Textarea id="deal-notes" rows={3} {...form.register('notes')} />
        </Field>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            {t('common:actions.cancel')}
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {deal ? t('common:actions.save') : t('common:actions.create')}
          </Button>
        </div>
      </FieldGroup>
    </form>
  )
}
