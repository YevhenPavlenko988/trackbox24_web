import { Smartphone } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { LinkButton } from '@/components/common/LinkButton'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/features/auth/useAuth'

function ErrorPage({ code, message }: { code: number; message: string }) {
  const { t } = useTranslation()
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <p className="text-6xl font-semibold text-muted-foreground">{code}</p>
      <p className="text-lg">{message}</p>
      <LinkButton variant="outline" to="/">
        {t('actions.back')}
      </LinkButton>
    </div>
  )
}

export function NotFoundPage() {
  const { t } = useTranslation()
  return <ErrorPage code={404} message={t('common.notFound')} />
}

export function ForbiddenPage() {
  const { t } = useTranslation()
  return <ErrorPage code={403} message={t('common.forbidden')} />
}

/** Shown to users whose only roles are REPRESENTATIVE/DRIVER — their tool is the mobile app. */
export function MobileOnlyPage() {
  const { t } = useTranslation()
  const { logout } = useAuth()
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <Smartphone className="size-12 text-muted-foreground" />
      <p className="text-lg font-medium">{t('mobileOnly.title')}</p>
      <p className="max-w-md text-sm text-muted-foreground">{t('mobileOnly.description')}</p>
      <Button variant="outline" onClick={logout}>
        {t('nav.logout')}
      </Button>
    </div>
  )
}
