const KEY = 'tb24.rememberedEmail'

/**
 * «Запам'ятати мене» on the web keeps only the email: a password in browser storage could be read by any script on
 * the page, so the password is left to the browser's own password manager.
 */
export function getRememberedEmail(): string {
  try {
    return localStorage.getItem(KEY) ?? ''
  } catch {
    return ''
  }
}

export function setRememberedEmail(email: string | null) {
  try {
    if (email) localStorage.setItem(KEY, email)
    else localStorage.removeItem(KEY)
  } catch {
    // storage unavailable (private mode): nothing to remember
  }
}
