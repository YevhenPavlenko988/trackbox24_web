import type { Role } from '@/lib/api/types'
import { useCompanyView } from './companyView'
import { useAuth } from './useAuth'

export type Access = {
  roles: Role[]
  has: (role: Role) => boolean
  isAdmin: boolean
  isManager: boolean
  isViewer: boolean
  /** Platform admin browsing one company's data (read-only, via X-Company-Id). */
  companyMode: boolean
  companyId: number | undefined
  companyName: string | undefined
  /** May open the company's operational pages at all. */
  hasCompanyAccess: boolean
  /** Only REPRESENTATIVE/DRIVER roles: the web has nothing for them. */
  mobileOnly: boolean
  canEdit: boolean
  canSeeMoney: boolean
  canManageUsers: boolean
}

export function useAccess(): Access {
  const { roles, companyId: ownCompanyId } = useAuth()
  const { company } = useCompanyView()
  const has = (role: Role) => roles.includes(role)
  const isAdmin = has('ADMIN')
  const isManager = has('MANAGER')
  const isViewer = has('VIEWER')
  const companyMode = isAdmin && company != null
  const hasCompanyAccess = isManager || isViewer || companyMode
  const pureFieldRole = (has('REPRESENTATIVE') || has('DRIVER')) && !isManager && !isViewer && !isAdmin

  return {
    roles,
    has,
    isAdmin,
    isManager,
    isViewer,
    companyMode,
    companyId: companyMode ? company?.id : ownCompanyId,
    companyName: companyMode ? company?.name : undefined,
    hasCompanyAccess,
    mobileOnly: pureFieldRole,
    canEdit: isManager,
    canSeeMoney: !(has('REPRESENTATIVE') && !isManager && !isViewer && !has('DRIVER') && !isAdmin),
    canManageUsers: isManager || isAdmin,
  }
}
