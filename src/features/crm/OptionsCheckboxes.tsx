import { useTranslation } from 'react-i18next'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import type { CompanyOption } from '@/lib/api/types'
import { COMPANY_OPTIONS, toggleOption } from './constants'

/** Paid options of a carrier, as checkboxes. */
export function OptionsCheckboxes({ value, onChange, idPrefix }: { value: CompanyOption[]; onChange: (v: CompanyOption[]) => void; idPrefix: string }) {
  const { t } = useTranslation('crm')
  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap gap-4">
        {COMPANY_OPTIONS.map((o) => (
          <Label key={o} htmlFor={`${idPrefix}-${o}`} className="flex items-center gap-2 font-normal">
            <Checkbox id={`${idPrefix}-${o}`} checked={value.includes(o)} onCheckedChange={(c) => onChange(toggleOption(value, o, c === true))} />
            {t(`options.${o}`)}
          </Label>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">{t('optionsHint')}</p>
    </div>
  )
}
