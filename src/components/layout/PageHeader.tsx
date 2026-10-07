import type { ReactNode } from 'react'

export function PageHeader({
  title,
  description,
  badges,
  actions,
}: {
  title: ReactNode
  description?: ReactNode
  /** Status chips and the like; they get their own row so they never push the actions off the header. */
  badges?: ReactNode
  actions?: ReactNode
}) {
  return (
    <div data-slot="page-header" className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0 flex-1">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {badges && (
          <div data-slot="page-badges" className="mt-2 flex flex-wrap items-center gap-2">
            {badges}
          </div>
        )}
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center justify-end gap-2">{actions}</div>}
    </div>
  )
}
