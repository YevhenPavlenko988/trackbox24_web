import type { FieldValues, Path, UseFormReturn } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { FieldErrorText } from '@/components/common/FieldErrorText'
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'

export type DimensionValues = { lengthCm: string; widthCm: string; heightCm: string; deliveryCity: string }

/** Parcel size in cm (Nova Poshta does not report it for incoming waybills) and the city of delivery to the client. */
export function DimensionFields<T extends FieldValues & DimensionValues>({ form, idPrefix = '' }: { form: UseFormReturn<T>; idPrefix?: string }) {
  const { t } = useTranslation('parcels')
  const errors = form.formState.errors as Partial<Record<keyof DimensionValues, { message?: string }>>
  const dim = (name: 'lengthCm' | 'widthCm' | 'heightCm') => (
    <Field data-invalid={!!errors[name]}>
      <FieldLabel htmlFor={`${idPrefix}${name}`}>{t(`fields.${name}`)}</FieldLabel>
      <Input id={`${idPrefix}${name}`} inputMode="decimal" aria-invalid={!!errors[name]} {...form.register(name as Path<T>)} />
      <FieldErrorText error={errors[name]} />
    </Field>
  )
  return (
    <div className="grid gap-4 sm:grid-cols-4">
      {dim('lengthCm')}
      {dim('widthCm')}
      {dim('heightCm')}
      <Field data-invalid={!!errors.deliveryCity}>
        <FieldLabel htmlFor={`${idPrefix}deliveryCity`}>{t('fields.deliveryCity')}</FieldLabel>
        <Input id={`${idPrefix}deliveryCity`} aria-invalid={!!errors.deliveryCity} {...form.register('deliveryCity' as Path<T>)} />
        <FieldDescription>{t('fields.deliveryCityHint')}</FieldDescription>
        <FieldErrorText error={errors.deliveryCity} />
      </Field>
    </div>
  )
}
