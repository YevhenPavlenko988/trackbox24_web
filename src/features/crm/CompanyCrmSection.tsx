import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { stageSwatch } from './colors'
import { useContacts, useDeals } from './queries'
import { TaskList } from './TaskList'

/** The CRM side of a client company: its people, deals and tasks. */
export function CompanyCrmSection({ companyId }: { companyId: number }) {
  const { t } = useTranslation('crm')
  const contacts = useContacts(companyId).data?.content ?? []
  const deals = useDeals({ companyId }).data?.content ?? []
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>{t('company.contacts')}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm">
          {contacts.length === 0 && <p className="text-muted-foreground">{t('company.noContacts')}</p>}
          {contacts.map((c) => (
            <div key={c.id}>
              <p className="font-medium">{[c.fullName, c.jobTitle].filter(Boolean).join(', ')}</p>
              <p className="text-muted-foreground">{[c.phone, c.email].filter(Boolean).join(' · ')}</p>
            </div>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{t('company.deals')}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm">
          {deals.length === 0 && <p className="text-muted-foreground">{t('deals.empty')}</p>}
          {deals.map((d) => (
            <Link key={d.id} to={`/crm/deals/${d.id}`} className="flex items-center justify-between gap-2 hover:underline">
              <span>{d.title}</span>
              <Badge className={stageSwatch(d.stageColor).badge}>{d.stage?.name}</Badge>
            </Link>
          ))}
        </CardContent>
      </Card>
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>{t('company.tasks')}</CardTitle>
        </CardHeader>
        <CardContent>
          <TaskList companyId={companyId} />
        </CardContent>
      </Card>
    </div>
  )
}
