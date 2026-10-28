import { zodResolver } from '@hookform/resolvers/zod'
import { Trash2 } from 'lucide-react'
import { Controller, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { z } from 'zod'
import { FieldErrorText } from '@/components/common/FieldErrorText'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { showApiError, useMutationError } from '@/lib/api/problem'
import type { CrmTaskResponse } from '@/lib/api/types'
import { fromDateTimeLocal, toDateTimeLocal } from '@/lib/format'
import { ColorDot } from './ColorDot'
import { taskSwatch } from './colors'
import { TASK_STATUSES } from './constants'
import { useCreateTask, useDeleteTask, useUpdateTask } from './queries'
import { TeamSelect } from './TeamSelect'

const schema = z.object({
  title: z.string().trim().min(1, 'required'),
  description: z.string().trim(),
  status: z.enum(TASK_STATUSES),
  assigneeId: z.number().optional(),
  dueAt: z.string(),
})

type FormValues = z.infer<typeof schema>

/** New task (optionally about a deal or a client) or the edit of an existing one. */
export function TaskDialog({
  open,
  onOpenChange,
  task,
  dealId,
  companyId,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  task?: CrmTaskResponse | null
  dealId?: number
  companyId?: number
}) {
  const { t } = useTranslation('crm')
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{task ? t('tasks.editTitle') : t('tasks.new')}</DialogTitle>
        </DialogHeader>
        {open && <TaskForm task={task ?? undefined} dealId={dealId} companyId={companyId} onClose={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  )
}

function TaskForm({ task, dealId, companyId, onClose }: { task?: CrmTaskResponse; dealId?: number; companyId?: number; onClose: () => void }) {
  const { t } = useTranslation(['crm', 'common'])
  const create = useCreateTask()
  const update = useUpdateTask()
  const remove = useDeleteTask()
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: task?.title ?? '',
      description: task?.description ?? '',
      status: task?.status ?? 'TODO',
      assigneeId: task?.assignee?.id,
      dueAt: toDateTimeLocal(task?.dueAt),
    },
  })
  const { errors, isSubmitting } = form.formState
  const onError = useMutationError(form)

  const submit = form.handleSubmit(async (v) => {
    const body = {
      title: v.title,
      description: v.description || undefined,
      status: v.status,
      assigneeId: v.assigneeId,
      dueAt: v.dueAt ? fromDateTimeLocal(v.dueAt) : undefined,
      dealId: task ? task.deal?.id : dealId,
      companyId: task ? task.company?.id : companyId,
    }
    try {
      await (task ? update.mutateAsync({ id: task.id!, body }) : create.mutateAsync(body))
      toast.success(t('common:common.saved'))
      onClose()
    } catch (e) {
      onError(e)
    }
  })

  const del = async () => {
    if (!task || !window.confirm(t('crm:tasks.deleteConfirm'))) return
    try {
      await remove.mutateAsync(task.id!)
      onClose()
    } catch (e) {
      showApiError(e)
    }
  }

  return (
    <form onSubmit={submit} noValidate>
      <FieldGroup>
        <Field data-invalid={!!errors.title}>
          <FieldLabel htmlFor="task-title">{t('crm:tasks.fields.title')}</FieldLabel>
          <Input id="task-title" aria-invalid={!!errors.title} {...form.register('title')} />
          <FieldErrorText error={errors.title} />
        </Field>
        <Field>
          <FieldLabel htmlFor="task-description">{t('crm:tasks.fields.description')}</FieldLabel>
          <Textarea id="task-description" rows={3} {...form.register('description')} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Controller
            control={form.control}
            name="assigneeId"
            render={({ field }) => (
              <Field>
                <FieldLabel htmlFor="task-assignee">{t('crm:tasks.fields.assignee')}</FieldLabel>
                <TeamSelect id="task-assignee" className="w-full" value={field.value} onChange={field.onChange} noneLabel={t('common:common.selectPlaceholder')} />
              </Field>
            )}
          />
          <Field>
            <FieldLabel htmlFor="task-due">{t('crm:tasks.fields.dueAt')}</FieldLabel>
            <Input id="task-due" type="datetime-local" {...form.register('dueAt')} />
          </Field>
        </div>
        <Controller
          control={form.control}
          name="status"
          render={({ field }) => (
            <Field>
              <FieldLabel htmlFor="task-status">{t('crm:tasks.fields.status')}</FieldLabel>
              <Select value={field.value} onValueChange={(v) => field.onChange(v)}>
                <SelectTrigger id="task-status" className="w-48">
                  <SelectValue>
                    <span className="flex items-center gap-2">
                      <ColorDot className={taskSwatch(field.value).dot} />
                      {t(`crm:tasks.status.${field.value}`)}
                    </span>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {TASK_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      <span className="flex items-center gap-2">
                        <ColorDot className={taskSwatch(s).dot} />
                        {t(`crm:tasks.status.${s}`)}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}
        />
        <div className="flex justify-between gap-2">
          <div>
            {task && (
              <Button type="button" variant="ghost" onClick={del}>
                <Trash2 />
                {t('common:actions.delete')}
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              {t('common:actions.cancel')}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {task ? t('common:actions.save') : t('common:actions.create')}
            </Button>
          </div>
        </div>
      </FieldGroup>
    </form>
  )
}
