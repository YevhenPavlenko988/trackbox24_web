import { cn } from 'cn'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import type { TripStatus } from '@/lib/api/types'

const STYLES: Record<TripStatus, string> = {
  PLANNED: 'bg-muted text-foreground',
  PREPARING: 'bg-sky-100 text-sky-900 dark:bg-sky-900/40 dark:text-sky-200',
  IN_PROGRESS: 'bg-violet-100 text-violet-900 dark:bg-violet-900/40 dark:text-violet-200',
  COMPLETED: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200',
  CANCELLED: 'bg-muted text-muted-foreground line-through',
}

export function TripStatusBadge({ status }: { status?: TripStatus }) {
  const { t } = useTranslation('trips')
  if (!status) return null
  return (
    <Badge variant="secondary" className={cn(STYLES[status])}>
      {t(`status.${status}`)}
    </Badge>
  )
}
