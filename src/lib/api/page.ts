import type { PageMetadata } from './types'

export type PageParams = {
  page?: number
  size?: number
  sort?: string
}

export type Page<T> = {
  content: T[]
  size: number
  number: number
  totalElements: number
  totalPages: number
}

export const DEFAULT_PAGE_SIZE = 20

type PagedModel<T> = { content?: T[]; page?: PageMetadata }

export function normalizePage<T>(model: PagedModel<T> | undefined): Page<T> {
  return {
    content: model?.content ?? [],
    size: model?.page?.size ?? DEFAULT_PAGE_SIZE,
    number: model?.page?.number ?? 0,
    totalElements: model?.page?.totalElements ?? 0,
    totalPages: model?.page?.totalPages ?? 0,
  }
}

export const emptyPage = <T,>(): Page<T> => normalizePage<T>(undefined)
