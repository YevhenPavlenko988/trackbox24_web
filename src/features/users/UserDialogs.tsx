import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { z } from 'zod'
import { FieldErrorText } from '@/components/common/FieldErrorText'
import { PasswordInput } from '@/components/common/PasswordInput'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field, FieldContent, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { useMutationError } from '@/lib/api/problem'
import type { Role, UserResponse } from '@/lib/api/types'
import { COMPANY_ROLES, userDisplayName } from './api'
import { useCreateUser, useResetUserPassword, useUpdateUser } from './queries'

const PHONE = /^380\d{9}$/
const rolesSchema = z.array(z.enum(['MANAGER', 'REPRESENTATIVE', 'DRIVER', 'VIEWER'])).min(1, 'rolesRequired')

function RolesField({ value, onChange, error }: { value: Role[]; onChange: (roles: Role[]) => void; error?: { message?: string } }) {
  const { t } = useTranslation(['users', 'common'])
  return (
    <Field data-invalid={!!error}>
      <FieldLabel>{t('users:fields.roles')}</FieldLabel>
      <div className="grid grid-cols-2 gap-2">
        {COMPANY_ROLES.map((role) => (
          <Label key={role} className="flex items-center gap-2 font-normal">
            <Checkbox
              checked={value.includes(role)}
              onCheckedChange={(c) => onChange(c === true ? [...value, role] : value.filter((r) => r !== role))}
            />
            {t(`common:roles.${role}`)}
          </Label>
        ))}
      </div>
      <FieldErrorText error={error} />
    </Field>
  )
}

