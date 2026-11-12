import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api/client'
import { unwrap } from '@/lib/api/problem'
import type { CashHandoverRequest, Currency, DriverPayoutRequest, DriverPayRateRequest } from '@/lib/api/types'

export type Period = { from: string; to: string }

const reportsKey = ['reports'] as const

/** The cash of the days [from, to]: by person, currency and method, cash still in hand, handovers, every payment. */
export function useCashReport(period: Period) {
  return useQuery({
    queryKey: [...reportsKey, 'cash', period],
    queryFn: () => unwrap(api.GET('/api/reports/cash', { params: { query: period } })),
    placeholderData: keepPreviousData,
  })
}

/** Handed over to the client and not paid: parcels and moves, oldest first. */
export function useDebts() {
  return useQuery({ queryKey: [...reportsKey, 'debts'], queryFn: () => unwrap(api.GET('/api/reports/debts')) })
}

/** The trips that left in the period: carried, earned, driven; by car and by driver. */
export function useTripsReport(period: Period) {
  return useQuery({
    queryKey: [...reportsKey, 'trips', period],
    queryFn: () => unwrap(api.GET('/api/reports/trips', { params: { query: period } })),
    placeholderData: keepPreviousData,
  })
}

/** What lies at each warehouse now. */
export function useWarehousesReport() {
  return useQuery({ queryKey: [...reportsKey, 'warehouses'], queryFn: () => unwrap(api.GET('/api/reports/warehouses')) })
}

/** Not moving for more than {@code days} days, or on Nova Poshta's paid storage. */
export function useStuckReport(days: number) {
  return useQuery({
    queryKey: [...reportsKey, 'stuck', days],
    queryFn: () => unwrap(api.GET('/api/reports/stuck', { params: { query: { days } } })),
    placeholderData: keepPreviousData,
  })
}

/** What each driver earned, spent of their own and was paid in the period; a driver gets only their own. */
export function useDriversReport(period: Period) {
  return useQuery({
    queryKey: [...reportsKey, 'drivers', period],
    queryFn: () => unwrap(api.GET('/api/reports/drivers', { params: { query: period } })),
    placeholderData: keepPreviousData,
  })
}

/** Who ordered in the period, new or back, from which channel; who has gone quiet. */
export function useClientsReport(period: Period) {
  return useQuery({
    queryKey: [...reportsKey, 'clients', period],
    queryFn: () => unwrap(api.GET('/api/reports/clients', { params: { query: period } })),
    placeholderData: keepPreviousData,
  })
}

/** The moves of the period after the loaders; what the loaders are still owed. */
export function useMovesReport(period: Period) {
  return useQuery({
    queryKey: [...reportsKey, 'moves', period],
    queryFn: () => unwrap(api.GET('/api/reports/moves', { params: { query: period } })),
    placeholderData: keepPreviousData,
  })
}

/** Nova Poshta's waybills of the period and what is on its paid storage now. */
export function useNpReport(period: Period) {
  return useQuery({
    queryKey: [...reportsKey, 'np', period],
    queryFn: () => unwrap(api.GET('/api/reports/np', { params: { query: period } })),
    placeholderData: keepPreviousData,
  })
}

export type VolumeGroup = 'DAY' | 'WEEK' | 'MONTH'

/** How much was created and handed over by day, week or month. */
export function useVolumesReport(period: Period, group?: VolumeGroup) {
  return useQuery({
    queryKey: [...reportsKey, 'volumes', period, group],
    queryFn: () => unwrap(api.GET('/api/reports/volumes', { params: { query: { ...period, group } } })),
    placeholderData: keepPreviousData,
  })
}

function useReportMutation<A>(fn: (arg: A) => Promise<unknown>) {
  const queryClient = useQueryClient()
  return useMutation({ mutationFn: fn, onSuccess: () => queryClient.invalidateQueries({ queryKey: reportsKey }) })
}

export const useHandOver = () =>
  useReportMutation((body: CashHandoverRequest) => unwrap(api.POST('/api/reports/cash/handovers', { body })))

