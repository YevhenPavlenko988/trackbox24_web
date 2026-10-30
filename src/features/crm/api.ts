import { api } from '@/lib/api/client'
import { normalizePage, type Page } from '@/lib/api/page'
import { unwrap } from '@/lib/api/problem'
import type {
  CrmContactRequest,
  CrmContactResponse,
  CrmConvertRequest,
  CrmDealActivityResponse,
  CrmDealRequest,
  CrmDealResponse,
  CrmRef,
  CrmStageChangeRequest,
  CrmStageRequest,
  CrmStageResponse,
  CrmTaskRequest,
  CrmTaskResponse,
  CrmTaskStatus,
  UserCreateRequest,
  UserResponse,
} from '@/lib/api/types'

export function listTeam(): Promise<CrmRef[]> {
  return unwrap(api.GET('/api/crm/team'))
}

/** A sales user of the TrackBox24 team: a platform role, no company. Only the platform admin creates one. */
export function createSalesUser(body: Omit<UserCreateRequest, 'roles' | 'companyId'>): Promise<UserResponse> {
  return unwrap(api.POST('/api/users', { body: { ...body, roles: ['SALES'] } }))
}

export function listStages(): Promise<CrmStageResponse[]> {
  return unwrap(api.GET('/api/crm/stages'))
}

export function createStage(body: CrmStageRequest): Promise<CrmStageResponse> {
  return unwrap(api.POST('/api/crm/stages', { body }))
}

export function updateStage(id: number, body: CrmStageRequest): Promise<CrmStageResponse> {
  return unwrap(api.PUT('/api/crm/stages/{id}', { params: { path: { id } }, body }))
}

export async function deleteStage(id: number): Promise<void> {
  await unwrap(api.DELETE('/api/crm/stages/{id}', { params: { path: { id } } }))
}

export type DealFilters = { ownerId?: number; companyId?: number; open?: boolean; query?: string; size?: number }

export async function listDeals(f: DealFilters): Promise<Page<CrmDealResponse>> {
  const data = await unwrap(
    api.GET('/api/crm/deals', {
      params: { query: { ownerId: f.ownerId, companyId: f.companyId, open: f.open, query: f.query || undefined, size: f.size ?? 200 } },
    }),
  )
  return normalizePage(data)
}

export function getDeal(id: number): Promise<CrmDealResponse> {
  return unwrap(api.GET('/api/crm/deals/{id}', { params: { path: { id } } }))
}

export function createDeal(body: CrmDealRequest): Promise<CrmDealResponse> {
  return unwrap(api.POST('/api/crm/deals', { body }))
}

export function updateDeal(id: number, body: CrmDealRequest): Promise<CrmDealResponse> {
  return unwrap(api.PUT('/api/crm/deals/{id}', { params: { path: { id } }, body }))
}

export function changeDealStage(id: number, body: CrmStageChangeRequest): Promise<CrmDealResponse> {
  return unwrap(api.POST('/api/crm/deals/{id}/stage', { params: { path: { id } }, body }))
}

export function convertDeal(id: number, body: CrmConvertRequest): Promise<CrmDealResponse> {
  return unwrap(api.POST('/api/crm/deals/{id}/convert', { params: { path: { id } }, body }))
}

export async function deleteDeal(id: number): Promise<void> {
  await unwrap(api.DELETE('/api/crm/deals/{id}', { params: { path: { id } } }))
}

export function dealActivity(id: number): Promise<CrmDealActivityResponse[]> {
  return unwrap(api.GET('/api/crm/deals/{id}/activity', { params: { path: { id } } }))
}

export function commentDeal(id: number, text: string): Promise<CrmDealActivityResponse> {
  return unwrap(api.POST('/api/crm/deals/{id}/comments', { params: { path: { id } }, body: { text } }))
}

export async function listContacts(companyId?: number): Promise<Page<CrmContactResponse>> {
  return normalizePage(await unwrap(api.GET('/api/crm/contacts', { params: { query: { companyId, size: 100 } } })))
}

export function updateContact(id: number, body: CrmContactRequest): Promise<CrmContactResponse> {
  return unwrap(api.PUT('/api/crm/contacts/{id}', { params: { path: { id } }, body }))
}

export type TaskFilters = {
  status?: CrmTaskStatus[]
  assigneeId?: number
  mine?: boolean
  dealId?: number
  companyId?: number
  due?: 'TODAY' | 'OVERDUE'
}

export function listTasks(f: TaskFilters): Promise<CrmTaskResponse[]> {
  return unwrap(api.GET('/api/crm/tasks', { params: { query: { ...f, mine: f.mine || undefined } } }))
}

export function createTask(body: CrmTaskRequest): Promise<CrmTaskResponse> {
  return unwrap(api.POST('/api/crm/tasks', { body }))
}

export function updateTask(id: number, body: CrmTaskRequest): Promise<CrmTaskResponse> {
  return unwrap(api.PUT('/api/crm/tasks/{id}', { params: { path: { id } }, body }))
}

export async function deleteTask(id: number): Promise<void> {
  await unwrap(api.DELETE('/api/crm/tasks/{id}', { params: { path: { id } } }))
}

/** The body of PUT for a task: it replaces every field, so the current values go along with the change. */
export function taskBody(t: CrmTaskResponse, change: Partial<CrmTaskRequest> = {}): CrmTaskRequest {
  return {
    title: t.title ?? '',
    description: t.description,
    status: t.status,
    assigneeId: t.assignee?.id,
    dueAt: t.dueAt,
    dealId: t.deal?.id,
    companyId: t.company?.id,
    ...change,
  }
}

/** The body of PUT for a deal from what it holds now. */
export function dealBody(d: CrmDealResponse, change: Partial<CrmDealRequest> = {}): CrmDealRequest {
  return {
    title: d.title ?? '',
    contactId: d.contact?.id,
    ownerId: d.owner?.id,
    source: d.source,
    sourceDetails: d.sourceDetails,
    interestedOptions: d.interestedOptions,
    expectedMonthlyEur: d.expectedMonthlyEur,
    notes: d.notes,
    ...change,
  }
}
