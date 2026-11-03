import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api/client'
import { unwrap } from '@/lib/api/problem'
import type { ReferralSettings } from '@/lib/api/types'
import { parcelKeys } from '@/features/parcels/queries'

const settingsKey = ['referral', 'settings'] as const

/** The company's referral program rules; «Реферальна програма» only, a manager. */
export function useReferralSettings(enabled = true) {
  return useQuery({ queryKey: settingsKey, queryFn: () => unwrap(api.GET('/api/referral/settings')), enabled })
}

export function useSaveReferralSettings() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: ReferralSettings) => unwrap(api.PUT('/api/referral/settings', { body })),
    onSuccess: (data) => queryClient.setQueryData(settingsKey, data),
  })
}

/** What the parcel's client may spend on it now. */
export function useRedeemInfo(parcelId: number, enabled = true) {
  return useQuery({
    queryKey: ['referral', 'redeem', parcelId] as const,
    queryFn: () => unwrap(api.GET('/api/referral/parcels/{id}/redeem', { params: { path: { id: parcelId } } })),
    enabled,
  })
}

export function useSetDiscountOff(parcelId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (off: boolean) => unwrap(api.PUT('/api/referral/parcels/{id}/discount', { params: { path: { id: parcelId }, query: { off } } })),
    onSuccess: (data) => {
      queryClient.setQueryData(parcelKeys.detail(parcelId), data)
      void queryClient.invalidateQueries({ queryKey: parcelKeys.all })
    },
  })
}

export function useClientPoints(clientId: number, page = 0, enabled = true) {
  return useQuery({
    queryKey: ['referral', 'points', clientId, page] as const,
    queryFn: () => unwrap(api.GET('/api/referral/clients/{id}/points', { params: { path: { id: clientId }, query: { page, size: 20 } as never } })),
    placeholderData: keepPreviousData,
    enabled,
  })
}
