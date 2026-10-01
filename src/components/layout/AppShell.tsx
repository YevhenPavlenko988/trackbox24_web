import { Building2, LogOut, Package, Users, UsersRound, type LucideIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { NavLink, Outlet, useLocation } from 'react-router'
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
import { useAuth } from '@/features/auth/useAuth'
import type { Role } from '@/lib/api/types'

type NavItem = { to: string; labelKey: string; icon: LucideIcon; roles: Role[] }

const NAV: NavItem[] = [
  { to: '/parcels', labelKey: 'nav.parcels', icon: Package, roles: ['MANAGER'] },
  { to: '/clients', labelKey: 'nav.clients', icon: UsersRound, roles: ['MANAGER'] },
  { to: '/companies', labelKey: 'nav.companies', icon: Building2, roles: ['ADMIN'] },
  { to: '/users', labelKey: 'nav.users', icon: Users, roles: ['ADMIN', 'MANAGER'] },
]

export function AppShell() {
  const { t } = useTranslation()
  const { user, role, logout } = useAuth()
  const { pathname } = useLocation()

  const items = NAV.filter((item) => role && item.roles.includes(role))
  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.email

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
                    <SidebarMenuButton
                      isActive={pathname.startsWith(item.to)}
                      render={<NavLink to={item.to} />}
                    >
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
            <p className="truncate text-xs text-muted-foreground">{role && t(`roles.${role}`)}</p>
          </div>
          <Button variant="outline" size="sm" onClick={logout}>
            <LogOut />
            {t('nav.logout')}
          </Button>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="flex h-12 items-center gap-2 border-b px-4">
          <SidebarTrigger />
        </header>
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
