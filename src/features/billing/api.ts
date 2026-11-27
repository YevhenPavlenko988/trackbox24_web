import { api } from '@/lib/api/client'
import { normalizePage, type Page } from '@/lib/api/page'
import { unwrap } from '@/lib/api/problem'
import type {
  BillingItem,
  BillingPaymentMethodRequest,
  BillingPaymentMethodResponse,
  BillingPaymentRequest,
  BillingPaymentResponse,
  BillingPaymentSummaryResponse,
  CompanyBalanceResponse,
  CompanyContractDto,
  ContractFileKind,
  ContractFileResponse,
  BillingPriceResponse,
  BillingRequisitesDto,
  CompanyBillingResponse,
  InvoicePaymentRequest,
  InvoiceResponse,
  InvoiceStatus,
  InvoiceSummaryResponse,
  InvoiceRateResponse,
} from '@/lib/api/types'
import type { MoneyCurrency } from '@/lib/format'

export function listPrices(): Promise<BillingPriceResponse[]> {
  return unwrap(api.GET('/api/crm/prices'))
}

export function setPrice(code: BillingItem, amountEur: number): Promise<BillingPriceResponse> {
  return unwrap(api.PUT('/api/crm/prices/{code}', { params: { path: { code } }, body: { amountEur } }))
}

export function getCompanyBilling(id: number): Promise<CompanyBillingResponse> {
  return unwrap(api.GET('/api/crm/companies/{id}/billing', { params: { path: { id } } }))
}

export function setCompanyPrice(id: number, code: BillingItem, amountEur: number | null): Promise<CompanyBillingResponse> {
  // null brings back the general price; the generated body type has no null, the backend takes it
  return unwrap(
    api.PUT('/api/crm/companies/{id}/prices/{code}', { params: { path: { id, code } }, body: { amountEur: amountEur as number } }),
  )
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

/** @param period `yyyy-MM`; @param companyId only these companies, none — every billed one */
export async function generateInvoices(period: string, companyId?: number[]): Promise<number> {
  const data = (await unwrap(api.POST('/api/crm/invoices/generate', { params: { query: { period, companyId } } }))) as { created?: number }
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

export type PaymentFilters = { companyId?: number; invoiceId?: number; methodId?: number; from?: string; to?: string; page?: number; size?: number }

export async function listPayments(f: PaymentFilters): Promise<Page<BillingPaymentResponse>> {
  const { page, size, ...filters } = f
  const data = await unwrap(api.GET('/api/crm/payments', { params: { query: { ...filters, page, size: size ?? 50 } } }))
  return normalizePage(data)
}

export function paymentsSummary(f: PaymentFilters): Promise<BillingPaymentSummaryResponse> {
  const { companyId, invoiceId, methodId, from, to } = f
  return unwrap(api.GET('/api/crm/payments/summary', { params: { query: { companyId, invoiceId, methodId, from, to } } }))
}

export function createPayment(body: BillingPaymentRequest): Promise<BillingPaymentResponse> {
  return unwrap(api.POST('/api/crm/payments', { body }))
}

export function updatePayment(id: number, body: BillingPaymentRequest): Promise<BillingPaymentResponse> {
  return unwrap(api.PUT('/api/crm/payments/{id}', { params: { path: { id } }, body }))
}

export async function deletePayment(id: number): Promise<void> {
  await unwrap(api.DELETE('/api/crm/payments/{id}', { params: { path: { id } } }))
}

export function getCompanyBalance(id: number): Promise<CompanyBalanceResponse> {
  return unwrap(api.GET('/api/crm/companies/{id}/balance', { params: { path: { id } } }))
}

export function listPaymentMethods(): Promise<BillingPaymentMethodResponse[]> {
  return unwrap(api.GET('/api/crm/payment-methods'))
}

export function savePaymentMethod(id: number | undefined, body: BillingPaymentMethodRequest): Promise<BillingPaymentMethodResponse> {
  return id == null
    ? unwrap(api.POST('/api/crm/payment-methods', { body }))
    : unwrap(api.PUT('/api/crm/payment-methods/{id}', { params: { path: { id } }, body }))
}

export function getInvoice(id: number): Promise<InvoiceResponse> {
  return unwrap(api.GET('/api/crm/invoices/{id}', { params: { path: { id } } }))
}

export function getRequisites(): Promise<BillingRequisitesDto> {
  return unwrap(api.GET('/api/crm/requisites'))
}

export function setRequisites(body: BillingRequisitesDto): Promise<BillingRequisitesDto> {
  return unwrap(api.PUT('/api/crm/requisites', { body }))
}

/** How much of the currency one euro is for the invoice document: the bank's sell rate when it was sent (now for a draft). */
export function invoiceRate(id: number, currency: MoneyCurrency): Promise<InvoiceRateResponse> {
  return unwrap(api.GET('/api/crm/invoices/{id}/rate', { params: { path: { id }, query: { currency } } }))
}

export async function deleteInvoice(id: number): Promise<void> {
  await unwrap(api.DELETE('/api/crm/invoices/{id}', { params: { path: { id } } }))
}

export function setBillingEnabled(id: number, value: boolean): Promise<CompanyBillingResponse> {
  return unwrap(api.PUT('/api/crm/companies/{id}/billing-enabled', { params: { path: { id }, query: { value } } }))
}

/** Every cancelled invoice without payments; how many went. */
export async function deleteCancelledInvoices(): Promise<number> {
  const data = (await unwrap(api.DELETE('/api/crm/invoices/cancelled'))) as { deleted?: number }
  return data?.deleted ?? 0
}

export function getContract(companyId: number): Promise<CompanyContractDto> {
  return unwrap(api.GET('/api/crm/companies/{id}/contract', { params: { path: { id: companyId } } }))
}

export function saveContract(companyId: number, body: CompanyContractDto): Promise<CompanyContractDto> {
  return unwrap(api.PUT('/api/crm/companies/{id}/contract', { params: { path: { id: companyId } }, body }))
}

export function listContractFiles(companyId: number): Promise<ContractFileResponse[]> {
  return unwrap(api.GET('/api/crm/companies/{id}/contract/files', { params: { path: { id: companyId } } }))
}

export function addContractFile(companyId: number, kind: ContractFileKind, file: Blob, name: string): Promise<ContractFileResponse> {
  const body = new FormData()
  body.append('file', file, name)
  return unwrap(
    api.POST('/api/crm/companies/{id}/contract/files', {
      params: { path: { id: companyId }, query: { kind } },
      body: body as unknown as { file: string },
      bodySerializer: (b) => b as unknown as FormData,
    }),
  )
}

export async function deleteContractFile(companyId: number, fileId: number): Promise<void> {
  await unwrap(api.DELETE('/api/crm/companies/{id}/contract/files/{fileId}', { params: { path: { id: companyId, fileId } } }))
}
