import type { Role } from '@/lib/api/types'
import { useCurrentCompany } from '@/features/companies/queries'
import { useCompanyView } from './companyView'
import { useAuth } from './useAuth'

export type Access = {
  roles: Role[]
  has: (role: Role) => boolean
  isAdmin: boolean
  /** Our own sales and support: the CRM and the companies' options, no carrier data. */
  isSales: boolean
  /** The TrackBox24 team (admin or sales): the CRM and the companies section. */
  isPlatform: boolean
  isManager: boolean
  isViewer: boolean
  /** Platform admin browsing one company's data (read-only, via X-Company-Id). */
  companyMode: boolean
  companyId: number | undefined
  companyName: string | undefined
  /** May open the company's operational pages at all. */
  hasCompanyAccess: boolean
  /** Only REPRESENTATIVE/DRIVER roles: the web has nothing for them (a representative of a moves company aside). */
  mobileOnly: boolean
  /** A representative of a company with moves: they run moves, trips and routes from the web too. */
  movesRepresentative: boolean
  /** The company's data is still loading to decide what a representative may do: guards wait. */
  accessPending: boolean
  /** The company's own pages a manager or viewer has (users, cars, settings, trash), not a moves representative. */
  fullAccess: boolean
  canEdit: boolean
  /** Moves, their loaders, bill, trips and routes: a manager, or a moves representative. */
  canEditMoves: boolean
  /** The company has the moves module: legs of a route (the next leg after a trip) belong to it. */
  movesEnabled: boolean
  canSeeMoney: boolean
  canManageUsers: boolean
}

export function useAccess(): Access {
  const { roles, companyId: ownCompanyId } = useAuth()
  const { company } = useCompanyView()
  const has = (role: Role) => roles.includes(role)
  const isAdmin = has('ADMIN')
  const isSales = has('SALES')
  const isManager = has('MANAGER')
  const isViewer = has('VIEWER')
  const companyMode = isAdmin && company != null
  const pureFieldRole = (has('REPRESENTATIVE') || has('DRIVER')) && !isManager && !isViewer && !isAdmin
  // a representative of a company with moves works on the web too; whether it has moves comes with the company
  const representative = pureFieldRole && has('REPRESENTATIVE')
  const ownCompany = useCurrentCompany(representative || isManager)
  const movesRepresentative = representative && ownCompany.data?.movesEnabled === true
  const accessPending = representative && ownCompany.isPending
  const fullAccess = isManager || isViewer || companyMode
  const hasCompanyAccess = fullAccess || movesRepresentative

  return {
    roles,
    has,
    isAdmin,
    isSales,
    isPlatform: isAdmin || isSales,
    isManager,
    isViewer,
    companyMode,
    companyId: companyMode ? company?.id : ownCompanyId,
    companyName: companyMode ? company?.name : undefined,
    hasCompanyAccess,
    mobileOnly: pureFieldRole && !movesRepresentative && !accessPending,
    movesRepresentative,
    accessPending,
    fullAccess,
    canEdit: isManager,
    canEditMoves: isManager || movesRepresentative,
    movesEnabled: ownCompany.data?.movesEnabled === true,
    canSeeMoney: !(has('REPRESENTATIVE') && !isManager && !isViewer && !has('DRIVER') && !isAdmin),
    canManageUsers: isManager || isAdmin,
  }
}
