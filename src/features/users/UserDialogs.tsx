import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { z } from 'zod'
import { FieldErrorText } from '@/components/common/FieldErrorText'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field, FieldContent, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { useMutationError } from '@/lib/api/problem'
import type { Role, UserResponse } from '@/lib/api/types'
import { useCreateUser, useUpdateUser } from './queries'

const PHONE = /^380\d{9}$/
const COMPANY_ROLES: Role[] = ['MANAGER', 'REPRESENTATIVE', 'DRIVER']

const createSchema = z
  .object({
    email: z.email('email'),
    password: z.string().min(8, 'min8'),
    lastName: z.string().trim().min(1, 'required'),
    firstName: z.string().trim().min(1, 'required'),
    phone: z.string().trim(),
    role: z.enum(['MANAGER', 'REPRESENTATIVE', 'DRIVER']),
    driverLicenseNumber: z.string().trim(),
  })
  .superRefine((v, ctx) => {
    if (v.role === 'REPRESENTATIVE' && !v.phone) ctx.addIssue({ code: 'custom', path: ['phone'], message: 'required' })
    if (v.phone && !PHONE.test(v.phone)) ctx.addIssue({ code: 'custom', path: ['phone'], message: 'phone' })
  })

type CreateValues = z.infer<typeof createSchema>

const orUndefined = (s: string) => (s ? s : undefined)

export function UserCreateDialog({
  open,
  onOpenChange,
  companyId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  companyId?: number
}) {
  const { t } = useTranslation('users')
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('createTitle')}</DialogTitle>
        </DialogHeader>
        {open && <CreateForm companyId={companyId} onClose={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  )
}

