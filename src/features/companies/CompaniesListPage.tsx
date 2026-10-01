import { Plus } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { DataTable, type Column } from '@/components/common/DataTable'
import { Pagination } from '@/components/common/Pagination'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { useListParams } from '@/hooks/use-list-params'
import { emptyPage } from '@/lib/api/page'
import type { CompanyResponse } from '@/lib/api/types'
import { formatDateTime, formatPhone } from '@/lib/format'
import { CompanyStatusBadge, NpKeyBadge } from './CompanyDetails'
import { CompanyDialog } from './CompanyDialog'
import { useCompanies, useCreateCompany } from './queries'

export function CompaniesListPage() {
  const { t } = useTranslation(['companies', 'common'])
  const navigate = useNavigate()
  const { page, size, setPage, setSize } = useListParams()
  const [creating, setCreating] = useState(false)
  const create = useCreateCompany()

  const query = useCompanies({ page, size })
  const data = query.data ?? emptyPage<CompanyResponse>()

  const columns: Column<CompanyResponse>[] = [
    { key: 'name', header: t('companies:fields.name'), cell: (c) => <span className="font-medium">{c.name}</span> },
    { key: 'edrpou', header: t('companies:fields.edrpou'), cell: (c) => c.edrpou ?? '—' },
    { key: 'phone', header: t('companies:fields.phone'), cell: (c) => formatPhone(c.phone) },
    { key: 'active', header: t('companies:fields.active'), cell: (c) => <CompanyStatusBadge active={c.active} /> },
    { key: 'np', header: t('companies:fields.npKey'), cell: (c) => <NpKeyBadge configured={c.novaPoshtaKeyConfigured} /> },
    { key: 'createdAt', header: t('common:common.createdAt'), cell: (c) => formatDateTime(c.createdAt) },
  ]

  return (
    <>
      <PageHeader
        title={t('companies:title')}
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus />
            {t('common:actions.add')}
          </Button>
        }
      />
      <DataTable
        columns={columns}
        rows={data.content}
        rowKey={(c) => c.id ?? 0}
        onRowClick={(c) => navigate(`/companies/${c.id}`)}
        isLoading={query.isPending}
      />
      <div className="mt-4">
        <Pagination page={data} onPageChange={setPage} onSizeChange={setSize} />
      </div>
      <CompanyDialog
        open={creating}
        onOpenChange={setCreating}
        onSubmit={async (body) => {
          const created = await create.mutateAsync(body)
          navigate(`/companies/${created.id}`)
        }}
      />
    </>
  )
}
