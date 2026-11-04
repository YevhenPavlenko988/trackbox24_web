import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api/client'
import { unwrap } from '@/lib/api/problem'
import type { PaymentSettingsRequest } from '@/lib/api/types'
import { parcelKeys } from '@/features/parcels/queries'

const settingsKey = ['payments', 'settings'] as const

/** The company's online payment settings; «Онлайн-оплата» only, a manager. Secrets come back only as «saved». */
export function usePaymentSettings(enabled = true) {
  return useQuery({ queryKey: settingsKey, queryFn: () => unwrap(api.GET('/api/payments/settings')), enabled })
}

export function useSavePaymentSettings() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: PaymentSettingsRequest) => unwrap(api.PUT('/api/payments/settings', { body })),
    onSuccess: (data) => queryClient.setQueryData(settingsKey, data),
  })
}

/** Asks the provider with the saved keys. */
export function useCheckPaymentSettings() {
  return useMutation({ mutationFn: () => unwrap<{ message?: string }>(api.POST('/api/payments/settings/check')) })
}

const claimedKey = ['payments', 'claimed-count'] as const

/** How many parcels and moves wait for the manager to find the client's transfer; for the menu, checked every minute. */
export function useClaimedCount(enabled: boolean) {
  return useQuery({
    queryKey: claimedKey,
    queryFn: () => unwrap<{ parcels?: number; moves?: number }>(api.GET('/api/online-payments/claimed-count')),
    enabled,
    refetchInterval: 60_000,
  })
}

const onlineKey = (parcelId: number) => ['payments', 'online', parcelId] as const

/** The client's tries to pay a parcel or a move online, newest first. */
export function useOnlinePayments(parcelId: number, enabled = true) {
  return useQuery({
    queryKey: onlineKey(parcelId),
    queryFn: () => unwrap(api.GET('/api/parcels/{id}/online-payments', { params: { path: { id: parcelId } } })),
    enabled,
  })
}

/** The manager's answer to «Я оплатив»: the transfer came (confirm) or not (reject). */
export function useDecideOnlinePayment(parcelId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, confirm }: { id: number; confirm: boolean }) =>
      confirm
        ? unwrap(api.POST('/api/online-payments/{id}/confirm', { params: { path: { id } } }))
        : unwrap(api.POST('/api/online-payments/{id}/reject', { params: { path: { id } } })),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: onlineKey(parcelId) })
      void queryClient.invalidateQueries({ queryKey: claimedKey })
      void queryClient.invalidateQueries({ queryKey: parcelKeys.all })
      void queryClient.invalidateQueries({ queryKey: ['moves'] })
      void queryClient.invalidateQueries({ queryKey: ['move-bill'] })
    },
  })
}
