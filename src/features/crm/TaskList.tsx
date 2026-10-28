import { Plus } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import type { CrmTaskResponse } from '@/lib/api/types'
import { useTasks } from './queries'
import { TaskCard } from './TaskCard'
import { TaskDialog } from './TaskDialog'

/** Tasks of one deal or one client, with an «add» button. */
export function TaskList({ dealId, companyId }: { dealId?: number; companyId?: number }) {
  const { t } = useTranslation('crm')
  const tasks = useTasks({ dealId, companyId }).data ?? []
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<CrmTaskResponse | null>(null)
  return (
    <div className="flex flex-col gap-2">
      {tasks.length === 0 && <p className="text-sm text-muted-foreground">{t('tasks.empty')}</p>}
      {tasks.map((task) => (
        <TaskCard key={task.id} task={task} onOpen={() => setEditing(task)} showMove={false} />
      ))}
      <Button variant="outline" size="sm" className="self-start" onClick={() => setCreating(true)}>
        <Plus />
        {t('tasks.new')}
      </Button>
      <TaskDialog open={creating} onOpenChange={setCreating} dealId={dealId} companyId={companyId} />
      <TaskDialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)} task={editing} />
    </div>
  )
}
