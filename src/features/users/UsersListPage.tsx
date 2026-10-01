import { useTranslation } from 'react-i18next'
import { PageHeader } from '@/components/layout/PageHeader'
import { UsersSection } from './UsersSection'

export function UsersListPage() {
  const { t } = useTranslation('users')
  return (
    <>
      <PageHeader title={t('title')} />
      <UsersSection />
    </>
  )
}
