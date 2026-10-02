import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { z } from 'zod'
import { FieldErrorText } from '@/components/common/FieldErrorText'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { useAccess } from '@/features/auth/access'
import { ClientPicker } from '@/features/clients/ClientPicker'
import { UserSelect } from '@/features/users/UserSelect'
import { useMutationError } from '@/lib/api/problem'
import { CHANNELS, ChannelFields } from '@/features/channels/channel'
import type { Channel } from '@/lib/api/types'
import { DimensionFields } from './DimensionFields'
import { PriceFields } from './PriceFields'
import { useCreateParcel } from './queries'
import { orUndefined, parseNumber } from './status'

const numberField = z
  .string()
  .trim()
  .refine((s) => s === '' || (parseNumber(s) ?? -1) >= 0, 'number')

const schema = z
  .object({
    mode: z.enum(['ttn', 'manual']),
    npTtn: z.string().trim(),
    representativeId: z.number().optional(),
    clientId: z.number().optional(),
    alreadyReceived: z.boolean(),
    description: z.string().trim(),
    weightKg: numberField,
    seatsAmount: z.string().trim().refine((s) => s === '' || /^\d+$/.test(s), 'number').refine((s) => s === '' || Number(s) >= 1, 'min1'),
    declaredValue: numberField,
    lengthCm: numberField,
    widthCm: numberField,
    heightCm: numberField,
    deliveryCity: z.string().trim().max(255),
    senderName: z.string().trim(),
    senderPhone: z.string().trim(),
    senderCity: z.string().trim(),
    notes: z.string().trim(),
    deliveryPrice: numberField,
    deliveryPriceCurrency: z.enum(['UAH', 'EUR']),
    channel: z.union([z.enum(CHANNELS as [Channel, ...Channel[]]), z.literal('')]),
    channelDetails: z.string().trim().max(255),
  })
  .superRefine((v, ctx) => {
    if (v.mode === 'ttn' && !/^\d{14}$/.test(v.npTtn)) {
      ctx.addIssue({ code: 'custom', path: ['npTtn'], message: 'ttn' })
    }
  })

type FormValues = z.infer<typeof schema>

