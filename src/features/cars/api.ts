import { api } from '@/lib/api/client'
import { normalizePage, type Page, type PageParams } from '@/lib/api/page'
import { unwrap } from '@/lib/api/problem'
import type { CarRequest, CarResponse } from '@/lib/api/types'

export async function listCars(params: PageParams): Promise<Page<CarResponse>> {
  const data = await unwrap(
    api.GET('/api/cars', {
      params: { query: { page: params.page, size: params.size, sort: [params.sort ?? 'plateNumber,asc'] } },
    }),
  )
  return normalizePage(data)
}

export function createCar(body: CarRequest): Promise<CarResponse> {
  return unwrap(api.POST('/api/cars', { body }))
}

export function updateCar(id: number, body: CarRequest): Promise<CarResponse> {
  return unwrap(api.PUT('/api/cars/{id}', { params: { path: { id } }, body }))
}

export function carDisplayName(c: CarResponse | undefined): string {
  if (!c) return '—'
  const model = [c.brand, c.model].filter(Boolean).join(' ')
  return model ? `${c.plateNumber} · ${model}` : (c.plateNumber ?? '—')
}
