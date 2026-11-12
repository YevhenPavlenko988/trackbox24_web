import { format, parseISO } from 'date-fns'
import { uk } from 'date-fns/locale'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { VolumeBucket } from '@/lib/api/types'
import { formatWeight } from '@/lib/format'
import { downloadReport, type Period, useVolumesReport, type VolumeGroup } from './api'
import { PeriodBar } from './PeriodBar'
import { presetPeriod } from './period'
import { Stat } from './Stat'

const GROUPS: VolumeGroup[] = ['DAY', 'WEEK', 'MONTH']

/** «Обсяги»: how much was created and handed over by day, week or month, and how long the way took. */
export function VolumesReport() {
  const { t } = useTranslation(['reports', 'common'])
  const [period, setPeriod] = useState<Period>(() => presetPeriod('month'))
  const [group, setGroup] = useState<VolumeGroup | undefined>(undefined)
  const query = useVolumesReport(period, group)
  const r = query.data
  const shown = (r?.group ?? 'DAY') as VolumeGroup
  const label = (b: VolumeBucket) =>
    b.start ? format(parseISO(b.start), shown === 'MONTH' ? 'LLL yyyy' : 'dd.MM', { locale: uk }) : ''
  const days = (v?: number) => (v == null ? '—' : v < 1 ? t('reports:volumes.underDay') : t('reports:volumes.daysValue', { days: v.toLocaleString('uk-UA') }))

  return (
    <div className="flex flex-col gap-4">
      <PeriodBar period={period} onChange={setPeriod} onExcel={() => downloadReport('volumes', period, group)} />
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground">{t('reports:volumes.by')}</span>
        <div className="flex gap-1" role="group">
          {GROUPS.map((g) => (
            <Button key={g} size="sm" variant={shown === g ? 'default' : 'outline'} onClick={() => setGroup(g)}>
              {t(`reports:volumes.group.${g}`)}
            </Button>
          ))}
        </div>
      </div>
      {query.isPending || !r ? (
        <Skeleton className="h-60 w-full" />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label={t('reports:volumes.created')} value={String((r.total?.parcels ?? 0) + (r.total?.moves ?? 0))} hint={t('reports:volumes.createdHint', { parcels: r.total?.parcels ?? 0, moves: r.total?.moves ?? 0 })} testId="volumes-created" />
            <Stat label={t('reports:volumes.delivered')} value={String(r.total?.delivered ?? 0)} />
            <Stat label={t('reports:volumes.weight')} value={formatWeight(r.total?.weightKg) || '—'} hint={t('reports:trips.seats', { count: r.total?.seats ?? 0 })} />
            <Stat label={t('reports:volumes.speed')} value={days(r.total?.avgDeliveryDays)} hint={t('reports:volumes.speedHint')} />
          </div>
          <Card>
            <CardHeader>
              <CardTitle>{t('reports:volumes.chart')}</CardTitle>
              <CardDescription>{t('reports:volumes.chartHint')}</CardDescription>
            </CardHeader>
            <CardContent>
              <Bars buckets={r.buckets ?? []} label={label} />
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t(`reports:volumes.col.${shown}`)}</TableHead>
                    <TableHead className="text-right">{t('reports:volumes.parcels')}</TableHead>
                    <TableHead className="text-right">{t('reports:volumes.moves')}</TableHead>
                    <TableHead className="text-right">{t('reports:volumes.delivered')}</TableHead>
                    <TableHead className="text-right">{t('reports:volumes.weight')}</TableHead>
                    <TableHead className="text-right">{t('reports:volumes.speedCol')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...(r.buckets ?? [])].reverse().map((b) => (
                    <TableRow key={b.start}>
                      <TableCell className="whitespace-nowrap">{label(b)}</TableCell>
                      <TableCell className="text-right tabular-nums">{b.parcels}</TableCell>
                      <TableCell className="text-right tabular-nums">{b.moves || '—'}</TableCell>
                      <TableCell className="text-right tabular-nums">{b.delivered}</TableCell>
                      <TableCell className="text-right tabular-nums">{b.weightKg ? formatWeight(b.weightKg) : '—'}</TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">{days(b.avgDeliveryDays)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}

/** Created per bucket, one bar each; the value shows on hover and above the busiest one. */
function Bars({ buckets, label }: { buckets: VolumeBucket[]; label: (b: VolumeBucket) => string }) {
  const { t } = useTranslation('reports')
  const [hover, setHover] = useState<number | null>(null)
  const value = (b: VolumeBucket) => (b.parcels ?? 0) + (b.moves ?? 0)
  const max = Math.max(1, ...buckets.map(value))
  const busiest = buckets.findIndex((b) => value(b) === max)
  // a label under every bar crowds a month of days: every few
  const every = Math.ceil(buckets.length / 12)
  return (
    <div className="flex h-52 items-end gap-0.5" role="img" aria-label={t('volumes.chart')}>
      {buckets.map((b, i) => {
        const v = value(b)
        const shownValue = hover === i || (hover == null && i === busiest && v > 0)
        return (
          <div
            key={b.start}
            className="relative flex h-full min-w-0 flex-1 flex-col justify-end"
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
            title={`${label(b)}: ${t('volumes.tooltip', { parcels: b.parcels ?? 0, moves: b.moves ?? 0, delivered: b.delivered ?? 0 })}`}
          >
            {shownValue && <span className="mb-1 text-center text-xs font-semibold tabular-nums">{v}</span>}
            <div
              className={`mx-auto w-full max-w-10 rounded-t-[4px] ${hover === i ? 'bg-primary' : 'bg-primary/75'}`}
              style={{ height: `${v === 0 ? 0 : Math.max((v / max) * 85, 2)}%` }}
            />
            <span className="mt-1 h-4 truncate text-center text-[10px] text-muted-foreground">{i % every === 0 ? label(b) : ''}</span>
          </div>
        )
      })}
    </div>
  )
}
