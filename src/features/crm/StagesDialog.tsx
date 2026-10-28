import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { showApiError } from '@/lib/api/problem'
import type { CrmStageKind, CrmStageResponse } from '@/lib/api/types'
import { ColorDot } from './ColorDot'
import { STAGE_COLORS, stageSwatch } from './colors'
import { useCreateStage, useDeleteStage, useStages, useUpdateStage } from './queries'

const KINDS: CrmStageKind[] = ['OPEN', 'WON', 'LOST']

/** Rename, reorder, add and remove the stages of the sales pipeline. */
export function StagesDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { t } = useTranslation(['crm', 'common'])
  const stages = useStages().data ?? []
  const create = useCreateStage()
  const [name, setName] = useState('')

  const add = async () => {
    try {
      await create.mutateAsync({ name: name.trim() })
      setName('')
    } catch (e) {
      showApiError(e)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{t('crm:stages.settings')}</DialogTitle>
          <DialogDescription>{t('crm:stages.hint')}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          {stages.map((s, i) => (
            <StageRow key={s.id} stage={s} first={i === 0} last={i === stages.length - 1} />
          ))}
        </div>
        <div className="flex gap-2">
          <Input value={name} placeholder={t('crm:stages.name')} onChange={(e) => setName(e.target.value)} aria-label={t('crm:stages.name')} />
          <Button onClick={add} disabled={!name.trim() || create.isPending}>
            <Plus />
            {t('crm:stages.add')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function StageRow({ stage, first, last }: { stage: CrmStageResponse; first: boolean; last: boolean }) {
  const { t } = useTranslation(['crm', 'common'])
  const update = useUpdateStage()
  const remove = useDeleteStage()
  const [name, setName] = useState(stage.name ?? '')

  const save = async (change: { name?: string; kind?: CrmStageKind; position?: number; color?: string }) => {
    try {
      await update.mutateAsync({
        id: stage.id!,
        body: { name: change.name ?? stage.name ?? '', kind: change.kind ?? stage.kind, position: change.position, color: change.color },
      })
      if (change.name) toast.success(t('common:common.saved'))
    } catch (e) {
      showApiError(e)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Select value={stage.color ?? 'slate'} onValueChange={(v) => save({ color: String(v) })}>
        <SelectTrigger className="w-14" aria-label={t('crm:stages.color')}>
          <SelectValue>
            <ColorDot className={stageSwatch(stage.color).dot} />
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {STAGE_COLORS.map((c) => (
            <SelectItem key={c} value={c}>
              <span className="flex items-center gap-2">
                <ColorDot className={stageSwatch(c).dot} />
                {t(`crm:colors.${c}`)}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        className="flex-1"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={() => name.trim() && name.trim() !== stage.name && save({ name: name.trim() })}
        aria-label={t('crm:stages.name')}
      />
      <Select value={stage.kind} onValueChange={(v) => save({ kind: v as CrmStageKind })}>
        <SelectTrigger className="w-32" aria-label={t('crm:stages.kind')}>
          <SelectValue>{t(`crm:stageKind.${stage.kind}`)}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {KINDS.map((k) => (
            <SelectItem key={k} value={k}>
              {t(`crm:stageKind.${k}`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <span className="w-6 text-center text-xs text-muted-foreground">{stage.dealCount}</span>
      <Button variant="ghost" size="icon-sm" disabled={first} onClick={() => save({ position: stage.position! - 1 })} aria-label={t('crm:stages.up')}>
        <ArrowUp />
      </Button>
      <Button variant="ghost" size="icon-sm" disabled={last} onClick={() => save({ position: stage.position! + 1 })} aria-label={t('crm:stages.down')}>
        <ArrowDown />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={t('common:actions.delete')}
        onClick={() => remove.mutateAsync(stage.id!).catch(showApiError)}
      >
        <Trash2 />
      </Button>
    </div>
  )
}
