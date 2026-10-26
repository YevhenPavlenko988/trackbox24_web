/**
 * Public contacts shown on the landing page. An empty value hides its button — fill these in before the page goes
 * live, nothing here is made up by the page.
 */
export const CONTACTS = {
  /** Digits with the country code, e.g. '380671234567'; shown formatted and used in `tel:`. */
  phone: '380985720218',
  /** Telegram username without `@`, or a full `https://t.me/...` link. */
  telegram: 'epavlenko',
  email: 'yevhenpavlenko988@gmail.com',
}

/** The operator as the legal documents name it; fill in the registered name before publishing. */
export const LEGAL = {
  name: 'TrackBox24',
  /** Mailbox for legal and data requests; when empty the documents point at the demo form instead. */
  email: CONTACTS.email,
}

export const hasContacts = () => !!(CONTACTS.phone || CONTACTS.telegram || CONTACTS.email)

export const telegramHref = (v: string) => (v.startsWith('http') ? v : `https://t.me/${v.replace(/^@/, '')}`)

export const formatPhone = (digits: string) => {
  const m = /^(380)(\d{2})(\d{3})(\d{2})(\d{2})$/.exec(digits)
  return m ? `+${m[1]} ${m[2]} ${m[3]} ${m[4]} ${m[5]}` : `+${digits}`
}
