import { Plus, Warehouse, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { LinkButton } from '@/components/common/LinkButton'
import { Pagination } from '@/components/common/Pagination'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAccess } from '@/features/auth/access'
import { ClientPicker } from '@/features/clients/ClientPicker'
import { UserSelect } from '@/features/users/UserSelect'
import { MoveToWarehouseDialog } from '@/features/warehouses/MoveToWarehouseDialog'
import { WarehouseSelect } from '@/features/warehouses/WarehouseSelect'
import { useDebounce } from '@/hooks/use-debounce'
import { useListParams } from '@/hooks/use-list-params'
import { emptyPage } from '@/lib/api/page'
import type { ParcelResponse, ParcelStatus, PaymentStatus } from '@/lib/api/types'
import { ParcelsTable } from './ParcelsTable'
import { ParcelStatusSelect } from './ParcelStatusSelect'
import { useParcels } from './queries'

const PAID_STORAGE_SORT = 'npPaidStorageFrom,asc'
const ALL = '__all__'

export function ParcelsListPage() {
  const { t } = useTranslation(['parcels', 'common'])
  const { canEdit, canSeeMoney } = useAccess()
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
  const warehouseId = get('warehouseId') ? Number(get('warehouseId')) : undefined
  const paymentStatus = get('paymentStatus') as PaymentStatus | undefined
  const needsEnrichment = get('needsEnrichment') === 'true' ? true : undefined
  const paidStorage = status === 'IN_NOVA_POSHTA' && sort === PAID_STORAGE_SORT
  const hasFilters = !!(urlQuery || status || clientId || representativeId || warehouseId || paymentStatus || needsEnrichment || sort)

  const query = useParcels({ query: urlQuery, status, clientId, representativeId, warehouseId, paymentStatus, needsEnrichment, page, size, sort })
  const data = query.data ?? emptyPage<ParcelResponse>()

  const [selected, setSelected] = useState<Set<string | number>>(new Set())
  const [moving, setMoving] = useState(false)
  useEffect(() => setSelected(new Set()), [query.data])

  const reset = () => {
    setSearch('')
    set({ query: undefined, status: undefined, clientId: undefined, representativeId: undefined, warehouseId: undefined, paymentStatus: undefined, needsEnrichment: undefined, sort: undefined })
  }

  return (
    <>
      <PageHeader
        title={t('parcels:title')}
        actions={
          canEdit && (
            <LinkButton to="/parcels/new">
              <Plus />
              {t('common:actions.add')}
            </LinkButton>
          )
        }
      />

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Input className="w-72" placeholder={t('parcels:filters.searchPlaceholder')} value={search} onChange={(e) => setSearch(e.target.value)} />
        <ParcelStatusSelect value={status} onChange={(v) => set({ status: v, sort: undefined })} />
        <UserSelect role="REPRESENTATIVE" value={representativeId} onChange={(v) => set({ representativeId: v })} />
        <div className="w-56">
          <WarehouseSelect value={warehouseId} onChange={(v) => set({ warehouseId: v })} noneLabel={t('parcels:filters.allWarehouses')} />
        </div>
        {canSeeMoney && (
          <Select value={paymentStatus ?? ALL} onValueChange={(v) => set({ paymentStatus: v === ALL || !v ? undefined : String(v) })}>
            <SelectTrigger className="w-44">
              <SelectValue>{paymentStatus ? t(`parcels:filters.${paymentStatus === 'PAID' ? 'paid' : 'unpaid'}`) : t('parcels:filters.allPayments')}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{t('parcels:filters.allPayments')}</SelectItem>
              <SelectItem value="UNPAID">{t('parcels:filters.unpaid')}</SelectItem>
              <SelectItem value="PAID">{t('parcels:filters.paid')}</SelectItem>
            </SelectContent>
          </Select>
        )}
        <div className="w-64">
          <ClientPicker value={clientId} onChange={(v) => set({ clientId: v })} placeholder={t('parcels:filters.client')} />
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Button size="sm" variant={needsEnrichment ? 'default' : 'outline'} onClick={() => set({ needsEnrichment: needsEnrichment ? undefined : true })}>
          {t('parcels:filters.needsEnrichment')}
        </Button>
        <Button
          size="sm"
          variant={paidStorage ? 'default' : 'outline'}
          onClick={() => (paidStorage ? set({ status: undefined, sort: undefined }) : set({ status: 'IN_NOVA_POSHTA', sort: PAID_STORAGE_SORT }))}
        >
          {t('parcels:filters.paidStorage')}
        </Button>
        {hasFilters && (
          <Button size="sm" variant="ghost" onClick={reset}>
            <X />
            {t('common:actions.reset')}
          </Button>
        )}
        {canEdit && selected.size > 0 && (
          <div className="ml-auto flex items-center gap-2 rounded-md bg-muted px-3 py-1 text-sm">
            <span>{t('parcels:selection.count', { count: selected.size })}</span>
            <Button size="sm" onClick={() => setMoving(true)}>
              <Warehouse />
              {t('warehouses:move.action', { ns: 'warehouses' })}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
              {t('common:actions.clear')}
            </Button>
          </div>
        )}
      </div>

      <ParcelsTable rows={data.content} isLoading={query.isPending} selection={canEdit ? { selected, onChange: setSelected } : undefined} />
      <div className="mt-4">
        <Pagination page={data} onPageChange={setPage} onSizeChange={setSize} />
      </div>

      <MoveToWarehouseDialog open={moving} onOpenChange={setMoving} parcelIds={[...selected].map(Number)} onMoved={() => setSelected(new Set())} />
    </>
  )
}
