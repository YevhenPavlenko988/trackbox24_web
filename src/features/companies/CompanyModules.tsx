import { Boxes, Camera, Globe, Send, type LucideIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { useAccess } from '@/features/auth/access'
import { formatEur } from '@/features/billing/format'
import { usePrices } from '@/features/billing/queries'
import { showApiError } from '@/lib/api/problem'
import type { CompanyOption, CompanyResponse } from '@/lib/api/types'
import { cn } from '@/lib/utils'
import { useSetCompanyMoves, useSetCompanyPhotos, useSetCompanyPublicTracking, useSetCompanyTelegramBot } from './queries'

type Mutation = { mutateAsync: (value: boolean) => Promise<unknown>; isPending: boolean }

const ICONS: Record<CompanyOption, { icon: LucideIcon; tint: string }> = {
  PHOTOS: { icon: Camera, tint: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
  PUBLIC_TRACKING: { icon: Globe, tint: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300' },
  TELEGRAM_BOT: { icon: Send, tint: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300' },
  MOVES: { icon: Boxes, tint: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300' },
}

/**
 * The company's paid modules as tiles: what each gives, its monthly price and whether it is on. The TrackBox24 team
 * switches them (billed pro rata); a manager of the company only sees what is connected.
 */
export function CompanyModules({ company }: { company: CompanyResponse }) {
  const { t } = useTranslation(['companies', 'common'])
  const { isPlatform, companyMode } = useAccess()
  const editable = isPlatform && !companyMode
  const prices = usePrices({ enabled: editable }).data ?? []
  const id = company.id!
  const mutations: Record<CompanyOption, Mutation> = {
    PHOTOS: useSetCompanyPhotos(id),
    PUBLIC_TRACKING: useSetCompanyPublicTracking(id),
    TELEGRAM_BOT: useSetCompanyTelegramBot(id),
    MOVES: useSetCompanyMoves(id),
  }
  const on: Record<CompanyOption, boolean> = {
    PHOTOS: company.photosEnabled === true,
    PUBLIC_TRACKING: company.publicTrackingEnabled === true,
    TELEGRAM_BOT: company.telegramBotEnabled === true,
    MOVES: company.movesEnabled === true,
  }
  const toggle = async (option: CompanyOption, value: boolean) => {
    try {
      await mutations[option].mutateAsync(value)
      toast.success(t('common:common.saved'))
    } catch (e) {
      showApiError(e)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('companies:modules.title')}</CardTitle>
        <CardDescription>{editable ? t('companies:modules.subtitle') : t('companies:modules.managerHint')}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {(Object.keys(ICONS) as CompanyOption[]).map((option) => {
          const { icon: Icon, tint } = ICONS[option]
          const price = prices.find((p) => p.code === option)?.amountEur
          // the bot shows what the public page shows: without the page it cannot be switched on
          const blocked = option === 'TELEGRAM_BOT' && !on.PUBLIC_TRACKING
          return (
            <div
              key={option}
              className={cn('flex flex-col gap-3 rounded-xl border p-4 transition-colors', on[option] ? 'border-emerald-300 bg-emerald-50/60 dark:border-emerald-800 dark:bg-emerald-950/30' : 'bg-card')}
            >
              <div className="flex items-start justify-between gap-3">
                <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-lg', tint)}>
                  <Icon className="size-5" />
                </span>
                {editable ? (
                  <Switch
                    checked={on[option]}
                    disabled={mutations[option].isPending || (blocked && !on[option])}
                    onCheckedChange={(c) => toggle(option, c)}
                    aria-label={t(`companies:modules.${option}.name`)}
                  />
                ) : (
                  <Badge
                    variant="outline"
                    className={on[option] ? 'border-emerald-300 bg-emerald-100 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200' : 'text-muted-foreground'}
                  >
                    {t(on[option] ? 'companies:modules.on' : 'companies:modules.off')}
                  </Badge>
                )}
              </div>
              <div className="flex flex-col gap-1">
                <p className="font-semibold">{t(`companies:modules.${option}.name`)}</p>
                <p className="text-sm text-muted-foreground">{t(`companies:modules.${option}.text`)}</p>
              </div>
              <div className="mt-auto flex flex-wrap items-center justify-between gap-2 text-sm">
                {editable && price != null && <span className="font-medium tabular-nums">{t('companies:modules.perMonth', { price: formatEur(price) })}</span>}
                {editable && (
                  <span className={cn('text-xs', on[option] ? 'font-medium text-emerald-700 dark:text-emerald-300' : 'text-muted-foreground')}>
                    {blocked && !on[option] ? t('companies:modules.needsTracking') : t(on[option] ? 'companies:modules.on' : 'companies:modules.off')}
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
