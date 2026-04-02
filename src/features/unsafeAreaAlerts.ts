/**
 * Unsafe Area Alerts
 * Geofencing and location-based safety alerts
 */

export interface Geofence {
  id: string;
  name: string;
  type: 'circle' | 'polygon';
  center?: {
    lat: number;
    lng: number;
  };
  radius?: number; // in meters for circle type
  coordinates?: Array<{ lat: number; lng: number }>; // for polygon type
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  isActive: boolean;
  createdAt: number;
  expiresAt?: number;
  alertTypes: ('entry' | 'exit' | 'dwell')[];
}

export interface UnsafeArea {
  id: string;
  name: string;
  category: 'high_crime' | 'poor_lighting' | 'isolated' | 'construction' | 'natural_hazard' | 'traffic' | 'other';
  location: {
    lat: number;
    lng: number;
  };
  radius: number; // in meters
  riskScore: number; // 0-100
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  recommendations: string[];
  timeRestrictions?: {
    startHour: number;
    endHour: number;
    days: number[]; // 0-6 (Sunday-Saturday)
  };
  isActive: boolean;
  lastUpdated: number;
  reportedBy?: string;
  verified: boolean;
}

export interface AreaAlert {
  id: string;
  type: 'entry' | 'exit' | 'dwell' | 'proximity';
  areaId: string;
  areaName: string;
  severity: UnsafeArea['severity'];
  message: string;
  location: {
    lat: number;
    lng: number;
  };
  timestamp: number;
  acknowledged: boolean;
  actions: string[];
  riskScore: number;
}

export interface LocationHistory {
  id: string;
  locations: Array<{
    lat: number;
    lng: number;
    timestamp: number;
    accuracy: number;
  }>;
  lastUpdated: number;
}

export class UnsafeAreaAlerts {
  private unsafeAreas: Map<string, UnsafeArea> = new Map();
  private geofences: Map<string, Geofence> = new Map();
  private activeAlerts: Map<string, AreaAlert> = new Map();
  private locationHistory: LocationHistory;
  private currentPosition: { lat: number; lng: number } | null = null;
  private watchId: number | null = null;
  private proximityInterval: NodeJS.Timeout | null = null;
  private callbacks: Map<string, Function[]> = new Map();

  constructor() {
    this.locationHistory = this.loadLocationHistory();
    this.loadUnsafeAreas();
    this.loadGeofences();
    this.startLocationTracking();
    this.startProximityMonitoring();
  }

  private loadLocationHistory(): LocationHistory {
    try {
      const cached = localStorage.getItem('resqai_location_history');
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      console.error('Failed to load location history:', error);
    }

    return {
      id: 'history_1',
      locations: [],
      lastUpdated: Date.now()
    };
  }

  private loadUnsafeAreas(): void {
    try {
      const cached = localStorage.getItem('resqai_unsafe_areas');
      if (cached) {
        const areas = JSON.parse(cached);
        areas.forEach((area: UnsafeArea) => {
          this.unsafeAreas.set(area.id, area);
        });
      }
    } catch (error) {
      console.error('Failed to load unsafe areas:', error);
    }

    // Load default unsafe areas if none exist
    if (this.unsafeAreas.size === 0) {
      this.loadDefaultUnsafeAreas();
    }
  }

  private loadGeofences(): void {
    try {
      const cached = localStorage.getItem('resqai_geofences');
      if (cached) {
        const fences = JSON.parse(cached);
        fences.forEach((fence: Geofence) => {
          this.geofences.set(fence.id, fence);
        });
      }
    } catch (error) {
      console.error('Failed to load geofences:', error);
    }
  }

