import type { components } from './schema'

type Schemas = components['schemas']

export type UserResponse = Schemas['UserResponse']
export type LoginRequest = Schemas['LoginRequest']

export type ParcelResponse = Schemas['ParcelResponse']
export type ParcelSeatResponse = Schemas['ParcelSeatResponse']
export type ParcelHistoryResponse = Schemas['ParcelHistoryResponse']
export type ParcelCreateRequest = Schemas['ParcelCreateRequest']
export type ParcelUpdateRequest = Schemas['ParcelUpdateRequest']
export type ParcelStatusChangeRequest = Schemas['ParcelStatusChangeRequest']

export type ClientResponse = Schemas['ClientResponse']
export type ClientRequest = Schemas['ClientRequest']

export type Problem = Schemas['Problem']
export type PageMetadata = Schemas['PageMetadata']

export type ParcelStatus = NonNullable<ParcelResponse['status']>
export type Role = NonNullable<UserResponse['role']>
export type ClientType = NonNullable<ClientResponse['type']>
export type ParcelSource = NonNullable<ParcelResponse['source']>
export type HistorySource = NonNullable<ParcelHistoryResponse['source']>
