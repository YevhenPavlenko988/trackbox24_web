import { ChevronLeft, ChevronRight, Clock } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { showApiError } from '@/lib/api/problem'
import type { CrmTaskResponse } from '@/lib/api/types'
import { formatDateTime } from '@/lib/format'
import { taskBody } from './api'
import { useUpdateTask } from './queries'
import { TASK_CARD_ACCENT, taskSwatch } from './colors'
import { TASK_STATUSES } from './constants'

/** A card of the task board: due date (red when overdue), assignee, the deal or client; arrows move it between columns. */
export function TaskCard({ task, onOpen, showMove = true }: { task: CrmTaskResponse; onOpen: () => void; showMove?: boolean }) {
  const { t } = useTranslation('crm')
  const update = useUpdateTask()
  const at = TASK_STATUSES.indexOf(task.status ?? 'TODO')
  const move = (step: number) =>
    update.mutateAsync({ id: task.id!, body: taskBody(task, { status: TASK_STATUSES[at + step] }) }).catch(showApiError)

  return (
    <Card size="sm" className={cn('gap-2', TASK_CARD_ACCENT[task.status ?? 'TODO'], task.status === 'DONE' && 'opacity-70')}>
      <CardContent className="flex flex-col gap-1.5">
        <button type="button" className="text-left font-medium hover:underline" onClick={onOpen}>
          {task.title}
        </button>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {!showMove && <span className={cn('rounded px-1.5 py-0.5 font-medium', taskSwatch(task.status).badge)}>{t(`tasks.status.${task.status}`)}</span>}
          <span className={cn('flex items-center gap-1', task.overdue && 'font-medium text-destructive')}>
            <Clock className="size-3" />
            {task.dueAt ? formatDateTime(task.dueAt) : t('tasks.noDue')}
          </span>
          {task.assignee && <span>{task.assignee.name}</span>}
        </div>
        {(task.deal || task.company) && (
          <div className="flex flex-wrap gap-x-3 text-xs">
            {task.deal && (
              <Link className="text-primary hover:underline" to={`/crm/deals/${task.deal.id}`}>
                {task.deal.name}
              </Link>
            )}
            {task.company && !task.deal && (
              <Link className="text-primary hover:underline" to={`/companies/${task.company.id}?tab=crm`}>
                {task.company.name}
              </Link>
            )}
          </div>
        )}
        {showMove && (
          <div className="flex justify-between">
            <Button variant="ghost" size="icon-xs" disabled={at === 0 || update.isPending} onClick={() => move(-1)} aria-label={t('tasks.moveBack')}>
              <ChevronLeft />
            </Button>
            <Button variant="ghost" size="icon-xs" disabled={at === TASK_STATUSES.length - 1 || update.isPending} onClick={() => move(1)} aria-label={t('tasks.moveNext')}>
              <ChevronRight />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
