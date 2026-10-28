import type { CompanyOption, CrmTaskStatus } from '@/lib/api/types'

/** Columns of the task board, in order. */
export const TASK_STATUSES: CrmTaskStatus[] = ['TODO', 'IN_PROGRESS', 'DONE']

/** Paid options of a carrier company. */
export const COMPANY_OPTIONS: CompanyOption[] = ['PHOTOS', 'PUBLIC_TRACKING']
