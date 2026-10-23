import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { z } from 'zod'
import { FieldErrorText } from '@/components/common/FieldErrorText'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { NpBranchPicker, NpCityPicker, NpStreetPicker } from '@/features/nova-poshta/NpRefPicker'
import { useMutationError } from '@/lib/api/problem'
import type { NpCargoType, NpDeliveryType, NpPayerType, NpPaymentMethod, ParcelResponse } from '@/lib/api/types'
import { useUpdateNpShipment, useUpdateParcel } from './queries'
import { orUndefined, parseNumber } from './status'

export const NP_DELIVERY_TYPES: NpDeliveryType[] = ['WAREHOUSE', 'POSTOMAT', 'ADDRESS']
const CARGO_TYPES: NpCargoType[] = ['PARCEL', 'DOCUMENTS', 'CARGO']
const PAYER_TYPES: NpPayerType[] = ['RECIPIENT', 'SENDER']
const NP_PAYMENT_METHODS: NpPaymentMethod[] = ['CASH', 'NON_CASH']

const schema = z
  .object({
    // Nova Poshta builds the waybill from the parcel itself and refuses it without these three, so they are filled
    // in right here instead of sending the manager to the parcel form.
    description: z.string().trim().max(500, 'max500'),
    weightKg: z.string().refine((s) => s === '' || (parseNumber(s) ?? -1) >= 0, 'number'),
    declaredValue: z.string().refine((s) => s === '' || (parseNumber(s) ?? -1) >= 0, 'number'),
    recipientLastName: z.string().trim(),
    recipientFirstName: z.string().trim(),
    recipientMiddleName: z.string().trim(),
    // The driver saves what they already know, so an empty phone is allowed; Nova Poshta only takes Ukrainian numbers.
    recipientPhone: z.string().trim().refine((s) => s === '' || /^380\d{9}$/.test(s), 'npPhone'),
    deliveryType: z.enum(NP_DELIVERY_TYPES),
    cityRef: z.string(),
    cityName: z.string(),
    branchRef: z.string(),
    branchName: z.string(),
    streetRef: z.string(),
    streetName: z.string(),
    building: z.string().trim(),
    flat: z.string().trim(),
    cargoType: z.enum(CARGO_TYPES),
    payerType: z.enum(PAYER_TYPES),
    paymentMethod: z.enum(NP_PAYMENT_METHODS),
    codAmount: z.string().refine((s) => s === '' || (parseNumber(s) ?? -1) >= 0, 'number'),
  })
  // Documents travel as 0.1 / 0.5 / 1 kg: anything heavier is a parcel, and Nova Poshta says so when the waybill is made.
  .refine((v) => v.cargoType !== 'DOCUMENTS' || (parseNumber(v.weightKg) ?? 0) <= 1, { path: ['weightKg'], message: 'docWeightMax' })

type FormValues = z.infer<typeof schema>

function defaults(parcel: ParcelResponse): FormValues {
  const s = parcel.npShipment
  return {
    description: parcel.description ?? '',
    weightKg: parcel.weightKg != null ? String(parcel.weightKg) : '',
    declaredValue: parcel.declaredValue != null ? String(parcel.declaredValue) : '',
    recipientLastName: s?.recipientLastName ?? '',
    recipientFirstName: s?.recipientFirstName ?? '',
    recipientMiddleName: s?.recipientMiddleName ?? '',
    recipientPhone: s?.recipientPhone ?? '',
    deliveryType: s?.deliveryType ?? 'WAREHOUSE',
    cityRef: s?.cityRef ?? '',
    cityName: s?.cityName ?? '',
    branchRef: s?.warehouseRef ?? '',
    branchName: s?.warehouseName ?? '',
    streetRef: s?.streetRef ?? '',
    streetName: s?.streetName ?? '',
    building: s?.building ?? '',
    flat: s?.flat ?? '',
    cargoType: s?.cargoType ?? 'PARCEL',
    payerType: s?.payerType ?? 'RECIPIENT',
    paymentMethod: s?.paymentMethod ?? 'CASH',
    codAmount: s?.codAmount != null ? String(s.codAmount) : '',
  }
}

/**
 * Where Nova Poshta takes the parcel next. The backend replaces every field, so the whole form is always sent;
 * it may stay half-filled — what is missing is listed when the waybill is created.
 */
