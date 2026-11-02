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
import { Textarea } from '@/components/ui/textarea'
import { parseNumber } from '@/features/parcels/status'
import { useMutationError } from '@/lib/api/problem'
import { CHANNELS, ChannelFields } from '@/features/channels/channel'
import type { Channel, CompanyOption, CrmDealRequest, CrmDealResponse } from '@/lib/api/types'
import { COMPANY_OPTIONS } from './constants'
import { OptionsCheckboxes } from './OptionsCheckboxes'
import { useCreateDeal, useUpdateContact, useUpdateDeal } from './queries'
import { TeamSelect } from './TeamSelect'

const schema = z.object({
  title: z.string().trim().min(1, 'required'),
  fullName: z.string().trim(),
  phone: z.string().trim(),
  email: z.union([z.literal(''), z.string().trim().email('email')]),
  jobTitle: z.string().trim(),
  ownerId: z.number().optional(),
  channel: z.union([z.enum(CHANNELS as [Channel, ...Channel[]]), z.literal('')]),
  channelDetails: z.string().trim().max(255),
  interestedOptions: z.array(z.enum(COMPANY_OPTIONS as [CompanyOption, ...CompanyOption[]])),
  expectedMonthlyEur: z.string().trim().refine((s) => s === '' || (parseNumber(s) ?? -1) >= 0, 'number'),
  notes: z.string().trim(),
})

type FormValues = z.infer<typeof schema>

/**
 * New deal (with its contact) or edit of an existing one, its contact included: a contact added later, or a phone
 * that was not known at first, is filled in here.
 */
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
  const updateContact = useUpdateContact()
  const contact = deal?.contact
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: deal?.title ?? '',
      fullName: contact?.fullName ?? '',
      phone: contact?.phone ?? '',
      email: contact?.email ?? '',
      jobTitle: contact?.jobTitle ?? '',
      ownerId: deal?.owner?.id,
      channel: deal?.source ?? '',
      channelDetails: deal?.sourceDetails ?? '',
      interestedOptions: deal?.interestedOptions ?? [],
      expectedMonthlyEur: deal?.expectedMonthlyEur != null ? String(deal.expectedMonthlyEur) : '',
      notes: deal?.notes ?? '',
    },
  })
  const { errors, isSubmitting } = form.formState
  const onError = useMutationError(form)

  const submit = form.handleSubmit(async (v) => {
    // an existing contact keeps a name; its notes and company stay as they are
    if (contact?.id && !v.fullName) {
      form.setError('fullName', { message: 'required' })
      return
    }
    const person = { fullName: v.fullName, phone: v.phone || undefined, email: v.email || undefined, jobTitle: v.jobTitle || undefined }
    const body: CrmDealRequest = {
      title: v.title,
      contactId: contact?.id,
      contact: !contact?.id && v.fullName ? person : undefined,
      ownerId: v.ownerId,
      source: v.channel || undefined,
      sourceDetails: v.channelDetails || undefined,
      interestedOptions: v.interestedOptions as CompanyOption[],
      expectedMonthlyEur: parseNumber(v.expectedMonthlyEur),
      notes: v.notes || undefined,
    }
    try {
      if (contact?.id) {
        await updateContact.mutateAsync({ id: contact.id, body: { ...person, notes: contact.notes, companyId: contact.company?.id } })
      }
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
        <div className="grid gap-4 sm:grid-cols-2">
          <Field data-invalid={!!errors.fullName}>
            <FieldLabel htmlFor="deal-name">{t('crm:fields.fullName')}</FieldLabel>
            <Input id="deal-name" aria-invalid={!!errors.fullName} {...form.register('fullName')} />
            <FieldErrorText error={errors.fullName} />
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
        <div className="grid gap-4">
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
        </div>
        <ChannelFields form={form} idPrefix="deal-" />
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
