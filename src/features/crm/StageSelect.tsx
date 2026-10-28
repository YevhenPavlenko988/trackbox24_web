import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { showApiError } from '@/lib/api/problem'
import type { CrmDealResponse, CrmStageResponse } from '@/lib/api/types'
import { ColorDot } from './ColorDot'
import { stageSwatch } from './colors'
import { ConvertDialog } from './ConvertDialog'
import { LostReasonDialog } from './LostReasonDialog'
import { useChangeDealStage } from './queries'

/**
 * Moves a deal to another stage: a LOST stage asks for the reason, a WON one means creating the client first
 * (the conversion moves the deal there itself).
 */
export function StageSelect({ deal, stages, size }: { deal: CrmDealResponse; stages: CrmStageResponse[]; size?: 'sm' | 'default' }) {
  const { t } = useTranslation(['crm', 'common'])
  const change = useChangeDealStage()
  const [lostStage, setLostStage] = useState<number | null>(null)
  const [converting, setConverting] = useState(false)

  const move = async (stageId: number, lostReason?: string) => {
    try {
      await change.mutateAsync({ id: deal.id!, body: { stageId, lostReason } })
      toast.success(t('common:common.saved'))
      setLostStage(null)
    } catch (e) {
      showApiError(e)
    }
  }

  const pick = (value: string | null) => {
    const stage = stages.find((s) => String(s.id) === value)
    if (!stage || stage.id === deal.stage?.id) return
    if (stage.kind === 'LOST') setLostStage(stage.id!)
    else if (stage.kind === 'WON' && !deal.company) setConverting(true)
    else move(stage.id!)
  }

  return (
    <>
      <Select value={String(deal.stage?.id)} onValueChange={pick}>
        <SelectTrigger size={size} className="w-full" aria-label={t('crm:deals.moveTo')}>
          <SelectValue>
            <span className="flex items-center gap-2">
              <ColorDot className={stageSwatch(deal.stageColor).dot} />
              {deal.stage?.name}
            </span>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {stages.map((s) => (
            <SelectItem key={s.id} value={String(s.id)}>
              <span className="flex items-center gap-2">
                <ColorDot className={stageSwatch(s.color).dot} />
                {s.name}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <LostReasonDialog open={lostStage != null} onOpenChange={(o) => !o && setLostStage(null)} pending={change.isPending} onConfirm={(r) => move(lostStage!, r)} />
      <ConvertDialog open={converting} onOpenChange={setConverting} deal={deal} />
    </>
  )
}
