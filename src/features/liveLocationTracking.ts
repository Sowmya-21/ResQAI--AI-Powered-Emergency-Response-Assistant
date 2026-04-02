/**
 * Live Location Tracking
 * Continuously shares the user’s real-time location during an emergency.
 */
export class LiveLocationTracking {
  private watchId: number | null = null;
  public startTracking(onUpdate: (coords: GeolocationCoordinates) => void): void {
    if (navigator.geolocation) {
      this.watchId = navigator.geolocation.watchPosition(
        (position) => onUpdate(position.coords),
        (error) => console.error('Location error:', error),
        { enableHighAccuracy: true }
      );
    }
  }
  public stopTracking(): void {
    if (this.watchId !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
  }
}
