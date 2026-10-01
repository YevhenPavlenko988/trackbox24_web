import { KeyRound, Pencil } from 'lucide-react'
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
import { useSetCompanyNpKey, useUpdateCompany } from './queries'

export function CompanyStatusBadge({ active }: { active?: boolean }) {
  const { t } = useTranslation('companies')
  return active === false ? (
    <Badge variant="destructive">{t('status.inactive')}</Badge>
  ) : (
    <Badge className="bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200">{t('status.active')}</Badge>
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
  const { t } = useTranslation(['companies', 'common'])
  const { canEdit, isAdmin, companyMode } = useAccess()
  // Admins may edit company requisites from the companies section, but not while browsing a company read-only.
  const editable = canEdit || (isAdmin && !companyMode)
  const update = useUpdateCompany(company.id!)
  const setKey = useSetCompanyNpKey(company.id!)
  const [editing, setEditing] = useState(false)
  const [keyOpen, setKeyOpen] = useState(false)

  return (
    <>
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
            </div>
          )}
        </CardContent>
      </Card>

      <CompanyDialog open={editing} onOpenChange={setEditing} company={company} onSubmit={(body) => update.mutateAsync(body)} />
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
    </>
  )
}
