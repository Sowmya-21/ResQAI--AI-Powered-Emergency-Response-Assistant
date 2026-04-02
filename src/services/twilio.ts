/**
 * Twilio Service (Browser-Compatible Fetch Version)
 * 
 * NOTE: Calling Twilio directly from the browser exposes your AUTH_TOKEN.
 * For a production app, these calls should be moved to a backend (e.g. Firebase Functions).
 */

export interface EmergencyResponse {
  emergencyType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  emergencyKey: string;
  triggerAlert: boolean;
  speechText: string;
  language?: string;
  injuryArea?: { x: number; y: number; width: number; height: number; label: string };
  confidence?: number;
  firstAidSteps?: string[];
  dos?: string[];
  donts?: string[];
  nearbyServicesNeeded?: string[];
  source?: string;
}

export interface NearbyPlace {
  name: string;
  type: string;
  distance?: string;
  status?: string;
  uri?: string;
  lat?: number;
  lng?: number;
  phone?: string;
  x?: number;
  y?: number;
  distance_meters?: number;
  address?: string;
}

const ACCOUNT_SID = (import.meta as any).env.VITE_TWILIO_ACCOUNT_SID || "";
const AUTH_TOKEN = (import.meta as any).env.VITE_TWILIO_AUTH_TOKEN || "";
const FROM_NUMBER = (import.meta as any).env.VITE_TWILIO_FROM_NUMBER || "";

/**
 * Normalizes a phone number to E.164 format.
 * If it's 10 digits and starts with 7, 8, or 9, it prepends +91 (India).
 * Otherwise, ensures it starts with +.
 */
export function normalizePhoneNumber(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10 && /^[6789]/.test(digits)) {
    return `+91${digits}`;
  }
  return phone.startsWith('+') ? phone : `+${phone}`;
}

/**
 * Sends an SMS message using Twilio REST API
 */
export async function sendSms(to: string, body: string): Promise<void> {
  if (!ACCOUNT_SID || !AUTH_TOKEN || !FROM_NUMBER) {
    throw new Error('Twilio credentials missing in environment variables');
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${ACCOUNT_SID}/Messages.json`;
  const auth = btoa(`${ACCOUNT_SID}:${AUTH_TOKEN}`);

  const normalizedTo = normalizePhoneNumber(to);
  const params = new URLSearchParams();
  params.append('To', normalizedTo);
  params.append('From', FROM_NUMBER);
  params.append('Body', body);
  params.append('SmartEncoded', 'true');

  console.log(`[Twilio] Attempting SMS to ${normalizedTo} (from ${FROM_NUMBER})`);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Twilio Error: ${errorData.message}`);
    }

    console.log(`[Twilio] SMS sent to ${normalizedTo}`);
    } catch (error: any) {
      console.error('[Twilio] SMS send failed:', error);
      // NOTE: Browsers block direct Twilio API calls due to CORS.
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        throw new Error('CORS_ERROR: Browser blocked direct Twilio call. Use a backend or native SMS fallback.');
      }
      throw error;
    }
}

/**
 * Initiates a phone call using Twilio REST API
 */
export async function makeCall(to: string, twiml: string): Promise<void> {
  if (!ACCOUNT_SID || !AUTH_TOKEN || !FROM_NUMBER) {
    throw new Error('Twilio credentials missing in environment variables');
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${ACCOUNT_SID}/Calls.json`;
  const auth = btoa(`${ACCOUNT_SID}:${AUTH_TOKEN}`);

  const normalizedTo = normalizePhoneNumber(to);
  const params = new URLSearchParams();
  params.append('To', normalizedTo);
  params.append('From', FROM_NUMBER);
  params.append('Twiml', twiml);

  console.log(`[Twilio] Attempting voice call to ${normalizedTo} (from ${FROM_NUMBER})`);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Twilio Error: ${errorData.message}`);
    }

    console.log(`[Twilio] Call initiated to ${normalizedTo}`);
    } catch (error: any) {
      console.error('[Twilio] Voice call failed:', error);
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        throw new Error('CORS_ERROR: Browser blocked direct Twilio call. Use a backend or manual call fallback.');
      }
      throw error;
    }
}
