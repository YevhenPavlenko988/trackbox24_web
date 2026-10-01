import { useTranslation } from 'react-i18next'
import { PageHeader } from '@/components/layout/PageHeader'

export function PlaceholderPage({ titleKey }: { titleKey: string }) {
  const { t } = useTranslation()
  return (
    <>
      <PageHeader title={t(titleKey)} />
      <p className="text-muted-foreground">{t('common.empty')}</p>
    </>
  )
}
