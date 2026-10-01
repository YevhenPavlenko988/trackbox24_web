import i18n from 'i18next'
import type { FieldValues, Path, UseFormReturn } from 'react-hook-form'
import { toast } from 'sonner'

export type FieldErrors = Record<string, string>

export class ApiError extends Error {
  readonly status: number
  readonly title: string
  readonly detail?: string
  readonly errors?: FieldErrors

  constructor(status: number, title: string, detail?: string, errors?: FieldErrors) {
    super(detail ?? title)
    this.name = 'ApiError'
    this.status = status
    this.title = title
    this.detail = detail
    this.errors = errors
  }
}

const KNOWN_STATUSES = [400, 401, 403, 404, 409, 502] as const

export function statusTitle(status: number): string {
  const key = (KNOWN_STATUSES as readonly number[]).includes(status) ? String(status) : 'default'
  return i18n.t(`errors.${key}`, { ns: 'common' })
}

type ProblemLike = { title?: string; detail?: string; errors?: FieldErrors }

/** Spring Security answers 401/403 with an empty body, so `error` may be undefined or a string. */
export function toApiError(error: unknown, response: Response): ApiError {
  const p: ProblemLike = error && typeof error === 'object' ? (error as ProblemLike) : {}
  return new ApiError(response.status, statusTitle(response.status), p.detail, p.errors)
}

type FetchResult<T> = { data?: T; error?: unknown; response: Response }

export async function unwrap<T>(promise: Promise<FetchResult<T>>): Promise<T> {
  const { data, error, response } = await promise
  if (!response.ok) throw toApiError(error, response)
  return data as T
}

export function isApiError(e: unknown): e is ApiError {
  return e instanceof ApiError
}

export function showApiError(e: unknown) {
  if (isApiError(e)) {
    toast.error(e.title, { description: e.detail })
  } else {
    toast.error(statusTitle(0), { description: e instanceof Error ? e.message : undefined })
  }
}

/** Puts backend field errors onto the form; everything else goes to a toast. */
export function useMutationError<T extends FieldValues>(form?: UseFormReturn<T>) {
  return (e: unknown) => {
    if (isApiError(e) && e.errors && form) {
      const known = form.getValues()
      let handled = false
      for (const [field, message] of Object.entries(e.errors)) {
        if (field in known) {
          form.setError(field as Path<T>, { type: 'server', message })
          handled = true
        }
      }
      if (handled) return
    }
    showApiError(e)
  }
}
