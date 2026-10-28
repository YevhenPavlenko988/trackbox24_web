import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { CrmContactRequest, CrmConvertRequest, CrmDealRequest, CrmStageChangeRequest, CrmStageRequest, CrmTaskRequest, UserCreateRequest } from '@/lib/api/types'
import {
  changeDealStage,
  commentDeal,
  convertDeal,
  createDeal,
  createSalesUser,
  createStage,
  createTask,
  dealActivity,
  deleteDeal,
  deleteStage,
  deleteTask,
  getDeal,
  listContacts,
  listDeals,
  listStages,
  listTasks,
  listTeam,
  updateContact,
  updateDeal,
  updateStage,
  updateTask,
  type DealFilters,
  type TaskFilters,
} from './api'

export const crmKeys = {
  all: ['crm'] as const,
  team: ['crm', 'team'] as const,
  stages: ['crm', 'stages'] as const,
  deals: (f: DealFilters) => ['crm', 'deals', f] as const,
  deal: (id: number) => ['crm', 'deal', id] as const,
  activity: (id: number) => ['crm', 'deal', id, 'activity'] as const,
  contacts: (companyId?: number) => ['crm', 'contacts', companyId] as const,
  tasks: (f: TaskFilters) => ['crm', 'tasks', f] as const,
}

/** Any CRM change may touch the board, a deal's counters and its history: refresh everything CRM. */
function useCrmMutation<A, R>(fn: (arg: A) => Promise<R>) {
  const queryClient = useQueryClient()
  return useMutation({ mutationFn: fn, onSuccess: () => queryClient.invalidateQueries({ queryKey: crmKeys.all }) })
}

export const useTeam = () => useQuery({ queryKey: crmKeys.team, queryFn: listTeam, staleTime: 60_000 })
export const useStages = () => useQuery({ queryKey: crmKeys.stages, queryFn: listStages })
export const useDeals = (f: DealFilters) => useQuery({ queryKey: crmKeys.deals(f), queryFn: () => listDeals(f), placeholderData: keepPreviousData })
export const useDeal = (id: number) => useQuery({ queryKey: crmKeys.deal(id), queryFn: () => getDeal(id) })
export const useDealActivity = (id: number) => useQuery({ queryKey: crmKeys.activity(id), queryFn: () => dealActivity(id) })
export const useContacts = (companyId?: number) => useQuery({ queryKey: crmKeys.contacts(companyId), queryFn: () => listContacts(companyId) })
export const useTasks = (f: TaskFilters) => useQuery({ queryKey: crmKeys.tasks(f), queryFn: () => listTasks(f), placeholderData: keepPreviousData })

export const useCreateSalesUser = () => useCrmMutation((body: Omit<UserCreateRequest, 'roles' | 'companyId'>) => createSalesUser(body))
export const useCreateStage = () => useCrmMutation((body: CrmStageRequest) => createStage(body))
export const useUpdateStage = () => useCrmMutation(({ id, body }: { id: number; body: CrmStageRequest }) => updateStage(id, body))
export const useDeleteStage = () => useCrmMutation((id: number) => deleteStage(id))
export const useCreateDeal = () => useCrmMutation((body: CrmDealRequest) => createDeal(body))
export const useUpdateDeal = (id: number) => useCrmMutation((body: CrmDealRequest) => updateDeal(id, body))
export const useChangeDealStage = () => useCrmMutation(({ id, body }: { id: number; body: CrmStageChangeRequest }) => changeDealStage(id, body))
export const useConvertDeal = (id: number) => useCrmMutation((body: CrmConvertRequest) => convertDeal(id, body))
export const useDeleteDeal = () => useCrmMutation((id: number) => deleteDeal(id))
export const useCommentDeal = (id: number) => useCrmMutation((text: string) => commentDeal(id, text))
export const useUpdateContact = () => useCrmMutation(({ id, body }: { id: number; body: CrmContactRequest }) => updateContact(id, body))
export const useCreateTask = () => useCrmMutation((body: CrmTaskRequest) => createTask(body))
export const useUpdateTask = () => useCrmMutation(({ id, body }: { id: number; body: CrmTaskRequest }) => updateTask(id, body))
export const useDeleteTask = () => useCrmMutation((id: number) => deleteTask(id))