function CreateForm({ companyId, onClose }: { companyId?: number; onClose: () => void }) {
  const { t } = useTranslation(['users', 'common'])
  const create = useCreateUser()
  const form = useForm<CreateValues>({
    resolver: zodResolver(createSchema),
    defaultValues: { email: '', password: '', lastName: '', firstName: '', phone: '', role: 'MANAGER', driverLicenseNumber: '' },
  })
  const { errors, isSubmitting } = form.formState
  const onError = useMutationError(form)
  const role = form.watch('role')

  const submit = form.handleSubmit(async (v) => {
    try {
      await create.mutateAsync({
        companyId,
        email: v.email,
        password: v.password,
        lastName: v.lastName,
        firstName: v.firstName,
        phone: orUndefined(v.phone),
        role: v.role,
        driverLicenseNumber: v.role === 'DRIVER' ? orUndefined(v.driverLicenseNumber) : undefined,
      })
      toast.success(t('common:common.saved'))
      onClose()
    } catch (e) {
      onError(e)
    }
  })

  return (
    <form onSubmit={submit} noValidate>
      <FieldGroup>
        <Controller
          control={form.control}
          name="role"
          render={({ field }) => (
            <Field data-invalid={!!errors.role}>
              <FieldLabel htmlFor="u-role">{t('users:fields.role')}</FieldLabel>
              <Select value={field.value} onValueChange={(v) => v && field.onChange(v)}>
                <SelectTrigger id="u-role" className="w-full">
                  <SelectValue>{t(`common:roles.${field.value}`)}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {COMPANY_ROLES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {t(`common:roles.${r}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldErrorText error={errors.role} />
            </Field>
          )}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field data-invalid={!!errors.lastName}>
            <FieldLabel htmlFor="u-lastName">{t('users:fields.lastName')}</FieldLabel>
            <Input id="u-lastName" aria-invalid={!!errors.lastName} {...form.register('lastName')} />
            <FieldErrorText error={errors.lastName} />
          </Field>
          <Field data-invalid={!!errors.firstName}>
            <FieldLabel htmlFor="u-firstName">{t('users:fields.firstName')}</FieldLabel>
            <Input id="u-firstName" aria-invalid={!!errors.firstName} {...form.register('firstName')} />
            <FieldErrorText error={errors.firstName} />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field data-invalid={!!errors.email}>
            <FieldLabel htmlFor="u-email">{t('users:fields.email')}</FieldLabel>
            <Input id="u-email" type="email" autoComplete="off" aria-invalid={!!errors.email} {...form.register('email')} />
            <FieldErrorText error={errors.email} />
          </Field>
          <Field data-invalid={!!errors.password}>
            <FieldLabel htmlFor="u-password">{t('users:fields.password')}</FieldLabel>
            <Input id="u-password" type="password" autoComplete="new-password" aria-invalid={!!errors.password} {...form.register('password')} />
            <FieldErrorText error={errors.password} />
          </Field>
        </div>
        <Field data-invalid={!!errors.phone}>
          <FieldLabel htmlFor="u-phone">{t('users:fields.phone')}</FieldLabel>
          <Input id="u-phone" inputMode="tel" placeholder="380XXXXXXXXX" aria-invalid={!!errors.phone} {...form.register('phone')} />
          {role === 'REPRESENTATIVE' && <FieldDescription>{t('users:hints.phoneRepresentative')}</FieldDescription>}
          <FieldErrorText error={errors.phone} />
        </Field>
        {role === 'DRIVER' && (
          <Field data-invalid={!!errors.driverLicenseNumber}>
            <FieldLabel htmlFor="u-license">{t('users:fields.driverLicenseNumber')}</FieldLabel>
            <Input id="u-license" {...form.register('driverLicenseNumber')} />
            <FieldErrorText error={errors.driverLicenseNumber} />
          </Field>
        )}
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

const editSchema = z
  .object({
    lastName: z.string().trim().min(1, 'required'),
    firstName: z.string().trim().min(1, 'required'),
    phone: z.string().trim(),
    driverLicenseNumber: z.string().trim(),
    active: z.boolean(),
  })
  .superRefine((v, ctx) => {
    if (v.phone && !PHONE.test(v.phone)) ctx.addIssue({ code: 'custom', path: ['phone'], message: 'phone' })
  })

type EditValues = z.infer<typeof editSchema>

export function UserEditDialog({
  user,
  open,
  onOpenChange,
}: {
  user: UserResponse | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useTranslation('users')
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('editTitle')}</DialogTitle>
        </DialogHeader>
        {open && user && <EditForm user={user} onClose={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  )
}

function EditForm({ user, onClose }: { user: UserResponse; onClose: () => void }) {
  const { t } = useTranslation(['users', 'common'])
  const update = useUpdateUser(user.id!)
  const form = useForm<EditValues>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      lastName: user.lastName ?? '',
      firstName: user.firstName ?? '',
      phone: user.phone ?? '',
      driverLicenseNumber: user.driverLicenseNumber ?? '',
      active: user.active ?? true,
    },
  })
  const { errors, isSubmitting } = form.formState
  const onError = useMutationError(form)

  const submit = form.handleSubmit(async (v) => {
    try {
      await update.mutateAsync({
        lastName: v.lastName,
        firstName: v.firstName,
        phone: orUndefined(v.phone),
        driverLicenseNumber: user.role === 'DRIVER' ? orUndefined(v.driverLicenseNumber) : undefined,
        active: v.active,
      })
      toast.success(t('common:common.saved'))
      onClose()
    } catch (e) {
      onError(e)
    }
  })

  return (
    <form onSubmit={submit} noValidate>
      <FieldGroup>
        <p className="text-sm text-muted-foreground">
          {user.email} · {user.role && t(`common:roles.${user.role}`)}
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field data-invalid={!!errors.lastName}>
            <FieldLabel htmlFor="ue-lastName">{t('users:fields.lastName')}</FieldLabel>
            <Input id="ue-lastName" aria-invalid={!!errors.lastName} {...form.register('lastName')} />
            <FieldErrorText error={errors.lastName} />
          </Field>
          <Field data-invalid={!!errors.firstName}>
            <FieldLabel htmlFor="ue-firstName">{t('users:fields.firstName')}</FieldLabel>
            <Input id="ue-firstName" aria-invalid={!!errors.firstName} {...form.register('firstName')} />
            <FieldErrorText error={errors.firstName} />
          </Field>
        </div>
        <Field data-invalid={!!errors.phone}>
          <FieldLabel htmlFor="ue-phone">{t('users:fields.phone')}</FieldLabel>
          <Input id="ue-phone" inputMode="tel" placeholder="380XXXXXXXXX" aria-invalid={!!errors.phone} {...form.register('phone')} />
          <FieldErrorText error={errors.phone} />
        </Field>
        {user.role === 'DRIVER' && (
          <Field data-invalid={!!errors.driverLicenseNumber}>
            <FieldLabel htmlFor="ue-license">{t('users:fields.driverLicenseNumber')}</FieldLabel>
            <Input id="ue-license" {...form.register('driverLicenseNumber')} />
            <FieldErrorText error={errors.driverLicenseNumber} />
          </Field>
        )}
        <Controller
          control={form.control}
          name="active"
          render={({ field }) => (
            <Field orientation="horizontal">
              <FieldContent>
                <FieldLabel htmlFor="ue-active">{t('users:fields.active')}</FieldLabel>
              </FieldContent>
              <Switch id="ue-active" checked={field.value} onCheckedChange={(c) => field.onChange(c)} />
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
  )
}
