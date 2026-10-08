import { Plus, RefreshCw, Warehouse, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { showApiError } from '@/lib/api/problem'
import { LinkButton } from '@/components/common/LinkButton'
import { Pagination } from '@/components/common/Pagination'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useAccess } from '@/features/auth/access'
import { ClientPicker } from '@/features/clients/ClientPicker'
import { UserSelect } from '@/features/users/UserSelect'
import { MoveToWarehouseDialog } from '@/features/warehouses/MoveToWarehouseDialog'
import { WarehouseSelect } from '@/features/warehouses/WarehouseSelect'
import { useDebounce } from '@/hooks/use-debounce'
import { useListParams } from '@/hooks/use-list-params'
import { emptyPage } from '@/lib/api/page'
import type { ParcelResponse, ParcelStatus, PaymentStatus } from '@/lib/api/types'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ParcelsTable } from './ParcelsTable'
import { inNpStateGroup, isNpStateGroup, NP_STATE_GROUPS, type NpStateGroup } from './npStatus'
import { useParcels, useSyncNovaPoshta } from './queries'
import { isParcelTab, PARCEL_TABS, TAB_FILTER_STATUSES, TAB_STATUSES, tabForStatus, type ParcelTab } from './tabs'
import { isParcelDeletable } from './status'
import { DeleteEntityButton } from '@/features/trash/DeleteEntityButton'
import { ChannelSelect, isChannel } from '@/features/channels/channel'

const PAID_STORAGE_SORT = 'npPaidStorageFrom,asc'
const ALL = '__all__'

