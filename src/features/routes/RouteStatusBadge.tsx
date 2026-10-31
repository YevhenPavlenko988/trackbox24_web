import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import type { RouteStatus } from '@/lib/api/types'
import { cn } from '@/lib/utils'

const STYLES: Record<RouteStatus, string> = {
  PLANNED: 'bg-muted text-foreground',
  IN_PROGRESS: 'bg-violet-100 text-violet-900 dark:bg-violet-900/40 dark:text-violet-200',
  COMPLETED: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200',
  CANCELLED: 'bg-muted text-muted-foreground line-through',
}

export function RouteStatusBadge({ status }: { status?: RouteStatus }) {
  const { t } = useTranslation('routes')
  if (!status) return null
  return (
    <Badge variant="secondary" className={cn(STYLES[status])}>
      {t(`status.${status}`)}
    </Badge>
  )
}
