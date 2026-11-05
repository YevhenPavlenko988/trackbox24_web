import { CircleAlert, CircleCheck, KeyRound, Pencil, Truck, type LucideIcon } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAccess } from '@/features/auth/access'
import type { CompanyResponse } from '@/lib/api/types'
import { formatDateTime, formatPhone } from '@/lib/format'
import { CompanyDialog } from './CompanyDialog'
import { NpKeyDialog } from './NpKeyDialog'
import { NpSenderDialog } from './NpSenderDialog'
import { CompanyModules } from './CompanyModules'
import { useSetCompanyNpKey, useUpdateCompany } from './queries'

/** Deactivated, restricted for non-payment, in the trial, or simply active. */
export function CompanyStatusBadge({ active, suspended, inTrial }: { active?: boolean; suspended?: boolean; inTrial?: boolean }) {
  const { t } = useTranslation('companies')
  if (active === false) return <Badge variant="destructive">{t('status.inactive')}</Badge>
  if (suspended) return <Badge variant="destructive">{t('status.suspended')}</Badge>
  return (
    <>
      <Badge className="bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200">{t('status.active')}</Badge>
      {inTrial && (
        <Badge className="bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200">{t('status.trial')}</Badge>
      )}
    </>
  )
}

export function NpKeyBadge({ configured }: { configured?: boolean }) {
  const { t } = useTranslation('companies')
  return configured ? (
    <Badge variant="outline">{t('fields.npKeyConfigured')}</Badge>
  ) : (
    <Badge variant="outline" className="text-muted-foreground">
      {t('fields.npKeyMissing')}
    </Badge>
  )
}

