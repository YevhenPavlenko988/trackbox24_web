import { cn } from '@/lib/utils'

const NP_NUMBER = /^\d{14}$/

/**
 * A 14-digit Nova Poshta number (an incoming TTN or our outgoing waybill) with its last four digits set apart —
 * that is how a parcel is called out and looked up at the branch. Anything else is shown as it is.
 * `grouped` prints it the way Nova Poshta does: 20 4515 5881 9168.
 */
export function NpNumber({ value, grouped = false, className }: { value: string; grouped?: boolean; className?: string }) {
  const digits = value.replace(/\s+/g, '')
  if (!NP_NUMBER.test(digits)) return <span className={cn('font-mono', className)}>{value}</span>
  const head = grouped ? `${digits.slice(0, 2)} ${digits.slice(2, 6)} ${digits.slice(6, 10)} ` : digits.slice(0, 10)
  return (
    <span className={cn('font-mono tabular-nums whitespace-nowrap', className)}>
      {head}
      <span data-slot="np-tail" className="text-[1.2em] font-bold text-foreground">
        {digits.slice(10)}
      </span>
    </span>
  )
}
