import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { z } from 'zod'
import { FieldErrorText } from '@/components/common/FieldErrorText'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field, FieldContent, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { parseNumber } from '@/features/parcels/status'
import { UserSelect } from '@/features/users/UserSelect'
import { useMutationError } from '@/lib/api/problem'
import type { CarRequest, CarResponse } from '@/lib/api/types'
import { useCreateCar, useUpdateCar } from './queries'

const numberField = z
  .string()
  .trim()
  .refine((s) => s === '' || (parseNumber(s) ?? -1) >= 0, 'number')

const schema = z.object({
  plateNumber: z.string().trim().min(1, 'required'),
  brand: z.string().trim(),
  model: z.string().trim(),
  capacityKg: numberField,
  volumeM3: numberField,
  defaultDriverId: z.number().optional(),
  notes: z.string().trim(),
  active: z.boolean(),
})

type FormValues = z.infer<typeof schema>

export function CarDialog({
  open,
  onOpenChange,
  car,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  car?: CarResponse | null
}) {
  const { t } = useTranslation('cars')
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{car ? t('editTitle') : t('createTitle')}</DialogTitle>
        </DialogHeader>
        {open && <CarForm car={car ?? undefined} onClose={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  )
}

function CarForm({ car, onClose }: { car?: CarResponse; onClose: () => void }) {
  const { t } = useTranslation(['cars', 'common'])
  const create = useCreateCar()
  const update = useUpdateCar(car?.id ?? 0)
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      plateNumber: car?.plateNumber ?? '',
      brand: car?.brand ?? '',
      model: car?.model ?? '',
      capacityKg: car?.capacityKg != null ? String(car.capacityKg) : '',
      volumeM3: car?.volumeM3 != null ? String(car.volumeM3) : '',
      defaultDriverId: car?.defaultDriverId,
      notes: car?.notes ?? '',
      active: car?.active ?? true,
    },
  })
  const { errors, isSubmitting } = form.formState
  const onError = useMutationError(form)

  const submit = form.handleSubmit(async (v) => {
    const body: CarRequest = {
      plateNumber: v.plateNumber,
      brand: v.brand || undefined,
      model: v.model || undefined,
      capacityKg: parseNumber(v.capacityKg),
      volumeM3: parseNumber(v.volumeM3),
      defaultDriverId: v.defaultDriverId,
      notes: v.notes || undefined,
      active: v.active,
    }
    try {
      await (car ? update.mutateAsync(body) : create.mutateAsync(body))
      toast.success(t('common:common.saved'))
      onClose()
    } catch (e) {
      onError(e)
    }
  })

  return (
    <form onSubmit={submit} noValidate>
      <FieldGroup>
        <Field data-invalid={!!errors.plateNumber}>
          <FieldLabel htmlFor="car-plate">{t('cars:fields.plateNumber')}</FieldLabel>
          <Input id="car-plate" className="uppercase" aria-invalid={!!errors.plateNumber} {...form.register('plateNumber')} />
          <FieldErrorText error={errors.plateNumber} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field data-invalid={!!errors.brand}>
            <FieldLabel htmlFor="car-brand">{t('cars:fields.brand')}</FieldLabel>
            <Input id="car-brand" {...form.register('brand')} />
            <FieldErrorText error={errors.brand} />
          </Field>
          <Field data-invalid={!!errors.model}>
            <FieldLabel htmlFor="car-model">{t('cars:fields.model')}</FieldLabel>
            <Input id="car-model" {...form.register('model')} />
            <FieldErrorText error={errors.model} />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field data-invalid={!!errors.capacityKg}>
            <FieldLabel htmlFor="car-capacity">{t('cars:fields.capacityKg')}</FieldLabel>
            <Input id="car-capacity" inputMode="decimal" aria-invalid={!!errors.capacityKg} {...form.register('capacityKg')} />
            <FieldErrorText error={errors.capacityKg} />
          </Field>
          <Field data-invalid={!!errors.volumeM3}>
            <FieldLabel htmlFor="car-volume">{t('cars:fields.volumeM3')}</FieldLabel>
            <Input id="car-volume" inputMode="decimal" aria-invalid={!!errors.volumeM3} {...form.register('volumeM3')} />
            <FieldErrorText error={errors.volumeM3} />
          </Field>
        </div>
        <Controller
          control={form.control}
          name="defaultDriverId"
          render={({ field }) => (
            <Field data-invalid={!!errors.defaultDriverId}>
              <FieldLabel htmlFor="car-driver">{t('cars:fields.defaultDriver')}</FieldLabel>
              <UserSelect role="DRIVER" id="car-driver" className="w-full" value={field.value} onChange={field.onChange} noneLabel={t('common:common.selectPlaceholder')} />
              <FieldErrorText error={errors.defaultDriverId} />
            </Field>
          )}
        />
        <Field data-invalid={!!errors.notes}>
          <FieldLabel htmlFor="car-notes">{t('cars:fields.notes')}</FieldLabel>
          <Textarea id="car-notes" rows={2} {...form.register('notes')} />
          <FieldErrorText error={errors.notes} />
        </Field>
        <Controller
          control={form.control}
          name="active"
          render={({ field }) => (
            <Field orientation="horizontal">
              <FieldContent>
                <FieldLabel htmlFor="car-active">{t('cars:fields.active')}</FieldLabel>
              </FieldContent>
              <Switch id="car-active" checked={field.value} onCheckedChange={(c) => field.onChange(c)} />
            </Field>
          )}
        />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            {t('common:actions.cancel')}
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {car ? t('common:actions.save') : t('common:actions.create')}
          </Button>
        </div>
      </FieldGroup>
    </form>
  )
}
