import { useTranslation } from 'react-i18next'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { ParcelStatus } from '@/lib/api/types'

export const PARCEL_STATUSES: ParcelStatus[] = [
  'IN_NOVA_POSHTA',
  'RECEIVED_BY_REPRESENTATIVE',
  'IN_CAR',
  'DELIVERED_TO_CLIENT',
  'CANCELLED',
]

const ALL = '__all__'

export function ParcelStatusSelect({
  value,
  onChange,
  className,
}: {
  value?: ParcelStatus
  onChange: (value: ParcelStatus | undefined) => void
  className?: string
}) {
  const { t } = useTranslation(['parcels', 'common'])
  return (
    <Select value={value ?? ALL} onValueChange={(v) => onChange(v === ALL || !v ? undefined : (v as ParcelStatus))}>
      <SelectTrigger className={className ?? 'w-56'}>
        <SelectValue>{value ? t(`common:parcelStatus.${value}`) : t('parcels:filters.allStatuses')}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>{t('parcels:filters.allStatuses')}</SelectItem>
        {PARCEL_STATUSES.map((s) => (
          <SelectItem key={s} value={s}>
            {t(`common:parcelStatus.${s}`)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
