import type { components } from './schema'

type Schemas = components['schemas']

export type UserResponse = Schemas['UserResponse']
export type LoginRequest = Schemas['LoginRequest']
export type TokenResponse = Schemas['TokenResponse']
export type ChangePasswordRequest = Schemas['ChangePasswordRequest']
export type PasswordResetRequest = Schemas['PasswordResetRequest']

export type ParcelResponse = Schemas['ParcelResponse']
export type ParcelSeatResponse = Schemas['ParcelSeatResponse']
export type ParcelHistoryResponse = Schemas['ParcelHistoryResponse']
export type ParcelCreateRequest = Schemas['ParcelCreateRequest']
export type ParcelUpdateRequest = Schemas['ParcelUpdateRequest']
export type ParcelStatusChangeRequest = Schemas['ParcelStatusChangeRequest']
export type ParcelPaymentRequest = Schemas['ParcelPaymentRequest']

/** Trash entry: the record as it was plus who deleted it and when (same shape for every entity). */
export type DeletedItem<T> = { item?: T; deletedAt?: string; deletedBy?: string }

export type ClientResponse = Schemas['ClientResponse']
export type ClientRequest = Schemas['ClientRequest']

export type CompanyRequest = Schemas['CompanyRequest']
export type CompanyResponse = Schemas['CompanyResponse']
export type UserCreateRequest = Schemas['UserCreateRequest']
export type UserUpdateRequest = Schemas['UserUpdateRequest']
export type NovaPoshtaKeyRequest = Schemas['NovaPoshtaKeyRequest']
export type CarRequest = Schemas['CarRequest']
export type CarResponse = Schemas['CarResponse']
export type SyncResult = Schemas['SyncResult']

export type TripRequest = Schemas['TripRequest']
export type TripResponse = Schemas['TripResponse']
export type TripDepartRequest = Schemas['TripDepartRequest']
export type TripCompleteRequest = Schemas['TripCompleteRequest']
export type TripHistoryResponse = Schemas['TripHistoryResponse']
export type TripStatus = NonNullable<TripResponse['status']>
export type TripEvent = NonNullable<TripHistoryResponse['event']>

export type WarehouseRequest = Schemas['WarehouseRequest']
export type WarehouseResponse = Schemas['WarehouseResponse']
export type WarehouseParcelsRequest = Schemas['WarehouseParcelsRequest']

export type Problem = Schemas['Problem']
export type PageMetadata = Schemas['PageMetadata']

export type ParcelStatus = NonNullable<ParcelResponse['status']>
export type Role = NonNullable<UserResponse['roles']>[number]
export type ClientType = NonNullable<ClientResponse['type']>
export type ParcelSource = NonNullable<ParcelResponse['source']>
export type HistorySource = NonNullable<ParcelHistoryResponse['source']>
export type Currency = NonNullable<ParcelResponse['deliveryPriceCurrency']>
export type PaymentStatus = NonNullable<ParcelResponse['paymentStatus']>
