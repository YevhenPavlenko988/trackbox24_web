import { Plus } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { useAccess } from '@/features/auth/access'
import { showApiError } from '@/lib/api/problem'
import type { BillingPaymentMethodResponse } from '@/lib/api/types'
import { usePaymentMethods, useSavePaymentMethod } from './queries'

/** The ways clients pay: the admin renames, hides or adds one; a hidden one stays on the payments made with it. */
export function PaymentMethodsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { t } = useTranslation(['billing', 'common'])
  const { isAdmin } = useAccess()
  const methods = usePaymentMethods().data ?? []
  const save = useSavePaymentMethod()
  const [name, setName] = useState('')

  const add = async () => {
    try {
      await save.mutateAsync({ body: { name: name.trim() } })
      setName('')
      toast.success(t('billing:toasts.methodSaved'))
    } catch (e) {
      showApiError(e)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('billing:methods.title')}</DialogTitle>
          <DialogDescription>{t(isAdmin ? 'billing:methods.hint' : 'billing:methods.readOnly')}</DialogDescription>
        </DialogHeader>
        <ul className="flex flex-col gap-2">
          {methods.map((m) => (isAdmin ? <MethodRow key={m.id} method={m} /> : (
            <li key={m.id} className={m.active ? 'text-sm' : 'text-sm text-muted-foreground line-through'}>
              {m.name}
            </li>
          )))}
        </ul>
        {isAdmin && (
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              if (name.trim()) add()
            }}
          >
            <Input placeholder={t('billing:methods.newPlaceholder')} maxLength={60} value={name} onChange={(e) => setName(e.target.value)} />
            <Button type="submit" variant="outline" disabled={!name.trim() || save.isPending}>
              <Plus />
              {t('billing:methods.add')}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}

function MethodRow({ method }: { method: BillingPaymentMethodResponse }) {
  const { t } = useTranslation(['billing', 'common'])
  const save = useSavePaymentMethod()
  const [name, setName] = useState(method.name ?? '')
  const persist = async (body: { name: string; active: boolean }) => {
    try {
      await save.mutateAsync({ id: method.id, body })
    } catch (e) {
      setName(method.name ?? '')
      showApiError(e)
    }
  }
  return (
    <li className="flex items-center gap-3">
      <Input
        aria-label={t('billing:methods.name')}
        maxLength={60}
        value={name}
        className={method.active ? undefined : 'text-muted-foreground'}
        onChange={(e) => setName(e.target.value)}
        onBlur={() => name.trim() && name.trim() !== method.name && persist({ name: name.trim(), active: !!method.active })}
      />
      <label className="flex shrink-0 items-center gap-2 text-sm text-muted-foreground">
        <Switch checked={!!method.active} disabled={save.isPending} onCheckedChange={(v) => persist({ name: method.name ?? name, active: v })} />
        {t(method.active ? 'billing:methods.active' : 'billing:methods.hidden')}
      </label>
    </li>
  )
}
