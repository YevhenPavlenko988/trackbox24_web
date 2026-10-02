import type { NpState, ParcelResponse } from '@/lib/api/types'

/**
 * Nova Poshta tracking status codes (TrackingDocument.getStatusDocuments → StatusCode).
 * The backend groups them into `npState`; this mirror lets the client parse `npStatusCode` itself when `npState`
 * is missing (older responses) and show a short label when `npStatusText` is empty.
 */
export const NP_STATE_BY_CODE: Record<string, NpState> = {
  '1': 'CREATED',
  '2': 'NOT_FOUND',
  '3': 'NOT_FOUND',
  '4': 'IN_TRANSIT',
  '41': 'IN_TRANSIT',
  '5': 'IN_TRANSIT',
  '6': 'IN_TRANSIT',
  '12': 'IN_TRANSIT',
  '101': 'IN_TRANSIT',
  '112': 'IN_TRANSIT',
  '7': 'ARRIVED',
  '8': 'ARRIVED',
  '9': 'RECEIVED',
  '10': 'RECEIVED',
  '11': 'RECEIVED',
  '106': 'RECEIVED',
  '104': 'REDIRECTED',
  '102': 'RETURNING',
  '103': 'RETURNING',
  '105': 'RETURNING',
  '108': 'RETURNING',
  '111': 'DELIVERY_FAILED',
}

/** Short Ukrainian wording per code, used when Nova Poshta gave us no status text. */
export const NP_CODE_LABELS: Record<string, string> = {
  '1': 'ЕН створено, ще не передано в НП',
  '2': 'ЕН видалено',
  '3': 'Номер не знайдено',
  '4': 'У місті відправника',
  '41': 'У місті відправника',
  '5': 'Прямує до міста отримувача',
  '6': 'У місті отримувача, очікує прибуття у відділення',
  '7': 'Прибула у відділення',
  '8': 'Прибула у поштомат',
  '9': 'Отримано',
  '10': 'Отримано, грошовий переказ у дорозі',
  '11': 'Отримано, грошовий переказ видано',
  '12': 'НП комплектує відправлення',
  '14': 'Передано на огляд отримувачу',
  '101': 'На шляху до одержувача',
  '102': 'Відмова відправника (повернення)',
  '103': 'Відмова одержувача',
  '104': 'Змінено адресу',
  '105': 'Припинено зберігання',
  '106': 'Одержано, створено ЕН зворотньої доставки',
  '108': 'Повертається відправнику',
  '111': 'Невдала спроба доставки',
  '112': 'Дату доставки перенесено одержувачем',
}

type NpParcel = Pick<ParcelResponse, 'npState' | 'npStatusCode' | 'npStatusText'>

/** Backend `npState` when present, otherwise parsed from the raw code. `undefined` = no NP data at all. */
export function npStateOf(p: NpParcel): NpState | undefined {
  if (p.npState) return p.npState
  if (!p.npStatusCode) return undefined
  return NP_STATE_BY_CODE[p.npStatusCode] ?? 'OTHER'
}

/** What Nova Poshta says, as text: their own wording, else our label for the code, else nothing. */
export function npStatusTextOf(p: NpParcel): string | undefined {
  return p.npStatusText || (p.npStatusCode ? NP_CODE_LABELS[p.npStatusCode] : undefined)
}

/**
 * Client-side groups for the "NP state" filter. `live` = the parcel is still somewhere in Nova Poshta's hands and
 * will reach the branch; the rest are not things a representative can go and pick up.
 */
export const NP_STATE_GROUPS = {
  live: ['CREATED', 'IN_TRANSIT', 'ARRIVED', 'DELIVERY_FAILED', 'OTHER'],
  arrived: ['ARRIVED'],
  transit: ['CREATED', 'IN_TRANSIT', 'DELIVERY_FAILED'],
  received: ['RECEIVED'],
  problem: ['REDIRECTED', 'RETURNING', 'NOT_FOUND'],
} satisfies Record<string, NpState[]>

export type NpStateGroup = keyof typeof NP_STATE_GROUPS

export function isNpStateGroup(v: string | undefined): v is NpStateGroup {
  return v != null && v in NP_STATE_GROUPS
}

export function inNpStateGroup(p: NpParcel, group: NpStateGroup): boolean {
  const state = npStateOf(p)
  if (!state) return group === 'live' // no NP data yet: assume it is still coming
  return (NP_STATE_GROUPS[group] as NpState[]).includes(state)
}

/** Nova Poshta already closed this waybill (picked up, redirected, returning, deleted) — not "live" for pickup. */
export function isGoneFromNp(p: NpParcel): boolean {
  return !inNpStateGroup(p, 'live')
}
