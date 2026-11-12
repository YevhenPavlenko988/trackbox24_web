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
export type ParcelPhotoResponse = Schemas['ParcelPhotoResponse']
export type PublicTrackingResponse = Schemas['PublicTrackingResponse']
export type PublicTrackingStep = Schemas['Step']
export type NpState = NonNullable<ParcelResponse['npState']>
export type NpShipmentRequest = Schemas['NpShipmentRequest']
export type NpShipmentResponse = Schemas['NpShipmentResponse']
export type NpDeliveryType = NonNullable<NpShipmentRequest['deliveryType']>
export type NpCargoType = NonNullable<NpShipmentRequest['cargoType']>
export type NpPayerType = NonNullable<NpShipmentRequest['payerType']>
export type NpPaymentMethod = NonNullable<NpShipmentRequest['paymentMethod']>

/** Trash entry: the record as it was plus who deleted it and when (same shape for every entity). */
export type DeletedItem<T> = { item?: T; deletedAt?: string; deletedBy?: string }

export type ClientResponse = Schemas['ClientResponse']
export type ClientMoney = Schemas['ClientMoney']
export type ClientRequest = Schemas['ClientRequest']

export type CompanyRequest = Schemas['CompanyRequest']
export type CompanyResponse = Schemas['CompanyResponse']
export type UserCreateRequest = Schemas['UserCreateRequest']
export type UserUpdateRequest = Schemas['UserUpdateRequest']
export type NovaPoshtaKeyRequest = Schemas['NovaPoshtaKeyRequest']
export type NpSenderRequest = Schemas['NpSenderRequest']
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
export type ParcelKind = NonNullable<ParcelResponse['kind']>
export type SeatCheckStage = NonNullable<Schemas['SeatCheckResponse']['stage']>
export type SeatCheckResponse = Schemas['SeatCheckResponse']
export type SeatsMoveRequest = Schemas['SeatsMoveRequest']
export type RouteRequest = Schemas['RouteRequest']
export type LoaderRequest = Schemas['LoaderRequest']
export type LoaderResponse = Schemas['LoaderResponse']
export type MoveBillResponse = Schemas['MoveBillResponse']
export type CurrencyRateResponse = Schemas['CurrencyRateResponse']
export type BankRateChangeResponse = Schemas['BankRateChangeResponse']
export type CompanyRateChangeResponse = Schemas['CompanyRateChangeResponse']
export type ReferralSettings = Schemas['ReferralSettingsDto']
export type RedeemInfoResponse = Schemas['RedeemInfoResponse']
export type PointsEntryResponse = Schemas['PointsEntryResponse']
export type PointsBalanceResponse = Schemas['PointsBalanceResponse']
export type PublicPointsResponse = Schemas['PublicPointsResponse']
export type CompanyRateRequest = Schemas['CompanyRateRequest']
export type MoveBillWork = Schemas['Work']
export type MoveBillWorkLoader = Schemas['WorkLoader']
export type MoveBillStorage = Schemas['Storage']
export type MoveBillPayment = Schemas['Payment']
export type MoveWorkRequest = Schemas['MoveWorkRequest']
export type MoveWorkKind = NonNullable<Schemas['MoveWorkRequest']['kind']>
export type MovePaymentRequest = Schemas['MovePaymentRequest']
export type MoveStorageRequest = Schemas['MoveStorageRequest']
export type MoveWorkFactRequest = Schemas['MoveWorkFactRequest']
export type RouteResponse = Schemas['RouteResponse']
export type RouteStatus = NonNullable<Schemas['RouteResponse']['status']>
export type HistorySource = NonNullable<ParcelHistoryResponse['source']>
export type Currency = NonNullable<ParcelResponse['deliveryPriceCurrency']>
export type PaymentStatus = NonNullable<ParcelResponse['paymentStatus']>
export type PaymentMethod = NonNullable<ParcelResponse['paymentMethod']>
export type TripPayments = NonNullable<TripResponse['payments']>
export type TripPaymentLine = NonNullable<TripPayments['received']>[number]

export type Channel = NonNullable<ClientRequest['channel']>

export type CrmRef = Schemas['CrmRef']
export type CrmStageRequest = Schemas['CrmStageRequest']
export type CrmStageResponse = Schemas['CrmStageResponse']
export type CrmStageKind = NonNullable<CrmStageResponse['kind']>
export type CrmContactRequest = Schemas['CrmContactRequest']
export type CrmContactResponse = Schemas['CrmContactResponse']
export type CrmDealRequest = Schemas['CrmDealRequest']
export type CrmDealResponse = Schemas['CrmDealResponse']
export type CompanyOption = NonNullable<CrmDealResponse['interestedOptions']>[number]
export type CrmStageChangeRequest = Schemas['CrmStageChangeRequest']
export type CrmDealActivityResponse = Schemas['CrmDealActivityResponse']
export type CrmConvertRequest = Schemas['CrmConvertRequest']
export type CrmTaskRequest = Schemas['CrmTaskRequest']
export type CrmTaskResponse = Schemas['CrmTaskResponse']
export type CrmTaskStatus = NonNullable<CrmTaskResponse['status']>

export type BillingPriceResponse = Schemas['BillingPriceResponse']
export type BillingItem = NonNullable<BillingPriceResponse['code']>
export type CompanyBillingResponse = Schemas['CompanyBillingResponse']
export type InvoiceResponse = Schemas['InvoiceResponse']
export type InvoiceLineResponse = Schemas['InvoiceLineResponse']
export type InvoiceStatus = NonNullable<InvoiceResponse['status']>
export type InvoicePaymentRequest = Schemas['InvoicePaymentRequest']
export type InvoiceSummaryResponse = Schemas['InvoiceSummaryResponse']
export type CrmStageRole = NonNullable<CrmStageResponse['role']>

// «Онлайн-оплата»
export type PaymentSettingsRequest = Schemas['PaymentSettingsRequest']
export type PaymentSettingsResponse = Schemas['PaymentSettingsResponse']
export type PaymentProvider = NonNullable<PaymentSettingsRequest['provider']>
export type OnlinePaymentResponse = Schemas['OnlinePaymentResponse']
export type PublicPaymentResponse = Schemas['PublicPaymentResponse']
export type PublicCheckoutResponse = Schemas['PublicCheckoutResponse']
export type PublicPaymentStatusResponse = Schemas['PublicPaymentStatusResponse']

// «Звіти»
export type CashReportResponse = Schemas['CashReportResponse']
export type CashSum = Schemas['CashSum']
export type PersonCash = Schemas['PersonCash']
export type CashOnHand = Schemas['CashOnHand']
export type CashEntry = Schemas['CashEntry']
export type CashHandoverRequest = Schemas['CashHandoverRequest']
export type CashHandoverResponse = Schemas['CashHandoverResponse']
export type DebtsResponse = Schemas['DebtsResponse']
export type DebtRow = Schemas['DebtRow']
export type DebtBucket = Schemas['DebtBucket']
