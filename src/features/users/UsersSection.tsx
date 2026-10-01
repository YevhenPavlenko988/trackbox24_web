import { KeyRound, Pencil, Plus } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { DataTable, type Column } from '@/components/common/DataTable'
import { Pagination } from '@/components/common/Pagination'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { NpKeyDialog } from '@/features/companies/NpKeyDialog'
import { useListParams } from '@/hooks/use-list-params'
import { emptyPage } from '@/lib/api/page'
import type { Role, UserResponse } from '@/lib/api/types'
import { formatPhone } from '@/lib/format'
import { userDisplayName } from './api'
import { useSetUserNovaPoshta, useUsers } from './queries'
import { UserCreateDialog, UserEditDialog } from './UserDialogs'

const ROLES: Role[] = ['MANAGER', 'REPRESENTATIVE', 'DRIVER']
const ALL = '__all__'

/** Users table with role filter, create/edit dialogs and NP settings; scoped to a company for admins. */
export function UsersSection({ companyId }: { companyId?: number }) {
  const { t } = useTranslation(['users', 'common'])
  const { page, size, get, set, setPage, setSize } = useListParams()
  const role = get('role') as Role | undefined
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<UserResponse | null>(null)
  const [npUser, setNpUser] = useState<UserResponse | null>(null)

  const query = useUsers({ companyId, role, page, size })
  const data = query.data ?? emptyPage<UserResponse>()

  const columns: Column<UserResponse>[] = [
    {
      key: 'name',
      header: t('users:fields.name'),
      cell: (u) => (
        <div className="flex flex-col">
          <span className="font-medium">{userDisplayName(u)}</span>
          <span className="text-xs text-muted-foreground">{u.email}</span>
        </div>
      ),
    },
    { key: 'role', header: t('users:fields.role'), cell: (u) => (u.role ? <Badge variant="outline">{t(`common:roles.${u.role}`)}</Badge> : '—') },
    { key: 'phone', header: t('users:fields.phone'), cell: (u) => formatPhone(u.phone) },
    {
      key: 'np',
      header: t('users:fields.novaPoshta'),
      cell: (u) =>
        u.role === 'REPRESENTATIVE' ? (
          <span className="text-sm">
            {u.novaPoshtaKeyConfigured ? t('users:np.configured') : t('users:np.missing')}
            <span className="text-muted-foreground"> · {u.novaPoshtaSyncEnabled ? t('users:np.syncOn') : t('users:np.syncOff')}</span>
          </span>
        ) : (
          '—'
        ),
    },
    {
      key: 'active',
      header: t('users:fields.active'),
      cell: (u) =>
        u.active === false ? <Badge variant="destructive">{t('users:status.inactive')}</Badge> : <Badge variant="secondary">{t('users:status.active')}</Badge>,
    },
    {
      key: 'actions',
      header: '',
      className: 'w-24 text-right',
      cell: (u) => (
        <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          {u.role === 'REPRESENTATIVE' && (
            <Button variant="ghost" size="icon-sm" aria-label={t('users:fields.novaPoshta')} onClick={() => setNpUser(u)}>
              <KeyRound />
            </Button>
          )}
          <Button variant="ghost" size="icon-sm" aria-label={t('common:actions.edit')} onClick={() => setEditing(u)}>
            <Pencil />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <Select value={role ?? ALL} onValueChange={(v) => set({ role: v === ALL || !v ? undefined : String(v) })}>
          <SelectTrigger className="w-56">
            <SelectValue>{role ? t(`common:roles.${role}`) : t('users:allRoles')}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t('users:allRoles')}</SelectItem>
            {ROLES.map((r) => (
              <SelectItem key={r} value={r}>
                {t(`common:roles.${r}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={() => setCreating(true)}>
          <Plus />
          {t('common:actions.add')}
        </Button>
      </div>
      <DataTable columns={columns} rows={data.content} rowKey={(u) => u.id ?? 0} onRowClick={(u) => setEditing(u)} isLoading={query.isPending} />
      <div className="mt-4">
        <Pagination page={data} onPageChange={setPage} onSizeChange={setSize} />
      </div>

      <UserCreateDialog open={creating} onOpenChange={setCreating} companyId={companyId} />
      <UserEditDialog user={editing} open={!!editing} onOpenChange={(o) => !o && setEditing(null)} />
      {npUser && <UserNpDialog user={npUser} onClose={() => setNpUser(null)} />}
    </>
  )
}

function UserNpDialog({ user, onClose }: { user: UserResponse; onClose: () => void }) {
  const { t } = useTranslation('users')
  const setNp = useSetUserNovaPoshta(user.id!)
  return (
    <NpKeyDialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={`${t('npDialog.title')} — ${userDisplayName(user)}`}
      description={t('npDialog.description')}
      apiKeyLabel={t('npDialog.apiKey')}
      apiKeyPlaceholder={t('npDialog.apiKeyPlaceholder')}
      clearHint={t('npDialog.clearHint')}
      syncLabel={t('npDialog.syncEnabled')}
      syncEnabled={user.novaPoshtaSyncEnabled ?? true}
      onSubmit={(body) => setNp.mutateAsync(body)}
    />
  )
}
