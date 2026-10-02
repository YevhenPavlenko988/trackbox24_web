import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { FieldErrorText } from '@/components/common/FieldErrorText'
import { Button } from '@/components/ui/button'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Textarea } from '@/components/ui/textarea'
import { useMutationError } from '@/lib/api/problem'
import type { ClientRequest } from '@/lib/api/types'
import { clientSchema, emptyClientValues, formValuesToRequest, type ClientFormValues } from './schema'

export function ClientForm({
  defaultValues = emptyClientValues,
  onSubmit,
  onCancel,
  submitLabel,
  idPrefix = '',
}: {
  defaultValues?: ClientFormValues
  onSubmit: (body: ClientRequest) => Promise<unknown>
  onCancel?: () => void
  submitLabel: string
  /** Prefix for input ids when the form is rendered inside another form's page (avoids duplicate ids). */
  idPrefix?: string
}) {
  const { t } = useTranslation(['clients', 'common'])
  const form = useForm<ClientFormValues>({ resolver: zodResolver(clientSchema), defaultValues })
  const { errors, isSubmitting } = form.formState
  const onError = useMutationError(form)
  const type = form.watch('type')

  const submit = form.handleSubmit(async (values) => {
    try {
      await onSubmit(formValuesToRequest(values))
    } catch (e) {
      onError(e)
    }
  })

  return (
    // stopPropagation: when rendered in a dialog opened from another form (parcel create/edit), React bubbles the
    // submit event through the portal and would submit the outer form as well.
    <form
      onSubmit={(e) => {
        e.stopPropagation()
        void submit(e)
      }}
      noValidate
    >
      <FieldGroup>
        <Controller
          control={form.control}
          name="type"
          render={({ field }) => (
            <Field>
              <FieldLabel>{t('clients:fields.type')}</FieldLabel>
              <RadioGroup value={field.value} onValueChange={(v) => field.onChange(v)} className="flex gap-4">
                {(['PRIVATE_PERSON', 'ORGANIZATION'] as const).map((value) => (
                  <Label key={value} className="flex items-center gap-2 font-normal">
                    <RadioGroupItem value={value} />
                    {t(`common:clientType.${value}`)}
                  </Label>
                ))}
              </RadioGroup>
            </Field>
          )}
        />

        {type === 'ORGANIZATION' && (
          <Field data-invalid={!!errors.organizationName}>
            <FieldLabel htmlFor={`${idPrefix}organizationName`}>{t('clients:fields.organizationName')}</FieldLabel>
            <Input id={`${idPrefix}organizationName`} aria-invalid={!!errors.organizationName} {...form.register('organizationName')} />
            <FieldErrorText error={errors.organizationName} />
          </Field>
        )}

        <div className="grid gap-4 sm:grid-cols-3">
          <Field data-invalid={!!errors.lastName}>
            <FieldLabel htmlFor={`${idPrefix}lastName`}>{t('clients:fields.lastName')}</FieldLabel>
            <Input id={`${idPrefix}lastName`} aria-invalid={!!errors.lastName} {...form.register('lastName')} />
            <FieldErrorText error={errors.lastName} />
          </Field>
          <Field data-invalid={!!errors.firstName}>
            <FieldLabel htmlFor={`${idPrefix}firstName`}>{t('clients:fields.firstName')}</FieldLabel>
            <Input id={`${idPrefix}firstName`} aria-invalid={!!errors.firstName} {...form.register('firstName')} />
            <FieldErrorText error={errors.firstName} />
          </Field>
          <Field data-invalid={!!errors.middleName}>
            <FieldLabel htmlFor={`${idPrefix}middleName`}>{t('clients:fields.middleName')}</FieldLabel>
            <Input id={`${idPrefix}middleName`} {...form.register('middleName')} />
            <FieldErrorText error={errors.middleName} />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field data-invalid={!!errors.phone}>
            <FieldLabel htmlFor={`${idPrefix}phone`}>{t('clients:fields.phone')}</FieldLabel>
            <Input id={`${idPrefix}phone`} inputMode="tel" placeholder="+380 XX XXX XX XX" aria-invalid={!!errors.phone} {...form.register('phone')} />
            <FieldErrorText error={errors.phone} />
          </Field>
          <Field data-invalid={!!errors.email}>
            <FieldLabel htmlFor={`${idPrefix}email`}>{t('clients:fields.email')}</FieldLabel>
            <Input id={`${idPrefix}email`} type="email" aria-invalid={!!errors.email} {...form.register('email')} />
            <FieldErrorText error={errors.email} />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field data-invalid={!!errors.city}>
            <FieldLabel htmlFor={`${idPrefix}city`}>{t('clients:fields.city')}</FieldLabel>
            <Input id={`${idPrefix}city`} {...form.register('city')} />
            <FieldErrorText error={errors.city} />
          </Field>
          <Field data-invalid={!!errors.address}>
            <FieldLabel htmlFor={`${idPrefix}address`}>{t('clients:fields.address')}</FieldLabel>
            <Input id={`${idPrefix}address`} {...form.register('address')} />
            <FieldErrorText error={errors.address} />
          </Field>
        </div>

        <Field data-invalid={!!errors.notes}>
          <FieldLabel htmlFor={`${idPrefix}notes`}>{t('clients:fields.notes')}</FieldLabel>
          <Textarea id={`${idPrefix}notes`} rows={3} {...form.register('notes')} />
          <FieldErrorText error={errors.notes} />
        </Field>

        <div className="flex justify-end gap-2">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              {t('common:actions.cancel')}
            </Button>
          )}
          <Button type="submit" disabled={isSubmitting}>
            {submitLabel}
          </Button>
        </div>
      </FieldGroup>
    </form>
  )
}
