/**
 * The NBU's QR code of a credit transfer (version 002), as the backend makes it (`NbuQr`): Windows-1251 text, Base64URL,
 * behind https://bank.gov.ua/qr/. Here only for the preview in the settings; the client gets the backend's.
 */
const EXTRA: Record<string, number> = {
  'Ё': 0xa8, 'ё': 0xb8, 'Є': 0xaa, 'є': 0xba, 'І': 0xb2, 'і': 0xb3, 'Ї': 0xaf, 'ї': 0xbf, 'Ґ': 0xa5, 'ґ': 0xb4,
  '’': 0x92, 'ʼ': 0x92, '«': 0xab, '»': 0xbb, '№': 0xb9, '—': 0x97, '–': 0x96,
}

function win1251(s: string): number[] {
  return [...s].map((ch) => {
    const c = ch.codePointAt(0)!
    if (c < 0x80) return c
    if (c >= 0x410 && c <= 0x44f) return c - 0x410 + 0xc0
    return EXTRA[ch] ?? 0x3f
  })
}

export function nbuQrUrl(recipient: string, iban: string, sum: number | undefined, taxId: string, purpose: string): string {
  const cut = (s: string, max: number) => s.trim().replace(/[\r\n]+/g, ' ').slice(0, max)
  const amount = sum == null ? '' : 'UAH' + String(Math.round(sum * 100) / 100)
  const data = ['BCD', '002', '2', 'UCT', '', cut(recipient, 70), iban.replace(/\s/g, '').toUpperCase(), amount, taxId.trim(), '', '', cut(purpose, 140), ''].join('\r\n')
  const bytes = win1251(data)
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return 'https://bank.gov.ua/qr/' + btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
