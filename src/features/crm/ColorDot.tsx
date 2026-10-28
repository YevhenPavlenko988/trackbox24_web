import { cn } from '@/lib/utils'

/** A small round swatch in front of a stage or status name. */
export function ColorDot({ className }: { className: string }) {
  return <span aria-hidden className={cn('inline-block size-2.5 shrink-0 rounded-full', className)} />
}
