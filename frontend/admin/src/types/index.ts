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

export interface Driver {
  driver_id: string;
  name: string;
  phone: string;
  license_number: string;
  verification_status: 'PENDING' | 'APPROVED' | 'REJECTED';
}

export interface RideRequest {
  id: string;
  passenger_id: string;
  driver_id?: string;
  pickup_address: string;
  dropoff_address: string;
  budget: number;
  status: string;
  created_at: string;
}

export interface Wallet {
  id: string;
  user_id: string;
  balance: number;
  currency: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  assignment_id: string;
  amount: number;
  commission_fee: number;
  status: string;
  method: string;
  created_at: string;
}

export interface AuditLog {
  id: number;
  admin_user_id: string;
  action: string;
  ip_address: string;
  details?: Record<string, any>;
  created_at: string;
}

export interface SystemHealth {
  database_connected: boolean;
  redis_connected: boolean;
  socket_connections_count: number;
  api_version: string;
  server_uptime_seconds: number;
  cpu_usage_percent: number;
  memory_usage_mb: number;
}

export interface SystemSetting {
  id: number;
  key: string;
  value: string;
  description?: string;
  updated_at: string;
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