  private loadDefaultUnsafeAreas(): void {
    const defaultAreas: UnsafeArea[] = [
      {
        id: 'default_high_crime_1',
        name: 'High Crime Area - Downtown',
        category: 'high_crime',
        location: { lat: 40.7128, lng: -74.0060 }, // NYC example
        radius: 500,
        riskScore: 85,
        severity: 'high',
        description: 'Area with historically high crime rates. Exercise extreme caution.',
        recommendations: [
          'Avoid walking alone at night',
          'Stay in well-lit areas',
          'Keep phone accessible and charged',
          'Inform someone of your route'
        ],
        timeRestrictions: {
          startHour: 20,
          endHour: 6,
          days: [0, 1, 2, 3, 4, 5, 6] // All days
        },
        isActive: true,
        lastUpdated: Date.now(),
        verified: true
      },
      {
        id: 'default_isolated_1',
        name: 'Isolated Park Area',
        category: 'isolated',
        location: { lat: 40.7489, lng: -73.9680 }, // Near Central Park
        radius: 300,
        riskScore: 70,
        severity: 'medium',
        description: 'Poorly lit area with limited visibility and few people around.',
        recommendations: [
          'Visit during daylight hours',
          'Bring a companion if possible',
          'Carry a flashlight',
          'Keep emergency contacts ready'
        ],
        timeRestrictions: {
          startHour: 18,
          endHour: 7,
          days: [0, 1, 2, 3, 4, 5, 6]
        },
        isActive: true,
        lastUpdated: Date.now(),
        verified: true
      },
      {
        id: 'default_construction_1',
        name: 'Construction Zone',
        category: 'construction',
        location: { lat: 40.7580, lng: -73.9855 }, // Times Square area
        radius: 200,
        riskScore: 60,
        severity: 'medium',
        description: 'Active construction with potential hazards and limited access.',
        recommendations: [
          'Follow posted detour signs',
          'Wear appropriate footwear',
          'Be aware of heavy equipment',
          'Keep children close'
        ],
        isActive: true,
        lastUpdated: Date.now(),
        verified: true
      }
    ];

    defaultAreas.forEach(area => {
      this.unsafeAreas.set(area.id, area);
    });

    this.saveUnsafeAreas();
  }

  private saveLocationHistory(): void {
    try {
      localStorage.setItem('resqai_location_history', JSON.stringify(this.locationHistory));
    } catch (error) {
      console.error('Failed to save location history:', error);
    }
  }

  private saveUnsafeAreas(): void {
    try {
      const areas = Array.from(this.unsafeAreas.values());
      localStorage.setItem('resqai_unsafe_areas', JSON.stringify(areas));
    } catch (error) {
      console.error('Failed to save unsafe areas:', error);
    }
  }

  private saveGeofences(): void {
    try {
      const fences = Array.from(this.geofences.values());
      localStorage.setItem('resqai_geofences', JSON.stringify(fences));
    } catch (error) {
      console.error('Failed to save geofences:', error);
    }
  }

