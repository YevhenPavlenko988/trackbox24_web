import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api/client'
import { unwrap } from '@/lib/api/problem'
import type { Currency } from '@/lib/api/types'

const ratesKey = ['currency', 'rates'] as const

/** The company's rates of USD, EUR and PLN (bank and own); only with the «Курси валют» module. */
export function useRates(enabled = true) {
  return useQuery({ queryKey: ratesKey, queryFn: () => unwrap(api.GET('/api/currency/rates')), enabled, staleTime: 5 * 60_000 })
}

function useRateMutation<A>(fn: (arg: A) => Promise<unknown>) {
  const queryClient = useQueryClient()
  return useMutation({ mutationFn: fn, onSuccess: () => queryClient.invalidateQueries({ queryKey: ratesKey }) })
}

export const useSetRate = () =>
  useRateMutation(({ currency, rate }: { currency: Currency; rate: number }) =>
    unwrap(api.PUT('/api/currency/rates/{currency}', { params: { path: { currency } }, body: { rate } })),
  )

export const useResetRate = () => useRateMutation((currency: Currency) => unwrap(api.DELETE('/api/currency/rates/{currency}', { params: { path: { currency } } })))

/** Units of {@code to} per unit of {@code from} at the company's rates now (UAH is 1); undefined until the rates are known. */
export function convertRate(rates: { currency?: Currency; rate?: number }[] | undefined, from: Currency, to: Currency): number | undefined {
  if (from === to) return 1
  const uah = (c: Currency) => (c === 'UAH' ? 1 : rates?.find((r) => r.currency === c)?.rate)
  const a = uah(from)
  const b = uah(to)
  return a != null && b != null && b > 0 ? a / b : undefined
}
