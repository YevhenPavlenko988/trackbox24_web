import { useTranslation } from 'react-i18next'
import { LinkButton } from '@/components/common/LinkButton'

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
