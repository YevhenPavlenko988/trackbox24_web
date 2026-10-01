import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { Page } from '@/lib/api/page'

const SIZES = [10, 20, 50]

export function Pagination({
  page,
  onPageChange,
  onSizeChange,
}: {
  page: Page<unknown>
  onPageChange: (page: number) => void
  onSizeChange?: (size: number) => void
}) {
  const { t } = useTranslation()
  if (page.totalElements === 0) return null

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
      <span>{t('common.totalItems', { count: page.totalElements })}</span>
      <div className="flex items-center gap-3">
        {onSizeChange && (
          <Select value={String(page.size)} onValueChange={(v) => v && onSizeChange(Number(v))}>
            <SelectTrigger size="sm" aria-label={t('common.perPage')}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SIZES.map((s) => (
                <SelectItem key={s} value={String(s)}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <span>{t('common.pageOf', { page: page.number + 1, total: Math.max(page.totalPages, 1) })}</span>
        <div className="flex gap-1">
          <Button
            variant="outline"
            size="icon-sm"
            disabled={page.number <= 0}
            onClick={() => onPageChange(page.number - 1)}
            aria-label="prev"
          >
            <ChevronLeft />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            disabled={page.number + 1 >= page.totalPages}
            onClick={() => onPageChange(page.number + 1)}
            aria-label="next"
          >
            <ChevronRight />
          </Button>
        </div>
      </div>
    </div>
  )
}
