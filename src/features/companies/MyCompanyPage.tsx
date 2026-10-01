import { RefreshCw } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/features/auth/useAuth'
import { showApiError } from '@/lib/api/problem'
import { NotFoundPage } from '@/routes/ErrorPages'
import { CompanyDetails } from './CompanyDetails'
import { useCompany, useSyncNovaPoshta } from './queries'

export function MyCompanyPage() {
  const { t } = useTranslation(['companies', 'common'])
  const { companyId } = useAuth()
  const query = useCompany(companyId)
  const sync = useSyncNovaPoshta()

  if (query.isPending) return <Skeleton className="h-40 w-full" />
  if (query.isError || !query.data) return <NotFoundPage />

  const onSync = async () => {
    try {
      const r = await sync.mutateAsync()
      toast.success(t('companies:actions.syncDone'), {
        description: t('companies:actions.syncResult', { imported: r.imported ?? 0, tracked: r.tracked ?? 0, failures: r.failures ?? 0 }),
      })
    } catch (e) {
      showApiError(e)
    }
  }

  return (
    <>
      <PageHeader
        title={t('companies:myTitle')}
        actions={
          <Button variant="outline" onClick={onSync} disabled={sync.isPending}>
            <RefreshCw className={sync.isPending ? 'animate-spin' : undefined} />
            {t('companies:actions.sync')}
          </Button>
        }
      />
      <CompanyDetails company={query.data} />
    </>
  )
}
