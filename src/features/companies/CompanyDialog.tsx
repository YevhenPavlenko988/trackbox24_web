import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { z } from 'zod'
import { FieldErrorText } from '@/components/common/FieldErrorText'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { useMutationError } from '@/lib/api/problem'
import type { CompanyRequest, CompanyResponse } from '@/lib/api/types'

const schema = z.object({
  name: z.string().trim().min(1, 'required'),
  edrpou: z.string().trim(),
  phone: z.string().trim(),
  email: z.union([z.literal(''), z.email('email')]),
  address: z.string().trim(),
})

type FormValues = z.infer<typeof schema>

const orUndefined = (s: string) => (s ? s : undefined)

export function CompanyDialog({
  open,
  onOpenChange,
  company,
  onSubmit,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  company?: CompanyResponse
  onSubmit: (body: CompanyRequest) => Promise<unknown>
}) {
  const { t } = useTranslation(['companies', 'common'])
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{company ? t('companies:editTitle') : t('companies:createTitle')}</DialogTitle>
        </DialogHeader>
        {open && <CompanyForm company={company} onSubmit={onSubmit} onClose={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  )
}

function CompanyForm({
  company,
  onSubmit,
  onClose,
}: {
  company?: CompanyResponse
  onSubmit: (body: CompanyRequest) => Promise<unknown>
  onClose: () => void
}) {
  const { t } = useTranslation(['companies', 'common'])
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: company?.name ?? '',
      edrpou: company?.edrpou ?? '',
      phone: company?.phone ?? '',
      email: company?.email ?? '',
      address: company?.address ?? '',
    },
  })
  const { errors, isSubmitting } = form.formState
  const onError = useMutationError(form)

  const submit = form.handleSubmit(async (v) => {
    try {
      await onSubmit({
        name: v.name,
        edrpou: orUndefined(v.edrpou),
        phone: orUndefined(v.phone),
        email: orUndefined(v.email),
        address: orUndefined(v.address),
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
        <Field data-invalid={!!errors.name}>
          <FieldLabel htmlFor="c-name">{t('companies:fields.name')}</FieldLabel>
          <Input id="c-name" aria-invalid={!!errors.name} {...form.register('name')} />
          <FieldErrorText error={errors.name} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field data-invalid={!!errors.edrpou}>
            <FieldLabel htmlFor="c-edrpou">{t('companies:fields.edrpou')}</FieldLabel>
            <Input id="c-edrpou" inputMode="numeric" {...form.register('edrpou')} />
            <FieldErrorText error={errors.edrpou} />
          </Field>
          <Field data-invalid={!!errors.phone}>
            <FieldLabel htmlFor="c-phone">{t('companies:fields.phone')}</FieldLabel>
            <Input id="c-phone" inputMode="tel" {...form.register('phone')} />
            <FieldErrorText error={errors.phone} />
          </Field>
        </div>
        <Field data-invalid={!!errors.email}>
          <FieldLabel htmlFor="c-email">{t('companies:fields.email')}</FieldLabel>
          <Input id="c-email" type="email" aria-invalid={!!errors.email} {...form.register('email')} />
          <FieldErrorText error={errors.email} />
        </Field>
        <Field data-invalid={!!errors.address}>
          <FieldLabel htmlFor="c-address">{t('companies:fields.address')}</FieldLabel>
          <Input id="c-address" {...form.register('address')} />
          <FieldErrorText error={errors.address} />
        </Field>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            {t('common:actions.cancel')}
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {company ? t('common:actions.save') : t('common:actions.create')}
          </Button>
        </div>
      </FieldGroup>
    </form>
  )
}
