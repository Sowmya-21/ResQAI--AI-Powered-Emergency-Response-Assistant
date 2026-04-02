/**
 * Offline Emergency Mode
 * Provides emergency functionality when internet connection is unavailable
 */

export interface OfflineEmergencyAlert {
  id: string;
  type: 'sos' | 'medical' | 'accident' | 'fire' | 'other';
  severity: 'low' | 'medium' | 'high' | 'critical';
  location?: {
    lat: number;
    lng: number;
    accuracy: number;
  };
  timestamp: number;
  message: string;
  contactsNotified: string[];
  status: 'active' | 'resolved' | 'cancelled';
}

export interface OfflineCache {
  alerts: OfflineEmergencyAlert[];
  emergencyContacts: EmergencyContact[];
  userLocation?: {
    lat: number;
    lng: number;
    timestamp: number;
  };
  lastSync?: number;
}

export interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  relationship: string;
  priority: 'primary' | 'secondary';
}

export class OfflineEmergencyMode {
  private cache: OfflineCache;
  private isOnline: boolean = navigator.onLine;
  private locationWatchId: number | null = null;
  private syncInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.cache = this.loadCache();
    this.setupNetworkListeners();
    this.startLocationTracking();
    this.startPeriodicSync();
  }

  private loadCache(): OfflineCache {
    try {
      const cached = localStorage.getItem('resqai_offline_cache');
      return cached ? JSON.parse(cached) : {
        alerts: [],
        emergencyContacts: [],
        userLocation: undefined,
        lastSync: undefined
      };
    } catch (error) {
      console.error('Failed to load offline cache:', error);
      return {
        alerts: [],
        emergencyContacts: [],
        userLocation: undefined,
        lastSync: undefined
      };
    }
  }

  private saveCache(): void {
    try {
      localStorage.setItem('resqai_offline_cache', JSON.stringify(this.cache));
    } catch (error) {
      console.error('Failed to save offline cache:', error);
    }
  }

  private setupNetworkListeners(): void {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.syncWhenOnline();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.enterOfflineMode();
    });
  }

  private startLocationTracking(): void {
    if ('geolocation' in navigator) {
      this.locationWatchId = navigator.geolocation.watchPosition(
        (position) => {
          this.cache.userLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            timestamp: Date.now()
          };
          this.saveCache();
        },
        (error) => {
          console.warn('Location tracking failed:', error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000 // 5 minutes
        }
      );
    }
  }

  private enterOfflineMode(): void {
    console.log('Entering offline emergency mode');
    // Cache critical data
    this.cache.lastSync = Date.now();
    this.saveCache();
  }

  private async syncWhenOnline(): Promise<void> {
    if (!this.isOnline) return;

    console.log('Syncing offline data when online');
    
    // Sync pending alerts
    const pendingAlerts = this.cache.alerts.filter(alert => alert.status === 'active');
    for (const alert of pendingAlerts) {
      try {
        await this.syncAlert(alert);
        alert.status = 'resolved';
      } catch (error) {
        console.error('Failed to sync alert:', error);
      }
    }

    this.saveCache();
  }

  private async syncAlert(alert: OfflineEmergencyAlert): Promise<void> {
    // This would sync with your backend when online
    console.log('Syncing alert:', alert);
  }

  private startPeriodicSync(): void {
    this.syncInterval = setInterval(() => {
      if (this.isOnline) {
        this.syncWhenOnline();
      }
    }, 30000); // Check every 30 seconds
  }

  public triggerEmergencyAlert(
    type: OfflineEmergencyAlert['type'],
    message: string,
    severity: OfflineEmergencyAlert['severity'] = 'high'
  ): string {
    const alert: OfflineEmergencyAlert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      severity,
      location: this.cache.userLocation ? {
        ...this.cache.userLocation,
        accuracy: 10
      } : undefined,
      timestamp: Date.now(),
      message,
      contactsNotified: [],
      status: 'active'
    };

    this.cache.alerts.push(alert);
    this.saveCache();

    if (!this.isOnline) {
      this.notifyContactsOffline(alert);
    } else {
      this.notifyContactsOnline(alert);
    }

    return alert.id;
  }

  private notifyContactsOffline(alert: OfflineEmergencyAlert): void {
    // Use SMS fallback or stored notification mechanisms
    console.log('Notifying contacts offline:', alert);
    
    // Store notification attempts for later sync
    const contacts = this.cache.emergencyContacts.slice(0, 3); // Top 3 contacts
    alert.contactsNotified = contacts.map(c => c.id);
    
    this.saveCache();
  }

  private notifyContactsOnline(alert: OfflineEmergencyAlert): void {
    // Use real-time notification systems
    console.log('Notifying contacts online:', alert);
  }

  public addEmergencyContact(contact: Omit<EmergencyContact, 'id'>): void {
    const newContact: EmergencyContact = {
      ...contact,
      id: `contact_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };

    this.cache.emergencyContacts.push(newContact);
    this.cache.emergencyContacts.sort((a, b) => {
      const priorityOrder = { primary: 0, secondary: 1 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    this.saveCache();
  }

  public getOfflineStatus(): {
    isOnline: boolean;
    cachedAlerts: number;
    lastSync: number | undefined;
    locationAvailable: boolean;
  } {
    return {
      isOnline: this.isOnline,
      cachedAlerts: this.cache.alerts.filter(a => a.status === 'active').length,
      lastSync: this.cache.lastSync,
      locationAvailable: !!this.cache.userLocation
    };
  }

  public getActiveAlerts(): OfflineEmergencyAlert[] {
    return this.cache.alerts.filter(alert => alert.status === 'active');
  }

  public cancelAlert(alertId: string): boolean {
    const alert = this.cache.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.status = 'cancelled';
      this.saveCache();
      return true;
    }
    return false;
  }

  public getEmergencyContacts(): EmergencyContact[] {
    return this.cache.emergencyContacts;
  }

  public cleanup(): void {
    if (this.locationWatchId) {
      navigator.geolocation.clearWatch(this.locationWatchId);
    }
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
  }
}
