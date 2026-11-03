import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

export type InfoRow = { label: ReactNode; value: ReactNode }

/** No value, or the «—» the formatters give for one. */
export const isEmptyValue = (v: ReactNode) => v == null || v === false || v === '' || v === '—'

/**
 * A titled block of a card: label on the left (one width for every block, so the values line up), value on the right; rows without a value are not shown
 * (what is missing goes to {@link MissingFields} instead of a column of dashes).
 */
export function InfoGroup({ icon: Icon, title, rows, children }: { icon?: LucideIcon; title?: ReactNode; rows: InfoRow[]; children?: ReactNode }) {
  const shown = rows.filter((r) => !isEmptyValue(r.value))
  if (!shown.length && !children) return null
  return (
    <section className="flex flex-col gap-1.5">
      {title && (
        <h3 className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          {Icon && <Icon className="size-3.5" />}
          {title}
        </h3>
      )}
      {shown.length > 0 && (
        <dl className="grid grid-cols-[minmax(0,10.5rem)_minmax(0,1fr)] gap-x-4 gap-y-1 text-sm">
          {shown.map((r, i) => (
            <div key={i} className="contents">
              <dt className="text-muted-foreground">{r.label}</dt>
              <dd className="min-w-0 font-medium break-words">{r.value}</dd>
            </div>
          ))}
        </dl>
      )}
      {children}
    </section>
  )
}

/** «Не заповнено: телефон, адреса…» — the empty fields of a card in one muted line. */
export function MissingFields({ label, rows }: { label: ReactNode; rows: InfoRow[] }) {
  const missing = rows.filter((r) => isEmptyValue(r.value))
  if (!missing.length) return null
  return (
    <p className="text-xs text-muted-foreground">
      {label}:{' '}
      {missing.map((r, i) => (
        <span key={i}>
          {i > 0 && ', '}
          {r.label}
        </span>
      ))}
    </p>
  )
}
