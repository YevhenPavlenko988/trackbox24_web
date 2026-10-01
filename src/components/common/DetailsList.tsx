import type { ReactNode } from 'react'

export type DetailItem = { label: ReactNode; value: ReactNode }

export function DetailsList({ items }: { items: DetailItem[] }) {
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
      {items.map((item, i) => (
        <div key={i} className="flex flex-col gap-0.5">
          <dt className="text-muted-foreground">{item.label}</dt>
          <dd className="font-medium">{item.value ?? '—'}</dd>
        </div>
      ))}
    </dl>
  )
}