export function ParcelCreatePage() {
  const { t } = useTranslation(['parcels', 'common'])
  const navigate = useNavigate()
  const create = useCreateParcel()

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      mode: 'ttn',
      npTtn: '',
      alreadyReceived: false,
      description: '',
      weightKg: '',
      seatsAmount: '1',
      declaredValue: '',
      lengthCm: '',
      widthCm: '',
      heightCm: '',
      deliveryCity: '',
      channel: '',
      channelDetails: '',
      senderName: '',
      senderPhone: '',
      senderCity: '',
      notes: '',
      deliveryPrice: '',
      deliveryPriceCurrency: 'UAH',
    },
  })
  const { errors, isSubmitting } = form.formState
  const onError = useMutationError(form)
  const mode = form.watch('mode')
  const { isManager } = useAccess()
  const [channelFromClient, setChannelFromClient] = useState(false)

  const submit = form.handleSubmit(async (v) => {
    try {
      const created = await create.mutateAsync({
        npTtn: v.mode === 'ttn' ? v.npTtn : undefined,
        alreadyReceived: v.mode === 'ttn' ? v.alreadyReceived : undefined,
        representativeId: v.representativeId,
        clientId: v.clientId,
        description: orUndefined(v.description),
        weightKg: parseNumber(v.weightKg),
        seatsAmount: parseNumber(v.seatsAmount),
        declaredValue: parseNumber(v.declaredValue),
        lengthCm: parseNumber(v.lengthCm),
        widthCm: parseNumber(v.widthCm),
        heightCm: parseNumber(v.heightCm),
        deliveryCity: orUndefined(v.deliveryCity),
        senderName: orUndefined(v.senderName),
        senderPhone: orUndefined(v.senderPhone),
        senderCity: orUndefined(v.senderCity),
        notes: orUndefined(v.notes),
        channel: v.channel || undefined,
        channelDetails: v.channel ? orUndefined(v.channelDetails) : undefined,
        deliveryPrice: isManager ? parseNumber(v.deliveryPrice) : undefined,
        deliveryPriceCurrency: isManager && v.deliveryPrice ? v.deliveryPriceCurrency : undefined,
      })
      toast.success(t('common:common.saved'))
      navigate(`/parcels/${created.id}`, { replace: true })
    } catch (e) {
      onError(e)
    }
  })

  return (
    <>
      <PageHeader title={t('parcels:createTitle')} />
      <Card className="max-w-3xl">
        <CardContent>
          <form onSubmit={submit} noValidate>
            <FieldGroup>
              <Controller
                control={form.control}
                name="mode"
                render={({ field }) => (
                  <Field>
                    <RadioGroup value={field.value} onValueChange={(v) => field.onChange(v)} className="flex gap-6">
                      <Label className="flex items-center gap-2 font-normal">
                        <RadioGroupItem value="ttn" />
                        {t('parcels:create.modeTtn')}
                      </Label>
                      <Label className="flex items-center gap-2 font-normal">
                        <RadioGroupItem value="manual" />
                        {t('parcels:create.modeManual')}
                      </Label>
                    </RadioGroup>
                    <FieldDescription>{mode === 'ttn' ? t('parcels:create.modeTtnHint') : t('parcels:create.modeManualHint')}</FieldDescription>
                  </Field>
                )}
              />

              {mode === 'ttn' && (
                <Field data-invalid={!!errors.npTtn}>
                  <FieldLabel htmlFor="npTtn">{t('parcels:fields.npTtn')}</FieldLabel>
                  <Input id="npTtn" inputMode="numeric" maxLength={14} aria-invalid={!!errors.npTtn} {...form.register('npTtn')} />
                  <FieldErrorText error={errors.npTtn} />
                </Field>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <Controller
                  control={form.control}
                  name="representativeId"
                  render={({ field }) => (
                    <Field data-invalid={!!errors.representativeId}>
                      <FieldLabel htmlFor="representativeId">{t('parcels:fields.representative')}</FieldLabel>
                      <UserSelect role="REPRESENTATIVE"
                        id="representativeId"
                        className="w-full"
                        value={field.value}
                        onChange={field.onChange}
                        noneLabel={t('common:common.selectPlaceholder')}
                      />
                      <FieldErrorText error={errors.representativeId} />
                    </Field>
                  )}
                />
                <Controller
                  control={form.control}
                  name="clientId"
                  render={({ field }) => (
                    <Field data-invalid={!!errors.clientId}>
                      <FieldLabel htmlFor="clientId">{t('parcels:fields.client')}</FieldLabel>
                      <ClientPicker
                        id="clientId"
                        value={field.value}
                        onChange={(id, client) => {
                          field.onChange(id)
                          // The backend would default the channel from the client anyway; show it so the user can override.
                          if (client?.channel && !form.getValues('channel')) {
                            form.setValue('channel', client.channel)
                            form.setValue('channelDetails', client.channelDetails ?? '')
                            setChannelFromClient(true)
                          }
                        }}
                        allowCreate
                      />
                      <FieldErrorText error={errors.clientId} />
                    </Field>
                  )}
                />
              </div>

              {mode === 'ttn' && (
                <Controller
                  control={form.control}
                  name="alreadyReceived"
                  render={({ field }) => (
                    <Field orientation="horizontal">
                      <Switch id="alreadyReceived" checked={field.value} onCheckedChange={(c) => field.onChange(c)} />
                      <FieldLabel htmlFor="alreadyReceived">{t('parcels:create.alreadyReceived')}</FieldLabel>
                    </Field>
                  )}
                />
              )}

              <Field data-invalid={!!errors.description}>
                <FieldLabel htmlFor="description">{t('parcels:fields.description')}</FieldLabel>
                <Input id="description" {...form.register('description')} />
                <FieldErrorText error={errors.description} />
              </Field>

              <div className="grid gap-4 sm:grid-cols-3">
                <Field data-invalid={!!errors.seatsAmount}>
                  <FieldLabel htmlFor="seatsAmount">{t('parcels:fields.seatsAmount')}</FieldLabel>
                  <Input id="seatsAmount" inputMode="numeric" aria-invalid={!!errors.seatsAmount} {...form.register('seatsAmount')} />
                  <FieldErrorText error={errors.seatsAmount} />
                </Field>
                <Field data-invalid={!!errors.weightKg}>
                  <FieldLabel htmlFor="weightKg">{t('parcels:fields.weightKg')}</FieldLabel>
                  <Input id="weightKg" inputMode="decimal" aria-invalid={!!errors.weightKg} {...form.register('weightKg')} />
                  <FieldErrorText error={errors.weightKg} />
                </Field>
                <Field data-invalid={!!errors.declaredValue}>
                  <FieldLabel htmlFor="declaredValue">{t('parcels:fields.declaredValue')}</FieldLabel>
                  <Input id="declaredValue" inputMode="decimal" aria-invalid={!!errors.declaredValue} {...form.register('declaredValue')} />
                  <FieldErrorText error={errors.declaredValue} />
                </Field>
              </div>

              <DimensionFields form={form} />

              {isManager && <PriceFields form={form} />}

              <div className="grid gap-4 sm:grid-cols-3">
                <Field data-invalid={!!errors.senderName}>
                  <FieldLabel htmlFor="senderName">{t('parcels:fields.senderName')}</FieldLabel>
                  <Input id="senderName" {...form.register('senderName')} />
                  <FieldErrorText error={errors.senderName} />
                </Field>
                <Field data-invalid={!!errors.senderPhone}>
                  <FieldLabel htmlFor="senderPhone">{t('parcels:fields.senderPhone')}</FieldLabel>
                  <Input id="senderPhone" inputMode="tel" placeholder="380XXXXXXXXX" {...form.register('senderPhone')} />
                  <FieldErrorText error={errors.senderPhone} />
                </Field>
                <Field data-invalid={!!errors.senderCity}>
                  <FieldLabel htmlFor="senderCity">{t('parcels:fields.senderCity')}</FieldLabel>
                  <Input id="senderCity" {...form.register('senderCity')} />
                  <FieldErrorText error={errors.senderCity} />
                </Field>
              </div>

              <ChannelFields form={form} hint={channelFromClient ? t('common:channelField.fromClient') : undefined} />

              <Field data-invalid={!!errors.notes}>
                <FieldLabel htmlFor="notes">{t('parcels:fields.notes')}</FieldLabel>
                <Textarea id="notes" rows={3} {...form.register('notes')} />
                <FieldErrorText error={errors.notes} />
              </Field>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => navigate('/parcels')}>
                  {t('common:actions.cancel')}
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {t('common:actions.create')}
                </Button>
              </div>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </>
  )
}
