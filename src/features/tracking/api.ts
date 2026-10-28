import { api } from '@/lib/api/client'
import { unwrap } from '@/lib/api/problem'
import type { PublicTrackingResponse } from '@/lib/api/types'

/** Our barcode (PT0123456789, a seat PT0123456789-2) or a 14-digit Nova Poshta waybill; the backend normalizes the rest. */
export const TRACKING_CODE = /^(PT\d{10}(-\d+)?|\d{14})$/

/** What the visitor typed → the code as the backend expects it: no spaces, upper case. */
export function normalizeTrackingCode(input: string): string {
  return input.replace(/\s+/g, '').toUpperCase()
}

// The spec declares this response as */* rather than JSON, so openapi-fetch cannot infer it; name the type here.
export const trackParcel = (code: string) => unwrap<PublicTrackingResponse>(api.GET('/api/public/tracking/{code}', { params: { path: { code } } }))

/** Nova Poshta's own tracking page, opened straight on the waybill (the ?cargo_number= form lands on an empty search). */
export const npTrackingUrl = (ttn: string) => `https://novaposhta.ua/tracking/${encodeURIComponent(ttn)}`
