import type { PaymentMethod } from '@/lib/api/types'

/** Offered in this order wherever a payment is taken or summed up. */
export const PAYMENT_METHODS = ['CASH', 'UA_CARD', 'FOREIGN_CARD'] as const satisfies readonly PaymentMethod[]
