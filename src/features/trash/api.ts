import { carDisplayName } from '@/features/cars/api'
import { clientDisplayName } from '@/features/clients/api'
import { userDisplayName } from '@/features/users/api'
import { api } from '@/lib/api/client'
import { normalizePage, type Page, type PageParams } from '@/lib/api/page'
import { unwrap } from '@/lib/api/problem'
import type { CarResponse, ClientResponse, DeletedItem, ParcelResponse, TripResponse, UserResponse, WarehouseResponse } from '@/lib/api/types'

export const TRASH_ENTITIES = ['parcels', 'trips', 'clients', 'cars', 'warehouses', 'users'] as const
export type TrashEntity = (typeof TRASH_ENTITIES)[number]

/** A trash row flattened for the table; `title` is what a human calls the record, `to` where it lives when restored. */
export type TrashRow = { id: number; title: string; subtitle?: string; to?: string; deletedAt?: string; deletedBy?: string }

function rows<T>(page: Page<DeletedItem<T>>, map: (item: T) => Omit<TrashRow, 'deletedAt' | 'deletedBy'>): Page<TrashRow> {
  return { ...page, content: page.content.filter((d) => d.item).map((d) => ({ ...map(d.item!), deletedAt: d.deletedAt, deletedBy: d.deletedBy })) }
}

const query = (params: PageParams) => ({ query: { page: params.page, size: params.size } })

export async function listDeleted(entity: TrashEntity, params: PageParams): Promise<Page<TrashRow>> {
  switch (entity) {
    case 'parcels':
      return rows(normalizePage(await unwrap(api.GET('/api/parcels/deleted', { params: query(params) }))), (p: ParcelResponse) => ({
        id: p.id!,
        title: p.barcode ?? (p.npTtn ? `ТТН ${p.npTtn}` : `#${p.id}`),
        subtitle: [p.senderName, p.clientName].filter(Boolean).join(' → ') || undefined,
        to: `/parcels/${p.id}`,
      }))
    case 'trips':
      return rows(normalizePage(await unwrap(api.GET('/api/trips/deleted', { params: query(params) }))), (t: TripResponse) => ({
        id: t.id!,
        title: `#${t.id}`,
        subtitle: [t.origin, t.destination].filter(Boolean).join(' → ') || undefined,
        to: `/trips/${t.id}`,
      }))
    case 'clients':
      return rows(normalizePage(await unwrap(api.GET('/api/clients/deleted', { params: query(params) }))), (c: ClientResponse) => ({
        id: c.id!,
        title: clientDisplayName(c),
        subtitle: c.phone,
        to: `/clients/${c.id}`,
      }))
    case 'cars':
      return rows(normalizePage(await unwrap(api.GET('/api/cars/deleted', { params: query(params) }))), (c: CarResponse) => ({
        id: c.id!,
        title: carDisplayName(c),
        subtitle: c.defaultDriverName,
      }))
    case 'warehouses':
      return rows(normalizePage(await unwrap(api.GET('/api/warehouses/deleted', { params: query(params) }))), (w: WarehouseResponse) => ({
        id: w.id!,
        title: w.name ?? `#${w.id}`,
        subtitle: w.address,
      }))
    case 'users':
      return rows(normalizePage(await unwrap(api.GET('/api/users/deleted', { params: query(params) }))), (u: UserResponse) => ({
        id: u.id!,
        title: userDisplayName(u),
        subtitle: u.email,
      }))
  }
}

export function restoreDeleted(entity: TrashEntity, id: number): Promise<unknown> {
  const path = { params: { path: { id } } }
  switch (entity) {
    case 'parcels':
      return unwrap(api.POST('/api/parcels/{id}/restore', path))
    case 'trips':
      return unwrap(api.POST('/api/trips/{id}/restore', path))
    case 'clients':
      return unwrap(api.POST('/api/clients/{id}/restore', path))
    case 'cars':
      return unwrap(api.POST('/api/cars/{id}/restore', path))
    case 'warehouses':
      return unwrap(api.POST('/api/warehouses/{id}/restore', path))
    case 'users':
      return unwrap(api.POST('/api/users/{id}/restore', path))
  }
}

export function deleteEntity(entity: Exclude<TrashEntity, 'parcels' | 'trips'>, id: number): Promise<unknown> {
  const path = { params: { path: { id } } }
  switch (entity) {
    case 'clients':
      return unwrap(api.DELETE('/api/clients/{id}', path))
    case 'cars':
      return unwrap(api.DELETE('/api/cars/{id}', path))
    case 'warehouses':
      return unwrap(api.DELETE('/api/warehouses/{id}', path))
    case 'users':
      return unwrap(api.DELETE('/api/users/{id}', path))
  }
}
