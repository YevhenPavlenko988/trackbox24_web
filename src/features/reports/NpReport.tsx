import { useState } from 'react'
import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { NpRow } from '@/lib/api/types'
import { formatDate, formatMoney } from '@/lib/format'
import { downloadReport, type Period, useNpReport } from './api'
import { PeriodBar } from './PeriodBar'
import { presetPeriod } from './period'
import { ShareBar } from './ShareBar'
import { Stat } from './Stat'

const SHOWN = 30

/** «Нова Пошта»: what the waybills of the period cost and who pays, cash on delivery, returns, paid storage now. */
export function NpReport() {
  const { t } = useTranslation(['reports', 'common'])
  const [period, setPeriod] = useState<Period>(() => presetPeriod('month'))
  const [all, setAll] = useState(false)
  const query = useNpReport(period)
  const r = query.data
  const rows = r?.rows ?? []
  const cost = r?.cost ?? 0

  return (
    <div className="flex flex-col gap-4">
      <PeriodBar period={period} onChange={setPeriod} onExcel={() => downloadReport('np', period)} />
      {query.isPending || !r ? (
        <Skeleton className="h-60 w-full" />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label={t('reports:np.waybills')} value={String(r.waybills ?? 0)} testId="np-waybills" />
            <Stat label={t('reports:np.cost')} value={formatMoney(r.cost, 'UAH')} hint={t('reports:np.costSenderHint', { amount: formatMoney(r.costSender, 'UAH') })} />
            <Stat label={t('reports:np.cod')} value={formatMoney(r.cod, 'UAH')} hint={t('reports:np.codHint', { count: r.codCount ?? 0 })} />
            <Stat
              label={t('reports:np.received')}
              value={`${r.received ?? 0} / ${r.returned ?? 0}`}
              hint={r.avgDaysAtBranch != null ? t('reports:np.atBranch', { days: r.avgDaysAtBranch.toLocaleString('uk-UA') }) : t('reports:np.receivedHint')}
            />
          </div>
          {cost > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>{t('reports:np.whoPays')}</CardTitle>
                <CardDescription>{t('reports:np.whoPaysHint')}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <ShareBar
                  label={t('reports:np.sender')}
                  note={t('reports:np.waybillsCount', { count: r.senderPays ?? 0 })}
                  value={formatMoney(r.costSender, 'UAH')}
                  share={((r.costSender ?? 0) / cost) * 100}
                />
                <ShareBar
                  label={t('reports:np.recipient')}
                  note={t('reports:np.waybillsCount', { count: r.recipientPays ?? 0 })}
                  value={formatMoney(r.costRecipient, 'UAH')}
                  share={((r.costRecipient ?? 0) / cost) * 100}
                />
              </CardContent>
            </Card>
          )}
          {!!r.paidStorage?.length && (
            <Card>
              <CardHeader>
                <CardTitle className="text-destructive">{t('reports:np.paidStorage', { count: r.paidStorage.length })}</CardTitle>
                <CardDescription>{t('reports:np.paidStorageHint')}</CardDescription>
              </CardHeader>
              <CardContent>
                <Rows rows={r.paidStorage} storage />
              </CardContent>
            </Card>
          )}
          <Card>
            <CardHeader>
              <CardTitle>{t('reports:np.list')}</CardTitle>
              <CardDescription>{t('reports:np.listHint')}</CardDescription>
            </CardHeader>
            <CardContent>
              {!rows.length ? (
                <p className="text-sm text-muted-foreground">{t('reports:np.empty')}</p>
              ) : (
                <>
                  <Rows rows={all ? rows : rows.slice(0, SHOWN)} />
                  {rows.length > SHOWN && (
                    <button type="button" className="mt-2 text-sm font-medium hover:underline" onClick={() => setAll(!all)}>
                      {all ? t('reports:clients.showLess') : t('reports:cash.showAll', { count: rows.length })}
                    </button>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}

function Rows({ rows, storage }: { rows: NpRow[]; storage?: boolean }) {
  const { t } = useTranslation(['reports', 'common'])
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t('reports:np.ttn')}</TableHead>
          <TableHead>{t('reports:debts.client')}</TableHead>
          <TableHead>{t('reports:np.status')}</TableHead>
          <TableHead className="text-right">{t('reports:np.costCol')}</TableHead>
          <TableHead className="text-right">{t('reports:np.codCol')}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((n) => (
          <TableRow key={n.parcelId}>
            <TableCell>
              <span className="font-mono">{n.ttn}</span>
              <Link to={`/${n.kind === 'MOVE' ? 'moves' : 'parcels'}/${n.parcelId}`} className="block font-mono text-xs text-muted-foreground hover:underline">
                {n.code}
              </Link>
            </TableCell>
            <TableCell>{n.clientName ?? '—'}</TableCell>
            <TableCell className="whitespace-normal">
              {n.npStatusText ?? (n.status ? t(`common:parcelStatus.${n.status}`) : '—')}
              <span className="block text-xs text-muted-foreground">
                {storage && n.paidStorageFrom
                  ? t('reports:stuck.paidStorage', { date: formatDate(n.paidStorageFrom) })
                  : n.returnAt
                    ? t('reports:np.returnedOn', { date: formatDate(n.returnAt) })
                    : n.receivedAt
                      ? t('reports:np.receivedOn', { date: formatDate(n.receivedAt) })
                      : formatDate(n.createdAt)}
              </span>
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {n.cost != null ? formatMoney(n.cost, 'UAH') : '—'}
              {n.payerType && (
                <span className="block text-xs text-muted-foreground">
                  {n.payerType.toLowerCase() === 'sender' ? t('reports:np.sender') : n.payerType.toLowerCase() === 'recipient' ? t('reports:np.recipient') : n.payerType}
                </span>
              )}
            </TableCell>
            <TableCell className="text-right tabular-nums">{n.cod ? formatMoney(n.cod, 'UAH') : '—'}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
