import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useAccess } from '@/features/auth/access'
import { parseNumber } from '@/features/parcels/status'
import { showApiError } from '@/lib/api/problem'
import type { BillingPriceResponse } from '@/lib/api/types'
import { formatEur } from './format'
import { usePrices, useSetPrice } from './queries'

/** Monthly prices of the base plan and the options; the admin edits them, sales see them. */
export function PricesDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { t } = useTranslation('billing')
  const { isAdmin } = useAccess()
  const prices = usePrices().data ?? []
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('prices.title')}</DialogTitle>
          <DialogDescription>{t('prices.hint')}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col divide-y">
          {prices.map((p) => (isAdmin ? <PriceRow key={p.code} price={p} /> : (
            <div key={p.code} className="flex items-center justify-between py-2.5">
              <span>{p.label}</span>
              <span className="font-medium tabular-nums">{formatEur(p.amountEur)}</span>
            </div>
          )))}
        </div>
        {!isAdmin && <p className="text-sm text-muted-foreground">{t('prices.readOnly')}</p>}
      </DialogContent>
    </Dialog>
  )
}

function PriceRow({ price }: { price: BillingPriceResponse }) {
  const { t } = useTranslation(['billing', 'common'])
  const save = useSetPrice()
  const [value, setValue] = useState(String(price.amountEur ?? ''))
  const amount = parseNumber(value)
  const changed = amount != null && amount !== price.amountEur
  return (
    <form
      className="flex items-center gap-3 py-2"
      onSubmit={async (e) => {
        e.preventDefault()
        if (amount == null || amount < 0) return
        try {
          await save.mutateAsync({ code: price.code!, amountEur: amount })
          toast.success(t('billing:toasts.priceSaved'))
        } catch (err) {
          showApiError(err)
        }
      }}
    >
      <label htmlFor={`price-${price.code}`} className="flex-1">
        {price.label}
      </label>
      <div className="relative w-28">
        <Input id={`price-${price.code}`} inputMode="decimal" className="pr-7 text-right tabular-nums" value={value} onChange={(e) => setValue(e.target.value)} />
        <span className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-sm text-muted-foreground">€</span>
      </div>
      <Button type="submit" size="sm" variant={changed ? 'default' : 'outline'} disabled={!changed || amount == null || amount < 0 || save.isPending}>
        {t('common:actions.save')}
      </Button>
    </form>
  )
}
