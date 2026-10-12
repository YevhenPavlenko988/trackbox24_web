import { Check, ChevronsUpDown } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useDebounce } from '@/hooks/use-debounce'
import { isApiError } from '@/lib/api/problem'
import type { NpBranchType } from './api'
import { MIN_QUERY, useNpBranches, useNpCities, useNpStreets } from './queries'

/** What a picker gives back: Nova Poshta needs the ref, the people reading the parcel need the name. */
export type NpRef = { ref?: string; name?: string }

type Option = { ref?: string; label: string; hint?: string }

/**
 * Combobox over a live Nova Poshta directory: the typed text is debounced, the chosen `ref` and name are kept
 * together so the card still reads well when Nova Poshta is unreachable.
 */
function RefPicker({
  id,
  value,
  options,
  isPending,
  error,
  search,
  onSearch,
  onPick,
  placeholder,
  disabled,
  hint,
  invalid,
}: {
  id?: string
  value?: NpRef
  options: Option[]
  isPending: boolean
  error: unknown
  search: string
  onSearch: (s: string) => void
  onPick: (option: Option) => void
  placeholder: string
  disabled?: boolean
  /** Shown instead of the list: nothing to search in yet, or why the search cannot run. */
  hint?: ReactNode
  invalid?: boolean
}) {
  const { t } = useTranslation(['novaPoshta', 'common'])
  const [open, setOpen] = useState(false)
  const label = value?.name ?? value?.ref ?? placeholder

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger render={<Button id={id} type="button" variant="outline" disabled={disabled} aria-invalid={invalid} className="w-full justify-between font-normal" />}>
        <span className={value?.ref ? 'truncate' : 'text-muted-foreground truncate'}>{label}</span>
        <ChevronsUpDown className="text-muted-foreground shrink-0" />
      </PopoverTrigger>
      <PopoverContent className="w-(--anchor-width) p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput value={search} onValueChange={onSearch} placeholder={t('common:actions.search')} />
          <CommandList>
            <CommandEmpty>
              {hint ??
                (isApiError(error)
                  ? (error.detail ?? error.title)
                  : error
                    ? t('novaPoshta:picker.failed')
                    : isPending
                      ? t('common:common.loading')
                      : t('common:common.empty'))}
            </CommandEmpty>
            <CommandGroup>
              {options.map((o) => (
                <CommandItem
                  key={o.ref}
                  value={o.ref}
                  onSelect={() => {
                    onPick(o)
                    setOpen(false)
                    onSearch('')
                  }}
                >
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate">{o.label}</span>
                    {o.hint && <span className="text-xs text-muted-foreground truncate">{o.hint}</span>}
                  </div>
                  {o.ref === value?.ref && <Check className="ml-auto" />}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

export function NpCityPicker({ id, value, onChange, invalid }: { id?: string; value?: NpRef; onChange: (v: NpRef) => void; invalid?: boolean }) {
  const { t } = useTranslation('novaPoshta')
  const [search, setSearch] = useState('')
  const debounced = useDebounce(search)
  const cities = useNpCities(debounced, true)
  const short = debounced.trim().length < MIN_QUERY

  return (
    <RefPicker
      id={id}
      value={value}
      search={search}
      onSearch={setSearch}
      options={(cities.data ?? []).map((c) => ({ ref: c.ref, label: c.name ?? '', hint: c.area }))}
      isPending={cities.isFetching}
      error={cities.error}
      hint={short ? t('picker.typeMore', { count: MIN_QUERY }) : undefined}
      onPick={(o) => onChange({ ref: o.ref, name: o.label })}
      placeholder={t('picker.city')}
      invalid={invalid}
    />
  )
}

/** Branches and lockers of the chosen city; Nova Poshta lists them even with an empty query. */
export function NpBranchPicker({
  id,
  cityRef,
  type,
  value,
  onChange,
  invalid,
}: {
  id?: string
  cityRef?: string
  type: NpBranchType
  value?: NpRef
  onChange: (v: NpRef) => void
  invalid?: boolean
}) {
  const { t } = useTranslation('novaPoshta')
  const [search, setSearch] = useState('')
  const debounced = useDebounce(search)
  const branches = useNpBranches(cityRef, debounced, type, true)

  return (
    <RefPicker
      id={id}
      value={value}
      search={search}
      onSearch={setSearch}
      options={(branches.data ?? []).map((b) => ({ ref: b.ref, label: b.name ?? '' }))}
      isPending={branches.isFetching}
      error={branches.error}
      hint={cityRef ? undefined : t('picker.cityFirst')}
      onPick={(o) => onChange({ ref: o.ref, name: o.label })}
      placeholder={type === 'POSTOMAT' ? t('picker.postomat') : t('picker.branch')}
      disabled={!cityRef}
      invalid={invalid}
    />
  )
}

export function NpStreetPicker({
  id,
  cityRef,
  value,
  onChange,
  invalid,
}: {
  id?: string
  cityRef?: string
  value?: NpRef
  onChange: (v: NpRef) => void
  invalid?: boolean
}) {
  const { t } = useTranslation('novaPoshta')
  const [search, setSearch] = useState('')
  const debounced = useDebounce(search)
  const streets = useNpStreets(cityRef, debounced, true)
  const short = debounced.trim().length < MIN_QUERY

  return (
    <RefPicker
      id={id}
      value={value}
      search={search}
      onSearch={setSearch}
      options={(streets.data ?? []).map((s) => ({ ref: s.ref, label: [s.type, s.name].filter(Boolean).join(' ') }))}
      isPending={streets.isFetching}
      error={streets.error}
      hint={!cityRef ? t('picker.cityFirst') : short ? t('picker.typeMore', { count: MIN_QUERY }) : undefined}
      onPick={(o) => onChange({ ref: o.ref, name: o.label })}
      placeholder={t('picker.street')}
      disabled={!cityRef}
      invalid={invalid}
    />
  )
}