export function NpShipmentDialog({ parcel, open, onOpenChange }: { parcel: ParcelResponse; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { t } = useTranslation(['novaPoshta', 'common'])
  const save = useUpdateNpShipment(parcel.id!)
  const saveParcel = useUpdateParcel(parcel.id!)
  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: defaults(parcel) })
  const { errors, isSubmitting } = form.formState
  const onError = useMutationError(form)
  const deliveryType = form.watch('deliveryType')
  const cityRef = form.watch('cityRef')
  const toAddress = deliveryType === 'ADDRESS'
  const documents = form.watch('cargoType') === 'DOCUMENTS'

  const submit = form.handleSubmit(async (v) => {
    try {
      // `PUT /api/parcels/{id}` is partial, so only what was actually typed goes with it.
      const parcelPatch = {
        description: orUndefined(v.description),
        weightKg: parseNumber(v.weightKg),
        declaredValue: parseNumber(v.declaredValue),
      }
      const changed =
        parcelPatch.description !== (parcel.description || undefined) ||
        parcelPatch.weightKg !== (parcel.weightKg ?? undefined) ||
        parcelPatch.declaredValue !== (parcel.declaredValue ?? undefined)
      if (changed) await saveParcel.mutateAsync(parcelPatch)
      await save.mutateAsync({
        recipientLastName: orUndefined(v.recipientLastName),
        recipientFirstName: orUndefined(v.recipientFirstName),
        recipientMiddleName: orUndefined(v.recipientMiddleName),
        recipientPhone: orUndefined(v.recipientPhone),
        deliveryType: v.deliveryType,
        cityRef: orUndefined(v.cityRef),
        cityName: orUndefined(v.cityName),
        warehouseRef: orUndefined(v.branchRef),
        warehouseName: orUndefined(v.branchName),
        streetRef: orUndefined(v.streetRef),
        streetName: orUndefined(v.streetName),
        building: orUndefined(v.building),
        flat: orUndefined(v.flat),
        cargoType: v.cargoType,
        payerType: v.payerType,
        paymentMethod: v.paymentMethod,
        codAmount: parseNumber(v.codAmount),
      })
      toast.success(t('common:common.saved'))
      onOpenChange(false)
    } catch (e) {
      onError(e)
    }
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('novaPoshta:shipment.dialogTitle')}</DialogTitle>
          <DialogDescription>{t('novaPoshta:shipment.dialogDescription')}</DialogDescription>
        </DialogHeader>
        {open && (
          <form onSubmit={submit} noValidate className="max-h-[70vh] overflow-y-auto px-1">
            <FieldGroup>
              {/* First: it decides what the waybill needs of the parcel itself — documents go without a weight. */}
              <EnumField
                form={form}
                name="cargoType"
                options={CARGO_TYPES}
                label={t('novaPoshta:shipment.cargoType')}
                prefix="cargoType"
                id="np-cargo"
                hint={t(documents ? 'novaPoshta:shipment.cargoDocumentsHint' : 'novaPoshta:shipment.cargoParcelHint')}
                onChange={() => void form.trigger('weightKg')}
              />
              <Field data-invalid={!!errors.description}>
                <FieldLabel htmlFor="np-description">{t('novaPoshta:shipment.description')}</FieldLabel>
                <Input id="np-description" {...form.register('description')} />
                <FieldDescription>{t('novaPoshta:shipment.parcelFieldsHint')}</FieldDescription>
                <FieldErrorText error={errors.description} />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field data-invalid={!!errors.weightKg}>
                  <FieldLabel htmlFor="np-weight">{t('novaPoshta:shipment.weightKg')}</FieldLabel>
                  <Input id="np-weight" inputMode="decimal" aria-invalid={!!errors.weightKg} {...form.register('weightKg')} />
                  <FieldErrorText error={errors.weightKg} />
                </Field>
                <Field data-invalid={!!errors.declaredValue}>
                  <FieldLabel htmlFor="np-declared">{t('novaPoshta:shipment.declaredValue')}</FieldLabel>
                  <Input id="np-declared" inputMode="decimal" aria-invalid={!!errors.declaredValue} {...form.register('declaredValue')} />
                  <FieldErrorText error={errors.declaredValue} />
                </Field>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <Field data-invalid={!!errors.recipientLastName}>
                  <FieldLabel htmlFor="np-last">{t('novaPoshta:shipment.lastName')}</FieldLabel>
                  <Input id="np-last" {...form.register('recipientLastName')} />
                </Field>
                <Field data-invalid={!!errors.recipientFirstName}>
                  <FieldLabel htmlFor="np-first">{t('novaPoshta:shipment.firstName')}</FieldLabel>
                  <Input id="np-first" {...form.register('recipientFirstName')} />
                </Field>
                <Field>
                  <FieldLabel htmlFor="np-middle">{t('novaPoshta:shipment.middleName')}</FieldLabel>
                  <Input id="np-middle" {...form.register('recipientMiddleName')} />
                </Field>
              </div>
              <Field data-invalid={!!errors.recipientPhone}>
                <FieldLabel htmlFor="np-phone">{t('novaPoshta:shipment.phone')}</FieldLabel>
                <Input id="np-phone" inputMode="tel" aria-invalid={!!errors.recipientPhone} {...form.register('recipientPhone')} />
                <FieldDescription>{t('novaPoshta:shipment.phoneHint')}</FieldDescription>
                <FieldErrorText error={errors.recipientPhone} />
              </Field>

              <Controller
                control={form.control}
                name="deliveryType"
                render={({ field }) => (
                  <Field>
                    <FieldLabel>{t('novaPoshta:shipment.deliveryType')}</FieldLabel>
                    <RadioGroup
                      value={field.value}
                      onValueChange={(v) => {
                        // A locker ref is not a branch ref, and a branch is not an address: keep only what still fits.
                        if (v !== field.value) {
                          form.setValue('branchRef', '')
                          form.setValue('branchName', '')
                        }
                        field.onChange(v)
                      }}
                      className="flex flex-wrap gap-4"
                    >
                      {NP_DELIVERY_TYPES.map((value) => (
                        <Label key={value} className="flex items-center gap-2 font-normal">
                          <RadioGroupItem value={value} />
                          {t(`novaPoshta:deliveryType.${value}`)}
                        </Label>
                      ))}
                    </RadioGroup>
                  </Field>
                )}
              />

              <Field>
                <FieldLabel htmlFor="np-city">{t('novaPoshta:shipment.city')}</FieldLabel>
                <NpCityPicker
                  id="np-city"
                  value={{ ref: cityRef || undefined, name: form.watch('cityName') || undefined }}
                  onChange={(v) => {
                    form.setValue('cityRef', v.ref ?? '')
                    form.setValue('cityName', v.name ?? '')
                    // Branches and streets belong to the city that was chosen before.
                    form.setValue('branchRef', '')
                    form.setValue('branchName', '')
                    form.setValue('streetRef', '')
                    form.setValue('streetName', '')
                  }}
                />
              </Field>

              {toAddress ? (
                <div className="grid gap-4 sm:grid-cols-[2fr_1fr_1fr]">
                  <Field>
                    <FieldLabel htmlFor="np-street">{t('novaPoshta:shipment.street')}</FieldLabel>
                    <NpStreetPicker
                      id="np-street"
                      cityRef={cityRef || undefined}
                      value={{ ref: form.watch('streetRef') || undefined, name: form.watch('streetName') || undefined }}
                      onChange={(v) => {
                        form.setValue('streetRef', v.ref ?? '')
                        form.setValue('streetName', v.name ?? '')
                      }}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="np-building">{t('novaPoshta:shipment.building')}</FieldLabel>
                    <Input id="np-building" {...form.register('building')} />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="np-flat">{t('novaPoshta:shipment.flat')}</FieldLabel>
                    <Input id="np-flat" {...form.register('flat')} />
                  </Field>
                </div>
              ) : (
                <Field>
                  <FieldLabel htmlFor="np-branch">{t(deliveryType === 'POSTOMAT' ? 'novaPoshta:shipment.postomat' : 'novaPoshta:shipment.branch')}</FieldLabel>
                  <NpBranchPicker
                    id="np-branch"
                    cityRef={cityRef || undefined}
                    type={deliveryType === 'POSTOMAT' ? 'POSTOMAT' : 'WAREHOUSE'}
                    value={{ ref: form.watch('branchRef') || undefined, name: form.watch('branchName') || undefined }}
                    onChange={(v) => {
                      form.setValue('branchRef', v.ref ?? '')
                      form.setValue('branchName', v.name ?? '')
                    }}
                  />
                </Field>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <EnumField form={form} name="payerType" options={PAYER_TYPES} label={t('novaPoshta:shipment.payerType')} prefix="payerType" id="np-payer" />
                <EnumField form={form} name="paymentMethod" options={NP_PAYMENT_METHODS} label={t('novaPoshta:shipment.paymentMethod')} prefix="paymentMethod" id="np-pay-method" />
              </div>

              <Field data-invalid={!!errors.codAmount}>
                <FieldLabel htmlFor="np-cod">{t('novaPoshta:shipment.codAmount')}</FieldLabel>
                <Input id="np-cod" inputMode="decimal" aria-invalid={!!errors.codAmount} {...form.register('codAmount')} />
                <FieldDescription>{t('novaPoshta:shipment.codAmountHint')}</FieldDescription>
                <FieldErrorText error={errors.codAmount} />
              </Field>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  {t('common:actions.cancel')}
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {t('common:actions.save')}
                </Button>
              </div>
            </FieldGroup>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}

/** One of the three Nova Poshta lists that are plain enums; the labels live under the same i18n prefix. */
function EnumField<K extends 'cargoType' | 'payerType' | 'paymentMethod'>({
  form,
  name,
  options,
  label,
  prefix,
  id,
  hint,
  onChange,
}: {
  form: ReturnType<typeof useForm<FormValues>>
  name: K
  options: FormValues[K][]
  label: string
  prefix: string
  id: string
  hint?: string
  onChange?: (value: FormValues[K]) => void
}) {
  const { t } = useTranslation('novaPoshta')
  return (
    <Controller
      control={form.control}
      name={name}
      render={({ field }) => (
        <Field>
          <FieldLabel htmlFor={id}>{label}</FieldLabel>
          <Select
            value={field.value}
            onValueChange={(v) => {
              if (!v) return
              field.onChange(v)
              onChange?.(v as FormValues[K])
            }}
          >
            <SelectTrigger id={id} className="w-full">
              <SelectValue>{t(`${prefix}.${field.value}`)}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {options.map((o) => (
                <SelectItem key={o} value={o}>
                  {t(`${prefix}.${o}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {hint && <FieldDescription>{hint}</FieldDescription>}
        </Field>
      )}
    />
  )
}
