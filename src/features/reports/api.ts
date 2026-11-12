import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api/client'
import { unwrap } from '@/lib/api/problem'
import type { CashHandoverRequest, Currency } from '@/lib/api/types'

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

function useReportMutation<A>(fn: (arg: A) => Promise<unknown>) {
  const queryClient = useQueryClient()
  return useMutation({ mutationFn: fn, onSuccess: () => queryClient.invalidateQueries({ queryKey: reportsKey }) })
}

export const useHandOver = () =>
  useReportMutation((body: CashHandoverRequest) => unwrap(api.POST('/api/reports/cash/handovers', { body })))

export const useDeleteHandover = () =>
  useReportMutation((id: number) => unwrap(api.DELETE('/api/reports/cash/handovers/{id}', { params: { path: { id } } })))

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

function save(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  URL.revokeObjectURL(url)
}
