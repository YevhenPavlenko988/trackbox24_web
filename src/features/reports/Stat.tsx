import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

/** One headline number of a report, with what it means under it. */
export function Stat({ label, value, hint, danger, testId }: { label: string; value: string; hint?: string; danger?: boolean; testId?: string }) {
  return (
    <Card>
      <CardContent>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className={cn('text-2xl font-semibold tabular-nums', danger && 'text-destructive')} data-testid={testId}>
          {value}
        </p>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  )
}
