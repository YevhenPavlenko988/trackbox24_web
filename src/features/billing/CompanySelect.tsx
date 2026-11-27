import { Check, ChevronsUpDown } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useCompanies } from '@/features/companies/queries'

/** A client company picked by name; the platform has a few dozen, so the list is loaded whole and filtered here. */
export function CompanySelect({
  value,
  onChange,
  id,
  allLabel,
  className,
}: {
  value?: number
  onChange: (id: number | undefined) => void
  id?: string
  /** Offer «all companies» (a filter) under this name. */
  allLabel?: string
  className?: string
}) {
  const { t } = useTranslation(['billing', 'common'])
  const [open, setOpen] = useState(false)
  const companies = useCompanies({ page: 0, size: 500 }).data?.content ?? []
  const selected = companies.find((c) => c.id === value)
  const label = selected?.name ?? allLabel ?? t('billing:payment.pickCompany')

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger render={<Button id={id} type="button" variant="outline" className={className ?? 'w-full justify-between font-normal'} />}>
        <span className={selected ? 'truncate' : 'truncate text-muted-foreground'}>{label}</span>
        <ChevronsUpDown className="text-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent className="w-(--anchor-width) min-w-64 p-0" align="start">
        <Command>
          <CommandInput placeholder={t('common:actions.search')} />
          <CommandList>
            <CommandEmpty>{t('common:common.empty')}</CommandEmpty>
            <CommandGroup>
              {allLabel && (
                <CommandItem
                  value={allLabel}
                  onSelect={() => {
                    onChange(undefined)
                    setOpen(false)
                  }}
                >
                  {allLabel}
                  {value == null && <Check className="ml-auto" />}
                </CommandItem>
              )}
              {companies.map((c) => (
                <CommandItem
                  key={c.id}
                  value={`${c.name} ${c.id}`}
                  onSelect={() => {
                    onChange(c.id)
                    setOpen(false)
                  }}
                >
                  {c.name}
                  {c.id === value && <Check className="ml-auto" />}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
