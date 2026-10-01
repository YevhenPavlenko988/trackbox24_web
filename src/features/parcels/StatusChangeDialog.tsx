import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { z } from 'zod'
import { FieldErrorText } from '@/components/common/FieldErrorText'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field, FieldContent, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { useMutationError } from '@/lib/api/problem'
import type { ParcelResponse, ParcelStatus } from '@/lib/api/types'
import { ParcelStatusBadge } from './ParcelStatusBadge'
import { useChangeParcelStatus } from './queries'
import { PARCEL_STATUSES, TRANSITIONS } from './status'

const schema = z
  .object({
    status: z.string().min(1, 'required'),
    force: z.boolean(),
    comment: z.string().trim(),
  })
  .superRefine((v, ctx) => {
    if (v.force && !v.comment) ctx.addIssue({ code: 'custom', path: ['comment'], message: 'required' })
  })

type FormValues = z.infer<typeof schema>

export function StatusChangeDialog({
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
      <DialogContent>{open && <StatusForm parcel={parcel} onClose={() => onOpenChange(false)} />}</DialogContent>
    </Dialog>
  )
}

function StatusForm({ parcel, onClose }: { parcel: ParcelResponse; onClose: () => void }) {
  const { t } = useTranslation(['parcels', 'common'])
  const change = useChangeParcelStatus(parcel.id!)
  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { status: '', force: false, comment: '' } })
  const { errors, isSubmitting } = form.formState
  const onError = useMutationError(form)
  const force = form.watch('force')
  const current = parcel.status

  const allowed = current ? TRANSITIONS[current] : []
  const options = force ? PARCEL_STATUSES.filter((s) => s !== current) : allowed

  const submit = form.handleSubmit(async (v) => {
    try {
      await change.mutateAsync({ status: v.status as ParcelStatus, force: v.force, comment: v.comment || undefined })
      toast.success(t('common:common.saved'))
      onClose()
    } catch (e) {
      onError(e)
    }
  })

  return (
    <>
      <DialogHeader>
        <DialogTitle>{t('parcels:statusDialog.title')}</DialogTitle>
        <DialogDescription className="flex items-center gap-2">
          {t('parcels:statusDialog.current')} <ParcelStatusBadge status={current} />
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={submit} noValidate>
        <FieldGroup>
          <Controller
            control={form.control}
            name="force"
            render={({ field }) => (
              <Field orientation="horizontal">
                <FieldContent>
                  <FieldLabel htmlFor="force">{t('parcels:statusDialog.force')}</FieldLabel>
                  <FieldDescription>{t('parcels:statusDialog.forceHint')}</FieldDescription>
                </FieldContent>
                <Switch
                  id="force"
                  checked={field.value}
                  onCheckedChange={(c) => {
                    field.onChange(c)
                    form.setValue('status', '')
                  }}
                />
              </Field>
            )}
          />

          <Controller
            control={form.control}
            name="status"
            render={({ field }) => (
              <Field data-invalid={!!errors.status}>
                <FieldLabel htmlFor="status">{t('parcels:statusDialog.newStatus')}</FieldLabel>
                <Select value={field.value || null} onValueChange={(v) => field.onChange(v ?? '')}>
                  <SelectTrigger id="status" className="w-full" aria-invalid={!!errors.status}>
                    <SelectValue>
                      {field.value ? t(`common:parcelStatus.${field.value}`) : t('common:common.selectPlaceholder')}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {options.map((s) => (
                      <SelectItem key={s} value={s}>
                        {t(`common:parcelStatus.${s}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {options.length === 0 && <FieldDescription>{t('parcels:statusDialog.noTransitions')}</FieldDescription>}
                <FieldErrorText error={errors.status} />
              </Field>
            )}
          />

          <Field data-invalid={!!errors.comment}>
            <FieldLabel htmlFor="comment">
              {t('parcels:statusDialog.comment')}
              {force && ' *'}
            </FieldLabel>
            <Textarea id="comment" rows={3} aria-invalid={!!errors.comment} {...form.register('comment')} />
            <FieldErrorText error={errors.comment} />
          </Field>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              {t('common:actions.cancel')}
            </Button>
            <Button type="submit" disabled={isSubmitting || options.length === 0}>
              {t('common:actions.confirm')}
            </Button>
          </div>
        </FieldGroup>
      </form>
    </>
  )
}
