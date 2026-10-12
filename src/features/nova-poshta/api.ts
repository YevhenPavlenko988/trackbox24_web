import { api } from '@/lib/api/client'
import { unwrap } from '@/lib/api/problem'
import type { components } from '@/lib/api/schema'

export type NpCity = components['schemas']['City']
/** A Nova Poshta branch or a parcel locker, told apart by `postomat`. */
export type NpBranch = components['schemas']['Warehouse']
export type NpStreet = components['schemas']['Street']
/** `deliveryType` of a shipment that goes to a branch or to a locker; both are searched in the same directory. */
export type NpBranchType = 'WAREHOUSE' | 'POSTOMAT'

/** Nova Poshta answers with at most 50 matches; the key is the company's one (or the user's own). */
export async function searchNpCities(query: string): Promise<NpCity[]> {
  return (await unwrap(api.GET('/api/nova-poshta/cities', { params: { query: { query } } }))) ?? []
}

export async function searchNpBranches(cityRef: string, query: string, type: NpBranchType): Promise<NpBranch[]> {
  return (await unwrap(api.GET('/api/nova-poshta/warehouses', { params: { query: { cityRef, query: query || undefined, type } } }))) ?? []
}

export async function searchNpStreets(cityRef: string, query: string): Promise<NpStreet[]> {
  return (await unwrap(api.GET('/api/nova-poshta/streets', { params: { query: { cityRef, query } } }))) ?? []
}
