import { useCallback } from 'react'
import { useSearchParams } from 'react-router'
import { DEFAULT_PAGE_SIZE } from '@/lib/api/page'

type Patch = Record<string, string | number | boolean | undefined | null>

/** List filters, paging and sorting kept in the URL so links and reloads keep the state. */
export function useListParams(defaults: { size?: number; sort?: string } = {}) {
  const [searchParams, setSearchParams] = useSearchParams()

  const page = Number(searchParams.get('page') ?? 0)
  const size = Number(searchParams.get('size') ?? defaults.size ?? DEFAULT_PAGE_SIZE)
  const sort = searchParams.get('sort') ?? defaults.sort

  const get = useCallback((key: string) => searchParams.get(key) ?? undefined, [searchParams])

  const set = useCallback(
    (patch: Patch, { resetPage = true }: { resetPage?: boolean } = {}) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          for (const [key, value] of Object.entries(patch)) {
            if (value === undefined || value === null || value === '') next.delete(key)
            else next.set(key, String(value))
          }
          if (resetPage) next.delete('page')
          return next
        },
        { replace: true },
      )
    },
    [setSearchParams],
  )

  const setPage = useCallback((p: number) => set({ page: p || undefined }, { resetPage: false }), [set])
  const setSize = useCallback((s: number) => set({ size: s === DEFAULT_PAGE_SIZE ? undefined : s }), [set])

  return { page, size, sort, get, set, setPage, setSize }
}
