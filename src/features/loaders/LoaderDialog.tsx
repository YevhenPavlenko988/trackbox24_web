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
import { Textarea } from '@/components/ui/textarea'
import { useMutationError } from '@/lib/api/problem'
import type { LoaderResponse } from '@/lib/api/types'
import { useCreateLoader, useUpdateLoader } from './queries'

const schema = z.object({
  firstName: z.string().trim().min(1, 'required'),
  lastName: z.string().trim(),
  phone: z.union([z.literal(''), z.string().trim().regex(/^\d{8,15}$/, 'phone')]),
  notes: z.string().trim(),
})

type FormValues = z.infer<typeof schema>

/** A loader of the directory: new or edited; [onCreated] gets the new one (picked straight into a work). */
export function LoaderDialog({
  open,
  onOpenChange,
  loader,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  loader?: LoaderResponse | null
  onCreated?: (loader: LoaderResponse) => void
}) {
  const { t } = useTranslation(['moves', 'common'])
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{loader ? t('moves:loaders.edit') : t('moves:loaders.new')}</DialogTitle>
        </DialogHeader>
        {open && <LoaderForm loader={loader ?? undefined} onDone={(l) => (onOpenChange(false), l && onCreated?.(l))} onCancel={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  )
}

function LoaderForm({ loader, onDone, onCancel }: { loader?: LoaderResponse; onDone: (created?: LoaderResponse) => void; onCancel: () => void }) {
  const { t } = useTranslation(['moves', 'common'])
  const create = useCreateLoader()
  const update = useUpdateLoader(loader?.id ?? 0)
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { firstName: loader?.firstName ?? '', lastName: loader?.lastName ?? '', phone: loader?.phone ?? '', notes: loader?.notes ?? '' },
  })
  const { errors, isSubmitting } = form.formState
  const onError = useMutationError(form)
  const submit = form.handleSubmit(async (v) => {
    const body = { firstName: v.firstName, lastName: v.lastName || undefined, phone: v.phone || undefined, notes: v.notes || undefined }
    try {
      const saved = loader ? await update.mutateAsync(body) : await create.mutateAsync(body)
      toast.success(t('common:common.saved'))
      onDone(loader ? undefined : saved)
    } catch (e) {
      onError(e)
    }
  })
  return (
    <form onSubmit={submit} noValidate>
      <FieldGroup>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field data-invalid={!!errors.firstName}>
            <FieldLabel htmlFor="ld-first">{t('moves:loaders.firstName')}</FieldLabel>
            <Input id="ld-first" autoFocus {...form.register('firstName')} />
            <FieldErrorText error={errors.firstName} />
          </Field>
          <Field>
            <FieldLabel htmlFor="ld-last">{t('moves:loaders.lastName')}</FieldLabel>
            <Input id="ld-last" {...form.register('lastName')} />
          </Field>
        </div>
        <Field data-invalid={!!errors.phone}>
          <FieldLabel htmlFor="ld-phone">{t('moves:loaders.phone')}</FieldLabel>
          <Input id="ld-phone" inputMode="tel" placeholder="380…" {...form.register('phone')} />
          <FieldErrorText error={errors.phone} />
        </Field>
        <Field>
          <FieldLabel htmlFor="ld-notes">{t('moves:loaders.notes')}</FieldLabel>
          <Textarea id="ld-notes" rows={2} {...form.register('notes')} />
        </Field>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            {t('common:actions.cancel')}
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {t('common:actions.save')}
          </Button>
        </div>
      </FieldGroup>
    </form>
  )
}
