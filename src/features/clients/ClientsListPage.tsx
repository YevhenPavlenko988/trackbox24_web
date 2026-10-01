import { Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { DataTable, type Column } from '@/components/common/DataTable'
import { LinkButton } from '@/components/common/LinkButton'
import { Pagination } from '@/components/common/Pagination'
import { PageHeader } from '@/components/layout/PageHeader'
import { Input } from '@/components/ui/input'
import { useAccess } from '@/features/auth/access'
import { useDebounce } from '@/hooks/use-debounce'
import { useListParams } from '@/hooks/use-list-params'
import { emptyPage } from '@/lib/api/page'
import type { ClientResponse } from '@/lib/api/types'
import { formatPhone } from '@/lib/format'
import { clientDisplayName } from './api'
import { useClients } from './queries'

export function ClientsListPage() {
  const { t } = useTranslation(['clients', 'common'])
  const navigate = useNavigate()
  const { canEdit } = useAccess()
  const { page, size, get, set, setPage, setSize } = useListParams()

  const urlSearch = get('search') ?? ''
  const [search, setSearch] = useState(urlSearch)
  const debounced = useDebounce(search)
  useEffect(() => {
    if (debounced !== urlSearch) set({ search: debounced })
  }, [debounced]) // eslint-disable-line react-hooks/exhaustive-deps

  const query = useClients({ search: urlSearch, page, size })
  const data = query.data ?? emptyPage<ClientResponse>()

  const columns: Column<ClientResponse>[] = [
    { key: 'name', header: t('clients:fields.name'), cell: (c) => <span className="font-medium">{clientDisplayName(c)}</span> },
    { key: 'type', header: t('clients:fields.type'), cell: (c) => (c.type ? t(`common:clientType.${c.type}`) : '—') },
    { key: 'phone', header: t('clients:fields.phone'), cell: (c) => formatPhone(c.phone) },
    { key: 'city', header: t('clients:fields.city'), cell: (c) => c.city ?? '—' },
  ]

  return (
    <>
      <PageHeader
        title={t('clients:title')}
        actions={
          canEdit && (
            <LinkButton to="/clients/new">
              <Plus />
              {t('common:actions.add')}
            </LinkButton>
          )
        }
      />
      <div className="mb-4 flex gap-2">
        <Input
          className="max-w-sm"
          placeholder={t('clients:searchPlaceholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <DataTable
        columns={columns}
        rows={data.content}
        rowKey={(c) => c.id ?? 0}
        onRowClick={(c) => navigate(`/clients/${c.id}`)}
        isLoading={query.isPending}
      />
      <div className="mt-4">
        <Pagination page={data} onPageChange={setPage} onSizeChange={setSize} />
      </div>
    </>
  )
}