/** Details card with edit + NP backup key dialogs; used by admin's company page and manager's own-company page. */
export function CompanyDetails({ company }: { company: CompanyResponse }) {
  const { t } = useTranslation(['companies', 'common', 'novaPoshta'])
  const { canEdit, isAdmin, companyMode } = useAccess()
  // Admins may edit company requisites from the companies section, but not while browsing a company read-only.
  const editable = canEdit || (isAdmin && !companyMode)
  const update = useUpdateCompany(company.id!)
  const setKey = useSetCompanyNpKey(company.id!)
  const [editing, setEditing] = useState(false)
  const [keyOpen, setKeyOpen] = useState(false)
  const [senderOpen, setSenderOpen] = useState(false)
  // The Nova Poshta directories behind the city and branch pickers are closed to admins, so only a manager sets this.
  const senderEditable = canEdit

  const senderValue = company.npSenderWarehouseRef
    ? [company.npSenderCityName, company.npSenderWarehouseName].filter(Boolean).join(' · ') + (company.npSenderPhone ? ` · ${formatPhone(company.npSenderPhone)}` : '')
    : undefined

  // Nova Poshta serves ordinary parcels only: a company that only does moves has nothing to set up there
  const np = company.parcelsEnabled !== false
  const requisites: SetupItem[] = [
    { label: t('companies:fields.name'), value: company.name },
    { label: t('companies:fields.edrpou'), value: company.edrpou },
    { label: t('companies:fields.phone'), value: company.phone ? formatPhone(company.phone) : undefined },
    { label: t('companies:fields.email'), value: company.email },
    { label: t('companies:fields.address'), value: company.address },
  ]
  const npItems: SetupItem[] = [
    {
      label: t('companies:fields.npKey'),
      value: company.novaPoshtaKeyConfigured ? t('companies:fields.npKeyConfigured') : undefined,
      hint: t('companies:setup.npKeyHint'),
      action: editable ? { label: t(company.novaPoshtaKeyConfigured ? 'companies:setup.change' : 'companies:setup.set'), icon: KeyRound, onClick: () => setKeyOpen(true) } : undefined,
    },
    {
      label: t('novaPoshta:sender.field'),
      value: senderValue,
      hint: t('companies:setup.senderHint'),
      action: senderEditable ? { label: t(senderValue ? 'companies:setup.change' : 'companies:setup.set'), icon: Truck, onClick: () => setSenderOpen(true) } : undefined,
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      {/* what is filled in and what is not, at a glance: a green tick or an amber «не заповнено» on every row */}
      <div className={np ? 'grid items-start gap-4 lg:grid-cols-2' : 'grid gap-4'}>
        <SetupCard
          title={t('companies:setup.requisites')}
          items={requisites}
          action={
            editable && (
              <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                <Pencil />
                {t('common:actions.edit')}
              </Button>
            )
          }
          footer={
            <div className="flex flex-col gap-1 text-sm text-muted-foreground">
              {company.notes && (
                <span>
                  {t('companies:fields.notes')}: <span className="text-foreground">{company.notes}</span>
                </span>
              )}
              <span>
                {t('common:common.createdAt')}: {formatDateTime(company.createdAt)}
              </span>
            </div>
          }
        />
        {np && <SetupCard title={t('companies:setup.novaPoshta')} items={npItems} />}
      </div>

      <CompanyModules company={company} />

      <CompanyDialog open={editing} onOpenChange={setEditing} company={company} onSubmit={(body) => update.mutateAsync(body)} />
      <NpSenderDialog company={company} open={senderOpen} onOpenChange={setSenderOpen} />
      <NpKeyDialog
        open={keyOpen}
        onOpenChange={setKeyOpen}
        title={t('companies:npKeyDialog.title')}
        description={t('companies:npKeyDialog.description')}
        apiKeyLabel={t('companies:npKeyDialog.apiKey')}
        apiKeyPlaceholder={t('companies:npKeyDialog.apiKeyPlaceholder')}
        clearHint={t('companies:npKeyDialog.clearHint')}
        onSubmit={(body) => setKey.mutateAsync(body)}
      />
    </div>
  )
}

type SetupItem = {
  label: string
  value?: ReactNode
  /** Why it matters, shown while it is not filled in. */
  hint?: string
  action?: { label: string; icon: LucideIcon; onClick: () => void }
}

/** A card of settings: «N з M заповнено» in the header, then one row per item with its state. */
function SetupCard({ title, items, action, footer }: { title: string; items: SetupItem[]; action?: ReactNode; footer?: ReactNode }) {
  const { t } = useTranslation('companies')
  const done = items.filter((i) => i.value != null && i.value !== '').length
  const complete = done === items.length
  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <CardTitle>{title}</CardTitle>
          <Badge
            variant="outline"
            className={complete ? 'border-transparent bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200' : 'border-transparent bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200'}
          >
            {complete ? t('setup.complete') : t('setup.progress', { done, total: items.length })}
          </Badge>
        </div>
        {action}
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <ul className="flex flex-col divide-y">
          {items.map((item) => {
            const filled = item.value != null && item.value !== ''
            const Action = item.action?.icon
            return (
              <li key={item.label} className="flex items-start gap-3 py-2.5 first:pt-0 last:pb-0">
                {filled ? <CircleCheck className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-300" /> : <CircleAlert className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-300" />}
                <div className="flex min-w-0 flex-1 flex-col gap-0.5 text-sm sm:flex-row sm:gap-4">
                  <span className="text-muted-foreground sm:w-44 sm:shrink-0">{item.label}</span>
                  <span className="min-w-0 break-words">
                    {filled ? <span className="font-medium">{item.value}</span> : <span className="text-amber-700 dark:text-amber-300">{t('setup.missing')}</span>}
                    {!filled && item.hint && <span className="block text-xs text-muted-foreground">{item.hint}</span>}
                  </span>
                </div>
                {item.action && Action && (
                  <Button variant={filled ? 'ghost' : 'outline'} size="sm" className="shrink-0" onClick={item.action.onClick} aria-label={`${item.action.label}: ${item.label}`}>
                    <Action />
                    {item.action.label}
                  </Button>
                )}
              </li>
            )
          })}
        </ul>
        {footer}
      </CardContent>
    </Card>
  )
}
