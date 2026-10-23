import { KeyRound, Pencil, Truck } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { DetailsList } from '@/components/common/DetailsList'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'
import { useAccess } from '@/features/auth/access'
import { showApiError } from '@/lib/api/problem'
import type { CompanyResponse } from '@/lib/api/types'
import { formatDateTime, formatPhone } from '@/lib/format'
import { CompanyDialog } from './CompanyDialog'
import { NpKeyDialog } from './NpKeyDialog'
import { NpSenderDialog } from './NpSenderDialog'
import { useSetCompanyNpKey, useSetCompanyPhotos, useUpdateCompany } from './queries'

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
  const { t } = useTranslation(['companies', 'common', 'novaPoshta'])
  const { canEdit, isAdmin, companyMode } = useAccess()
  // Admins may edit company requisites from the companies section, but not while browsing a company read-only.
  const editable = canEdit || (isAdmin && !companyMode)
  const update = useUpdateCompany(company.id!)
  const setKey = useSetCompanyNpKey(company.id!)
  const setPhotos = useSetCompanyPhotos(company.id!)
  // Parcel photos are switched on per company by the platform admin; a manager only sees the state.
  const photosEditable = isAdmin && !companyMode
  const togglePhotos = async (value: boolean) => {
    try {
      await setPhotos.mutateAsync(value)
      toast.success(t('common:common.saved'))
    } catch (e) {
      showApiError(e)
    }
  }
  const [editing, setEditing] = useState(false)
  const [keyOpen, setKeyOpen] = useState(false)
  const [senderOpen, setSenderOpen] = useState(false)
  // The Nova Poshta directories behind the city and branch pickers are closed to admins, so only a manager sets this.
  const senderEditable = canEdit

  const senderValue = company.npSenderWarehouseRef
    ? [company.npSenderCityName, company.npSenderWarehouseName].filter(Boolean).join(' · ') + (company.npSenderPhone ? ` · ${formatPhone(company.npSenderPhone)}` : '')
    : undefined

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
              { label: t('novaPoshta:sender.field'), value: senderValue },
              {
                label: t('companies:fields.photos'),
                value: (
                  <span className="flex flex-col gap-1">
                    <span className="flex items-center gap-2">
                      {photosEditable && (
                        <Switch
                          id="company-photos"
                          checked={company.photosEnabled === true}
                          disabled={setPhotos.isPending}
                          onCheckedChange={(c) => togglePhotos(c)}
                          aria-label={t('companies:fields.photos')}
                        />
                      )}
                      {company.photosEnabled ? t('companies:photos.enabled') : t('companies:photos.disabled')}
                    </span>
                    {photosEditable && <span className="text-xs font-normal text-muted-foreground">{t('companies:photos.hint')}</span>}
                  </span>
                ),
              },
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
    </>
  )
}
