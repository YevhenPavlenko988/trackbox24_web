import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * A labelled bar of a part of a whole: the label and a note on the left, the value on the right, the bar under them.
 * {@code share} is 0–100; a part that is there but tiny still shows a sliver.
 */
export function ShareBar({ label, note, value, share, alarm, present = share > 0 }: {
  label: ReactNode
  note?: ReactNode
  value: ReactNode
  share: number
  alarm?: boolean
  present?: boolean
}) {
  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 text-sm">
        <span className={cn(alarm ? 'font-semibold text-destructive' : 'text-muted-foreground')}>
          {label}
          {note && <span className="ml-2 text-xs font-normal text-muted-foreground">{note}</span>}
        </span>
        <span className="font-semibold tabular-nums">{value}</span>
      </div>
      <div className="mt-1.5 h-2 rounded-full bg-muted" role="presentation">
        <div className={cn('h-2 rounded-full', alarm ? 'bg-destructive' : 'bg-primary')} style={{ width: `${present ? Math.max(Math.min(share, 100), 2) : 0}%` }} />
      </div>
    </div>
  )
}
