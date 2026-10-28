import { format } from 'date-fns'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { showApiError } from '@/lib/api/problem'
import { useGenerateInvoices } from './queries'

/** Drafts in advance for a month by hand, e.g. the next one early; repeating it creates nothing twice. */
export function GenerateDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { t } = useTranslation(['billing', 'common'])
  const generate = useGenerateInvoices()
  const [month, setMonth] = useState(() => format(new Date(), 'yyyy-MM'))
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
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common:actions.cancel')}
          </Button>
          <Button
            disabled={!month || generate.isPending}
            onClick={async () => {
              try {
                const count = await generate.mutateAsync(month)
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