export function ParcelsListPage() {
  const { t } = useTranslation(['parcels', 'common'])
  const { canEdit, canSeeMoney, isManager, companyMode } = useAccess()
  const sync = useSyncNovaPoshta()
  const onSync = async () => {
    try {
      const r = await sync.mutateAsync()
      const summary = t('parcels:actions.syncNpDone', { imported: r.imported ?? 0, tracked: r.tracked ?? 0 })
      if (r.failures) toast.warning(summary, { description: t('parcels:actions.syncNpFailures', { failures: r.failures }) })
      else toast.success(summary)
    } catch (e) {
      showApiError(e)
    }
  }
  const { page, size, sort, get, set, setPage, setSize } = useListParams()

  const urlQuery = get('query') ?? ''
  const [search, setSearch] = useState(urlQuery)
  const debounced = useDebounce(search)
  useEffect(() => {
    if (debounced !== urlQuery) set({ query: debounced })
  }, [debounced]) // eslint-disable-line react-hooks/exhaustive-deps

  const status = get('status') as ParcelStatus | undefined
  // An old "?status=" link without a tab opens the tab that status belongs to.
  const tab: ParcelTab = isParcelTab(get('tab')) ? (get('tab') as ParcelTab) : (tabForStatus(status) ?? 'np')
  const clientId = get('clientId') ? Number(get('clientId')) : undefined
  const representativeId = get('representativeId') ? Number(get('representativeId')) : undefined
  const warehouseId = get('warehouseId') ? Number(get('warehouseId')) : undefined
  const paymentStatus = get('paymentStatus') as PaymentStatus | undefined
  const channelParam = get('channel')
  const channel = isChannel(channelParam) ? channelParam : undefined
  const deliveryCity = get('deliveryCity') ?? ''
  const [cityInput, setCityInput] = useState(deliveryCity)
  const debouncedCity = useDebounce(cityInput)
  useEffect(() => {
    if (debouncedCity !== deliveryCity) set({ deliveryCity: debouncedCity || undefined })
  }, [debouncedCity]) // eslint-disable-line react-hooks/exhaustive-deps
  const needsEnrichment = get('needsEnrichment') === 'true' ? true : undefined
  const paidStorage = sort === PAID_STORAGE_SORT
  // No backend filter by npState yet: filter the loaded page on the client, with a bigger page so it is useful.
  const npGroupParam = get('npState')
  const npGroup: NpStateGroup | undefined = isNpStateGroup(npGroupParam) ? npGroupParam : undefined
  const hasFilters = !!(urlQuery || status || clientId || representativeId || warehouseId || paymentStatus || deliveryCity || needsEnrichment || sort || npGroup || channel)

  const query = useParcels({
    // One status narrows inside the tab; otherwise the whole tab is asked for at once.
    status: status ? [status] : TAB_STATUSES[tab],
    query: urlQuery,
    clientId,
    representativeId,
    warehouseId,
    paymentStatus,
    deliveryCity,
    channel,
    needsEnrichment,
    page,
    size,
    sort,
  })
  const data = query.data ?? emptyPage<ParcelResponse>()
  const rows = npGroup ? data.content.filter((p) => inNpStateGroup(p, npGroup)) : data.content

  const [rawSelected, setSelected] = useState<Set<string | number>>(new Set())
  const [moving, setMoving] = useState(false)
  // Only rows on the current page count; stale ids from other pages/filters are ignored.
  const visibleIds = new Set(rows.map((p) => p.id ?? 0))
  const selected = new Set([...rawSelected].filter((id) => visibleIds.has(Number(id))))

  const reset = () => {
    setSearch('')
    setCityInput('')
    set({ query: undefined, deliveryCity: undefined, status: undefined, clientId: undefined, representativeId: undefined, warehouseId: undefined, paymentStatus: undefined, needsEnrichment: undefined, sort: undefined, npState: undefined, channel: undefined })
  }

  return (
    <>
      <PageHeader
        title={t('parcels:title')}
        actions={
          <>
            {isManager && !companyMode && (
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button variant="outline" onClick={onSync} disabled={sync.isPending} data-testid="np-sync">
                      <RefreshCw className={sync.isPending ? 'animate-spin' : undefined} />
                      {t('parcels:actions.syncNp')}
                    </Button>
                  }
                />
                <TooltipContent className="max-w-xs">{t('parcels:actions.syncNpHint')}</TooltipContent>
              </Tooltip>
            )}
            {canEdit && (
              <LinkButton to="/parcels/new">
                <Plus />
                {t('common:actions.add')}
              </LinkButton>
            )}
          </>
        }
      />

      <Tabs value={tab} onValueChange={(v) => set({ tab: String(v) === 'np' ? undefined : String(v), status: undefined, sort: undefined, npState: undefined })} className="mb-4">
        <TabsList>
          {PARCEL_TABS.map((value) => (
            <TabsTrigger key={value} value={value}>
              {t(`parcels:tabs.${value}`)}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Input className="w-72" placeholder={t('parcels:filters.searchPlaceholder')} value={search} onChange={(e) => setSearch(e.target.value)} />
        {TAB_FILTER_STATUSES[tab].length > 1 && (
          <Select value={status ?? ALL} onValueChange={(v) => set({ status: v === ALL || !v ? undefined : String(v) })}>
            <SelectTrigger className="w-56" data-testid="status-filter">
              <SelectValue>{status ? t(`common:parcelStatus.${status}`) : t('parcels:filters.allStatuses')}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{t('parcels:filters.allStatuses')}</SelectItem>
              {TAB_FILTER_STATUSES[tab].map((v) => (
                <SelectItem key={v} value={v}>
                  {t(`common:parcelStatus.${v}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <UserSelect role="REPRESENTATIVE" value={representativeId} onChange={(v) => set({ representativeId: v })} noneLabel={t('parcels:filters.allRepresentatives')} />
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
        {tab === 'np' && (
        <Select value={npGroup ?? ALL} onValueChange={(v) => set({ npState: v === ALL || !v ? undefined : String(v) })}>
          <SelectTrigger className="w-56" data-testid="np-state-filter">
            <SelectValue>{npGroup ? t(`parcels:filters.npState.${npGroup}`) : t('parcels:filters.npStateAll')}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t('parcels:filters.npStateAll')}</SelectItem>
            {(Object.keys(NP_STATE_GROUPS) as NpStateGroup[]).map((g) => (
              <SelectItem key={g} value={g}>
                {t(`parcels:filters.npState.${g}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        )}
        <ChannelSelect className="w-44" value={channel ?? ''} onChange={(v) => set({ channel: v })} noneLabel={t('common:channelField.all')} />
        <Input className="w-44" placeholder={t('parcels:filters.deliveryCity')} value={cityInput} onChange={(e) => setCityInput(e.target.value)} />
        <div className="w-64">
          <ClientPicker value={clientId} onChange={(v) => set({ clientId: v })} placeholder={t('parcels:filters.client')} />
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Button size="sm" variant={needsEnrichment ? 'default' : 'outline'} onClick={() => set({ needsEnrichment: needsEnrichment ? undefined : true })}>
          {t('parcels:filters.needsEnrichment')}
        </Button>
        {tab === 'np' && (
          <Button size="sm" variant={paidStorage ? 'default' : 'outline'} onClick={() => set({ sort: paidStorage ? undefined : PAID_STORAGE_SORT })}>
            {t('parcels:filters.paidStorage')}
          </Button>
        )}
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

      <ParcelsTable
        rows={rows}
        isLoading={query.isPending}
        selection={canEdit ? { selected, onChange: setSelected } : undefined}
        actions={canEdit ? (p) => (isParcelDeletable(p) ? <DeleteEntityButton entity="parcels" id={p.id!} iconOnly /> : null) : undefined}
      />
      <div className="mt-4">
        <Pagination page={data} onPageChange={setPage} onSizeChange={setSize} />
      </div>

      <MoveToWarehouseDialog open={moving} onOpenChange={setMoving} parcelIds={[...selected].map(Number)} onMoved={() => setSelected(new Set())} />
    </>
  )
}
