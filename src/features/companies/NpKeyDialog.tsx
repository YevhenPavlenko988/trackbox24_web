import { zodResolver } from '@hookform/resolvers/zod'
import type { ReactNode } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { z } from 'zod'
import { FieldErrorText } from '@/components/common/FieldErrorText'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field, FieldContent, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { useMutationError } from '@/lib/api/problem'
import type { NovaPoshtaKeyRequest } from '@/lib/api/types'

const schema = z.object({
  apiKey: z.string().trim().refine((s) => s === '' || /^[0-9a-fA-F]{32}$/.test(s), 'npKey'),
  syncEnabled: z.boolean(),
})

type FormValues = z.infer<typeof schema>

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: ReactNode
  description?: ReactNode
  apiKeyLabel: string
  apiKeyPlaceholder?: string
  clearHint?: string
  syncLabel?: string
  syncEnabled?: boolean
  /** Shown under the sync switch (e.g. the representative's phone is not Ukrainian, so import cannot be enabled). */
  syncHint?: ReactNode
  onSubmit: (body: NovaPoshtaKeyRequest) => Promise<unknown>
}

/** Shared by company (backup key) and representative (own key + sync flag). */
export function NpKeyDialog(props: Props) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{props.title}</DialogTitle>
          {props.description && <DialogDescription>{props.description}</DialogDescription>}
        </DialogHeader>
        {props.open && <NpKeyForm {...props} />}
      </DialogContent>
    </Dialog>
  )
}

function NpKeyForm({ onOpenChange, apiKeyLabel, apiKeyPlaceholder, clearHint, syncLabel, syncEnabled, syncHint, onSubmit }: Props) {
  const { t } = useTranslation()
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { apiKey: '', syncEnabled: syncEnabled ?? true },
  })
  const { errors, isSubmitting } = form.formState
  const onError = useMutationError(form)

  const submit = form.handleSubmit(async (v) => {
    try {
      await onSubmit({ apiKey: v.apiKey || undefined, ...(syncLabel ? { syncEnabled: v.syncEnabled } : {}) })
      toast.success(t('common.saved'))
      onOpenChange(false)
    } catch (e) {
      onError(e)
    }
  })

  return (
    <form onSubmit={submit} noValidate>
      <FieldGroup>
        <Field data-invalid={!!errors.apiKey}>
          <FieldLabel htmlFor="np-key">{apiKeyLabel}</FieldLabel>
          <Input
            id="np-key"
            autoComplete="off"
            spellCheck={false}
            className="font-mono"
            placeholder={apiKeyPlaceholder}
            aria-invalid={!!errors.apiKey}
            {...form.register('apiKey')}
          />
          {clearHint && <FieldDescription>{clearHint}</FieldDescription>}
          <FieldErrorText error={errors.apiKey} />
        </Field>
        {syncLabel && (
          <Controller
            control={form.control}
            name="syncEnabled"
            render={({ field }) => (
              <Field orientation="horizontal">
                <FieldContent>
                  <FieldLabel htmlFor="np-sync">{syncLabel}</FieldLabel>
                  {syncHint && <FieldDescription>{syncHint}</FieldDescription>}
                </FieldContent>
                <Switch id="np-sync" checked={field.value} onCheckedChange={(c) => field.onChange(c)} />
              </Field>
            )}
          />
        )}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t('actions.cancel')}
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {t('actions.save')}
          </Button>
        </div>
      </FieldGroup>
    </form>
  )
}
