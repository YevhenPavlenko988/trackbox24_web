import { Check, ChevronsUpDown, X } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useDebounce } from '@/hooks/use-debounce'
import type { ClientResponse } from '@/lib/api/types'
import { formatPhone } from '@/lib/format'
import { clientDisplayName } from './api'
import { useClient, useClients } from './queries'

export function ClientPicker({
  value,
  onChange,
  placeholder,
  id,
  invalid,
  clearable = true,
}: {
  value?: number
  onChange: (id: number | undefined, client?: ClientResponse) => void
  placeholder?: string
  id?: string
  invalid?: boolean
  clearable?: boolean
}) {
  const { t } = useTranslation(['clients', 'common'])
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const debounced = useDebounce(search)

  const options = useClients({ search: debounced, size: 20 }, open)
  const selected = useClient(value)

  const label = value ? clientDisplayName(selected.data) : (placeholder ?? t('clients:pickerPlaceholder'))

  return (
    <div className="flex gap-1">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button
              id={id}
              type="button"
              variant="outline"
              aria-invalid={invalid}
              className="flex-1 justify-between font-normal"
            />
          }
        >
          <span className={value ? undefined : 'text-muted-foreground'}>{label}</span>
          <ChevronsUpDown className="text-muted-foreground" />
        </PopoverTrigger>
        <PopoverContent className="w-(--anchor-width) p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput value={search} onValueChange={setSearch} placeholder={t('common:actions.search')} />
            <CommandList>
              <CommandEmpty>{options.isPending ? t('common:common.loading') : t('common:common.empty')}</CommandEmpty>
              <CommandGroup>
                {(options.data?.content ?? []).map((c) => (
                  <CommandItem
                    key={c.id}
                    value={String(c.id)}
                    onSelect={() => {
                      onChange(c.id, c)
                      setOpen(false)
                    }}
                  >
                    <div className="flex flex-col">
                      <span>{clientDisplayName(c)}</span>
                      <span className="text-xs text-muted-foreground">{formatPhone(c.phone)}</span>
                    </div>
                    {c.id === value && <Check className="ml-auto" />}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {clearable && value != null && (
        <Button type="button" variant="ghost" size="icon" aria-label={t('common:actions.clear')} onClick={() => onChange(undefined)}>
          <X />
        </Button>
      )}
    </div>
  )
}
