/**
 * The same bot with the same parcel code in Telegram Web: «https://t.me/bot?start=CODE» → web.telegram.org with the
 * tg:// address it understands. Undefined for a link that is not a t.me one.
 */
export function telegramWebUrl(tme: string): string | undefined {
  try {
    const url = new URL(tme)
    if (url.hostname !== 't.me') return undefined
    const bot = url.pathname.replace(/^\//, '')
    if (!bot) return undefined
    const start = url.searchParams.get('start')
    const tg = `tg://resolve?domain=${bot}` + (start ? `&start=${start}` : '')
    return `https://web.telegram.org/k/#?tgaddr=${encodeURIComponent(tg)}`
  } catch {
    return undefined
  }
}
