import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft, Plus, Trash2 } from 'lucide-react'
import { Controller, useFieldArray, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { z } from 'zod'
import { FieldErrorText } from '@/components/common/FieldErrorText'
import { LinkButton } from '@/components/common/LinkButton'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { CarSelect } from '@/features/cars/CarSelect'
import { UserSelect } from '@/features/users/UserSelect'
import { useMutationError } from '@/lib/api/problem'
import { fromDateTimeLocal } from '@/lib/format'
import { useCreateRoute } from './queries'

const legSchema = z.object({
  origin: z.string().trim(),
  destination: z.string().trim(),
  plannedDepartureAt: z.string().min(1, 'required'),
  carId: z.number().optional(),
  driverId: z.number().optional(),
})

const schema = z.object({
  origin: z.string().trim().max(500),
  destination: z.string().trim().max(500),
  notes: z.string().trim(),
  sameCar: z.boolean(),
  carId: z.number().optional(),
  driverId: z.number().optional(),
  legs: z.array(legSchema).max(20),
})

type FormValues = z.infer<typeof schema>

/**
 * A new route: from where to where and its legs. With «the same car» ticked the car and driver are chosen once and
 * go into every leg; untick it to give a leg its own. Legs can also be added later, on the way.
 */
export function RouteCreatePage() {
  const { t } = useTranslation(['routes', 'trips', 'common'])
  const navigate = useNavigate()
  const create = useCreateRoute()
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      origin: '',
      destination: '',
      notes: '',
      sameCar: true,
      legs: [{ origin: '', destination: '', plannedDepartureAt: '' }],
    },
  })
  const legs = useFieldArray({ control: form.control, name: 'legs' })
  const sameCar = form.watch('sameCar')
  const { errors, isSubmitting } = form.formState
  const onError = useMutationError(form)

  const addLeg = () => {
    const previous = form.getValues('legs').at(-1)
    // the next leg starts where the previous one ended, with its car and driver
    legs.append({
      origin: previous?.destination ?? '',
      destination: '',
      plannedDepartureAt: previous?.plannedDepartureAt ?? '',
      carId: previous?.carId,
      driverId: previous?.driverId,
    })
  }

  const submit = form.handleSubmit(async (v) => {
    try {
      const created = await create.mutateAsync({
        origin: v.origin || undefined,
        destination: v.destination || undefined,
        notes: v.notes || undefined,
        legs: v.legs.map((l, i) => ({
          carId: v.sameCar ? v.carId : l.carId,
          driverId: v.sameCar ? v.driverId : l.driverId,
          plannedDepartureAt: fromDateTimeLocal(l.plannedDepartureAt),
          origin: l.origin || (i === 0 ? v.origin : undefined) || undefined,
          destination: l.destination || (i === v.legs.length - 1 ? v.destination : undefined) || undefined,
        })),
      })
      toast.success(t('common:common.saved'))
      navigate(`/routes/${created.id}`, { replace: true })
    } catch (e) {
      onError(e)
    }
  })

  const carAndDriver = (prefix: string, carName: 'carId' | `legs.${number}.carId`, driverName: 'driverId' | `legs.${number}.driverId`) => (
    <div className="grid gap-4 sm:grid-cols-2">
      <Controller
        control={form.control}
        name={carName}
        render={({ field }) => (
          <Field>
            <FieldLabel htmlFor={`${prefix}-car`}>{t('trips:fields.car')}</FieldLabel>
            <CarSelect id={`${prefix}-car`} value={field.value as number | undefined} onChange={field.onChange} />
          </Field>
        )}
      />
      <Controller
        control={form.control}
        name={driverName}
        render={({ field }) => (
          <Field>
            <FieldLabel htmlFor={`${prefix}-driver`}>{t('trips:fields.driver')}</FieldLabel>
            <UserSelect
              role="DRIVER"
              id={`${prefix}-driver`}
              className="w-full"
              value={field.value as number | undefined}
              onChange={field.onChange}
              noneLabel={t('common:common.selectPlaceholder')}
            />
          </Field>
        )}
      />
    </div>
  )

  return (
    <>
      <LinkButton variant="ghost" size="sm" className="mb-2" to="/routes">
        <ArrowLeft />
        {t('routes:title')}
      </LinkButton>
      <PageHeader title={t('routes:new')} description={t('routes:hint')} />
      <form onSubmit={submit} noValidate className="grid gap-6 lg:grid-cols-[2fr_3fr]">
        <Card className="self-start">
          <CardContent>
            <FieldGroup>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="rt-origin">{t('routes:fields.origin')}</FieldLabel>
                  <Input id="rt-origin" {...form.register('origin')} />
                </Field>
                <Field>
                  <FieldLabel htmlFor="rt-destination">{t('routes:fields.destination')}</FieldLabel>
                  <Input id="rt-destination" {...form.register('destination')} />
                </Field>
              </div>
              <Field>
                <FieldLabel htmlFor="rt-notes">{t('routes:fields.notes')}</FieldLabel>
                <Textarea id="rt-notes" rows={2} {...form.register('notes')} />
              </Field>
              <Controller
                control={form.control}
                name="sameCar"
                render={({ field }) => (
                  <Field>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="rt-same-car"
                        checked={field.value}
                        onCheckedChange={(c) => {
                          // unticked: every leg keeps the common car and driver, and only the odd one is changed
                          if (c !== true) {
                            form.getValues('legs').forEach((_, i) => {
                              form.setValue(`legs.${i}.carId`, form.getValues('carId'))
                              form.setValue(`legs.${i}.driverId`, form.getValues('driverId'))
                            })
                          }
                          field.onChange(c === true)
                        }}
                      />
                      <Label htmlFor="rt-same-car">{t('routes:form.sameCar')}</Label>
                    </div>
                    <FieldDescription>{t('routes:form.sameCarHint')}</FieldDescription>
                  </Field>
                )}
              />
              {sameCar && carAndDriver('rt', 'carId', 'driverId')}
            </FieldGroup>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('routes:fields.legs')}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {legs.fields.length === 0 && <p className="text-sm text-muted-foreground">{t('routes:form.noLegs')}</p>}
            {legs.fields.map((leg, i) => (
              <div key={leg.id} className="flex flex-col gap-4 rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{t('routes:form.leg', { n: i + 1 })}</span>
                  <Button type="button" variant="ghost" size="icon-sm" aria-label={t('routes:form.removeLeg')} onClick={() => legs.remove(i)}>
                    <Trash2 />
                  </Button>
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <Field>
                    <FieldLabel htmlFor={`leg-${i}-from`}>{t('routes:form.legFrom')}</FieldLabel>
                    <Input id={`leg-${i}-from`} {...form.register(`legs.${i}.origin`)} />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor={`leg-${i}-to`}>{t('routes:form.legTo')}</FieldLabel>
                    <Input id={`leg-${i}-to`} {...form.register(`legs.${i}.destination`)} />
                  </Field>
                  <Field data-invalid={!!errors.legs?.[i]?.plannedDepartureAt}>
                    <FieldLabel htmlFor={`leg-${i}-departure`}>{t('trips:fields.plannedDepartureAt')}</FieldLabel>
                    <Input id={`leg-${i}-departure`} type="datetime-local" {...form.register(`legs.${i}.plannedDepartureAt`)} />
                    <FieldErrorText error={errors.legs?.[i]?.plannedDepartureAt} />
                  </Field>
                </div>
                {!sameCar && carAndDriver(`leg-${i}`, `legs.${i}.carId`, `legs.${i}.driverId`)}
              </div>
            ))}
            <div className="flex flex-wrap justify-between gap-2">
              <Button type="button" variant="outline" onClick={addLeg}>
                <Plus />
                {t('routes:form.addLeg')}
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {t('routes:form.submit')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </>
  )
}
