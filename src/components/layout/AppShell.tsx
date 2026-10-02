import { Building2, Eye, KeyRound, LogOut, Package, Route, Trash2, Truck, Users, UsersRound, Warehouse, X, type LucideIcon } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router'
import { Button } from '@/components/ui/button'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import { useAccess, type Access } from '@/features/auth/access'
import { ChangePasswordDialog } from '@/features/auth/ChangePasswordDialog'
import { useCompanyView } from '@/features/auth/companyView'
import { useAuth } from '@/features/auth/useAuth'

type NavItem = { to: string; labelKey: string; icon: LucideIcon; show: (a: Access) => boolean }

const NAV: NavItem[] = [
  { to: '/parcels', labelKey: 'nav.parcels', icon: Package, show: (a) => a.hasCompanyAccess },
  { to: '/clients', labelKey: 'nav.clients', icon: UsersRound, show: (a) => a.hasCompanyAccess },
  { to: '/trips', labelKey: 'nav.trips', icon: Route, show: (a) => a.hasCompanyAccess },
  { to: '/warehouses', labelKey: 'nav.warehouses', icon: Warehouse, show: (a) => a.hasCompanyAccess },
  { to: '/users', labelKey: 'nav.users', icon: Users, show: (a) => a.hasCompanyAccess },
  { to: '/cars', labelKey: 'nav.cars', icon: Truck, show: (a) => a.hasCompanyAccess },
  { to: '/company', labelKey: 'nav.company', icon: Building2, show: (a) => a.hasCompanyAccess },
  { to: '/trash', labelKey: 'nav.trash', icon: Trash2, show: (a) => a.hasCompanyAccess },
  { to: '/companies', labelKey: 'nav.companies', icon: Building2, show: (a) => a.isAdmin },
]

export function AppShell() {
  const { t } = useTranslation()
  const { user, roles, logout } = useAuth()
  const access = useAccess()
  const companyView = useCompanyView()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [changingPassword, setChangingPassword] = useState(false)

  const items = NAV.filter((item) => item.show(access))
  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.email

  const exitCompanyMode = () => {
    companyView.exit()
    navigate('/companies')
  }

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader className="px-4 py-3 text-lg font-semibold">{t('app.name')}</SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {items.map((item) => (
                  <SidebarMenuItem key={item.to}>
                    <SidebarMenuButton isActive={pathname === item.to || pathname.startsWith(item.to + '/')} render={<NavLink to={item.to} />}>
                      <item.icon />
                      <span>{t(item.labelKey)}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter className="gap-2 px-4 py-3">
          <div className="min-w-0 text-sm">
            <p className="truncate font-medium">{fullName}</p>
            <p className="truncate text-xs text-muted-foreground">{roles.map((r) => t(`roles.${r}`)).join(', ')}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setChangingPassword(true)}>
            <KeyRound />
            {t('nav.changePassword')}
          </Button>
          <Button variant="outline" size="sm" onClick={logout}>
            <LogOut />
            {t('nav.logout')}
          </Button>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="flex h-12 items-center gap-2 border-b px-4">
          <SidebarTrigger />
          {access.companyMode && (
            <div className="ml-2 flex flex-1 items-center justify-between gap-3 rounded-md bg-amber-100 px-3 py-1 text-sm text-amber-900 dark:bg-amber-900/40 dark:text-amber-100">
              <span className="flex items-center gap-2">
                <Eye className="size-4" />
                {t('companyMode.banner', { name: access.companyName })}
              </span>
              <Button variant="ghost" size="xs" onClick={exitCompanyMode}>
                <X />
                {t('companyMode.exit')}
              </Button>
            </div>
          )}
        </header>
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </SidebarInset>
      <ChangePasswordDialog open={changingPassword} onOpenChange={setChangingPassword} />
    </SidebarProvider>
  )
}
