import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { companyKeys } from '@/features/companies/queries'
import { crmKeys } from '@/features/crm/queries'
import type { BillingItem, BillingPaymentMethodRequest, BillingPaymentRequest, BillingRequisitesDto, InvoicePaymentRequest } from '@/lib/api/types'
import type { MoneyCurrency } from '@/lib/format'
import {
  cancelInvoice,
  createPayment,
  deleteCancelledInvoices,
  deleteInvoice,
  deletePayment,
  generateInvoices,
  getCompanyBalance,
  getInvoice,
  getRequisites,
  getCompanyBilling,
  invoiceSummary,
  listInvoices,
  listPaymentMethods,
  listPayments,
  listPrices,
  invoiceRate,
  payInvoice,
  paymentsSummary,
  recalculateInvoice,
  savePaymentMethod,
  sendInvoice,
  setBillingEnabled,
  setCompanyPrice,
  setPrice,
  setRequisites,
  setTrial,
  updatePayment,
  type InvoiceFilters,
  type PaymentFilters,
} from './api'

export const billingKeys = {
  all: ['billing'] as const,
  prices: ['billing', 'prices'] as const,
  company: (id: number) => ['billing', 'company', id] as const,
  invoices: (f: InvoiceFilters) => ['billing', 'invoices', f] as const,
  summary: ['billing', 'summary'] as const,
  payments: (f: PaymentFilters) => ['billing', 'payments', f] as const,
  paymentsSummary: (f: PaymentFilters) => ['billing', 'payments-summary', f] as const,
  balance: (id: number) => ['billing', 'balance', id] as const,
  methods: ['billing', 'methods'] as const,
  invoice: (id: number) => ['billing', 'invoice', id] as const,
  requisites: ['billing', 'requisites'] as const,
  rate: (id: number, currency: string) => ['billing', 'rate', id, currency] as const,
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

/** The tariff; a carrier's manager has no access to it, so pages they see pass {@code enabled: false}. */
export const usePrices = ({ enabled = true }: { enabled?: boolean } = {}) => useQuery({ queryKey: billingKeys.prices, queryFn: listPrices, enabled })
export const useCompanyBilling = (id: number) => useQuery({ queryKey: billingKeys.company(id), queryFn: () => getCompanyBilling(id) })
export const useInvoices = (f: InvoiceFilters) =>
  useQuery({ queryKey: billingKeys.invoices(f), queryFn: () => listInvoices(f), placeholderData: keepPreviousData })
export const useInvoiceSummary = () => useQuery({ queryKey: billingKeys.summary, queryFn: invoiceSummary })

export const useSetPrice = () => useBillingMutation(({ code, amountEur }: { code: BillingItem; amountEur: number }) => setPrice(code, amountEur))
export const useSetCompanyPrice = (companyId: number) =>
  useBillingMutation(({ code, amountEur }: { code: BillingItem; amountEur: number | null }) => setCompanyPrice(companyId, code, amountEur))
export const useSetTrial = (companyId: number) => useBillingMutation((trialEndsOn: string | null) => setTrial(companyId, trialEndsOn))
export const useGenerateInvoices = () =>
  useBillingMutation(({ period, companyIds }: { period: string; companyIds?: number[] }) => generateInvoices(period, companyIds))
export const useDeleteCancelledInvoices = () => useBillingMutation(() => deleteCancelledInvoices())
export const useDeleteInvoice = () => useBillingMutation((id: number) => deleteInvoice(id))
export const useSetBillingEnabled = (companyId: number) => useBillingMutation((value: boolean) => setBillingEnabled(companyId, value))
export const useSendInvoice = () => useBillingMutation((id: number) => sendInvoice(id))
export const useCancelInvoice = () => useBillingMutation((id: number) => cancelInvoice(id))
export const useRecalculateInvoice = () => useBillingMutation((id: number) => recalculateInvoice(id))
export const usePayInvoice = () => useBillingMutation(({ id, body }: { id: number; body: InvoicePaymentRequest }) => payInvoice(id, body))

export const usePayments = (f: PaymentFilters, { enabled = true }: { enabled?: boolean } = {}) =>
  useQuery({ queryKey: billingKeys.payments(f), queryFn: () => listPayments(f), placeholderData: keepPreviousData, enabled })
export const usePaymentsSummary = (f: PaymentFilters) => useQuery({ queryKey: billingKeys.paymentsSummary(f), queryFn: () => paymentsSummary(f) })
export const useCompanyBalance = (id: number) => useQuery({ queryKey: billingKeys.balance(id), queryFn: () => getCompanyBalance(id) })
export const usePaymentMethods = () => useQuery({ queryKey: billingKeys.methods, queryFn: listPaymentMethods })

export const useSavePayment = () =>
  useBillingMutation(({ id, body }: { id?: number; body: BillingPaymentRequest }) => (id == null ? createPayment(body) : updatePayment(id, body)))
export const useDeletePayment = () => useBillingMutation((id: number) => deletePayment(id))
export const useSavePaymentMethod = () =>
  useBillingMutation(({ id, body }: { id?: number; body: BillingPaymentMethodRequest }) => savePaymentMethod(id, body))

export const useInvoice = (id: number) => useQuery({ queryKey: billingKeys.invoice(id), queryFn: () => getInvoice(id) })
export const useRequisites = () => useQuery({ queryKey: billingKeys.requisites, queryFn: getRequisites })
export const useSetRequisites = () => useBillingMutation((body: BillingRequisitesDto) => setRequisites(body))
/** A failed answer is not retried: the rate is then typed in. */
export const useInvoiceRate = (id: number, currency: MoneyCurrency, enabled: boolean) =>
  useQuery({ queryKey: billingKeys.rate(id, currency), queryFn: () => invoiceRate(id, currency), enabled, retry: false })
