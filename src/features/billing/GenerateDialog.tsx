import { format } from 'date-fns'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { useCompanies } from '@/features/companies/queries'
import { showApiError } from '@/lib/api/problem'
import { useGenerateInvoices } from './queries'

/**
 * Drafts in advance for a month by hand, for the companies ticked (all billed ones at first); test companies with
 * «Виставляти рахунки» off are not offered. Repeating it creates nothing twice.
 */
export function GenerateDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { t } = useTranslation(['billing', 'common'])
  const generate = useGenerateInvoices()
  const [month, setMonth] = useState(() => format(new Date(), 'yyyy-MM'))
  const companies = (useCompanies({ page: 0, size: 500 }).data?.content ?? []).filter((c) => c.active && c.billingEnabled)
  // what was unticked; everything else is in
  const [skipped, setSkipped] = useState<Set<number>>(new Set())
  const chosen = companies.filter((c) => !skipped.has(c.id!)).map((c) => c.id!)
  const toggle = (id: number, on: boolean) =>
    setSkipped((s) => {
      const next = new Set(s)
      if (on) next.delete(id)
      else next.add(id)
      return next
    })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('billing:generate.title')}</DialogTitle>
          <DialogDescription>{t('billing:generate.hint')}</DialogDescription>
        </DialogHeader>
        <Field>
          <FieldLabel htmlFor="generate-month">{t('billing:generate.month')}</FieldLabel>
          <Input id="generate-month" type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
        </Field>
        <Field>
          <FieldLabel>{t('billing:generate.companies')}</FieldLabel>
          {companies.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('billing:generate.none')}</p>
          ) : (
            <div className="flex max-h-64 flex-col gap-2 overflow-y-auto rounded-md border p-3">
              <label className="flex items-center gap-2 text-sm font-medium">
                <Checkbox
                  checked={chosen.length === companies.length}
                  indeterminate={chosen.length > 0 && chosen.length < companies.length}
                  onCheckedChange={(v) => setSkipped(v ? new Set() : new Set(companies.map((c) => c.id!)))}
                />
                {t('billing:generate.all', { count: companies.length })}
              </label>
              {companies.map((c) => (
                <label key={c.id} className="flex items-center gap-2 pl-6 text-sm">
                  <Checkbox checked={!skipped.has(c.id!)} onCheckedChange={(v) => toggle(c.id!, !!v)} />
                  {c.name}
                </label>
              ))}
            </div>
          )}
        </Field>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common:actions.cancel')}
          </Button>
          <Button
            disabled={!month || chosen.length === 0 || generate.isPending}
            onClick={async () => {
              try {
                const count = await generate.mutateAsync({ period: month, companyIds: chosen })
                toast.success(t('billing:toasts.generated', { count }))
                onOpenChange(false)
              } catch (e) {
                showApiError(e)
              }
            }}
          >
            {t('billing:actions.generate')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
