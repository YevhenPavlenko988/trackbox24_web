import { Eye, Power, PowerOff } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useCompanyView } from '@/features/auth/companyView'
import { UsersSection } from '@/features/users/UsersSection'
import { useListParams } from '@/hooks/use-list-params'
import { showApiError } from '@/lib/api/problem'
import { NotFoundPage } from '@/routes/ErrorPages'
import { CompanyDetails, CompanyStatusBadge } from './CompanyDetails'
import { useCompany, useSetCompanyActive } from './queries'

export function CompanyPage() {
  const { id } = useParams()
  const companyId = Number(id)
  const { t } = useTranslation(['companies', 'common'])
  const query = useCompany(companyId)
  const setActive = useSetCompanyActive(companyId)
  const companyView = useCompanyView()
  const navigate = useNavigate()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const { get, set } = useListParams()
  const tab = get('tab') ?? 'info'

  if (query.isPending) return <Skeleton className="h-40 w-full" />
  if (query.isError || !query.data) return <NotFoundPage />
  const company = query.data

  const toggleActive = async (value: boolean) => {
    try {
      await setActive.mutateAsync(value)
      toast.success(t('common:common.saved'))
      setConfirmOpen(false)
    } catch (e) {
      showApiError(e)
    }
  }

  return (
    <>
      <PageHeader
        title={company.name}
        badges={<CompanyStatusBadge active={company.active} />}
        actions={
          <>
            <Button
              variant="outline"
              onClick={() => {
                companyView.enter({ id: companyId, name: company.name ?? `#${companyId}` })
                navigate('/parcels')
              }}
            >
              <Eye />
              {t('common:companyMode.enter')}
            </Button>
            {company.active === false ? (
              <Button variant="outline" onClick={() => toggleActive(true)} disabled={setActive.isPending}>
                <Power />
                {t('companies:actions.activate')}
              </Button>
            ) : (
              <Button variant="destructive" onClick={() => setConfirmOpen(true)}>
                <PowerOff />
                {t('companies:actions.deactivate')}
              </Button>
            )}
          </>
        }
      />

      <Tabs value={tab} onValueChange={(v) => set({ tab: v === 'info' ? undefined : String(v), page: undefined, role: undefined })}>
        <TabsList>
          <TabsTrigger value="info">{t('companies:tabs.info')}</TabsTrigger>
          <TabsTrigger value="users">{t('companies:tabs.users')}</TabsTrigger>
        </TabsList>
        <TabsContent value="info" className="mt-4">
          <CompanyDetails company={company} />
        </TabsContent>
        <TabsContent value="users" className="mt-4">
          {tab === 'users' && <UsersSection companyId={companyId} />}
        </TabsContent>
      </Tabs>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={t('companies:deactivateConfirm.title')}
        description={t('companies:deactivateConfirm.description')}
        confirmLabel={t('companies:actions.deactivate')}
        destructive
        pending={setActive.isPending}
        onConfirm={() => toggleActive(false)}
      />
    </>
  )
}
