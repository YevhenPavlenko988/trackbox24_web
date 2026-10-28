import { zodResolver } from '@hookform/resolvers/zod'
import { Plus } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { z } from 'zod'
import { FieldErrorText } from '@/components/common/FieldErrorText'
import { PasswordInput } from '@/components/common/PasswordInput'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { useAccess } from '@/features/auth/access'
import { useMutationError } from '@/lib/api/problem'
import { useCreateSalesUser, useTeam } from './queries'

/** The TrackBox24 team; the platform admin adds sales people here. */
export function TeamPage() {
  const { t } = useTranslation(['crm', 'common'])
  const { isAdmin } = useAccess()
  const team = useTeam().data ?? []
  const [adding, setAdding] = useState(false)
  return (
    <>
      <PageHeader
        title={t('crm:team.title')}
        description={t('crm:team.description')}
        actions={
          isAdmin && (
            <Button onClick={() => setAdding(true)}>
              <Plus />
              {t('crm:team.addSales')}
            </Button>
          )
        }
      />
      <Card>
        <CardContent>
          <ul className="flex flex-col gap-2 text-sm">
            {team.map((m) => (
              <li key={m.id}>{m.name}</li>
            ))}
          </ul>
        </CardContent>
      </Card>
      <Dialog open={adding} onOpenChange={setAdding}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('crm:team.salesTitle')}</DialogTitle>
            <DialogDescription>{t('crm:team.salesHint')}</DialogDescription>
          </DialogHeader>
          {adding && <SalesForm onClose={() => setAdding(false)} />}
        </DialogContent>
      </Dialog>
    </>
  )
}

const schema = z.object({
  firstName: z.string().trim().min(1, 'required'),
  lastName: z.string().trim().min(1, 'required'),
  email: z.string().trim().email('email'),
  password: z.string().min(8, 'min8'),
  phone: z.union([z.literal(''), z.string().trim().regex(/^\d{8,15}$/, 'phone')]),
})

function SalesForm({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation(['crm', 'common'])
  const create = useCreateSalesUser()
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { firstName: '', lastName: '', email: '', password: '', phone: '' },
  })
  const { errors, isSubmitting } = form.formState
  const onError = useMutationError(form)
  const submit = form.handleSubmit(async (v) => {
    try {
      await create.mutateAsync({ firstName: v.firstName, lastName: v.lastName, email: v.email, password: v.password, phone: v.phone || undefined })
      toast.success(t('common:common.saved'))
      onClose()
    } catch (e) {
      onError(e)
    }
  })
  return (
    <form onSubmit={submit} noValidate>
      <FieldGroup>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field data-invalid={!!errors.firstName}>
            <FieldLabel htmlFor="sales-first">{t('crm:convert.firstName')}</FieldLabel>
            <Input id="sales-first" aria-invalid={!!errors.firstName} {...form.register('firstName')} />
            <FieldErrorText error={errors.firstName} />
          </Field>
          <Field data-invalid={!!errors.lastName}>
            <FieldLabel htmlFor="sales-last">{t('crm:convert.lastName')}</FieldLabel>
            <Input id="sales-last" aria-invalid={!!errors.lastName} {...form.register('lastName')} />
            <FieldErrorText error={errors.lastName} />
          </Field>
        </div>
        <Field data-invalid={!!errors.email}>
          <FieldLabel htmlFor="sales-email">{t('crm:fields.email')}</FieldLabel>
          <Input id="sales-email" type="email" aria-invalid={!!errors.email} {...form.register('email')} />
          <FieldErrorText error={errors.email} />
        </Field>
        <Field data-invalid={!!errors.phone}>
          <FieldLabel htmlFor="sales-phone">{t('crm:fields.phone')}</FieldLabel>
          <Input id="sales-phone" inputMode="numeric" aria-invalid={!!errors.phone} {...form.register('phone')} />
          <FieldErrorText error={errors.phone} />
        </Field>
        <Field data-invalid={!!errors.password}>
          <FieldLabel htmlFor="sales-password">{t('crm:convert.password')}</FieldLabel>
          <PasswordInput id="sales-password" autoComplete="new-password" aria-invalid={!!errors.password} {...form.register('password')} />
          <FieldErrorText error={errors.password} />
        </Field>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            {t('common:actions.cancel')}
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {t('common:actions.create')}
          </Button>
        </div>
      </FieldGroup>
    </form>
  )
}
