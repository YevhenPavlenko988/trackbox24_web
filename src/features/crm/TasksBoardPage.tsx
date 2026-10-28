import { Plus } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useListParams } from '@/hooks/use-list-params'
import type { CrmTaskResponse } from '@/lib/api/types'
import { useTasks } from './queries'
import { TaskCard } from './TaskCard'
import { ColorDot } from './ColorDot'
import { taskSwatch } from './colors'
import { TASK_STATUSES } from './constants'
import { TaskDialog } from './TaskDialog'
import { TeamSelect } from './TeamSelect'

type Due = 'TODAY' | 'OVERDUE'

/** The team's task board: «Зробити», «В роботі», «Готово». */
export function TasksBoardPage() {
  const { t } = useTranslation(['crm', 'common'])
  const { get, set } = useListParams()
  const mine = get('who') !== 'all'
  const assigneeId = !mine && get('assignee') ? Number(get('assignee')) : undefined
  const due = (get('due') as Due | undefined) ?? undefined
  const tasks = useTasks({ mine, assigneeId, due })
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<CrmTaskResponse | null>(null)

  return (
    <>
      <PageHeader
        title={t('crm:tasks.title')}
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus />
            {t('crm:tasks.new')}
          </Button>
        }
      />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Tabs value={mine ? 'mine' : 'all'} onValueChange={(v) => set({ who: v === 'all' ? 'all' : undefined, assignee: undefined })}>
          <TabsList>
            <TabsTrigger value="mine">{t('crm:tasks.mine')}</TabsTrigger>
            <TabsTrigger value="all">{t('crm:tasks.all')}</TabsTrigger>
          </TabsList>
        </Tabs>
        {!mine && <TeamSelect value={assigneeId} onChange={(v) => set({ assignee: v != null ? String(v) : undefined })} noneLabel={t('crm:tasks.allAssignees')} />}
        <Tabs value={due ?? 'any'} onValueChange={(v) => set({ due: v === 'any' ? undefined : String(v) })}>
          <TabsList>
            <TabsTrigger value="any">{t('crm:tasks.all')}</TabsTrigger>
            <TabsTrigger value="TODAY">{t('crm:tasks.today')}</TabsTrigger>
            <TabsTrigger value="OVERDUE">{t('crm:tasks.overdue')}</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      {tasks.isPending ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          {TASK_STATUSES.map((status) => {
            const column = (tasks.data ?? []).filter((task) => task.status === status)
            return (
              <section key={status} className={`flex flex-col gap-3 rounded-lg border-t-4 bg-muted/50 p-3 ${taskSwatch(status).border}`}>
                <header className="flex items-center justify-between">
                  <h2 className="flex items-center gap-2 text-sm font-semibold">
                    <ColorDot className={taskSwatch(status).dot} />
                    {t(`crm:tasks.status.${status}`)}
                  </h2>
                  <Badge variant="secondary">{column.length}</Badge>
                </header>
                {column.length === 0 && <p className="py-4 text-center text-xs text-muted-foreground">{t('crm:tasks.empty')}</p>}
                {column.map((task) => (
                  <TaskCard key={task.id} task={task} onOpen={() => setEditing(task)} />
                ))}
              </section>
            )
          })}
        </div>
      )}
      <TaskDialog open={creating} onOpenChange={setCreating} />
      <TaskDialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)} task={editing} />
    </>
  )
}
