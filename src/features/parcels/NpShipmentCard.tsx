import { Pencil, Send, Trash2, Truck } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { DetailsList } from '@/components/common/DetailsList'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAccess } from '@/features/auth/access'
import { showApiError } from '@/lib/api/problem'
import type { NpShipmentResponse, ParcelResponse } from '@/lib/api/types'
import { formatDate, formatDateTime, formatMoney, formatPhone } from '@/lib/format'
import { NpShipmentDialog } from './NpShipmentDialog'
import { useCreateNpWaybill, useDeleteNpWaybill } from './queries'
import { NP_SHIPPABLE_STATUSES } from './status'

const recipientName = (s: NpShipmentResponse) => [s.recipientLastName, s.recipientFirstName, s.recipientMiddleName].filter(Boolean).join(' ')

function destination(s: NpShipmentResponse): string | undefined {
  if (s.deliveryType === 'ADDRESS') {
    const address = [s.streetName, s.building].filter(Boolean).join(', ')
    const flat = s.flat ? `, кв. ${s.flat}` : ''
    return [s.cityName, address ? address + flat : undefined].filter(Boolean).join(' · ') || undefined
  }
  return [s.cityName, s.warehouseName].filter(Boolean).join(' · ') || undefined
}

/**
 * Return parcels: what Nova Poshta does with the parcel after us. The driver fills the recipient in on acceptance,
 * a manager creates the waybill; once it exists the data is frozen until the waybill is deleted.
 */
export function NpShipmentCard({ parcel: p }: { parcel: ParcelResponse }) {
  const { t } = useTranslation(['novaPoshta', 'common'])
  const { canEdit } = useAccess()
  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const createWaybill = useCreateNpWaybill(p.id!)
  const removeWaybill = useDeleteNpWaybill(p.id!)
  const s = p.npShipment
  const withUs = p.status != null && NP_SHIPPABLE_STATUSES.includes(p.status)
  const hasWaybill = !!s?.waybillNumber
  // Nova Poshta only lets a waybill go while it has not taken the parcel yet.
  const removable = hasWaybill && (s?.npState == null || s.npState === 'CREATED')

  if (!s) {
    if (!canEdit || !withUs) return null
    return (
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-sm text-muted-foreground">{t('novaPoshta:shipment.empty')}</span>
          <Button variant="outline" onClick={() => setEditing(true)}>
            <Truck />
            {t('novaPoshta:shipment.fill')}
          </Button>
          <NpShipmentDialog parcel={p} open={editing} onOpenChange={setEditing} />
        </CardContent>
      </Card>
    )
  }

  const onCreate = async () => {
    try {
      await createWaybill.mutateAsync()
      toast.success(t('novaPoshta:shipment.created'))
    } catch (e) {
      showApiError(e)
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2">
        <CardTitle>{t('novaPoshta:shipment.title')}</CardTitle>
        {canEdit && (
          <div className="flex flex-wrap gap-2">
            {withUs && !hasWaybill && (
              <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
                <Pencil />
                {t('novaPoshta:shipment.edit')}
              </Button>
            )}
            {withUs && !hasWaybill && (
              <Button size="sm" onClick={onCreate} disabled={createWaybill.isPending}>
                <Send />
                {t('novaPoshta:shipment.create')}
              </Button>
            )}
            {removable && (
              <Button size="sm" variant="outline" onClick={() => setDeleting(true)}>
                <Trash2 />
                {t('novaPoshta:shipment.delete')}
              </Button>
            )}
          </div>
        )}
      </CardHeader>
      <CardContent>
        <DetailsList
          items={[
            { label: t('novaPoshta:shipment.recipient'), value: recipientName(s) || undefined },
            { label: t('novaPoshta:shipment.phone'), value: formatPhone(s.recipientPhone) },
            { label: t('novaPoshta:shipment.deliveryType'), value: s.deliveryType ? t(`novaPoshta:deliveryType.${s.deliveryType}`) : undefined },
            { label: t('novaPoshta:shipment.destination'), value: destination(s) },
            { label: t('novaPoshta:shipment.cargoType'), value: s.cargoType ? t(`novaPoshta:cargoType.${s.cargoType}`) : undefined },
            { label: t('novaPoshta:shipment.payerType'), value: s.payerType ? t(`novaPoshta:payerType.${s.payerType}`) : undefined },
            { label: t('novaPoshta:shipment.paymentMethod'), value: s.paymentMethod ? t(`novaPoshta:paymentMethod.${s.paymentMethod}`) : undefined },
            { label: t('novaPoshta:shipment.codAmount'), value: s.codAmount ? formatMoney(s.codAmount) : undefined },
            // Everything about the waybill only exists once it has been created; empty rows would only puzzle.
            ...(hasWaybill
              ? [
                  { label: t('novaPoshta:shipment.waybillNumber'), value: <span className="font-mono">{s.waybillNumber}</span> },
                  { label: t('novaPoshta:shipment.waybillCost'), value: s.waybillCost != null ? formatMoney(s.waybillCost) : undefined },
                  { label: t('novaPoshta:shipment.waybillCreatedAt'), value: formatDateTime(s.waybillCreatedAt) },
                  { label: t('novaPoshta:shipment.estimatedDeliveryDate'), value: formatDate(s.estimatedDeliveryDate) },
                  { label: t('novaPoshta:shipment.npStatus'), value: s.npStatusText ? `${s.npStatusText}${s.npStatusCode ? ` (${s.npStatusCode})` : ''}` : undefined },
                  { label: t('novaPoshta:shipment.npStatusUpdatedAt'), value: formatDateTime(s.npStatusUpdatedAt) },
                ]
              : []),
          ]}
        />
        {hasWaybill && canEdit && <p className="mt-3 text-xs text-muted-foreground">{t('novaPoshta:shipment.locked')}</p>}
      </CardContent>

      <NpShipmentDialog parcel={p} open={editing} onOpenChange={setEditing} />
      <ConfirmDialog
        open={deleting}
        onOpenChange={setDeleting}
        title={t('novaPoshta:shipment.deleteConfirm.title')}
        description={t('novaPoshta:shipment.deleteConfirm.description')}
        confirmLabel={t('novaPoshta:shipment.delete')}
        destructive
        pending={removeWaybill.isPending}
        onConfirm={async () => {
          try {
            await removeWaybill.mutateAsync()
            toast.success(t('novaPoshta:shipment.deleted'))
            setDeleting(false)
          } catch (e) {
            showApiError(e)
          }
        }}
      />
    </Card>
  )
}
