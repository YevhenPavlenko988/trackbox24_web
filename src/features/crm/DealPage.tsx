import { Building2, Pencil, Trash2, UserPlus } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { DetailsList } from '@/components/common/DetailsList'
import { LinkButton } from '@/components/common/LinkButton'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { showApiError } from '@/lib/api/problem'
import { formatDateTime, formatMoney } from '@/lib/format'
import { NotFoundPage } from '@/routes/ErrorPages'
import { ChannelBadge } from '@/features/channels/channel'
import { stageSwatch } from './colors'
import { ConvertDialog } from './ConvertDialog'
import { DealActivity } from './DealActivity'
import { DealDialog } from './DealDialog'
import { useDeal, useDeleteDeal, useStages } from './queries'
import { StageSelect } from './StageSelect'
import { TaskList } from './TaskList'

export function DealPage() {
  const { id } = useParams()
  const dealId = Number(id)
  const { t } = useTranslation(['crm', 'common'])
  const navigate = useNavigate()
  const deal = useDeal(dealId)
  const stages = useStages().data ?? []
  const remove = useDeleteDeal()
  const [editing, setEditing] = useState(false)
  const [converting, setConverting] = useState(false)
  const [deleting, setDeleting] = useState(false)

  if (deal.isPending) return <Skeleton className="h-40 w-full" />
  if (deal.isError || !deal.data) return <NotFoundPage />
  const d = deal.data
  const utm = [d.utmSource, d.utmMedium, d.utmCampaign, d.utmTerm, d.utmContent].filter(Boolean).join(' / ')

  const del = async () => {
    try {
      await remove.mutateAsync(dealId)
      navigate('/crm/deals')
    } catch (e) {
      showApiError(e)
    }
  }

  return (
    <>
      <PageHeader
        title={d.title}
        badges={
          <>
            <Badge className={stageSwatch(d.stageColor).badge}>{d.stage?.name}</Badge>
          </>
        }
        actions={
          <>
            {d.company ? (
              <LinkButton variant="outline" to={`/companies/${d.company.id}?tab=crm`}>
                <Building2 />
                {t('crm:deals.openClient')}
              </LinkButton>
            ) : (
              d.stageKind !== 'LOST' && (
                <Button onClick={() => setConverting(true)}>
                  <UserPlus />
                  {t('crm:convert.action')}
                </Button>
              )
            )}
            <Button variant="outline" onClick={() => setEditing(true)}>
              <Pencil />
              {t('common:actions.edit')}
            </Button>
            <Button variant="ghost" onClick={() => setDeleting(true)} aria-label={t('common:actions.delete')}>
              <Trash2 />
            </Button>
          </>
        }
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_24rem]">
        <div className="flex flex-col gap-6">
          <Card>
            <CardContent className="flex flex-col gap-4">
              <div className="w-64">
                <StageSelect deal={d} stages={stages} />
              </div>
              <DetailsList
                items={[
                  { label: t('crm:fields.contact'), value: d.contact && [d.contact.fullName, d.contact.jobTitle].filter(Boolean).join(', ') },
                  { label: t('crm:fields.phone'), value: d.contact?.phone },
                  { label: t('crm:fields.email'), value: d.contact?.email },
                  { label: t('crm:fields.owner'), value: d.owner?.name },
                  { label: t('crm:fields.source'), value: d.source ? <ChannelBadge channel={d.source} details={d.sourceDetails} /> : undefined },
                  { label: t('crm:fields.interestedOptions'), value: d.interestedOptions?.length ? d.interestedOptions.map((o) => t(`crm:options.${o}`)).join(', ') : undefined },
                  { label: t('crm:fields.expectedMonthlyEur'), value: d.expectedMonthlyEur != null ? formatMoney(d.expectedMonthlyEur, 'EUR') : undefined },
                  { label: t('crm:deals.client'), value: d.company?.name },
                  { label: t('crm:fields.lostReason'), value: d.lostReason },
                  { label: t('crm:fields.utm'), value: utm || undefined },
                  { label: t('crm:fields.createdAt'), value: formatDateTime(d.createdAt) },
                ]}
              />
              {d.notes && <p className="whitespace-pre-wrap text-sm">{d.notes}</p>}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{t('crm:tasks.title')}</CardTitle>
            </CardHeader>
            <CardContent>
              <TaskList dealId={dealId} />
            </CardContent>
          </Card>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>{t('crm:activity.title')}</CardTitle>
          </CardHeader>
          <CardContent>
            <DealActivity dealId={dealId} />
          </CardContent>
        </Card>
      </div>
      <DealDialog open={editing} onOpenChange={setEditing} deal={d} />
      <ConvertDialog open={converting} onOpenChange={setConverting} deal={d} />
      <ConfirmDialog
        open={deleting}
        onOpenChange={setDeleting}
        title={t('common:actions.delete')}
        description={t('crm:deals.deleteConfirm')}
        destructive
        pending={remove.isPending}
        onConfirm={del}
      />
    </>
  )
}
