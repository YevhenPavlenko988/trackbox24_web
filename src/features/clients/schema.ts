import { z } from 'zod'
import type { ClientRequest, ClientResponse } from '@/lib/api/types'

export const PHONE_REGEX = /^380\d{9}$/

const optionalText = z.string().trim().optional()

export const clientSchema = z
  .object({
    type: z.enum(['PRIVATE_PERSON', 'ORGANIZATION']),
    lastName: z.string().trim().min(1, 'required'),
    firstName: z.string().trim().min(1, 'required'),
    middleName: optionalText,
    organizationName: optionalText,
    phone: z.string().trim().regex(PHONE_REGEX, 'phone'),
    email: z.union([z.literal(''), z.email('email')]).optional(),
    city: optionalText,
    address: optionalText,
    notes: optionalText,
  })
  .superRefine((v, ctx) => {
    if (v.type === 'ORGANIZATION' && !v.organizationName) {
      ctx.addIssue({ code: 'custom', path: ['organizationName'], message: 'required' })
    }
  })

export type ClientFormValues = z.infer<typeof clientSchema>

export const emptyClientValues: ClientFormValues = {
  type: 'PRIVATE_PERSON',
  lastName: '',
  firstName: '',
  middleName: '',
  organizationName: '',
  phone: '',
  email: '',
  city: '',
  address: '',
  notes: '',
}

export function clientToFormValues(c: ClientResponse): ClientFormValues {
  return {
    type: c.type ?? 'PRIVATE_PERSON',
    lastName: c.lastName ?? '',
    firstName: c.firstName ?? '',
    middleName: c.middleName ?? '',
    organizationName: c.organizationName ?? '',
    phone: c.phone ?? '',
    email: c.email ?? '',
    city: c.city ?? '',
    address: c.address ?? '',
    notes: c.notes ?? '',
  }
}

const orUndefined = (s?: string) => (s && s.length > 0 ? s : undefined)

export function formValuesToRequest(v: ClientFormValues): ClientRequest {
  return {
    type: v.type,
    lastName: v.lastName,
    firstName: v.firstName,
    middleName: orUndefined(v.middleName),
    organizationName: v.type === 'ORGANIZATION' ? orUndefined(v.organizationName) : undefined,
    phone: v.phone,
    email: orUndefined(v.email),
    city: orUndefined(v.city),
    address: orUndefined(v.address),
    notes: orUndefined(v.notes),
  }
}
