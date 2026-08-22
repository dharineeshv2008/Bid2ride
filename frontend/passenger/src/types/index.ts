export type UserRole = 'PASSENGER' | 'DRIVER' | 'ADMIN' | 'SUPPORT';

export interface User {
  id: string;
  phone: string;
  email?: string;
  name: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
}

export interface AuthTokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: User;
}

export interface SendOtpResponse {
  session_id?: string;
  success?: boolean;
  development_mode?: boolean;
  message?: string;
  token?: string;
  access_token?: string;
  refresh_token?: string;
  token_type?: string;
  user?: User;
}

export interface RideRequest {
  id: string;
  passenger_id: string;
  pickup_address: string;
  pickup_lat: number;
  pickup_lng: number;
  dropoff_address: string;
  dropoff_lat: number;
  dropoff_lng: number;
  vehicle_category: 'SEDAN' | 'SUV' | 'LUXURY' | 'AUTO';
  target_budget: number;
  otp_code: string;
  status: 'PENDING_BIDS' | 'MATCHED' | 'CANCELLED' | 'COMPLETED';
  created_at: string;
}

export interface DriverBid {
  id: string;
  bid_id?: string;
  request_id: string;
  driver_id: string;
  bid_amount: number;
  eta_minutes: number;
  status: 'SUBMITTED' | 'ACCEPTED' | 'REJECTED' | 'WITHDRAWN';
  driver_name?: string;
  driver_rating?: number;
  vehicle_model?: string;
  created_at: string;
}

export interface RideAssignment {
  id: string;
  request_id: string;
  driver_id: string;
  status: 'ACCEPTED' | 'DRIVER_ACCEPTED' | 'DRIVER_ARRIVED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  price_charged: number;
  created_at: string;
}

export interface LiveLocation {
  lat: number;
  lng: number;
  speed?: number;
  heading?: number;
  updated_at: string;
}

export interface Wallet {
  id: string;
  user_id: string;
  balance: number;
  currency: string;
  updated_at: string;
}

export interface WalletTransaction {
  id: string;
  wallet_id: string;
  amount: number;
  type: 'CREDIT' | 'DEBIT';
  transaction_purpose: 'RIDE_EARNING' | 'TOPUP' | 'CASH_OUT' | 'COMMISSION';
  created_at: string;
}

export interface Payment {
  id: string;
  assignment_id: string;
  amount: number;
  commission_fee: number;
  status: 'PENDING' | 'COMPLETED' | 'REFUNDED';
  method: string;
  created_at: string;
}

export interface NotificationItem {
  id: string;
  user_id: string;
  title: string;
  body: string;
  status: 'UNREAD' | 'READ';
  created_at: string;
}

export interface SavedPlace {
  id: string;
  passenger_id: string;
  label: string;
  address: string;
  lat: number;
  lng: number;
}

export interface UserSettings {
  id: string;
  theme: string;
  language: string;
  notification_email: boolean;
  notification_sms: boolean;
  notification_push: boolean;
  map_provider: string;
  default_payment_method: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  preferred_ride_type: string;
  privacy_share_location: boolean;
  last_login?: string;
  driver_vehicle_model?: string;
  driver_vehicle_plate?: string;
  driver_ride_pref_auto_accept?: boolean;
  driver_wallet_payout_bank?: string;
}

export type PlaceType = 'HOME' | 'WORK' | 'AIRPORT' | 'OTHER';

export interface FavoritePlace {
  id: string;
  user_id: string;
  place_type: PlaceType;
  place_name: string;
  full_address: string;
  latitude: number;
  longitude: number;
  landmark?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface FavoritePlaceCreatePayload {
  place_type: PlaceType;
  place_name: string;
  full_address: string;
  latitude: number;
  longitude: number;
  landmark?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  is_default?: boolean;
}

export interface FavoritePlaceUpdatePayload {
  place_type?: PlaceType;
  place_name?: string;
  full_address?: string;
  latitude?: number;
  longitude?: number;
  landmark?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  is_default?: boolean;
}

export type GenderType = 'MALE' | 'FEMALE' | 'OTHER' | 'PREFER_NOT_TO_SAY';

export interface UserProfile {
  id: string;
  name?: string;
  avatar_url?: string;

  bio?: string;
  gender?: GenderType;
  dob?: string;
  secondary_phone?: string;
  secondary_email?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  emergency_contact_relationship?: string;
  default_payment_method: string;
  upi_id?: string;
  preferred_language: string;
  theme: string;
  created_at?: string;
  updated_at?: string;
}

export interface UserProfileUpdatePayload {
  name?: string;
  avatar_url?: string;
  bio?: string;
  gender?: GenderType;
  dob?: string;
  secondary_phone?: string;
  secondary_email?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  emergency_contact_relationship?: string;
  default_payment_method?: string;
  upi_id?: string;
  preferred_language?: string;
  theme?: string;
}

export interface ProfilePhotoPayload {
  photo_base64: string;
}



