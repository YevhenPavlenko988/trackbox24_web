import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useAccess } from '@/features/auth/access'
import { showApiError } from '@/lib/api/problem'
import type { BillingRequisitesDto } from '@/lib/api/types'
import { useRequisites, useSetRequisites } from './queries'

const FIELDS = ['name', 'taxId', 'address', 'iban', 'bank', 'email', 'phone', 'edrRecord', 'taxGroup', 'signer', 'city'] as const

/** Our details on the invoices carriers get: who to pay and where; the admin keeps them. */
export function RequisitesDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { t } = useTranslation('billing')
  const requisites = useRequisites().data
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('requisites.title')}</DialogTitle>
          <DialogDescription>{t('requisites.hint')}</DialogDescription>
        </DialogHeader>
        {requisites && <RequisitesForm key={JSON.stringify(requisites)} initial={requisites} onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  )
}

function RequisitesForm({ initial, onDone }: { initial: BillingRequisitesDto; onDone: () => void }) {
  const { t } = useTranslation(['billing', 'common'])
  const { isAdmin } = useAccess()
  const save = useSetRequisites()
  const [form, setForm] = useState<BillingRequisitesDto>(initial)
  const set = (key: keyof BillingRequisitesDto, value: string) => setForm((f) => ({ ...f, [key]: value }))

  const submit = async () => {
    try {
      // an IBAN is often copied in groups of four
      const clean = Object.fromEntries(
        Object.entries(form).map(([k, v]) => [k, typeof v === 'string' && v.trim() ? (k === 'iban' ? v.replace(/\s/g, '').toUpperCase() : v.trim()) : undefined]),
      )
      await save.mutateAsync(clean as BillingRequisitesDto)
      toast.success(t('billing:toasts.requisitesSaved'))
      onDone()
    } catch (e) {
      showApiError(e)
    }
  }

  return (
    <>
      <FieldGroup className="grid gap-4 sm:grid-cols-2">
        {FIELDS.map((key) => (
          <Field key={key}>
            <FieldLabel htmlFor={`req-${key}`}>{t(`billing:requisites.${key}`)}</FieldLabel>
            <Input
              id={`req-${key}`}
              readOnly={!isAdmin}
              placeholder={t(`billing:requisites.${key}Placeholder`)}
              value={form[key] ?? ''}
              onChange={(e) => set(key, e.target.value)}
            />
          </Field>
        ))}
        <Field className="sm:col-span-2">
          <FieldLabel htmlFor="req-notes">{t('billing:requisites.notes')}</FieldLabel>
          <Textarea
            id="req-notes"
            rows={2}
            readOnly={!isAdmin}
            placeholder={t('billing:requisites.notesPlaceholder')}
            value={form.notes ?? ''}
            onChange={(e) => set('notes', e.target.value)}
          />
        </Field>
      </FieldGroup>
      {isAdmin ? (
        <DialogFooter>
          <Button variant="outline" onClick={onDone}>
            {t('common:actions.cancel')}
          </Button>
          <Button disabled={save.isPending} onClick={submit}>
            {t('common:actions.save')}
          </Button>
        </DialogFooter>
      ) : (
        <p className="text-sm text-muted-foreground">{t('billing:requisites.readOnly')}</p>
      )}
    </>
  )
}