export const useDeleteHandover = () =>
  useReportMutation((id: number) => unwrap(api.DELETE('/api/reports/cash/handovers/{id}', { params: { path: { id } } })))

export const useSaveRate = () =>
  useReportMutation(({ userId, id, body }: { userId: number; id?: number; body: DriverPayRateRequest }) =>
    id == null
      ? unwrap(api.POST('/api/reports/drivers/{userId}/rates', { params: { path: { userId } }, body }))
      : unwrap(api.PUT('/api/reports/drivers/{userId}/rates/{id}', { params: { path: { userId, id } }, body })),
  )

export const useDeleteRate = () =>
  useReportMutation(({ userId, id }: { userId: number; id: number }) =>
    unwrap(api.DELETE('/api/reports/drivers/{userId}/rates/{id}', { params: { path: { userId, id } } })),
  )

export const usePayout = () =>
  useReportMutation(({ userId, body }: { userId: number; body: DriverPayoutRequest }) =>
    unwrap(api.POST('/api/reports/drivers/{userId}/payouts', { params: { path: { userId } }, body })),
  )

export const useDeletePayout = () =>
  useReportMutation((id: number) => unwrap(api.DELETE('/api/reports/drivers/payouts/{id}', { params: { path: { id } } })))

/** The company's report currency; the reports are counted again in it. */
export function useSetReportCurrency(companyId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (currency: Currency) =>
      unwrap(api.PUT('/api/companies/{id}/report-currency', { params: { path: { id: companyId }, query: { currency } } })),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] })
      queryClient.invalidateQueries({ queryKey: reportsKey })
    },
  })
}

/** Excel through the authenticated client (the browser cannot send the Bearer header itself). */
export async function downloadCash(period: Period): Promise<void> {
  save(await unwrap(api.GET('/api/reports/cash.xlsx', { params: { query: period }, parseAs: 'blob' })), `cash-${period.from}-${period.to}.xlsx`)
}

export async function downloadDebts(): Promise<void> {
  save(await unwrap(api.GET('/api/reports/debts.xlsx', { parseAs: 'blob' })), `debts-${new Date().toISOString().slice(0, 10)}.xlsx`)
}

export async function downloadTrips(period: Period): Promise<void> {
  save(await unwrap(api.GET('/api/reports/trips.xlsx', { params: { query: period }, parseAs: 'blob' })), `trips-${period.from}-${period.to}.xlsx`)
}

export async function downloadWarehouses(): Promise<void> {
  save(await unwrap(api.GET('/api/reports/warehouses.xlsx', { parseAs: 'blob' })), `warehouses-${new Date().toISOString().slice(0, 10)}.xlsx`)
}

export async function downloadStuck(days: number): Promise<void> {
  save(await unwrap(api.GET('/api/reports/stuck.xlsx', { params: { query: { days } }, parseAs: 'blob' })), `stuck-${new Date().toISOString().slice(0, 10)}.xlsx`)
}

export async function downloadDrivers(period: Period): Promise<void> {
  save(await unwrap(api.GET('/api/reports/drivers.xlsx', { params: { query: period }, parseAs: 'blob' })), `drivers-${period.from}-${period.to}.xlsx`)
}

export async function downloadReport(kind: 'clients' | 'moves' | 'np' | 'volumes', period: Period, group?: VolumeGroup): Promise<void> {
  const opts = { params: { query: { ...period, group } }, parseAs: 'blob' } as const
  const blob = await unwrap(
    kind === 'clients'
      ? api.GET('/api/reports/clients.xlsx', opts)
      : kind === 'moves'
        ? api.GET('/api/reports/moves.xlsx', opts)
        : kind === 'np'
          ? api.GET('/api/reports/np.xlsx', opts)
          : api.GET('/api/reports/volumes.xlsx', opts),
  )
  save(blob, `${kind}-${period.from}-${period.to}.xlsx`)
}

function save(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  URL.revokeObjectURL(url)
}
