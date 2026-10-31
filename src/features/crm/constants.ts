import type { CompanyOption, CrmTaskStatus } from '@/lib/api/types'

/** Columns of the task board, in order. */
export const TASK_STATUSES: CrmTaskStatus[] = ['TODO', 'IN_PROGRESS', 'DONE']

/** Paid options of a carrier company. */
export const COMPANY_OPTIONS: CompanyOption[] = ['PARCELS', 'MOVES', 'PHOTOS', 'PUBLIC_TRACKING', 'TELEGRAM_BOT']

/** A company works with parcels, moves or both. */
export const hasWorkModule = (options: CompanyOption[]) => options.includes('PARCELS') || options.includes('MOVES')

/**
 * The options a change of one checkbox leaves: the Telegram bot needs the public tracking page, so ticking the bot
 * ticks the page too and unticking the page unticks the bot; the page alone is fine.
 */
export function toggleOption(value: CompanyOption[], option: CompanyOption, checked: boolean): CompanyOption[] {
  const next = new Set(value)
  if (checked) {
    next.add(option)
    if (option === 'TELEGRAM_BOT') next.add('PUBLIC_TRACKING')
  } else {
    next.delete(option)
    if (option === 'PUBLIC_TRACKING') next.delete('TELEGRAM_BOT')
  }
  return COMPANY_OPTIONS.filter((o) => next.has(o))
}
