import { useTranslation } from 'react-i18next'
import { PageHeader } from '@/components/layout/PageHeader'
import { useAccess } from '@/features/auth/access'
import { UsersSection } from './UsersSection'

export function UsersListPage() {
  const { t } = useTranslation('users')
  const { companyMode, companyId } = useAccess()
  return (
    <>
      <PageHeader title={t('title')} />
      <UsersSection companyId={companyMode ? companyId : undefined} />
    </>
  )
}
