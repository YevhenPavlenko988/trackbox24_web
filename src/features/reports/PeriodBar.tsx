import { FileSpreadsheet } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { showApiError } from '@/lib/api/problem'
import type { Period } from './api'
import { PERIOD_PRESETS, presetOf, presetPeriod } from './period'

/** The days of a report: presets or own dates, and its Excel. */
export function PeriodBar({ period, onChange, onExcel }: { period: Period; onChange: (p: Period) => void; onExcel: () => Promise<void> }) {
  const { t } = useTranslation('reports')
  const preset = presetOf(period)
  return (
    <div className="flex flex-wrap items-end gap-2">
      <div className="flex flex-wrap gap-1" role="group">
        {PERIOD_PRESETS.map((p) => (
          <Button key={p} size="sm" variant={preset === p ? 'default' : 'outline'} onClick={() => onChange(presetPeriod(p))}>
            {t(`period.${p}`)}
          </Button>
        ))}
      </div>
      <label className="flex items-center gap-1.5 text-sm text-muted-foreground">
        {t('period.from')}
        <Input type="date" className="w-40" value={period.from} max={period.to} onChange={(e) => e.target.value && onChange({ ...period, from: e.target.value })} />
      </label>
      <label className="flex items-center gap-1.5 text-sm text-muted-foreground">
        {t('period.to')}
        <Input type="date" className="w-40" value={period.to} min={period.from} onChange={(e) => e.target.value && onChange({ ...period, to: e.target.value })} />
      </label>
      <ExcelButton className="ml-auto" onClick={onExcel} />
    </div>
  )
}

export function ExcelButton({ onClick, className }: { onClick: () => Promise<void>; className?: string }) {
  const { t } = useTranslation('reports')
  return (
    <Button size="sm" variant="outline" className={className} onClick={() => onClick().catch(showApiError)}>
      <FileSpreadsheet />
      {t('excel')}
    </Button>
  )
}
