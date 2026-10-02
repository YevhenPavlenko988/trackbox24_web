import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { z } from 'zod'
import { FieldErrorText } from '@/components/common/FieldErrorText'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { useAccess } from '@/features/auth/access'
import { ClientPicker } from '@/features/clients/ClientPicker'
import { UserSelect } from '@/features/users/UserSelect'
import { useMutationError } from '@/lib/api/problem'
import type { ParcelResponse } from '@/lib/api/types'
import { DimensionFields } from './DimensionFields'
import { PriceFields } from './PriceFields'
import { useUpdateParcel } from './queries'
import { canEditSeatsAmount, orUndefined, parseNumber } from './status'

const numberField = z
  .string()
  .trim()
  .refine((s) => s === '' || (parseNumber(s) ?? -1) >= 0, 'number')

const schema = z.object({
  representativeId: z.number().optional(),
  clientId: z.number().optional(),
  needsEnrichment: z.boolean(),
  description: z.string().trim(),
  weightKg: numberField,
  seatsAmount: z.string().trim().refine((s) => /^\d+$/.test(s) && Number(s) >= 1, 'min1'),
  declaredValue: numberField,
  lengthCm: numberField,
  widthCm: numberField,
  heightCm: numberField,
  deliveryCity: z.string().trim().max(255),
  senderName: z.string().trim(),
  senderPhone: z.string().trim(),
  senderCity: z.string().trim(),
  notes: z.string().trim(),
  deliveryPrice: numberField,
  deliveryPriceCurrency: z.enum(['UAH', 'EUR']),
})

type FormValues = z.infer<typeof schema>

function toFormValues(p: ParcelResponse): FormValues {
  return {
    representativeId: p.representativeId,
    clientId: p.clientId,
    needsEnrichment: p.needsEnrichment ?? false,
    description: p.description ?? '',
    weightKg: p.weightKg != null ? String(p.weightKg) : '',
    seatsAmount: String(p.seatsAmount ?? p.seats?.length ?? 1),
    declaredValue: p.declaredValue != null ? String(p.declaredValue) : '',
    lengthCm: p.lengthCm != null ? String(p.lengthCm) : '',
    widthCm: p.widthCm != null ? String(p.widthCm) : '',
    heightCm: p.heightCm != null ? String(p.heightCm) : '',
    deliveryCity: p.deliveryCity ?? '',
    senderName: p.senderName ?? '',
    senderPhone: p.senderPhone ?? '',
    senderCity: p.senderCity ?? '',
    notes: p.notes ?? '',
    deliveryPrice: p.deliveryPrice != null ? String(p.deliveryPrice) : '',
    deliveryPriceCurrency: p.deliveryPriceCurrency ?? 'UAH',
  }
}

