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
import { changePassword } from './api'
import { useAuth } from './useAuth'

const schema = z.object({
  currentPassword: z.string().min(1, 'required'),
  newPassword: z.string().min(8, 'min8'),
})

type FormValues = z.infer<typeof schema>

export function ChangePasswordDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { t } = useTranslation(['users', 'common'])
  const { replaceToken } = useAuth()
  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { currentPassword: '', newPassword: '' } })
  const { errors, isSubmitting } = form.formState
  const onError = useMutationError(form)

  const submit = form.handleSubmit(async (v) => {
    try {
      const token = await changePassword(v)
      if (token.accessToken) replaceToken(token.accessToken)
      toast.success(t('users:changePassword.done'))
      form.reset()
      onOpenChange(false)
    } catch (e) {
      onError(e)
    }
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('users:changePassword.title')}</DialogTitle>
        </DialogHeader>
        {open && (
          <form onSubmit={submit} noValidate>
            <FieldGroup>
              <Field data-invalid={!!errors.currentPassword}>
                <FieldLabel htmlFor="cp-current">{t('users:changePassword.current')}</FieldLabel>
                <Input id="cp-current" type="password" autoComplete="current-password" aria-invalid={!!errors.currentPassword} {...form.register('currentPassword')} />
                <FieldErrorText error={errors.currentPassword} />
              </Field>
              <Field data-invalid={!!errors.newPassword}>
                <FieldLabel htmlFor="cp-new">{t('users:changePassword.new')}</FieldLabel>
                <Input id="cp-new" type="password" autoComplete="new-password" aria-invalid={!!errors.newPassword} {...form.register('newPassword')} />
                <FieldErrorText error={errors.newPassword} />
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
