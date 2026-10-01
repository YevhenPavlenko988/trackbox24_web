import { Plus, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { LinkButton } from '@/components/common/LinkButton'
import { Pagination } from '@/components/common/Pagination'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ClientPicker } from '@/features/clients/ClientPicker'
import { UserSelect } from '@/features/users/UserSelect'
import { useDebounce } from '@/hooks/use-debounce'
import { useListParams } from '@/hooks/use-list-params'
import { emptyPage } from '@/lib/api/page'
import type { ParcelResponse, ParcelStatus } from '@/lib/api/types'
import { ParcelsTable } from './ParcelsTable'
import { ParcelStatusSelect } from './ParcelStatusSelect'
import { useParcels } from './queries'

const PAID_STORAGE_SORT = 'npPaidStorageFrom,asc'

export function ParcelsListPage() {
  const { t } = useTranslation(['parcels', 'common'])
  const { page, size, sort, get, set, setPage, setSize } = useListParams()

  const urlQuery = get('query') ?? ''
  const [search, setSearch] = useState(urlQuery)
  const debounced = useDebounce(search)
  useEffect(() => {
    if (debounced !== urlQuery) set({ query: debounced })
  }, [debounced]) // eslint-disable-line react-hooks/exhaustive-deps

  const status = get('status') as ParcelStatus | undefined
  const clientId = get('clientId') ? Number(get('clientId')) : undefined
  const representativeId = get('representativeId') ? Number(get('representativeId')) : undefined
  const needsEnrichment = get('needsEnrichment') === 'true' ? true : undefined
  const paidStorage = status === 'IN_NOVA_POSHTA' && sort === PAID_STORAGE_SORT
  const hasFilters = !!(urlQuery || status || clientId || representativeId || needsEnrichment || sort)

  const query = useParcels({ query: urlQuery, status, clientId, representativeId, needsEnrichment, page, size, sort })
  const data = query.data ?? emptyPage<ParcelResponse>()

  const reset = () => {
    setSearch('')
    set({ query: undefined, status: undefined, clientId: undefined, representativeId: undefined, needsEnrichment: undefined, sort: undefined })
  }

  return (
    <>
      <PageHeader
        title={t('parcels:title')}
        actions={
          <LinkButton to="/parcels/new">
            <Plus />
            {t('common:actions.add')}
          </LinkButton>
        }
      />

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Input
          className="w-72"
          placeholder={t('parcels:filters.searchPlaceholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <ParcelStatusSelect value={status} onChange={(v) => set({ status: v, sort: undefined })} />
        <UserSelect role="REPRESENTATIVE" value={representativeId} onChange={(v) => set({ representativeId: v })} />
        <div className="w-64">
          <ClientPicker value={clientId} onChange={(v) => set({ clientId: v })} placeholder={t('parcels:filters.client')} />
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant={needsEnrichment ? 'default' : 'outline'}
          onClick={() => set({ needsEnrichment: needsEnrichment ? undefined : true })}
        >
          {t('parcels:filters.needsEnrichment')}
        </Button>
        <Button
          size="sm"
          variant={paidStorage ? 'default' : 'outline'}
          onClick={() =>
            paidStorage
              ? set({ status: undefined, sort: undefined })
              : set({ status: 'IN_NOVA_POSHTA', sort: PAID_STORAGE_SORT })
          }
        >
          {t('parcels:filters.paidStorage')}
        </Button>
        {hasFilters && (
          <Button size="sm" variant="ghost" onClick={reset}>
            <X />
            {t('common:actions.reset')}
          </Button>
        )}
      </div>

      <ParcelsTable rows={data.content} isLoading={query.isPending} />
      <div className="mt-4">
        <Pagination page={data} onPageChange={setPage} onSizeChange={setSize} />
      </div>
    </>
  )
}
