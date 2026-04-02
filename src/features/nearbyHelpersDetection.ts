import { db, ref, get } from '../firebase';

export interface Helper {
  id: string;
  name: string;
  lat: number;
  lng: number;
  skills?: string[];
  trustScore?: number;
  isVerified?: boolean;
  distance?: number; // calculated at runtime
}

/**
 * Nearby Helpers Detection
 * Detects and lists users/helpers near the emergency location.
 */
export class NearbyHelpersDetection {
  // Fetch helpers from Firebase and filter by proximity (simple radius filter)
  public async getNearbyHelpers(location: {lat: number, lng: number}): Promise<Helper[]> {
    try {
      const helpersRef = ref(db, 'helpers');
      const snapshot = await get(helpersRef);
      if (!snapshot.exists()) return [];
      const allHelpers: Helper[] = Object.entries(snapshot.val()).map(([id, data]: any) => ({ id, ...(data as Omit<Helper, 'id'>) }));
      // Simple radius filter (e.g., 10km)
      const RADIUS_KM = 10;
      const toRad = (deg: number) => deg * Math.PI / 180;
      const distance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
        const R = 6371; // km
        const dLat = toRad(lat2 - lat1);
        const dLng = toRad(lng2 - lng1);
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
                  Math.sin(dLng/2) * Math.sin(dLng/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
      };
      return allHelpers
        .map(helper => ({
          ...helper,
          distance: helper.lat && helper.lng ? distance(location.lat, location.lng, helper.lat, helper.lng) : undefined
        }))
        .filter(helper => helper.distance !== undefined && helper.distance <= RADIUS_KM)
        .sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0));
    } catch (error) {
      console.error('Error fetching helpers:', error);
      return [];
    }
  }
}
