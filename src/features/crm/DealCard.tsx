import { CheckSquare, Euro, User } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { Card, CardContent } from '@/components/ui/card'
import type { CrmDealResponse, CrmStageResponse } from '@/lib/api/types'
import { formatMoney } from '@/lib/format'
import { ChannelBadge } from '@/features/channels/channel'
import { StageSelect } from './StageSelect'

/** A deal on the pipeline board; the stage is changed right on the card. */
export function DealCard({ deal, stages }: { deal: CrmDealResponse; stages: CrmStageResponse[] }) {
  const { t } = useTranslation('crm')
  return (
    <Card size="sm" className="gap-2">
      <CardContent className="flex flex-col gap-2">
        <Link to={`/crm/deals/${deal.id}`} className="font-medium hover:underline">
          {deal.title}
        </Link>
        {deal.contact && (
          <p className="text-xs text-muted-foreground">
            {deal.contact.fullName}
            {deal.contact.phone ? ` · ${deal.contact.phone}` : ''}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {deal.owner && (
            <span className="flex items-center gap-1">
              <User className="size-3" />
              {deal.owner.name}
            </span>
          )}
          {deal.expectedMonthlyEur != null && (
            <span className="flex items-center gap-1">
              <Euro className="size-3" />
              {t('deals.perMonth', { value: formatMoney(deal.expectedMonthlyEur, 'EUR') })}
            </span>
          )}
          {!!deal.openTasks && (
            <span className="flex items-center gap-1">
              <CheckSquare className="size-3" />
              {t('deals.openTasks', { count: deal.openTasks })}
            </span>
          )}
          {deal.source && <ChannelBadge channel={deal.source} compact />}
        </div>
        <StageSelect deal={deal} stages={stages} size="sm" />
      </CardContent>
    </Card>
  )
}
