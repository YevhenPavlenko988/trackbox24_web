import { Plus, Settings2 } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { useDebounce } from '@/hooks/use-debounce'
import { useListParams } from '@/hooks/use-list-params'
import { ColorDot } from './ColorDot'
import { stageSwatch } from './colors'
import { DealCard } from './DealCard'
import { DealDialog } from './DealDialog'
import { useDeals, useStages } from './queries'
import { StagesDialog } from './StagesDialog'
import { TeamSelect } from './TeamSelect'

/** The sales pipeline as a board: a column per stage. */
export function DealsBoardPage() {
  const { t } = useTranslation(['crm', 'common'])
  const { get, set } = useListParams()
  const ownerId = get('owner') ? Number(get('owner')) : undefined
  const showClosed = get('closed') === '1'
  const [text, setText] = useState(get('q') ?? '')
  const query = useDebounce(text, 400)
  const [creating, setCreating] = useState(false)
  const [settings, setSettings] = useState(false)

  const stages = useStages()
  const deals = useDeals({ ownerId, query, open: showClosed ? undefined : true })
  const columns = (stages.data ?? []).filter((s) => showClosed || s.kind === 'OPEN')

  return (
    <>
      <PageHeader
        title={t('crm:deals.title')}
        actions={
          <>
            <Button variant="outline" onClick={() => setSettings(true)}>
              <Settings2 />
              {t('crm:stages.settings')}
            </Button>
            <Button onClick={() => setCreating(true)}>
              <Plus />
              {t('crm:deals.new')}
            </Button>
          </>
        }
      />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Input className="w-72" value={text} placeholder={t('crm:deals.search')} onChange={(e) => setText(e.target.value)} aria-label={t('crm:deals.search')} />
        <TeamSelect value={ownerId} onChange={(v) => set({ owner: v != null ? String(v) : undefined })} noneLabel={t('crm:deals.allOwners')} />
        <Label className="flex items-center gap-2 font-normal">
          <Switch checked={showClosed} onCheckedChange={(c) => set({ closed: c ? '1' : undefined })} />
          {t('crm:deals.showClosed')}
        </Label>
      </div>
      {stages.isPending || deals.isPending ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {columns.map((stage) => {
            const inStage = (deals.data?.content ?? []).filter((d) => d.stage?.id === stage.id)
            return (
              <section key={stage.id} className={`flex w-72 shrink-0 flex-col gap-3 rounded-lg border-t-4 bg-muted/50 p-3 ${stageSwatch(stage.color).border}`}>
                <header className="flex items-center justify-between">
                  <h2 className="flex items-center gap-2 text-sm font-semibold">
                    <ColorDot className={stageSwatch(stage.color).dot} />
                    {stage.name}
                  </h2>
                  <Badge variant="secondary">{inStage.length}</Badge>
                </header>
                {inStage.length === 0 && <p className="py-4 text-center text-xs text-muted-foreground">{t('crm:deals.empty')}</p>}
                {inStage.map((deal) => (
                  <DealCard key={deal.id} deal={deal} stages={stages.data ?? []} />
                ))}
              </section>
            )
          })}
        </div>
      )}
      <DealDialog open={creating} onOpenChange={setCreating} />
      <StagesDialog open={settings} onOpenChange={setSettings} />
    </>
  )
}
