import type { LoaderResponse } from '@/lib/api/types'

/** The cities of the directory, once each, alphabetically (as typed first). */
export function loaderCities(loaders: LoaderResponse[]): string[] {
  const seen = new Map<string, string>()
  for (const l of loaders) {
    const c = l.city?.trim()
    if (c && !seen.has(c.toLowerCase())) seen.set(c.toLowerCase(), c)
  }
  return [...seen.values()].sort((a, b) => a.localeCompare(b, 'uk'))
}

export const sameCity = (l: LoaderResponse, city: string) => !city || (l.city ?? '').trim().toLowerCase() === city.toLowerCase()
