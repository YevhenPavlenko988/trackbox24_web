import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { z } from 'zod'
import { FieldErrorText } from '@/components/common/FieldErrorText'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { NpBranchPicker, NpCityPicker } from '@/features/nova-poshta/NpRefPicker'
import { useMutationError } from '@/lib/api/problem'
import type { CompanyResponse } from '@/lib/api/types'
import { useSetCompanyNpSender } from './queries'

const schema = z.object({
  cityRef: z.string().min(1, 'required'),
  cityName: z.string(),
  warehouseRef: z.string().min(1, 'required'),
  warehouseName: z.string(),
  phone: z.string().trim().regex(/^380\d{9}$/, 'npPhone'),
})

type FormValues = z.infer<typeof schema>

/** Sender of our outgoing waybills: the branch we hand return parcels over at, and the contact in the NP account. */
export function NpSenderDialog({ company, open, onOpenChange }: { company: CompanyResponse; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { t } = useTranslation(['novaPoshta', 'common'])
  const save = useSetCompanyNpSender(company.id!)
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      cityRef: company.npSenderCityRef ?? '',
      cityName: company.npSenderCityName ?? '',
      warehouseRef: company.npSenderWarehouseRef ?? '',
      warehouseName: company.npSenderWarehouseName ?? '',
      phone: company.npSenderPhone ?? '',
    },
  })
  const { errors, isSubmitting } = form.formState
  const onError = useMutationError(form)
  const cityRef = form.watch('cityRef')

  const submit = form.handleSubmit(async (v) => {
    try {
      await save.mutateAsync(v)
      toast.success(t('common:common.saved'))
      onOpenChange(false)
    } catch (e) {
      onError(e)
    }
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('novaPoshta:sender.title')}</DialogTitle>
          <DialogDescription>{t('novaPoshta:sender.description')}</DialogDescription>
        </DialogHeader>
        {open && (
          <form onSubmit={submit} noValidate>
            <FieldGroup>
              {!company.novaPoshtaKeyConfigured && <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">{t('novaPoshta:sender.needKey')}</p>}
              <Field data-invalid={!!errors.cityRef}>
                <FieldLabel htmlFor="nps-city">{t('novaPoshta:sender.city')}</FieldLabel>
                <NpCityPicker
                  id="nps-city"
                  invalid={!!errors.cityRef}
                  value={{ ref: cityRef || undefined, name: form.watch('cityName') || undefined }}
                  onChange={(v) => {
                    form.setValue('cityRef', v.ref ?? '', { shouldValidate: true })
                    form.setValue('cityName', v.name ?? '')
                    form.setValue('warehouseRef', '')
                    form.setValue('warehouseName', '')
                  }}
                />
                <FieldErrorText error={errors.cityRef} />
              </Field>
              <Field data-invalid={!!errors.warehouseRef}>
                <FieldLabel htmlFor="nps-branch">{t('novaPoshta:sender.branch')}</FieldLabel>
                <NpBranchPicker
                  id="nps-branch"
                  cityRef={cityRef || undefined}
                  type="WAREHOUSE"
                  invalid={!!errors.warehouseRef}
                  value={{ ref: form.watch('warehouseRef') || undefined, name: form.watch('warehouseName') || undefined }}
                  onChange={(v) => {
                    form.setValue('warehouseRef', v.ref ?? '', { shouldValidate: true })
                    form.setValue('warehouseName', v.name ?? '')
                  }}
                />
                <FieldErrorText error={errors.warehouseRef} />
              </Field>
              <Field data-invalid={!!errors.phone}>
                <FieldLabel htmlFor="nps-phone">{t('novaPoshta:sender.phone')}</FieldLabel>
                <Input id="nps-phone" inputMode="tel" aria-invalid={!!errors.phone} {...form.register('phone')} />
                <FieldDescription>{t('novaPoshta:sender.description')}</FieldDescription>
                <FieldErrorText error={errors.phone} />
              </Field>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  {t('common:actions.cancel')}
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {t('common:actions.save')}
                </Button>
              </div>
            </FieldGroup>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
