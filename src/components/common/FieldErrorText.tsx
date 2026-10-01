import { useTranslation } from 'react-i18next'
import { FieldError } from '@/components/ui/field'

/** Zod messages are i18n keys under `errors.*`; server messages are shown as-is. */
export function FieldErrorText({ error }: { error?: { message?: string } }) {
  const { t, i18n } = useTranslation()
  if (!error?.message) return null
  const key = `errors.${error.message}`
  return <FieldError>{i18n.exists(key) ? t(key) : error.message}</FieldError>
}
