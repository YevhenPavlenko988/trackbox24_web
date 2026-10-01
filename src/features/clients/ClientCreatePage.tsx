import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { ClientForm } from './ClientForm'
import { useCreateClient } from './queries'

export function ClientCreatePage() {
  const { t } = useTranslation(['clients', 'common'])
  const navigate = useNavigate()
  const create = useCreateClient()

  return (
    <>
      <PageHeader title={t('clients:createTitle')} />
      <Card className="max-w-3xl">
        <CardContent>
          <ClientForm
            submitLabel={t('common:actions.create')}
            onCancel={() => navigate('/clients')}
            onSubmit={async (body) => {
              const created = await create.mutateAsync(body)
              toast.success(t('common:common.saved'))
              navigate(`/clients/${created.id}`, { replace: true })
            }}
          />
        </CardContent>
      </Card>
    </>
  )
}
