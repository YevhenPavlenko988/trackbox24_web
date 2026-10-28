import { api } from '@/lib/api/client'
import { normalizePage, type Page } from '@/lib/api/page'
import { unwrap } from '@/lib/api/problem'
import type {
  BillingItem,
  BillingPriceResponse,
  CompanyBillingResponse,
  InvoicePaymentRequest,
  InvoiceResponse,
  InvoiceStatus,
  InvoiceSummaryResponse,
} from '@/lib/api/types'

export function listPrices(): Promise<BillingPriceResponse[]> {
  return unwrap(api.GET('/api/crm/prices'))
}

export function setPrice(code: BillingItem, amountEur: number): Promise<BillingPriceResponse> {
  return unwrap(api.PUT('/api/crm/prices/{code}', { params: { path: { code } }, body: { amountEur } }))
}

export function getCompanyBilling(id: number): Promise<CompanyBillingResponse> {
  return unwrap(api.GET('/api/crm/companies/{id}/billing', { params: { path: { id } } }))
}

export function setTrial(id: number, trialEndsOn: string | null): Promise<CompanyBillingResponse> {
  // null removes the trial; the generated body type has no null, the backend takes it
  return unwrap(api.PUT('/api/crm/companies/{id}/trial', { params: { path: { id } }, body: { trialEndsOn: trialEndsOn as string } }))
}

export type InvoiceFilters = { companyId?: number; status?: InvoiceStatus[]; overdue?: boolean; page?: number; size?: number }

export async function listInvoices(f: InvoiceFilters): Promise<Page<InvoiceResponse>> {
  const data = await unwrap(
    api.GET('/api/crm/invoices', {
      params: { query: { companyId: f.companyId, status: f.status, overdue: f.overdue, page: f.page, size: f.size ?? 50 } },
    }),
  )
  return normalizePage(data)
}

export function invoiceSummary(): Promise<InvoiceSummaryResponse> {
  return unwrap(api.GET('/api/crm/invoices/summary'))
}

/** @param period `yyyy-MM` */
export async function generateInvoices(period: string): Promise<number> {
  const data = (await unwrap(api.POST('/api/crm/invoices/generate', { params: { query: { period } } }))) as { created?: number }
  return data?.created ?? 0
}

const invoiceAction = (action: '/api/crm/invoices/{id}/send' | '/api/crm/invoices/{id}/cancel' | '/api/crm/invoices/{id}/recalculate') => (id: number) =>
  unwrap(api.POST(action, { params: { path: { id } } })) as Promise<InvoiceResponse>

export const sendInvoice = invoiceAction('/api/crm/invoices/{id}/send')
export const cancelInvoice = invoiceAction('/api/crm/invoices/{id}/cancel')
export const recalculateInvoice = invoiceAction('/api/crm/invoices/{id}/recalculate')

export function payInvoice(id: number, body: InvoicePaymentRequest): Promise<InvoiceResponse> {
  return unwrap(api.POST('/api/crm/invoices/{id}/pay', { params: { path: { id } }, body }))
}
