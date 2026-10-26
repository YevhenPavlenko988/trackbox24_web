import { Mail, Phone, Send } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { CONTACTS, formatPhone, telegramHref } from './contacts'

const link = 'inline-flex items-center gap-2 rounded-lg border border-white/30 px-3 py-2 text-sm font-medium text-white hover:bg-white/10'

/** The direct contacts, each only when configured. Renders nothing at all while `CONTACTS` is empty. */
export function ContactLinks({ className = '' }: { className?: string }) {
  const { t } = useTranslation('landing')
  const items = [
    CONTACTS.telegram && { href: telegramHref(CONTACTS.telegram), Icon: Send, label: t('cta.telegram'), external: true },
    CONTACTS.phone && { href: `tel:+${CONTACTS.phone}`, Icon: Phone, label: formatPhone(CONTACTS.phone) },
    CONTACTS.email && { href: `mailto:${CONTACTS.email}`, Icon: Mail, label: CONTACTS.email },
  ].filter((x): x is Exclude<typeof x, '' | false> => !!x)
  if (!items.length) return null
  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {items.map(({ href, Icon, label, external }) => (
        <a key={href} href={href} className={link} {...(external ? { target: '_blank', rel: 'noreferrer' } : {})}>
          <Icon className="size-4" />
          {label}
        </a>
      ))}
    </div>
  )
}
