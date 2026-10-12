import { Pencil, Send, Trash2, Truck } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { DetailsList } from '@/components/common/DetailsList'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Link } from 'react-router'
import { useAccess } from '@/features/auth/access'
import { useCurrentCompany } from '@/features/companies/queries'
import { showApiError } from '@/lib/api/problem'
import type { NpShipmentResponse, ParcelResponse } from '@/lib/api/types'
import { formatDate, formatDateTime, formatMoney, formatPhone } from '@/lib/format'
import { ParcelEditDialog } from './ParcelEditDialog'
import { NpShipmentDialog } from './NpShipmentDialog'
import { useCreateNpWaybill, useDeleteNpWaybill } from './queries'
import { isFinalStatus, NP_SHIPPABLE_STATUSES } from './status'

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
 * Return parcels: what Nova Poshta does with the parcel after us. The driver fills the recipient in on acceptance
 * and usually creates the waybill right there (one label with our barcode and the waybill); a manager checks,
 * deletes and recreates it here. Once the waybill exists the data is frozen until it is deleted.
 */
export function NpShipmentCard({ parcel: p }: { parcel: ParcelResponse }) {
  const { t } = useTranslation(['novaPoshta', 'common'])
  const { canEdit } = useAccess()
  const [editing, setEditing] = useState(false)
  const [editingParcel, setEditingParcel] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const company = useCurrentCompany()
  // Without the company key and the sender branch Nova Poshta refuses the waybill, and the error names settings
  // that live on another page — so the way there is offered before the button is pressed.
  const companyReady = !!company.data?.novaPoshtaKeyConfigured && !!company.data?.npSenderWarehouseRef
  const createWaybill = useCreateNpWaybill(p.id!)
  /**
   * Nova Poshta builds the waybill from the parcel itself, and refuses it without these three. The backend says
   * the same when the waybill is created; saying it here saves the manager a rejected button.
   */
  const missingOnParcel = [
    !p.description?.trim() ? t('novaPoshta:shipment.needDescription') : undefined,
    !(p.weightKg && p.weightKg > 0) ? t('novaPoshta:shipment.needWeight') : undefined,
    !(p.declaredValue && p.declaredValue > 0) ? t('novaPoshta:shipment.needDeclaredValue') : undefined,
  ].filter(Boolean) as string[]

  const parcelSetup =
    canEdit && missingOnParcel.length > 0 ? (
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">
        <span>{t('novaPoshta:shipment.parcelNotReady', { fields: missingOnParcel.join(', ') })}</span>
        <Button size="sm" variant="outline" onClick={() => setEditingParcel(true)}>
          <Pencil />
          {t('novaPoshta:shipment.fillParcel')}
        </Button>
      </div>
    ) : null

  const companySetup =
    canEdit && !companyReady && company.isSuccess ? (
      <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">
        {t('novaPoshta:shipment.companyNotReady')}{' '}
        <Link to="/company" className="underline underline-offset-4">
          {t('novaPoshta:shipment.companySettings')}
        </Link>
      </p>
    ) : null
  const removeWaybill = useDeleteNpWaybill(p.id!)
  const s = p.npShipment
  const withUs = p.status != null && NP_SHIPPABLE_STATUSES.includes(p.status)
  const hasWaybill = !!s?.waybillNumber
  // Nova Poshta only lets a waybill go while it has not taken the parcel yet.
  const removable = hasWaybill && (s?.npState == null || s.npState === 'CREATED')

  // Nothing filled in yet. The card still shows itself — with its title — so that sending a parcel onward by
  // Nova Poshta is something you can find on the parcel, not something you have to know about.
  if (!s) {
    if (!canEdit || isFinalStatus(p.status)) return null
    return (
      <>
        <Card>
          <CardHeader>
            <CardTitle>{t('novaPoshta:shipment.title')}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-sm text-muted-foreground">{withUs ? t('novaPoshta:shipment.empty') : t('novaPoshta:shipment.onlyWithUs')}</span>
            <Tooltip>
              <TooltipTrigger render={<span />}>
                <Button variant="outline" disabled={!withUs} onClick={() => setEditing(true)}>
                  <Truck />
                  {t('novaPoshta:shipment.fill')}
                </Button>
              </TooltipTrigger>
              {!withUs && <TooltipContent>{t('novaPoshta:shipment.onlyWithUs')}</TooltipContent>}
            </Tooltip>
            {companySetup}
            {parcelSetup}
          </CardContent>
        </Card>
        <NpShipmentDialog parcel={p} open={editing} onOpenChange={setEditing} />
        <ParcelEditDialog parcel={p} open={editingParcel} onOpenChange={setEditingParcel} />
      </>
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
                  { label: t('novaPoshta:shipment.shipDate'), value: formatDate(s.shipDate) },
                  { label: t('novaPoshta:shipment.estimatedDeliveryDate'), value: formatDate(s.estimatedDeliveryDate) },
                  { label: t('novaPoshta:shipment.npStatus'), value: s.npStatusText ? `${s.npStatusText}${s.npStatusCode ? ` (${s.npStatusCode})` : ''}` : undefined },
                  { label: t('novaPoshta:shipment.npStatusUpdatedAt'), value: formatDateTime(s.npStatusUpdatedAt) },
                ]
              : []),
          ]}
        />
        {hasWaybill && canEdit && <p className="mt-3 text-xs text-muted-foreground">{t('novaPoshta:shipment.locked')}</p>}
        {!hasWaybill && companySetup}
        {!hasWaybill && parcelSetup}
      </CardContent>

      <NpShipmentDialog parcel={p} open={editing} onOpenChange={setEditing} />
      <ParcelEditDialog parcel={p} open={editingParcel} onOpenChange={setEditingParcel} />
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
