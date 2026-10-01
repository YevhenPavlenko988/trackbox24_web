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
}: {
  role: Role
  value?: number
  onChange: (id: number | undefined) => void
  id?: string
  invalid?: boolean
  className?: string
  noneLabel?: string
}) {
  const { t } = useTranslation('users')
  const users = useUsersByRole(role)
  const items = users.data?.content ?? []
  const selected = items.find((u) => u.id === value)
  const empty = noneLabel ?? t('selectPlaceholder')

  return (
    <Select value={value != null ? String(value) : NONE} onValueChange={(v) => onChange(v && v !== NONE ? Number(v) : undefined)}>
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