  private startLocationTracking(): void {
    if (!('geolocation' in navigator)) {
      console.warn('Geolocation not supported');
      return;
    }

    this.watchId = navigator.geolocation.watchPosition(
      (position) => {
        this.updateLocation(position);
      },
      (error) => {
        console.error('Location tracking error:', error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000 // 1 minute
      }
    );
  }

  private updateLocation(position: GeolocationPosition): void {
    const newLocation = {
      lat: position.coords.latitude,
      lng: position.coords.longitude
    };

    // Add to location history
    this.locationHistory.locations.push({
      ...newLocation,
      timestamp: Date.now(),
      accuracy: position.coords.accuracy || 0
    });

    // Trim history to last 1000 locations
    if (this.locationHistory.locations.length > 1000) {
      this.locationHistory.locations = this.locationHistory.locations.slice(-1000);
    }

    this.locationHistory.lastUpdated = Date.now();
    this.saveLocationHistory();

    // Check for area changes
    this.checkAreaEntryExit(this.currentPosition, newLocation);

    this.currentPosition = newLocation;
    this.emit('locationUpdated', newLocation);
  }

  private checkAreaEntryExit(
    previousLocation: { lat: number; lng: number } | null,
    newLocation: { lat: number; lng: number }
  ): void {
    for (const area of this.unsafeAreas.values()) {
      if (!area.isActive) continue;

      const wasInside = previousLocation ? this.isPointInArea(previousLocation, area) : false;
      const isInside = this.isPointInArea(newLocation, area);

      if (!wasInside && isInside) {
        this.handleAreaEntry(area, newLocation);
      } else if (wasInside && !isInside) {
        this.handleAreaExit(area, newLocation);
      } else if (isInside) {
        this.handleAreaDwell(area, newLocation);
      }
    }

    // Check geofences
    for (const geofence of this.geofences.values()) {
      if (!geofence.isActive) continue;

      const wasInside = previousLocation ? this.isPointInGeofence(previousLocation, geofence) : false;
      const isInside = this.isPointInGeofence(newLocation, geofence);

      if (!wasInside && isInside && geofence.alertTypes.includes('entry')) {
        this.handleGeofenceEntry(geofence, newLocation);
      } else if (wasInside && !isInside && geofence.alertTypes.includes('exit')) {
        this.handleGeofenceExit(geofence, newLocation);
      }
    }
  }

  private isPointInArea(
    point: { lat: number; lng: number },
    area: UnsafeArea
  ): boolean {
    const distance = this.calculateDistance(point, area.location);
    return distance <= area.radius;
  }

  private isPointInGeofence(
    point: { lat: number; lng: number },
    geofence: Geofence
  ): boolean {
    if (geofence.type === 'circle' && geofence.center && geofence.radius) {
      const distance = this.calculateDistance(point, geofence.center);
      return distance <= geofence.radius;
    } else if (geofence.type === 'polygon' && geofence.coordinates) {
      return this.isPointInPolygon(point, geofence.coordinates);
    }
    return false;
  }

  private calculateDistance(
    point1: { lat: number; lng: number },
    point2: { lat: number; lng: number }
  ): number {
    const R = 6371000; // Earth's radius in meters
    const dLat = this.toRadians(point2.lat - point1.lat);
    const dLng = this.toRadians(point2.lng - point1.lng);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(point1.lat)) * Math.cos(this.toRadians(point2.lat)) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  private isPointInPolygon(
    point: { lat: number; lng: number },
    polygon: Array<{ lat: number; lng: number }>
  ): boolean {
    let inside = false;
    
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].lng, yi = polygon[i].lat;
      const xj = polygon[j].lng, yj = polygon[j].lat;
      
      const intersect = ((yi > point.lat) !== (yj > point.lat))
          && (point.lng < (xj - xi) * (point.lat - yi) / (yj - yi) + xi);
      
      if (intersect) inside = !inside;
    }
    
