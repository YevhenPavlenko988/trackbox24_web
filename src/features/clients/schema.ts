import { z } from 'zod'
import type { Channel, ClientRequest, ClientResponse } from '@/lib/api/types'
import { CHANNELS } from '@/features/channels/channel'

/** Backend rule (PhoneNumber.REGEXP): country code first, digits only, 8–15 digits, no leading 0. Checked after [normalizePhone]. */
export const PHONE_REGEX = /^[1-9]\d{7,14}$/

/** "+380 (50) 123-45-67" → "380501234567": what the backend stores and what Nova Poshta matches on. */
export function normalizePhone(raw: string): string {
  return raw.replace(/[\s\-().]/g, '').replace(/^\+/, '').replace(/^00/, '')
}

const optionalText = z.string().trim().optional()

export const clientSchema = z
  .object({
    type: z.enum(['PRIVATE_PERSON', 'ORGANIZATION']),
    lastName: z.string().trim().min(1, 'required'),
    firstName: z.string().trim().min(1, 'required'),
    middleName: optionalText,
    organizationName: optionalText,
    phone: z
      .string()
      .trim()
      .min(1, 'required')
      .refine((v) => PHONE_REGEX.test(normalizePhone(v)), 'phone'),
    email: z.union([z.literal(''), z.email('email')]).optional(),
    city: optionalText,
    address: optionalText,
    notes: optionalText,
    channel: z.union([z.enum(CHANNELS as [Channel, ...Channel[]]), z.literal('')]),
    channelDetails: z.string().trim().max(255),
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
  channel: '',
  channelDetails: '',
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
    channel: c.channel ?? '',
    channelDetails: c.channelDetails ?? '',
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
    phone: normalizePhone(v.phone),
    email: orUndefined(v.email),
    city: orUndefined(v.city),
    address: orUndefined(v.address),
    notes: orUndefined(v.notes),
    channel: v.channel || undefined,
    channelDetails: v.channel ? orUndefined(v.channelDetails) : undefined,
  }
}