const createSchema = z
  .object({
    email: z.email('email'),
    password: z.string().min(8, 'min8'),
    lastName: z.string().trim().min(1, 'required'),
    firstName: z.string().trim().min(1, 'required'),
    phone: z.string().trim(),
    roles: rolesSchema,
    driverLicenseNumber: z.string().trim(),
    notes: z.string().trim(),
  })
  .superRefine((v, ctx) => {
    if (v.roles.includes('REPRESENTATIVE') && !v.phone) ctx.addIssue({ code: 'custom', path: ['phone'], message: 'required' })
    if (v.phone && !PHONE.test(v.phone)) ctx.addIssue({ code: 'custom', path: ['phone'], message: 'phoneUa' })
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
    defaultValues: { email: '', password: '', lastName: '', firstName: '', phone: '', roles: ['MANAGER'], driverLicenseNumber: '', notes: '' },
  })
  const { errors, isSubmitting } = form.formState
  const onError = useMutationError(form)
  const roles = form.watch('roles')

  const submit = form.handleSubmit(async (v) => {
    try {
      await create.mutateAsync({
        companyId,
        email: v.email,
        password: v.password,
        lastName: v.lastName,
        firstName: v.firstName,
        phone: orUndefined(v.phone),
        roles: v.roles,
        driverLicenseNumber: v.roles.includes('DRIVER') ? orUndefined(v.driverLicenseNumber) : undefined,
        notes: orUndefined(v.notes),
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
        <Controller control={form.control} name="roles" render={({ field }) => <RolesField value={field.value} onChange={field.onChange} error={errors.roles} />} />
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
            <PasswordInput id="u-password" autoComplete="new-password" aria-invalid={!!errors.password} {...form.register('password')} />
            <FieldErrorText error={errors.password} />
          </Field>
        </div>
        <Field data-invalid={!!errors.phone}>
          <FieldLabel htmlFor="u-phone">{t('users:fields.phone')}</FieldLabel>
          <Input id="u-phone" inputMode="tel" placeholder="380XXXXXXXXX" aria-invalid={!!errors.phone} {...form.register('phone')} />
          {roles.includes('REPRESENTATIVE') && <FieldDescription>{t('users:hints.phoneRepresentative')}</FieldDescription>}
          <FieldErrorText error={errors.phone} />
        </Field>
        {roles.includes('DRIVER') && (
          <Field data-invalid={!!errors.driverLicenseNumber}>
            <FieldLabel htmlFor="u-license">{t('users:fields.driverLicenseNumber')}</FieldLabel>
            <Input id="u-license" {...form.register('driverLicenseNumber')} />
            <FieldErrorText error={errors.driverLicenseNumber} />
          </Field>
        )}
        <Field data-invalid={!!errors.notes}>
          <FieldLabel htmlFor="u-notes">{t('users:fields.notes')}</FieldLabel>
          <Textarea id="u-notes" rows={2} {...form.register('notes')} />
          <FieldErrorText error={errors.notes} />
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

const editSchema = z
  .object({
    lastName: z.string().trim().min(1, 'required'),
    firstName: z.string().trim().min(1, 'required'),
    phone: z.string().trim(),
    roles: rolesSchema,
    driverLicenseNumber: z.string().trim(),
    notes: z.string().trim(),
    active: z.boolean(),
  })
  .superRefine((v, ctx) => {
    if (v.roles.includes('REPRESENTATIVE') && !v.phone) ctx.addIssue({ code: 'custom', path: ['phone'], message: 'required' })
    if (v.phone && !PHONE.test(v.phone)) ctx.addIssue({ code: 'custom', path: ['phone'], message: 'phoneUa' })
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
  const isAdminUser = user.roles?.includes('ADMIN') ?? false
  const form = useForm<EditValues>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      lastName: user.lastName ?? '',
      firstName: user.firstName ?? '',
      phone: user.phone ?? '',
      roles: (user.roles ?? []).filter((r): r is Exclude<Role, 'ADMIN'> => r !== 'ADMIN'),
      driverLicenseNumber: user.driverLicenseNumber ?? '',
      notes: user.notes ?? '',
      active: user.active ?? true,
    },
  })
  const { errors, isSubmitting } = form.formState
  const onError = useMutationError(form)
  const roles = form.watch('roles')
  const rolesChanged = JSON.stringify([...roles].sort()) !== JSON.stringify([...(user.roles ?? [])].sort())

  const submit = form.handleSubmit(async (v) => {
    try {
      await update.mutateAsync({
        lastName: v.lastName,
        firstName: v.firstName,
        phone: orUndefined(v.phone),
        roles: isAdminUser ? undefined : v.roles,
        driverLicenseNumber: v.roles.includes('DRIVER') ? orUndefined(v.driverLicenseNumber) : undefined,
        notes: orUndefined(v.notes),
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
        <p className="text-sm text-muted-foreground">{user.email}</p>
        {!isAdminUser && (
          <Controller
            control={form.control}
            name="roles"
            render={({ field }) => (
              <div className="flex flex-col gap-1">
                <RolesField value={field.value} onChange={field.onChange} error={errors.roles} />
                {rolesChanged && <FieldDescription className="text-amber-700">{t('users:hints.rolesChange')}</FieldDescription>}
              </div>
            )}
          />
        )}
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
        {roles.includes('DRIVER') && (
          <Field data-invalid={!!errors.driverLicenseNumber}>
            <FieldLabel htmlFor="ue-license">{t('users:fields.driverLicenseNumber')}</FieldLabel>
            <Input id="ue-license" {...form.register('driverLicenseNumber')} />
            <FieldErrorText error={errors.driverLicenseNumber} />
          </Field>
        )}
        <Field data-invalid={!!errors.notes}>
          <FieldLabel htmlFor="ue-notes">{t('users:fields.notes')}</FieldLabel>
          <Textarea id="ue-notes" rows={2} {...form.register('notes')} />
          <FieldErrorText error={errors.notes} />
        </Field>
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

const resetSchema = z.object({ newPassword: z.string().min(8, 'min8') })
type ResetValues = z.infer<typeof resetSchema>

export function ResetPasswordDialog({ user, onClose }: { user: UserResponse; onClose: () => void }) {
  const { t } = useTranslation(['users', 'common'])
  const reset = useResetUserPassword(user.id!)
  const form = useForm<ResetValues>({ resolver: zodResolver(resetSchema), defaultValues: { newPassword: '' } })
  const { errors, isSubmitting } = form.formState
  const onError = useMutationError(form)

  const submit = form.handleSubmit(async (v) => {
    try {
      await reset.mutateAsync(v.newPassword)
      toast.success(t('users:resetPassword.done'))
      onClose()
    } catch (e) {
      onError(e)
    }
  })

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('users:resetPassword.title', { name: userDisplayName(user) })}</DialogTitle>
          <DialogDescription>{t('users:resetPassword.description')}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} noValidate>
          <FieldGroup>
            <Field data-invalid={!!errors.newPassword}>
              <FieldLabel htmlFor="rp-password">{t('users:resetPassword.newPassword')}</FieldLabel>
              <PasswordInput id="rp-password" autoComplete="off" aria-invalid={!!errors.newPassword} {...form.register('newPassword')} />
              <FieldErrorText error={errors.newPassword} />
            </Field>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={onClose}>
                {t('common:actions.cancel')}
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {t('users:resetPassword.action')}
              </Button>
            </div>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  )
}
