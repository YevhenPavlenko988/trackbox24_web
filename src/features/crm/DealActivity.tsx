import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { showApiError } from '@/lib/api/problem'
import { formatDateTime } from '@/lib/format'
import { useCommentDeal, useDealActivity } from './queries'

/** The deal's history, newest first, with a comment box on top. */
export function DealActivity({ dealId }: { dealId: number }) {
  const { t } = useTranslation('crm')
  const activity = useDealActivity(dealId).data ?? []
  const comment = useCommentDeal(dealId)
  const [text, setText] = useState('')

  const send = async () => {
    try {
      await comment.mutateAsync(text.trim())
      setText('')
    } catch (e) {
      showApiError(e)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Textarea rows={2} value={text} placeholder={t('activity.comment')} onChange={(e) => setText(e.target.value)} aria-label={t('activity.comment')} />
        <Button size="sm" className="self-end" disabled={!text.trim() || comment.isPending} onClick={send}>
          {t('activity.send')}
        </Button>
      </div>
      <ol className="flex flex-col gap-3">
        {activity.map((a) => (
          <li key={a.id} className="border-l-2 pl-3 text-sm">
            <p className="text-xs text-muted-foreground">
              {formatDateTime(a.at)} · {a.actor ?? t('activity.system')}
            </p>
            <p className="font-medium">
              {t(`activity.${a.type}`)}
              {a.type === 'STAGE_CHANGED' && `: ${a.fromStage} → ${a.toStage}`}
            </p>
            {a.text && <p className="whitespace-pre-wrap">{a.text}</p>}
          </li>
        ))}
      </ol>
    </div>
  )
}