export function ParcelEditDialog({
  parcel,
  open,
  onOpenChange,
}: {
  parcel: ParcelResponse
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        {open && <EditForm parcel={parcel} onClose={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  )
}

function EditForm({ parcel, onClose }: { parcel: ParcelResponse; onClose: () => void }) {
  const { t } = useTranslation(['parcels', 'common'])
  const update = useUpdateParcel(parcel.id!)
  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: toFormValues(parcel) })
  const { errors, isSubmitting } = form.formState
  const onError = useMutationError(form)
  const seatsEditable = canEditSeatsAmount(parcel)
  const { isManager } = useAccess()

  // PUT is a partial update, but we still send the full form so the dialog reflects what gets saved.
  const submit = form.handleSubmit(async (v) => {
    try {
      await update.mutateAsync({
        deliveryPrice: isManager ? parseNumber(v.deliveryPrice) : undefined,
        deliveryPriceCurrency: isManager && v.deliveryPrice ? v.deliveryPriceCurrency : undefined,
        representativeId: v.representativeId,
        clientId: v.clientId,
        needsEnrichment: v.needsEnrichment,
        description: orUndefined(v.description),
        weightKg: parseNumber(v.weightKg),
        seatsAmount: parseNumber(v.seatsAmount),
        declaredValue: parseNumber(v.declaredValue),
        lengthCm: parseNumber(v.lengthCm),
        widthCm: parseNumber(v.widthCm),
        heightCm: parseNumber(v.heightCm),
        deliveryCity: orUndefined(v.deliveryCity),
        senderName: orUndefined(v.senderName),
        senderPhone: orUndefined(v.senderPhone),
        senderCity: orUndefined(v.senderCity),
        notes: orUndefined(v.notes),
      })
      toast.success(t('common:common.saved'))
      onClose()
    } catch (e) {
      onError(e)
    }
  })

  return (
    <>
      <DialogHeader>
        <DialogTitle>{t('parcels:editTitle')}</DialogTitle>
      </DialogHeader>
      <form onSubmit={submit} noValidate>
        <FieldGroup>
          <div className="grid gap-4 sm:grid-cols-2">
            <Controller
              control={form.control}
              name="representativeId"
              render={({ field }) => (
                <Field data-invalid={!!errors.representativeId}>
                  <FieldLabel htmlFor="e-representativeId">{t('parcels:fields.representative')}</FieldLabel>
                  <UserSelect role="REPRESENTATIVE"
                    id="e-representativeId"
                    className="w-full"
                    value={field.value}
                    onChange={field.onChange}
                    noneLabel={t('common:common.selectPlaceholder')}
                  />
                  <FieldErrorText error={errors.representativeId} />
                </Field>
              )}
            />
            <Controller
              control={form.control}
              name="clientId"
              render={({ field }) => (
                <Field data-invalid={!!errors.clientId}>
                  <FieldLabel htmlFor="e-clientId">{t('parcels:fields.client')}</FieldLabel>
                  <ClientPicker id="e-clientId" value={field.value} onChange={(id) => field.onChange(id)} allowCreate />
                  <FieldErrorText error={errors.clientId} />
                </Field>
              )}
            />
          </div>

          <Field data-invalid={!!errors.description}>
            <FieldLabel htmlFor="e-description">{t('parcels:fields.description')}</FieldLabel>
            <Input id="e-description" {...form.register('description')} />
            <FieldErrorText error={errors.description} />
          </Field>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field data-invalid={!!errors.seatsAmount}>
              <FieldLabel htmlFor="e-seatsAmount">{t('parcels:fields.seatsAmount')}</FieldLabel>
              <Input id="e-seatsAmount" inputMode="numeric" disabled={!seatsEditable} aria-invalid={!!errors.seatsAmount} {...form.register('seatsAmount')} />
              {!seatsEditable && <FieldDescription>{t('parcels:edit.seatsLocked')}</FieldDescription>}
              <FieldErrorText error={errors.seatsAmount} />
            </Field>
            <Field data-invalid={!!errors.weightKg}>
              <FieldLabel htmlFor="e-weightKg">{t('parcels:fields.weightKg')}</FieldLabel>
              <Input id="e-weightKg" inputMode="decimal" aria-invalid={!!errors.weightKg} {...form.register('weightKg')} />
              <FieldErrorText error={errors.weightKg} />
            </Field>
            <Field data-invalid={!!errors.declaredValue}>
              <FieldLabel htmlFor="e-declaredValue">{t('parcels:fields.declaredValue')}</FieldLabel>
              <Input id="e-declaredValue" inputMode="decimal" aria-invalid={!!errors.declaredValue} {...form.register('declaredValue')} />
              <FieldErrorText error={errors.declaredValue} />
            </Field>
          </div>

          <DimensionFields form={form} idPrefix="e-" />

          {isManager && <PriceFields form={form} idPrefix="e-" />}

          <div className="grid gap-4 sm:grid-cols-3">
            <Field data-invalid={!!errors.senderName}>
              <FieldLabel htmlFor="e-senderName">{t('parcels:fields.senderName')}</FieldLabel>
              <Input id="e-senderName" {...form.register('senderName')} />
              <FieldErrorText error={errors.senderName} />
            </Field>
            <Field data-invalid={!!errors.senderPhone}>
              <FieldLabel htmlFor="e-senderPhone">{t('parcels:fields.senderPhone')}</FieldLabel>
              <Input id="e-senderPhone" inputMode="tel" {...form.register('senderPhone')} />
              <FieldErrorText error={errors.senderPhone} />
            </Field>
            <Field data-invalid={!!errors.senderCity}>
              <FieldLabel htmlFor="e-senderCity">{t('parcels:fields.senderCity')}</FieldLabel>
              <Input id="e-senderCity" {...form.register('senderCity')} />
              <FieldErrorText error={errors.senderCity} />
            </Field>
          </div>

          <Field data-invalid={!!errors.notes}>
            <FieldLabel htmlFor="e-notes">{t('parcels:fields.notes')}</FieldLabel>
            <Textarea id="e-notes" rows={3} {...form.register('notes')} />
            <FieldErrorText error={errors.notes} />
          </Field>

          <Controller
            control={form.control}
            name="needsEnrichment"
            render={({ field }) => (
              <Field orientation="horizontal">
                <Switch id="e-needsEnrichment" checked={field.value} onCheckedChange={(c) => field.onChange(c)} />
                <FieldLabel htmlFor="e-needsEnrichment">{t('parcels:needsEnrichment')}</FieldLabel>
              </Field>
            )}
          />

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              {t('common:actions.cancel')}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {t('common:actions.save')}
            </Button>
          </div>
        </FieldGroup>
      </form>
    </>
  )
}
