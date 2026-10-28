import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { companyKeys } from '@/features/companies/queries'
import { crmKeys } from '@/features/crm/queries'
import type { BillingItem, InvoicePaymentRequest } from '@/lib/api/types'
import {
  cancelInvoice,
  generateInvoices,
  getCompanyBilling,
  invoiceSummary,
  listInvoices,
  listPrices,
  payInvoice,
  recalculateInvoice,
  sendInvoice,
  setPrice,
  setTrial,
  type InvoiceFilters,
} from './api'

export const billingKeys = {
  all: ['billing'] as const,
  prices: ['billing', 'prices'] as const,
  company: (id: number) => ['billing', 'company', id] as const,
  invoices: (f: InvoiceFilters) => ['billing', 'invoices', f] as const,
  summary: ['billing', 'summary'] as const,
}

/**
 * A payment or a cancellation may lift a company's restriction and close its overdue task,
 * so the companies and the CRM board are refreshed along with the billing.
 */
function useBillingMutation<A, R>(fn: (arg: A) => Promise<R>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: billingKeys.all })
      queryClient.invalidateQueries({ queryKey: companyKeys.all })
      queryClient.invalidateQueries({ queryKey: crmKeys.all })
    },
  })
}

export const usePrices = () => useQuery({ queryKey: billingKeys.prices, queryFn: listPrices })
export const useCompanyBilling = (id: number) => useQuery({ queryKey: billingKeys.company(id), queryFn: () => getCompanyBilling(id) })
export const useInvoices = (f: InvoiceFilters) =>
  useQuery({ queryKey: billingKeys.invoices(f), queryFn: () => listInvoices(f), placeholderData: keepPreviousData })
export const useInvoiceSummary = () => useQuery({ queryKey: billingKeys.summary, queryFn: invoiceSummary })

export const useSetPrice = () => useBillingMutation(({ code, amountEur }: { code: BillingItem; amountEur: number }) => setPrice(code, amountEur))
export const useSetTrial = (companyId: number) => useBillingMutation((trialEndsOn: string | null) => setTrial(companyId, trialEndsOn))
export const useGenerateInvoices = () => useBillingMutation((period: string) => generateInvoices(period))
export const useSendInvoice = () => useBillingMutation((id: number) => sendInvoice(id))
export const useCancelInvoice = () => useBillingMutation((id: number) => cancelInvoice(id))
export const useRecalculateInvoice = () => useBillingMutation((id: number) => recalculateInvoice(id))
export const usePayInvoice = () => useBillingMutation(({ id, body }: { id: number; body: InvoicePaymentRequest }) => payInvoice(id, body))
