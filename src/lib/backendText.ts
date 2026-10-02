import i18n from 'i18next'

/**
 * The backend writes history comments in English ("Loading started", "To warehouse X").
 * Known phrases are translated client-side; anything else (user-typed comments) passes through.
 */
const RULES: { re: RegExp; key: string; args?: (m: RegExpMatchArray) => Record<string, string> }[] = [
  { re: /^Loading started$/, key: 'loadingStarted' },
  { re: /^Departed$/, key: 'departed' },
  { re: /^Departed, odometer (\d+) km$/, key: 'departedOdometer', args: (m) => ({ km: m[1] }) },
  { re: /^Completed$/, key: 'completed' },
  { re: /^Completed, odometer (\d+) km$/, key: 'completedOdometer', args: (m) => ({ km: m[1] }) },
  { re: /^Outside the plan$/, key: 'outsidePlan' },
  { re: /^Loaded outside the plan$/, key: 'loadedOutsidePlan' },
  { re: /^Loaded outside the plan\. (.+)$/s, key: 'loadedOutsidePlanComment', args: (m) => ({ comment: m[1] }) },
  { re: /^Not loaded before departure$/, key: 'notLoadedBeforeDeparture' },
  { re: /^Re-planned to trip (\d+)$/, key: 'replanned', args: (m) => ({ id: m[1] }) },
  { re: /^To warehouse (.+)$/s, key: 'toWarehouse', args: (m) => ({ name: m[1] }) },
  { re: /^Trip cancelled$/, key: 'tripCancelled' },
  { re: /^Trip cancelled, to warehouse (.+)$/s, key: 'tripCancelledToWarehouse', args: (m) => ({ name: m[1] }) },
  { re: /^All (\d+) seats$/, key: 'allSeats', args: (m) => ({ count: m[1] }) },
  { re: /^Created manually$/, key: 'createdManually' },
  { re: /^Created manually as already received$/, key: 'createdManuallyReceived' },
  {
    re: /^Redirected by Nova Poshta: waybill (\d+) -> (\d+), parcel #(\d+) merged$/,
    key: 'npRedirected',
    args: (m) => ({ from: m[1], to: m[2], id: m[3] }),
  },
  { re: /^Manual status change to ([A-Z_]+)$/, key: 'manualStatusChange', args: (m) => ({ status: i18n.t(`common:parcelStatus.${m[1]}`, { defaultValue: m[1] }) }) },
]

export function translateComment(comment?: string | null): string | undefined {
  if (!comment) return undefined
  for (const rule of RULES) {
    const m = comment.match(rule.re)
    if (m) return i18n.t(`common:backendComments.${rule.key}`, rule.args?.(m))
  }
  return comment
}
