import { useTranslation } from 'react-i18next'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { Role } from '@/lib/api/types'
import { userDisplayName } from './api'
import { useUsersByRole } from './queries'

const NONE = '__none__'

export function UserSelect({
  role,
  value,
  onChange,
  id,
  invalid,
  className,
  noneLabel,
  disabled,
  excludeId,
}: {
  role: Role
  value?: number
  onChange: (id: number | undefined) => void
  id?: string
  invalid?: boolean
  className?: string
  noneLabel?: string
  disabled?: boolean
  /** Left out of the list: the same person cannot be picked twice (a trip's second driver). */
  excludeId?: number
}) {
  const { t } = useTranslation('users')
  const users = useUsersByRole(role)
  const all = users.data?.content ?? []
  const items = excludeId == null ? all : all.filter((u) => u.id !== excludeId)
  const selected = all.find((u) => u.id === value)
  const empty = noneLabel ?? t('selectPlaceholder')

  return (
    <Select value={value != null ? String(value) : NONE} onValueChange={(v) => onChange(v && v !== NONE ? Number(v) : undefined)} disabled={disabled}>
      <SelectTrigger id={id} aria-invalid={invalid} className={className ?? 'w-56'}>
        <SelectValue>{selected ? userDisplayName(selected) : empty}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NONE}>{empty}</SelectItem>
        {items.map((u) => (
          <SelectItem key={u.id} value={String(u.id)}>
            {userDisplayName(u)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
