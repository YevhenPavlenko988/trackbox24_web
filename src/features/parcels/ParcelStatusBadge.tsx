import { cn } from 'cn'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import type { ParcelStatus } from '@/lib/api/types'

const STYLES: Record<ParcelStatus, string> = {
  IN_NOVA_POSHTA: 'bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200',
  RECEIVED_BY_REPRESENTATIVE: 'bg-sky-100 text-sky-900 dark:bg-sky-900/40 dark:text-sky-200',
  AT_WAREHOUSE: 'bg-teal-100 text-teal-900 dark:bg-teal-900/40 dark:text-teal-200',
  IN_CAR: 'bg-violet-100 text-violet-900 dark:bg-violet-900/40 dark:text-violet-200',
  DELIVERED_TO_CLIENT: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200',
  CANCELLED: 'bg-muted text-muted-foreground line-through',
}

export function ParcelStatusBadge({ status, className }: { status?: ParcelStatus; className?: string }) {
  const { t } = useTranslation()
  if (!status) return null
  return (
    <Badge variant="secondary" className={cn(STYLES[status], className)}>
      {t(`parcelStatus.${status}`)}
    </Badge>
  )
}
