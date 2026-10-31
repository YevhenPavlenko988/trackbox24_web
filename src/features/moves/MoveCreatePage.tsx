import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft } from 'lucide-react'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { z } from 'zod'
import { FieldErrorText } from '@/components/common/FieldErrorText'
import { LinkButton } from '@/components/common/LinkButton'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { useAccess } from '@/features/auth/access'
import { ClientPicker } from '@/features/clients/ClientPicker'
import { PriceFields } from '@/features/parcels/PriceFields'
import { useCreateParcel } from '@/features/parcels/queries'
import { orUndefined, parseNumber } from '@/features/parcels/status'
import { useMutationError } from '@/lib/api/problem'
import { itemLines } from './items'

const MAX_SEATS = 500

const schema = z.object({
  clientId: z.number({ message: 'required' }),
  senderClientId: z.number().optional(),
  description: z.string().trim().max(500),
  senderCity: z.string().trim().max(255),
  deliveryCity: z.string().trim().max(255),
  notes: z.string().trim(),
  items: z.string(),
  count: z.string().trim(),
  deliveryPrice: z.string().trim().refine((s) => s === '' || (parseNumber(s) ?? -1) >= 0, 'number'),
  deliveryPriceCurrency: z.enum(['UAH', 'EUR']),
})

type FormValues = z.infer<typeof schema>

/** A new move: who gets it, from where to where, and its items one per line (or just how many). */
export function MoveCreatePage() {
  const { t } = useTranslation(['moves', 'parcels', 'common'])
  const { isManager } = useAccess()
  const navigate = useNavigate()
  const create = useCreateParcel()
  const [mode, setMode] = useState<'list' | 'count'>('list')
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      description: '',
      senderCity: '',
      deliveryCity: '',
      notes: '',
      items: '',
      count: '',
      deliveryPrice: '',
      deliveryPriceCurrency: 'EUR',
    },
  })
  const { errors, isSubmitting } = form.formState
  const onError = useMutationError(form)
  const lines = itemLines(form.watch('items'))
  const count = mode === 'list' ? lines.length : Number(form.watch('count')) || 0
  const countError = count < 1 ? t('moves:items.none') : count > MAX_SEATS ? t('moves:items.tooMany') : undefined

  const submit = form.handleSubmit(async (v) => {
    if (countError) {
      toast.error(countError)
      return
    }
    try {
      const created = await create.mutateAsync({
        kind: 'MOVE',
        clientId: v.clientId,
        // the sender's name, phone and city come from their client card
        senderClientId: v.senderClientId,
        description: orUndefined(v.description),
        senderCity: orUndefined(v.senderCity),
        deliveryCity: orUndefined(v.deliveryCity),
        notes: orUndefined(v.notes),
        seatDescriptions: mode === 'list' ? lines : undefined,
        seatsAmount: mode === 'count' ? count : undefined,
        deliveryPrice: isManager ? parseNumber(v.deliveryPrice) : undefined,
        deliveryPriceCurrency: isManager && v.deliveryPrice ? v.deliveryPriceCurrency : undefined,
        alreadyReceived: false,
      })
      toast.success(t('common:common.saved'))
      navigate(`/moves/${created.id}`, { replace: true })
    } catch (e) {
      onError(e)
    }
  })

  return (
    <>
      <LinkButton variant="ghost" size="sm" className="mb-2" to="/moves">
        <ArrowLeft />
        {t('moves:title')}
      </LinkButton>
      <PageHeader title={t('moves:new')} />
      <form onSubmit={submit} noValidate className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardContent>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="move-name">{t('moves:fields.name')}</FieldLabel>
                <Input id="move-name" placeholder={t('moves:fields.namePlaceholder')} {...form.register('description')} />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Controller
                  control={form.control}
                  name="senderClientId"
                  render={({ field }) => (
                    <Field>
                      <FieldLabel htmlFor="move-sender">{t('moves:fields.sender')}</FieldLabel>
                      <ClientPicker id="move-sender" value={field.value} onChange={(id) => field.onChange(id)} allowCreate />
                    </Field>
                  )}
                />
                <Field>
                  <FieldLabel htmlFor="move-from">{t('moves:fields.fromCity')}</FieldLabel>
                  <Input id="move-from" placeholder={t('moves:fields.fromCityHint')} {...form.register('senderCity')} />
                </Field>
                <Controller
                  control={form.control}
                  name="clientId"
                  render={({ field }) => (
                    <Field data-invalid={!!errors.clientId}>
                      <FieldLabel htmlFor="move-client">{t('moves:fields.recipient')}</FieldLabel>
                      <ClientPicker id="move-client" value={field.value} onChange={(id) => field.onChange(id)} allowCreate />
                      <FieldErrorText error={errors.clientId} />
                    </Field>
                  )}
                />
                <Field>
                  <FieldLabel htmlFor="move-to">{t('moves:fields.toCity')}</FieldLabel>
                  <Input id="move-to" placeholder={t('moves:fields.toCityHint')} {...form.register('deliveryCity')} />
                </Field>
              </div>
              {isManager && <PriceFields form={form} idPrefix="move-" />}
              <Field>
                <FieldLabel htmlFor="move-notes">{t('moves:fields.notes')}</FieldLabel>
                <Textarea id="move-notes" rows={2} {...form.register('notes')} />
              </Field>
            </FieldGroup>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('moves:items.title')}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Tabs value={mode} onValueChange={(v) => setMode(v as 'list' | 'count')}>
              <TabsList>
                <TabsTrigger value="list">{t('moves:items.modeList')}</TabsTrigger>
                <TabsTrigger value="count">{t('moves:items.modeCount')}</TabsTrigger>
              </TabsList>
            </Tabs>
            {mode === 'list' ? (
              <Field>
                <Textarea
                  rows={14}
                  className="font-mono text-sm"
                  placeholder={t('moves:items.listPlaceholder')}
                  aria-label={t('moves:items.modeList')}
                  {...form.register('items')}
                />
                <FieldDescription>{t('moves:items.listHint')}</FieldDescription>
              </Field>
            ) : (
              <Field>
                <FieldLabel htmlFor="move-count">{t('moves:items.count')}</FieldLabel>
                <Input id="move-count" type="number" min={1} max={MAX_SEATS} className="w-32" {...form.register('count')} />
                <FieldDescription>{t('moves:items.countHint')}</FieldDescription>
              </Field>
            )}
            <p className={countError && count > 0 ? 'text-sm font-medium text-destructive' : 'text-sm font-medium'}>
              {count > MAX_SEATS ? t('moves:items.tooMany') : t('moves:items.willCreate', { count })}
            </p>
            <Button type="submit" disabled={isSubmitting || !!countError} className="self-start">
              {t('moves:new')}
            </Button>
          </CardContent>
        </Card>
      </form>
    </>
  )
}
