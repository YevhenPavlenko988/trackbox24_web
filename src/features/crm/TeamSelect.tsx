import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useTeam } from './queries'

const NONE = '__none__'

/** A member of the TrackBox24 team (admin or sales): owner of a deal, assignee of a task. */
export function TeamSelect({
  value,
  onChange,
  id,
  className,
  noneLabel,
}: {
  value?: number
  onChange: (id: number | undefined) => void
  id?: string
  className?: string
  noneLabel: string
}) {
  const team = useTeam().data ?? []
  const selected = team.find((m) => m.id === value)
  return (
    <Select value={value != null ? String(value) : NONE} onValueChange={(v) => onChange(v && v !== NONE ? Number(v) : undefined)}>
      <SelectTrigger id={id} className={className ?? 'w-56'}>
        <SelectValue>{selected?.name ?? noneLabel}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NONE}>{noneLabel}</SelectItem>
        {team.map((m) => (
          <SelectItem key={m.id} value={String(m.id)}>
            {m.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
