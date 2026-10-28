import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { z } from 'zod'
import { FieldErrorText } from '@/components/common/FieldErrorText'
import { PasswordInput } from '@/components/common/PasswordInput'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field, FieldGroup, FieldLabel, FieldLegend, FieldSet } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { useMutationError } from '@/lib/api/problem'
import type { CompanyOption, CrmDealResponse } from '@/lib/api/types'
import { OptionsCheckboxes } from './OptionsCheckboxes'
import { useConvertDeal } from './queries'

const schema = z.object({
  companyName: z.string().trim().min(1, 'required'),
  edrpou: z.union([z.literal(''), z.string().trim().regex(/^\d{8,10}$/, 'edrpou')]),
  firstName: z.string().trim().min(1, 'required'),
  lastName: z.string().trim().min(1, 'required'),
  email: z.string().trim().email('email'),
  password: z.string().min(8, 'min8'),
  phone: z.union([z.literal(''), z.string().trim().regex(/^\d{8,15}$/, 'phone')]),
  options: z.array(z.enum(['PHOTOS', 'PUBLIC_TRACKING'])),
})

type FormValues = z.infer<typeof schema>

/** Won deal → a company in TrackBox24 with its first manager and the chosen options. */
export function ConvertDialog({ open, onOpenChange, deal }: { open: boolean; onOpenChange: (o: boolean) => void; deal: CrmDealResponse }) {
  const { t } = useTranslation('crm')
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('convert.title')}</DialogTitle>
          <DialogDescription>{t('convert.description')}</DialogDescription>
        </DialogHeader>
        {open && <ConvertForm deal={deal} onClose={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  )
}

function ConvertForm({ deal, onClose }: { deal: CrmDealResponse; onClose: () => void }) {
  const { t } = useTranslation(['crm', 'common'])
  const convert = useConvertDeal(deal.id!)
  const [first, ...rest] = (deal.contact?.fullName ?? '').split(' ')
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      companyName: deal.title ?? '',
      edrpou: '',
      firstName: first ?? '',
      lastName: rest.join(' '),
      email: deal.contact?.email ?? '',
      password: '',
      phone: (deal.contact?.phone ?? '').replace(/\D/g, ''),
      options: deal.interestedOptions ?? [],
    },
  })
  const { errors, isSubmitting } = form.formState
  const onError = useMutationError(form)

  const submit = form.handleSubmit(async (v) => {
    try {
      await convert.mutateAsync({
        companyName: v.companyName,
        edrpou: v.edrpou || undefined,
        manager: { firstName: v.firstName, lastName: v.lastName, email: v.email, password: v.password, phone: v.phone || undefined },
        options: v.options as CompanyOption[],
      })
      toast.success(t('common:common.saved'))
      onClose()
    } catch (e) {
      onError(e)
    }
  })

  return (
    <form onSubmit={submit} noValidate>
      <FieldGroup>
        <div className="grid gap-4 sm:grid-cols-[1fr_10rem]">
          <Field data-invalid={!!errors.companyName}>
            <FieldLabel htmlFor="conv-company">{t('crm:convert.companyName')}</FieldLabel>
            <Input id="conv-company" aria-invalid={!!errors.companyName} {...form.register('companyName')} />
            <FieldErrorText error={errors.companyName} />
          </Field>
          <Field data-invalid={!!errors.edrpou}>
            <FieldLabel htmlFor="conv-edrpou">{t('crm:convert.edrpou')}</FieldLabel>
            <Input id="conv-edrpou" inputMode="numeric" aria-invalid={!!errors.edrpou} {...form.register('edrpou')} />
            <FieldErrorText error={errors.edrpou} />
          </Field>
        </div>
        <FieldSet>
          <FieldLegend>{t('crm:convert.manager')}</FieldLegend>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field data-invalid={!!errors.firstName}>
              <FieldLabel htmlFor="conv-first">{t('crm:convert.firstName')}</FieldLabel>
              <Input id="conv-first" aria-invalid={!!errors.firstName} {...form.register('firstName')} />
              <FieldErrorText error={errors.firstName} />
            </Field>
            <Field data-invalid={!!errors.lastName}>
              <FieldLabel htmlFor="conv-last">{t('crm:convert.lastName')}</FieldLabel>
              <Input id="conv-last" aria-invalid={!!errors.lastName} {...form.register('lastName')} />
              <FieldErrorText error={errors.lastName} />
            </Field>
            <Field data-invalid={!!errors.email}>
              <FieldLabel htmlFor="conv-email">{t('crm:fields.email')}</FieldLabel>
              <Input id="conv-email" type="email" aria-invalid={!!errors.email} {...form.register('email')} />
              <FieldErrorText error={errors.email} />
            </Field>
            <Field data-invalid={!!errors.phone}>
              <FieldLabel htmlFor="conv-phone">{t('crm:fields.phone')}</FieldLabel>
              <Input id="conv-phone" inputMode="numeric" aria-invalid={!!errors.phone} {...form.register('phone')} />
              <FieldErrorText error={errors.phone} />
            </Field>
          </div>
          <Field data-invalid={!!errors.password}>
            <FieldLabel htmlFor="conv-password">{t('crm:convert.password')}</FieldLabel>
            <PasswordInput id="conv-password" autoComplete="new-password" aria-invalid={!!errors.password} {...form.register('password')} />
            <FieldErrorText error={errors.password} />
          </Field>
        </FieldSet>
        <Controller
          control={form.control}
          name="options"
          render={({ field }) => (
            <Field>
              <FieldLabel>{t('crm:convert.options')}</FieldLabel>
              <OptionsCheckboxes idPrefix="conv-option" value={field.value} onChange={field.onChange} />
            </Field>
          )}
        />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            {t('common:actions.cancel')}
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {t('crm:convert.submit')}
          </Button>
        </div>
      </FieldGroup>
    </form>
  )
}
