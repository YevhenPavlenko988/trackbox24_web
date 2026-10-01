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
import { useMutationError } from '@/lib/api/problem'
import type { WarehouseResponse } from '@/lib/api/types'
import { useCreateWarehouse, useUpdateWarehouse } from './queries'

const schema = z.object({
  name: z.string().trim().min(1, 'required'),
  address: z.string().trim(),
  notes: z.string().trim(),
  active: z.boolean(),
})

type FormValues = z.infer<typeof schema>

export function WarehouseDialog({
  open,
  onOpenChange,
  warehouse,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  warehouse?: WarehouseResponse | null
}) {
  const { t } = useTranslation('warehouses')
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{warehouse ? t('editTitle') : t('createTitle')}</DialogTitle>
        </DialogHeader>
        {open && <WarehouseForm warehouse={warehouse ?? undefined} onClose={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  )
}

function WarehouseForm({ warehouse, onClose }: { warehouse?: WarehouseResponse; onClose: () => void }) {
  const { t } = useTranslation(['warehouses', 'common'])
  const create = useCreateWarehouse()
  const update = useUpdateWarehouse(warehouse?.id ?? 0)
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: warehouse?.name ?? '', address: warehouse?.address ?? '', notes: warehouse?.notes ?? '', active: warehouse?.active ?? true },
  })
  const { errors, isSubmitting } = form.formState
  const onError = useMutationError(form)

  const submit = form.handleSubmit(async (v) => {
    const body = { name: v.name, address: v.address || undefined, notes: v.notes || undefined, active: v.active }
    try {
      await (warehouse ? update.mutateAsync(body) : create.mutateAsync(body))
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
          <FieldLabel htmlFor="wh-name">{t('warehouses:fields.name')}</FieldLabel>
          <Input id="wh-name" aria-invalid={!!errors.name} {...form.register('name')} />
          <FieldErrorText error={errors.name} />
        </Field>
        <Field data-invalid={!!errors.address}>
          <FieldLabel htmlFor="wh-address">{t('warehouses:fields.address')}</FieldLabel>
          <Input id="wh-address" {...form.register('address')} />
          <FieldErrorText error={errors.address} />
        </Field>
        <Field data-invalid={!!errors.notes}>
          <FieldLabel htmlFor="wh-notes">{t('warehouses:fields.notes')}</FieldLabel>
          <Textarea id="wh-notes" rows={2} {...form.register('notes')} />
          <FieldErrorText error={errors.notes} />
        </Field>
        <Controller
          control={form.control}
          name="active"
          render={({ field }) => (
            <Field orientation="horizontal">
              <FieldContent>
                <FieldLabel htmlFor="wh-active">{t('warehouses:fields.active')}</FieldLabel>
              </FieldContent>
              <Switch id="wh-active" checked={field.value} onCheckedChange={(c) => field.onChange(c)} />
            </Field>
          )}
        />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            {t('common:actions.cancel')}
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {warehouse ? t('common:actions.save') : t('common:actions.create')}
          </Button>
        </div>
      </FieldGroup>
    </form>
  )
}
