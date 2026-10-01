import { createBrowserRouter } from 'react-router'
import { AppShell } from '@/components/layout/AppShell'
import { LoginPage } from '@/features/auth/LoginPage'
import { ClientCreatePage } from '@/features/clients/ClientCreatePage'
import { ClientPage } from '@/features/clients/ClientPage'
import { ClientsListPage } from '@/features/clients/ClientsListPage'
import { LabelsPage } from '@/features/parcels/LabelsPage'
import { ParcelCreatePage } from '@/features/parcels/ParcelCreatePage'
import { ParcelPage } from '@/features/parcels/ParcelPage'
import { ParcelsListPage } from '@/features/parcels/ParcelsListPage'
import { NotFoundPage } from './ErrorPages'
import { HomeRedirect, RedirectIfAuthenticated, RequireAuth, RequireRole } from './guards'
import { PlaceholderPage } from './PlaceholderPage'

export const router = createBrowserRouter([
  {
    element: <RedirectIfAuthenticated />,
    children: [{ path: '/login', element: <LoginPage /> }],
  },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <RequireRole roles={['MANAGER']} />,
        children: [{ path: 'parcels/:id/labels', element: <LabelsPage /> }],
      },
      {
        element: <AppShell />,
        children: [
          { index: true, element: <HomeRedirect /> },
          {
            element: <RequireRole roles={['MANAGER']} />,
            children: [
              { path: 'parcels', element: <ParcelsListPage /> },
              { path: 'parcels/new', element: <ParcelCreatePage /> },
              { path: 'parcels/:id', element: <ParcelPage /> },
              { path: 'clients', element: <ClientsListPage /> },
              { path: 'clients/new', element: <ClientCreatePage /> },
              { path: 'clients/:id', element: <ClientPage /> },
            ],
          },
          {
            element: <RequireRole roles={['ADMIN', 'MANAGER']} />,
            children: [
              { path: 'companies', element: <PlaceholderPage titleKey="nav.companies" /> },
              { path: 'users', element: <PlaceholderPage titleKey="nav.users" /> },
            ],
          },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
])
