import { api } from '@/lib/api/client'
import { normalizePage, type Page } from '@/lib/api/page'
import { unwrap } from '@/lib/api/problem'
import type { LoaderRequest, LoaderResponse } from '@/lib/api/types'

/** The whole directory at once: a company calls a few dozen loaders, not thousands. */
export async function listLoaders(): Promise<Page<LoaderResponse>> {
  return normalizePage(await unwrap(api.GET('/api/loaders', { params: { query: { size: 500 } } })))
}

export function createLoader(body: LoaderRequest): Promise<LoaderResponse> {
  return unwrap(api.POST('/api/loaders', { body }))
}

export function updateLoader(id: number, body: LoaderRequest): Promise<LoaderResponse> {
  return unwrap(api.PUT('/api/loaders/{id}', { params: { path: { id } }, body }))
}
