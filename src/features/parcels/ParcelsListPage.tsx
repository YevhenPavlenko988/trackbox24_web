import { AlertCircle, Archive, Banknote, BellRing, Clock, Inbox, Layers, Plus, RefreshCw, Search, SlidersHorizontal, Warehouse, X, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { showApiError } from '@/lib/api/problem'
import { LinkButton } from '@/components/common/LinkButton'
import { Pagination } from '@/components/common/Pagination'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useCurrentCompany } from '@/features/companies/queries'
import { useClaimedCount } from '@/features/payments/queries'
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
import { isNpStateGroup, NP_FILTER_STATES, npStatesOf } from './npStatus'
import { useParcels, useSyncNovaPoshta } from './queries'
import { DEFAULT_PARCEL_TAB, isParcelTab, PARCEL_TABS, TAB_FILTER_STATUSES, TAB_STATUSES, tabForStatus, type ParcelTab } from './tabs'
import { isParcelDeletable } from './status'
import { DeleteEntityButton } from '@/features/trash/DeleteEntityButton'
import { ChannelSelect, isChannel } from '@/features/channels/channel'

const PAID_STORAGE_SORT = 'npPaidStorageFrom,asc'
const TAB_ICONS: Record<ParcelTab, typeof Inbox> = { company: Layers, np: Inbox, archive: Archive }
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
  const company = useCurrentCompany()
  const claimed = useClaimedCount(canSeeMoney && company.data?.onlinePaymentsEnabled === true).data

  const urlQuery = get('query') ?? ''
  const [search, setSearch] = useState(urlQuery)
  const debounced = useDebounce(search)
  useEffect(() => {
    if (debounced !== urlQuery) set({ query: debounced })
  }, [debounced]) // eslint-disable-line react-hooks/exhaustive-deps

  const status = get('status') as ParcelStatus | undefined
  // An old "?status=" link without a tab opens the tab that status belongs to.
  const tab: ParcelTab = isParcelTab(get('tab')) ? (get('tab') as ParcelTab) : (tabForStatus(status) ?? DEFAULT_PARCEL_TAB)
  const clientId = get('clientId') ? Number(get('clientId')) : undefined
  const representativeId = get('representativeId') ? Number(get('representativeId')) : undefined
  const warehouseId = get('warehouseId') ? Number(get('warehouseId')) : undefined
  const paymentStatus = get('paymentStatus') as PaymentStatus | undefined
  // «Повідомили про оплату»: across every tab, a claimed parcel may be anywhere on its way
  const paymentClaimed = get('paymentClaimed') === 'true'
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
  // Nova Poshta's state of the incoming waybill or of our own; an older link may carry a group of states
  const npParam = get('npState')
  const npStates = npStatesOf(npParam)
  const npGroup = npStates ? npParam : undefined
  const npLabel = (v?: string) => (!v ? t('parcels:filters.npStateAll') : isNpStateGroup(v) ? t(`parcels:filters.npState.${v}`) : t(`parcels:npState.${v}`))
  const hasFilters = !!(urlQuery || status || clientId || representativeId || warehouseId || paymentStatus || paymentClaimed || deliveryCity || needsEnrichment || sort || npGroup || channel)

  const query = useParcels({
    // One status narrows inside the tab; otherwise the whole tab is asked for at once.
    status: status ? [status] : paymentClaimed ? undefined : TAB_STATUSES[tab],
    // moves have their own section
    kind: 'PARCEL',
    query: urlQuery,
    clientId,
    representativeId,
    warehouseId,
    paymentStatus,
    paymentClaimed,
    deliveryCity,
    channel,
    npState: npStates,
    needsEnrichment,
    page,
    size,
    sort,
  })
  const data = query.data ?? emptyPage<ParcelResponse>()
  const rows = data.content

  const [rawSelected, setSelected] = useState<Set<string | number>>(new Set())
  const [moving, setMoving] = useState(false)
  // Only rows on the current page count; stale ids from other pages/filters are ignored.
  const visibleIds = new Set(rows.map((p) => p.id ?? 0))
  const selected = new Set([...rawSelected].filter((id) => visibleIds.has(Number(id))))

  const archive = tab === 'archive'
  // the filters under «Ще фільтри», shown as chips once set (the row above shows its own values)
  const chips = [
    deliveryCity && { key: 'city', label: t('parcels:fields.deliveryCity'), value: deliveryCity, clear: () => (setCityInput(''), set({ deliveryCity: undefined })) },
    channel && { key: 'channel', label: t('common:channelField.label'), value: t(`common:channel.${channel}`), clear: () => set({ channel: undefined }) },
    // the archive shows no «Неоплачені» toggle: an unpaid filter carried over is a chip there
    paymentStatus === 'UNPAID' && archive && { key: 'unpaid', label: t('parcels:payment.title'), value: t('parcels:filters.unpaid'), clear: () => set({ paymentStatus: undefined }) },
    paymentStatus === 'PAID' && { key: 'paid', label: t('parcels:payment.title'), value: t('parcels:filters.paid'), clear: () => set({ paymentStatus: undefined }) },
  ].filter(Boolean) as { key: string; label: string; value: string; clear: () => void }[]
  const moreActive = chips.length

  const reset = () => {
    setSearch('')
    setCityInput('')
    set({ query: undefined, deliveryCity: undefined, status: undefined, clientId: undefined, representativeId: undefined, warehouseId: undefined, paymentStatus: undefined, paymentClaimed: undefined, needsEnrichment: undefined, sort: undefined, npState: undefined, channel: undefined })
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

      <Tabs value={tab} onValueChange={(v) =>
          set({
            tab: String(v) === DEFAULT_PARCEL_TAB ? undefined : String(v),
            status: undefined,
            sort: undefined,
            npState: undefined,
            // the archive has no such filters: they must not narrow it unseen
            ...(String(v) === 'archive' ? { representativeId: undefined, warehouseId: undefined, needsEnrichment: undefined } : {}),
          })
        } className="mb-3">
        <TabsList variant="line" className="w-full justify-start border-b">
          {PARCEL_TABS.map((value) => {
            const Icon = TAB_ICONS[value]
            return (
              <TabsTrigger key={value} value={value} className="flex-none px-3 pb-2">
                <Icon />
                {t(`parcels:tabs.${value}`)}
              </TabsTrigger>
            )
          })}
        </TabsList>
      </Tabs>

      {/* filters: the everyday ones in one row, the rare ones under «Ще фільтри», quick toggles and what is on under them */}
      <div className="mb-3 flex flex-col gap-2.5 rounded-xl border bg-card p-3">
        <div className="flex flex-wrap gap-2 [&_[data-slot=select-trigger]]:bg-background">
          {/* the search has the whole first row, so its hint can say everything it looks in; the filters go under it */}
          <div className="relative basis-full">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="bg-background pl-8" placeholder={t('parcels:filters.searchPlaceholder')} value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          {TAB_FILTER_STATUSES[tab].length > 1 && (
            <FilterField label={t('parcels:filters.label.status')} className="min-w-48 flex-[1_1_12rem]">
            <Select value={status ?? ALL} onValueChange={(v) => set({ status: v === ALL || !v ? undefined : String(v) })}>
              <SelectTrigger className="w-full" data-testid="status-filter">
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
            </FilterField>
          )}
          <FilterField label={t('parcels:filters.label.npState')} className="min-w-44 flex-[1_1_11rem]">
          <Select value={npGroup ?? ALL} onValueChange={(v) => set({ npState: v === ALL || !v ? undefined : String(v) })}>
            <SelectTrigger className="w-full" data-testid="np-state-filter">
              <SelectValue>{npLabel(npGroup)}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{t('parcels:filters.npStateAll')}</SelectItem>
              {NP_FILTER_STATES.map((v) => (
                <SelectItem key={v} value={v}>
                  {t(`parcels:npState.${v}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          </FilterField>
          <FilterField label={t('parcels:filters.label.client')} className="min-w-52 flex-[1_1_13rem] [&_button]:bg-background">
            <ClientPicker value={clientId} onChange={(v) => set({ clientId: v })} placeholder={t('parcels:filters.client')} />
          </FilterField>
          {/* who holds it and where: nothing to ask about once it is delivered or cancelled */}
          {!archive && (
            <>
              <FilterField label={t('parcels:filters.label.holder')} className="min-w-48 flex-[1_1_12rem]">
                <UserSelect role={['REPRESENTATIVE', 'DRIVER']} value={representativeId} onChange={(v) => set({ representativeId: v })} noneLabel={t('parcels:filters.allRepresentatives')} className="w-full" />
              </FilterField>
              <FilterField label={t('parcels:filters.label.warehouse')} className="min-w-44 flex-[1_1_11rem]">
                <WarehouseSelect value={warehouseId} onChange={(v) => set({ warehouseId: v })} noneLabel={t('parcels:filters.allWarehouses')} />
              </FilterField>
            </>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* the archive is for looking things up: details to add and debts are the work of the other tabs */}
          {!archive && (
            <Toggle on={!!needsEnrichment} icon={AlertCircle} onClick={() => set({ needsEnrichment: needsEnrichment ? undefined : true })}>
              {t('parcels:filters.needsEnrichment')}
            </Toggle>
          )}
          {tab === 'np' && (
            <Toggle on={paidStorage} icon={Clock} onClick={() => set({ sort: paidStorage ? undefined : PAID_STORAGE_SORT })}>
              {t('parcels:filters.paidStorage')}
            </Toggle>
          )}
          {canSeeMoney && !archive && (
            <Toggle on={paymentStatus === 'UNPAID'} icon={Banknote} onClick={() => set({ paymentStatus: paymentStatus === 'UNPAID' ? undefined : 'UNPAID' })}>
              {t('parcels:filters.unpaid')}
            </Toggle>
          )}
          {canSeeMoney && (paymentClaimed || (claimed?.parcels ?? 0) > 0) && (
            <Toggle on={paymentClaimed} icon={BellRing} onClick={() => set({ paymentClaimed: paymentClaimed ? undefined : 'true' })}>
              {t('parcels:filters.paymentClaimed')}
              {(claimed?.parcels ?? 0) > 0 && <span className="rounded-full bg-amber-400 px-1.5 text-xs text-amber-950">{claimed?.parcels}</span>}
            </Toggle>
          )}
          <span className="ml-auto text-sm text-muted-foreground">{t('parcels:list.found', { count: data.totalElements ?? 0 })}</span>
          <Popover>
            <PopoverTrigger render={<Button size="sm" variant="outline" className="bg-background" />}>
              <SlidersHorizontal />
              {t('parcels:list.moreFilters')}
              {moreActive > 0 && <span className="rounded-full bg-primary px-1.5 text-xs text-primary-foreground">{moreActive}</span>}
            </PopoverTrigger>
            <PopoverContent align="end" className="flex w-80 flex-col gap-3 [&_[data-slot=select-trigger]]:w-full">
              <FilterField label={t('parcels:fields.deliveryCity')}>
                <Input placeholder={t('parcels:filters.deliveryCity')} value={cityInput} onChange={(e) => setCityInput(e.target.value)} />
              </FilterField>
              <FilterField label={t('common:channelField.label')}>
                <ChannelSelect className="w-full" value={channel ?? ''} onChange={(v) => set({ channel: v })} noneLabel={t('common:channelField.all')} />
              </FilterField>
              {canSeeMoney && (
                <FilterField label={t('parcels:payment.title')}>
                  <Select value={paymentStatus ?? ALL} onValueChange={(v) => set({ paymentStatus: v === ALL || !v ? undefined : String(v) })}>
                    <SelectTrigger>
                      <SelectValue>{paymentStatus ? t(`parcels:filters.${paymentStatus === 'PAID' ? 'paid' : 'unpaid'}`) : t('parcels:filters.allPayments')}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL}>{t('parcels:filters.allPayments')}</SelectItem>
                      <SelectItem value="UNPAID">{t('parcels:filters.unpaid')}</SelectItem>
                      <SelectItem value="PAID">{t('parcels:filters.paid')}</SelectItem>
                    </SelectContent>
                  </Select>
                </FilterField>
              )}
            </PopoverContent>
          </Popover>
        </div>

        {/* what narrows the list beyond the row above: each with its own ×, and «reset» for all */}
        {(chips.length > 0 || hasFilters) && (
          <div className="flex flex-wrap items-center gap-1.5 border-t pt-2.5">
            {chips.map((c) => (
              <span key={c.key} className="inline-flex items-center gap-1 rounded-full border bg-background py-0.5 pr-1 pl-2.5 text-xs">
                <span className="text-muted-foreground">{c.label}:</span>
                <span className="font-medium">{c.value}</span>
                <button type="button" className="rounded-full p-0.5 hover:bg-muted" aria-label={t('parcels:list.removeFilter', { name: c.label })} onClick={c.clear}>
                  <X className="size-3" />
                </button>
              </span>
            ))}
            {hasFilters && (
              <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={reset}>
                <X />
                {t('parcels:list.resetAll')}
              </Button>
            )}
          </div>
        )}
      </div>

      {canEdit && selected.size > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm">
          <span className="font-medium">{t('parcels:selection.count', { count: selected.size })}</span>
          <Button size="sm" onClick={() => setMoving(true)}>
            <Warehouse />
            {t('warehouses:move.action', { ns: 'warehouses' })}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
            {t('common:actions.clear')}
          </Button>
        </div>
      )}

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

/** A labelled field of the «Ще фільтри» popover. */
function FilterField({ label, children, className }: { label: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </div>
  )
}

/** A quick on/off filter: outlined when off, filled when on. */
function Toggle({ on, icon: Icon, onClick, children }: { on: boolean; icon: LucideIcon; onClick: () => void; children: ReactNode }) {
  return (
    <Button size="sm" variant={on ? 'default' : 'outline'} className={on ? undefined : 'bg-background'} onClick={onClick} aria-pressed={on}>
      <Icon />
      {children}
    </Button>
  )
}
