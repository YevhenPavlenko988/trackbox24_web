import type { ComponentType } from 'react'
import { createBrowserRouter } from 'react-router'
import { AppShell } from '@/components/layout/AppShell'
import { LoginPage } from '@/features/auth/LoginPage'
import { MobileOnlyPage, NotFoundPage } from './ErrorPages'
import { HomeRedirect, RedirectIfAuthenticated, RequireAdmin, RequireAuth, RequireCompanyAccess } from './guards'

type PageModule = Record<string, unknown>

const RELOADED = 'tb24.chunkReload'

/**
 * Code-splits a page: `page(() => import('...'), 'ExportName')`.
 * A deploy replaces the hashed chunks, so a tab left open asks for a file that is gone. Reload once to pick up
 * the new build; the flag stops a reload loop when the import fails for any other reason.
 */
const page = (load: () => Promise<PageModule>, name: string) => async () => {
  try {
    const module = await load()
    sessionStorage.removeItem(RELOADED)
    return { Component: module[name] as ComponentType }
  } catch (e) {
    if (!sessionStorage.getItem(RELOADED)) {
      sessionStorage.setItem(RELOADED, '1')
      window.location.reload()
      await new Promise(() => {}) // the reload is on its way; never resolve
    }
    throw e
  }
}

export const router = createBrowserRouter([
  {
    element: <RedirectIfAuthenticated />,
    children: [{ path: '/login', element: <LoginPage /> }],
  },
  {
    element: <RequireAuth />,
    children: [
      { path: 'mobile-only', element: <MobileOnlyPage /> },
      {
        element: <RequireCompanyAccess />,
        children: [{ path: 'parcels/:id/labels', lazy: page(() => import('@/features/parcels/LabelsPage'), 'LabelsPage') }],
      },
      {
        element: <AppShell />,
        children: [
          { index: true, element: <HomeRedirect /> },
          {
            element: <RequireCompanyAccess />,
            children: [
              { path: 'parcels', lazy: page(() => import('@/features/parcels/ParcelsListPage'), 'ParcelsListPage') },
              { path: 'parcels/new', lazy: page(() => import('@/features/parcels/ParcelCreatePage'), 'ParcelCreatePage') },
              { path: 'parcels/:id', lazy: page(() => import('@/features/parcels/ParcelPage'), 'ParcelPage') },
              { path: 'clients', lazy: page(() => import('@/features/clients/ClientsListPage'), 'ClientsListPage') },
              { path: 'clients/new', lazy: page(() => import('@/features/clients/ClientCreatePage'), 'ClientCreatePage') },
              { path: 'clients/:id', lazy: page(() => import('@/features/clients/ClientPage'), 'ClientPage') },
              { path: 'users', lazy: page(() => import('@/features/users/UsersListPage'), 'UsersListPage') },
              { path: 'cars', lazy: page(() => import('@/features/cars/CarsListPage'), 'CarsListPage') },
              { path: 'company', lazy: page(() => import('@/features/companies/MyCompanyPage'), 'MyCompanyPage') },
              { path: 'trips', lazy: page(() => import('@/features/trips/TripsListPage'), 'TripsListPage') },
              { path: 'trips/:id', lazy: page(() => import('@/features/trips/TripPage'), 'TripPage') },
              { path: 'warehouses', lazy: page(() => import('@/features/warehouses/WarehousesListPage'), 'WarehousesListPage') },
              { path: 'trash', lazy: page(() => import('@/features/trash/TrashPage'), 'TrashPage') },
            ],
          },
          {
            element: <RequireAdmin />,
            children: [
              { path: 'companies', lazy: page(() => import('@/features/companies/CompaniesListPage'), 'CompaniesListPage') },
              { path: 'companies/:id', lazy: page(() => import('@/features/companies/CompanyPage'), 'CompanyPage') },
            ],
          },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
])
