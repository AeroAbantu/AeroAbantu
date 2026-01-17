
export enum ContactCategory {
  FAMILY = 'Family',
  FRIENDS = 'Friends',
  MEDICAL = 'Medical',
  AUTHORITIES = 'Authorities'
}

export interface Contact {
  id: string;
  name: string;
  phone: string;
  email: string;
  category: ContactCategory;
  enabled: boolean;
  priority: number;
}

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
  batteryLevel?: number;
  networkType?: string;
  speed?: number | null;
}

export interface EmergencySession {
  id: string;
  startTime: number;
  lastLocation: LocationData | null;
  isActive: boolean;
  reason?: string;
}

export interface WearableDevice {
  id: string;
  name: string;
  type: 'WATCH' | 'BAND' | 'EARPIECE';
  status: 'CONNECTED' | 'DISCONNECTED' | 'PAIRING';
  battery: number;
  lastSync: number;
}

export interface User {
  username: string;
  tacticalId: string;
  email?: string;
  phone?: string;
  fullName?: string;
  bloodType?: string;
  emergencyNote?: string;
  isVerified?: boolean;
  mfaCode?: string;
  recoveryCode?: string;
}

export type AppState = 'AUTH' | 'IDLE' | 'EMERGENCY' | 'VOICE_GUARD' | 'SETTINGS' | 'CONTACTS' | 'SAFETY_ADVICE' | 'LIVE_TRACKING' | 'SAFE_ZONES' | 'WEARABLE_SYNC';
