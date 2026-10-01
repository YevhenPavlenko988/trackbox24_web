import { cn } from 'cn'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import type { ActualShipmentStatus, PlannedShipmentStatus } from '@/lib/api/types'

const PLANNED: Record<PlannedShipmentStatus, string> = {
  PLANNED: 'bg-muted text-foreground',
  CONFIRMED: 'bg-sky-100 text-sky-900 dark:bg-sky-900/40 dark:text-sky-200',
  STARTED: 'bg-violet-100 text-violet-900 dark:bg-violet-900/40 dark:text-violet-200',
  CANCELLED: 'bg-muted text-muted-foreground line-through',
}

const ACTUAL: Record<ActualShipmentStatus, string> = {
  IN_PROGRESS: 'bg-violet-100 text-violet-900 dark:bg-violet-900/40 dark:text-violet-200',
  COMPLETED: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200',
  CANCELLED: 'bg-muted text-muted-foreground line-through',
}

export function PlannedStatusBadge({ status }: { status?: PlannedShipmentStatus }) {
  const { t } = useTranslation('shipments')
  if (!status) return null
  return (
    <Badge variant="secondary" className={cn(PLANNED[status])}>
      {t(`planned.status.${status}`)}
    </Badge>
  )
}

export function ActualStatusBadge({ status }: { status?: ActualShipmentStatus }) {
  const { t } = useTranslation('shipments')
  if (!status) return null
  return (
    <Badge variant="secondary" className={cn(ACTUAL[status])}>
      {t(`actual.status.${status}`)}
    </Badge>
  )
}
