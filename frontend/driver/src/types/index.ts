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

export interface DriverProfile {
  id: string;
  license_number: string;
  verification_status: 'PENDING' | 'APPROVED' | 'REJECTED';
  online_status: boolean;
  rating: number;
  total_trips: number;
  active_vehicle_id?: string;
  vehicle_details?: {
    id: string;
    make: string;
    model: string;
    year: number;
    color: string;
    plate_number: string;
    category: string;
    status: string;
  };
}

export interface Vehicle {
  id: string;
  driver_id: string;
  make: string;
  model: string;
  year: number;
  license_plate: string;
  category: 'SEDAN' | 'SUV' | 'LUXURY' | 'AUTO';
  is_active: boolean;
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
  created_at: string;
  passenger_name?: string;
  passenger_rating?: number;
  distance_km?: number;
  distance?: number;
}

export interface DriverBid {
  id: string;
  request_id: string;
  driver_id: string;
  bid_amount: number;
  eta_minutes: number;
  status: 'SUBMITTED' | 'ACCEPTED' | 'REJECTED' | 'WITHDRAWN';
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

export interface NotificationItem {
  id: string;
  user_id: string;
  title: string;
  body: string;
  status: 'UNREAD' | 'READ';
  created_at: string;
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

