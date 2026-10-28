import { cn } from 'cn'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import type { ParcelStatus } from '@/lib/api/types'
import { PARCEL_STATUS_STYLES } from './statusStyles'

export function ParcelStatusBadge({ status, className }: { status?: ParcelStatus; className?: string }) {
  const { t } = useTranslation()
  if (!status) return null
  return (
    <Badge variant="secondary" className={cn(PARCEL_STATUS_STYLES[status], className)}>
      {t(`parcelStatus.${status}`)}
    </Badge>
  )
}
