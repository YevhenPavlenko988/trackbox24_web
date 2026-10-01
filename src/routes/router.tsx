import type { ComponentType } from 'react'
import { createBrowserRouter } from 'react-router'
import { AppShell } from '@/components/layout/AppShell'
import { LoginPage } from '@/features/auth/LoginPage'
import { MobileOnlyPage, NotFoundPage } from './ErrorPages'
import { HomeRedirect, RedirectIfAuthenticated, RequireAdmin, RequireAuth, RequireCompanyAccess } from './guards'

type PageModule = Record<string, unknown>

/** Code-splits a page: `page(() => import('...'), 'ExportName')`. */
const page = (load: () => Promise<PageModule>, name: string) => async () => ({
  Component: (await load())[name] as ComponentType,
})

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
