import { lazy, Suspense } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router'
import { useAccess, type Access } from '@/features/auth/access'
import { useAuth } from '@/features/auth/useAuth'
import { ForbiddenPage, MobileOnlyPage } from './ErrorPages'

export function RequireAuth() {
  const { user } = useAuth()
  const location = useLocation()
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  return <Outlet />
}

/** Company operational pages: managers, viewers, or an admin browsing a company. */
export function RequireCompanyAccess() {
  const access = useAccess()
  if (access.hasCompanyAccess) return <Outlet />
  return access.mobileOnly ? <MobileOnlyPage /> : <ForbiddenPage />
}

export function RequireAdmin() {
  const { isAdmin } = useAccess()
  return isAdmin ? <Outlet /> : <ForbiddenPage />
}

/** The TrackBox24 team: admins and sales (CRM, companies). */
export function RequirePlatform() {
  const { isPlatform } = useAccess()
  return isPlatform ? <Outlet /> : <ForbiddenPage />
}

export function RedirectIfAuthenticated() {
  const { user } = useAuth()
  if (user) return <Navigate to="/" replace />
  return <Outlet />
}

export function homePathFor(access: Access): string {
  if (access.isAdmin && !access.companyMode) return '/companies'
  if (access.isSales) return '/crm/deals'
  if (access.mobileOnly) return '/mobile-only'
  return '/parcels'
}

const LandingPage = lazy(() => import('@/features/landing/LandingPage').then((m) => ({ default: m.LandingPage })))

/** `/`: the public landing page for visitors, the role home for anyone signed in. */
export function RootPage() {
  const { user } = useAuth()
  if (user) return <HomeRedirect />
  return (
    <Suspense fallback={null}>
      <LandingPage />
    </Suspense>
  )
}

export function HomeRedirect() {
  const access = useAccess()
  return <Navigate to={homePathFor(access)} replace />
}
