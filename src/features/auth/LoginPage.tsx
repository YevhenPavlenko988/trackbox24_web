import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router'
import { z } from 'zod'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LEGAL_DOCS } from '@/features/landing/legal/docs'
import { isApiError, showApiError } from '@/lib/api/problem'
import { login as loginRequest } from './api'
import { getRememberedEmail, setRememberedEmail } from './rememberedEmail'
import { useAuth } from './useAuth'

const schema = z.object({
  email: z.email(),
  password: z.string().min(1),
})

type FormValues = z.infer<typeof schema>

export function LoginPage() {
  const { t } = useTranslation(['auth', 'common'])
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const [failed, setFailed] = useState(false)
  const [blocked, setBlocked] = useState<string>()
  const [remembered] = useState(getRememberedEmail)
  const [remember, setRemember] = useState(remembered !== '')

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: remembered, password: '' },
  })
  const { errors, isSubmitting } = form.formState

  const onSubmit = form.handleSubmit(async (values) => {
    setFailed(false)
    setBlocked(undefined)
    try {
      const { accessToken } = await loginRequest(values)
      setRememberedEmail(remember ? values.email.trim() : null)
      await login(accessToken)
      const from = (location.state as { from?: string } | null)?.from
      navigate(from ?? '/', { replace: true })
    } catch (e) {
      if (isApiError(e) && e.status === 401) setFailed(true)
      // the company's access is restricted for non-payment: the backend says so and what to do
      else if (isApiError(e) && e.status === 403 && e.detail) setBlocked(e.detail)
      else showApiError(e)
    }
  })

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-muted/40 p-4">
      <Link to="/" title={t('auth:toSite')}>
        <img src="/logo-full.png" alt="TrackBox24" className="h-24 w-auto" />
      </Link>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{t('auth:title')}</CardTitle>
          <CardDescription>{t('auth:subtitle')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} noValidate>
            <FieldGroup>
              {searchParams.get('reason') === 'expired' && !failed && (
                <Alert>
                  <AlertDescription>{t('auth:sessionExpired')}</AlertDescription>
                </Alert>
              )}
              {blocked && (
                <Alert variant="destructive">
                  <AlertDescription>{blocked}</AlertDescription>
                </Alert>
              )}
              {failed && (
                <Alert variant="destructive">
                  <AlertDescription>{t('auth:invalidCredentials')}</AlertDescription>
                </Alert>
              )}
              <Field data-invalid={!!errors.email}>
                <FieldLabel htmlFor="email">{t('auth:email')}</FieldLabel>
                <Input id="email" type="email" autoComplete="username" autoFocus={!remembered} aria-invalid={!!errors.email} {...form.register('email')} />
                {errors.email && <FieldError>{t('common:errors.email')}</FieldError>}
              </Field>
              <Field data-invalid={!!errors.password}>
                <FieldLabel htmlFor="password">{t('auth:password')}</FieldLabel>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  autoFocus={!!remembered}
                  aria-invalid={!!errors.password}
                  {...form.register('password')}
                />
                {errors.password && <FieldError>{t('common:errors.required')}</FieldError>}
              </Field>
              <Label htmlFor="remember" className="flex items-center gap-2 font-normal">
                <Checkbox id="remember" checked={remember} onCheckedChange={(c) => setRemember(c === true)} />
                {t('auth:remember')}
              </Label>
              <Button type="submit" disabled={isSubmitting} className="w-full">
                {t('auth:submit')}
              </Button>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
      <nav className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {LEGAL_DOCS.map((d) => (
          <Link key={d.path} to={d.path} className="hover:text-foreground">
            {d.title}
          </Link>
        ))}
      </nav>
    </div>
  )
}
