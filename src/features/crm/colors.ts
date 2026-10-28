import type { CrmTaskStatus } from '@/lib/api/types'

/** Palette of pipeline stages; the names are what the API stores. Tailwind needs the classes spelled out. */
export const STAGE_COLORS = ['slate', 'blue', 'cyan', 'violet', 'amber', 'orange', 'emerald', 'red', 'pink'] as const
export type StageColor = (typeof STAGE_COLORS)[number]

type Swatch = { dot: string; badge: string; border: string }

const SWATCHES: Record<StageColor, Swatch> = {
  slate: { dot: 'bg-slate-400', badge: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100', border: 'border-t-slate-400' },
  blue: { dot: 'bg-blue-500', badge: 'bg-blue-100 text-blue-900 dark:bg-blue-900/50 dark:text-blue-100', border: 'border-t-blue-500' },
  cyan: { dot: 'bg-cyan-500', badge: 'bg-cyan-100 text-cyan-900 dark:bg-cyan-900/50 dark:text-cyan-100', border: 'border-t-cyan-500' },
  violet: { dot: 'bg-violet-500', badge: 'bg-violet-100 text-violet-900 dark:bg-violet-900/50 dark:text-violet-100', border: 'border-t-violet-500' },
  amber: { dot: 'bg-amber-500', badge: 'bg-amber-100 text-amber-900 dark:bg-amber-900/50 dark:text-amber-100', border: 'border-t-amber-500' },
  orange: { dot: 'bg-orange-500', badge: 'bg-orange-100 text-orange-900 dark:bg-orange-900/50 dark:text-orange-100', border: 'border-t-orange-500' },
  emerald: { dot: 'bg-emerald-500', badge: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/50 dark:text-emerald-100', border: 'border-t-emerald-500' },
  red: { dot: 'bg-red-500', badge: 'bg-red-100 text-red-900 dark:bg-red-900/50 dark:text-red-100', border: 'border-t-red-500' },
  pink: { dot: 'bg-pink-500', badge: 'bg-pink-100 text-pink-900 dark:bg-pink-900/50 dark:text-pink-100', border: 'border-t-pink-500' },
}

export function stageSwatch(color?: string): Swatch {
  return SWATCHES[(color as StageColor) in SWATCHES ? (color as StageColor) : 'slate']
}

/** Task board columns: to do — neutral, in progress — amber, done — green. */
const TASK_SWATCH: Record<CrmTaskStatus, StageColor> = { TODO: 'slate', IN_PROGRESS: 'amber', DONE: 'emerald' }

export function taskSwatch(status?: CrmTaskStatus): Swatch {
  return SWATCHES[TASK_SWATCH[status ?? 'TODO']]
}

/** Left accent of a task card, by its column. */
export const TASK_CARD_ACCENT: Record<CrmTaskStatus, string> = {
  TODO: 'border-l-4 border-l-slate-300',
  IN_PROGRESS: 'border-l-4 border-l-amber-500',
  DONE: 'border-l-4 border-l-emerald-500',
}