    return inside;
  }

  private handleAreaEntry(area: UnsafeArea, location: { lat: number; lng: number }): void {
    // Check time restrictions
    if (area.timeRestrictions && !this.isWithinTimeRestrictions(area.timeRestrictions)) {
      return;
    }

    const alert: AreaAlert = {
      id: `entry_${area.id}_${Date.now()}`,
      type: 'entry',
      areaId: area.id,
      areaName: area.name,
      severity: area.severity,
      message: `You have entered ${area.name}. ${area.description}`,
      location,
      timestamp: Date.now(),
      acknowledged: false,
      actions: area.recommendations,
      riskScore: area.riskScore
    };

    this.activeAlerts.set(alert.id, alert);
    this.emit('areaAlert', alert);
  }

  private handleAreaExit(area: UnsafeArea, location: { lat: number; lng: number }): void {
    const alert: AreaAlert = {
      id: `exit_${area.id}_${Date.now()}`,
      type: 'exit',
      areaId: area.id,
      areaName: area.name,
      severity: 'low',
      message: `You have left ${area.name}. You are now in a safer area.`,
      location,
      timestamp: Date.now(),
      acknowledged: false,
      actions: ['Continue to monitor your surroundings'],
      riskScore: 20
    };

    this.activeAlerts.set(alert.id, alert);
    this.emit('areaAlert', alert);
  }

  private handleAreaDwell(area: UnsafeArea, location: { lat: number; lng: number }): void {
    // Check if user has been in area for extended time
    const recentLocations = this.locationHistory.locations.filter(
      loc => Date.now() - loc.timestamp < 300000 // Last 5 minutes
    );

    if (recentLocations.length >= 5) {
      // User has been in area for at least 5 minutes
      const existingAlert = Array.from(this.activeAlerts.values())
        .find(alert => alert.areaId === area.id && alert.type === 'dwell' && 
                     Date.now() - alert.timestamp < 300000);

      if (!existingAlert) {
        const alert: AreaAlert = {
          id: `dwell_${area.id}_${Date.now()}`,
          type: 'dwell',
          areaId: area.id,
          areaName: area.name,
          severity: area.severity,
          message: `You have been in ${area.name} for an extended period. Consider leaving if possible.`,
          location,
          timestamp: Date.now(),
          acknowledged: false,
          actions: [...area.recommendations, 'Consider leaving the area'],
          riskScore: area.riskScore
        };

        this.activeAlerts.set(alert.id, alert);
        this.emit('areaAlert', alert);
      }
    }
  }

  private handleGeofenceEntry(
    geofence: Geofence,
    location: { lat: number; lng: number }
  ): void {
    const alert: AreaAlert = {
      id: `geofence_entry_${geofence.id}_${Date.now()}`,
      type: 'entry',
      areaId: geofence.id,
      areaName: geofence.name,
      severity: geofence.riskLevel,
      message: `Geofence alert: Entered ${geofence.name}. ${geofence.description}`,
      location,
      timestamp: Date.now(),
      acknowledged: false,
      actions: this.getGeofenceActions(geofence),
      riskScore: this.getSeverityScore(geofence.riskLevel)
    };

    this.activeAlerts.set(alert.id, alert);
    this.emit('areaAlert', alert);
  }

  private handleGeofenceExit(
    geofence: Geofence,
    location: { lat: number; lng: number }
  ): void {
    const alert: AreaAlert = {
      id: `geofence_exit_${geofence.id}_${Date.now()}`,
      type: 'exit',
      areaId: geofence.id,
      areaName: geofence.name,
      severity: 'low',
      message: `Geofence alert: Exited ${geofence.name}`,
      location,
      timestamp: Date.now(),
      acknowledged: false,
      actions: ['Continue to monitor your safety'],
      riskScore: 20
    };

    this.activeAlerts.set(alert.id, alert);
    this.emit('areaAlert', alert);
  }

  private isWithinTimeRestrictions(
    restrictions: UnsafeArea['timeRestrictions']
  ): boolean {
    if (!restrictions) return true;

    const now = new Date();
    const currentHour = now.getHours();
    const currentDay = now.getDay();

    // Check day
    if (!restrictions.days.includes(currentDay)) return false;

    // Check time (handle overnight restrictions)
    if (restrictions.startHour <= restrictions.endHour) {
      return currentHour >= restrictions.startHour && currentHour <= restrictions.endHour;
    } else {
      return currentHour >= restrictions.startHour || currentHour <= restrictions.endHour;
    }
  }

  private getGeofenceActions(geofence: Geofence): string[] {
    const baseActions = ['Stay alert', 'Keep phone accessible'];
    
    switch (geofence.riskLevel) {
      case 'critical':
        return [...baseActions, 'Consider leaving immediately', 'Contact emergency services if needed'];
      case 'high':
        return [...baseActions, 'Exercise extreme caution', 'Inform someone of your location'];
      case 'medium':
        return [...baseActions, 'Be aware of surroundings', 'Have exit strategy'];
      default:
        return baseActions;
    }
  }

  private getSeverityScore(severity: Geofence['riskLevel']): number {
    switch (severity) {
      case 'critical': return 90;
      case 'high': return 70;
      case 'medium': return 50;
      case 'low': return 30;
      default: return 50;
    }
  }

  private startProximityMonitoring(): void {
    this.proximityInterval = setInterval(() => {
      this.checkProximityAlerts();
    }, 60000); // Check every minute
  }

  private checkProximityAlerts(): void {
    if (!this.currentPosition) return;

    for (const area of this.unsafeAreas.values()) {
      if (!area.isActive) continue;

      const distance = this.calculateDistance(this.currentPosition, area.location);
      const alertDistance = area.radius + 100; // Alert 100m before entering

      if (distance <= alertDistance && distance > area.radius) {
        const existingAlert = Array.from(this.activeAlerts.values())
          .find(alert => alert.areaId === area.id && alert.type === 'proximity' && 
                       Date.now() - alert.timestamp < 300000);

        if (!existingAlert) {
          const alert: AreaAlert = {
            id: `proximity_${area.id}_${Date.now()}`,
            type: 'proximity',
            areaId: area.id,
            areaName: area.name,
            severity: area.severity,
            message: `Approaching ${area.name}. ${area.description}`,
            location: this.currentPosition,
            timestamp: Date.now(),
            acknowledged: false,
            actions: area.recommendations,
            riskScore: Math.round(area.riskScore * 0.7) // Lower score for proximity
          };

          this.activeAlerts.set(alert.id, alert);
          this.emit('areaAlert', alert);
        }
      }
    }
  }

  public addUnsafeArea(area: Omit<UnsafeArea, 'id' | 'lastUpdated'>): string {
    const newArea: UnsafeArea = {
      ...area,
      id: `area_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      lastUpdated: Date.now()
    };

    this.unsafeAreas.set(newArea.id, newArea);
    this.saveUnsafeAreas();
    this.emit('unsafeAreaAdded', newArea);

    return newArea.id;
  }

  public updateUnsafeArea(areaId: string, updates: Partial<UnsafeArea>): boolean {
    const area = this.unsafeAreas.get(areaId);
    if (!area) return false;

    Object.assign(area, updates, { lastUpdated: Date.now() });
    this.saveUnsafeAreas();
    this.emit('unsafeAreaUpdated', area);

    return true;
  }

  public removeUnsafeArea(areaId: string): boolean {
    const deleted = this.unsafeAreas.delete(areaId);
    if (deleted) {
      this.saveUnsafeAreas();
      this.emit('unsafeAreaRemoved', areaId);
    }
    return deleted;
  }

  public createGeofence(geofence: Omit<Geofence, 'id' | 'createdAt'>): string {
    const newGeofence: Geofence = {
      ...geofence,
      id: `geofence_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: Date.now()
    };

    this.geofences.set(newGeofence.id, newGeofence);
    this.saveGeofences();
    this.emit('geofenceCreated', newGeofence);

    return newGeofence.id;
  }

  public acknowledgeAlert(alertId: string): boolean {
    const alert = this.activeAlerts.get(alertId);
    if (alert) {
      alert.acknowledged = true;
      this.emit('alertAcknowledged', alert);
      return true;
    }
    return false;
  }

  public getActiveAlerts(): AreaAlert[] {
    return Array.from(this.activeAlerts.values())
      .filter(alert => !alert.acknowledged)
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  public getUnsafeAreas(): UnsafeArea[] {
    return Array.from(this.unsafeAreas.values())
      .filter(area => area.isActive);
  }

  public getGeofences(): Geofence[] {
    return Array.from(this.geofences.values())
      .filter(geofence => geofence.isActive);
  }

  public isCurrentlyInUnsafeArea(): boolean {
    if (!this.currentPosition) return false;

    for (const area of this.unsafeAreas.values()) {
      if (area.isActive && this.isPointInArea(this.currentPosition, area)) {
        return true;
      }
    }

    return false;
  }

  public getCurrentUnsafeAreas(): UnsafeArea[] {
    if (!this.currentPosition) return [];

    return Array.from(this.unsafeAreas.values())
      .filter(area => area.isActive && this.isPointInArea(this.currentPosition!, area));
  }

  public on(event: string, callback: Function): void {
    if (!this.callbacks.has(event)) {
      this.callbacks.set(event, []);
    }
    this.callbacks.get(event)!.push(callback);
  }

  public off(event: string, callback: Function): void {
    const callbacks = this.callbacks.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  private emit(event: string, data: any): void {
    const callbacks = this.callbacks.get(event);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in callback for event ${event}:`, error);
        }
      });
    }
  }

  public cleanup(): void {
    if (this.watchId) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }

    if (this.proximityInterval) {
      clearInterval(this.proximityInterval);
      this.proximityInterval = null;
    }

    this.callbacks.clear();
  }
}
