import { KeyRound, Pencil, Truck } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { DetailsList } from '@/components/common/DetailsList'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
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

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardContent className="flex flex-col gap-4">
          <DetailsList
            items={[
              { label: t('companies:fields.name'), value: company.name },
              { label: t('companies:fields.edrpou'), value: company.edrpou },
              { label: t('companies:fields.phone'), value: formatPhone(company.phone) },
              { label: t('companies:fields.email'), value: company.email },
              { label: t('companies:fields.address'), value: company.address },
              { label: t('companies:fields.npKey'), value: <NpKeyBadge configured={company.novaPoshtaKeyConfigured} /> },
              { label: t('novaPoshta:sender.field'), value: senderValue },
              { label: t('companies:fields.notes'), value: company.notes },
              { label: t('common:common.createdAt'), value: formatDateTime(company.createdAt) },
            ]}
          />
          {editable && (
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => setEditing(true)}>
                <Pencil />
                {t('common:actions.edit')}
              </Button>
              <Button variant="outline" onClick={() => setKeyOpen(true)}>
                <KeyRound />
                {t('companies:actions.npKey')}
              </Button>
              {senderEditable && (
                <Button variant="outline" onClick={() => setSenderOpen(true)}>
                  <Truck />
                  {t('novaPoshta:sender.action')}
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

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
