/**
 * Privacy Control System
 * Comprehensive data access management and privacy controls
 */

export interface PrivacyPolicy {
  id: string;
  name: string;
  version: string;
  description: string;
  dataCategories: Array<{
    category: string;
    allowed: boolean;
    retentionDays: number;
    sharingAllowed: boolean;
    encryptionRequired: boolean;
  }>;
  userRights: Array<{
    right: string;
    description: string;
    enabled: boolean;
  }>;
  complianceStandards: string[];
  lastUpdated: number;
  isActive: boolean;
}

export interface DataConsent {
  id: string;
  userId: string;
  dataType: 'personal_info' | 'health_data' | 'location_data' | 'evidence' | 'communications' | 'biometric';
  purpose: string;
  granted: boolean;
  timestamp: number;
  expiresAt?: number;
  scope: 'limited' | 'full' | 'temporary';
  conditions: string[];
  withdrawnAt?: number;
  metadata: {
    ipAddress: string;
    userAgent: string;
    location?: {
      lat: number;
      lng: number;
    };
  };
}

export interface AccessControl {
  id: string;
  resourceType: 'data' | 'feature' | 'api' | 'storage';
  resourceId: string;
  userId: string;
  permissions: Array<{
    action: 'read' | 'write' | 'delete' | 'share' | 'export';
    granted: boolean;
    conditions?: string[];
    expiresAt?: number;
  }>;
  restrictions: {
    timeBased: {
      enabled: boolean;
      allowedHours: { start: number; end: number }[];
      allowedDays: number[];
    };
    locationBased: {
      enabled: boolean;
      allowedLocations: Array<{
        lat: number;
        lng: number;
        radius: number;
      }>;
      blockedLocations: Array<{
        lat: number;
        lng: number;
        radius: number;
      }>;
    };
    deviceBased: {
      enabled: boolean;
      allowedDevices: string[];
      requireBiometric: boolean;
    };
    purposeBased: {
      enabled: boolean;
      allowedPurposes: string[];
      blockedPurposes: string[];
    };
  };
  auditTrail: Array<{
    timestamp: number;
    action: string;
    userId: string;
    granted: boolean;
    reason?: string;
    context: {
      ipAddress: string;
      userAgent: string;
      location?: {
        lat: number;
        lng: number;
      };
    };
  }>;
  createdAt: number;
  lastModified: number;
  isActive: boolean;
}

export interface PrivacySetting {
  id: string;
  category: 'data_collection' | 'data_sharing' | 'data_retention' | 'user_tracking' | 'third_party_access';
  name: string;
  description: string;
  value: boolean | number | string;
  type: 'boolean' | 'number' | 'string' | 'enum';
  options?: string[];
  defaultValue: any;
  userCanModify: boolean;
  requiresRestart: boolean;
  lastModified: number;
  modifiedBy: string;
}

export interface DataSubjectRequest {
  id: string;
  type: 'access' | 'portability' | 'rectification' | 'erasure' | 'restriction';
  status: 'pending' | 'processing' | 'completed' | 'rejected';
  userId: string;
  description: string;
  dataCategories: string[];
  timestamp: number;
  processedAt?: number;
  response?: string;
  attachments?: string[];
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

export class PrivacyControlSystem {
  private policies: Map<string, PrivacyPolicy> = new Map();
  private consents: Map<string, DataConsent> = new Map();
  private accessControls: Map<string, AccessControl> = new Map();
  private privacySettings: Map<string, PrivacySetting> = new Map();
  private subjectRequests: Map<string, DataSubjectRequest> = new Map();
  private callbacks: Map<string, Function[]> = new Map();

  constructor() {
    this.loadPolicies();
    this.loadConsents();
    this.loadAccessControls();
    this.loadPrivacySettings();
    this.loadSubjectRequests();
    this.initializeDefaultSettings();
    this.startPrivacyMonitoring();
  }

  private loadPolicies(): void {
    try {
      const policies = localStorage.getItem('resqai_privacy_policies');
      if (policies) {
        const policyData = JSON.parse(policies);
        policyData.forEach((policy: PrivacyPolicy) => {
          this.policies.set(policy.id, policy);
        });
      }
    } catch (error) {
      console.error('Failed to load privacy policies:', error);
    }
  }

  private loadConsents(): void {
    try {
      const consents = localStorage.getItem('resqai_data_consents');
      if (consents) {
        const consentData = JSON.parse(consents);
        consentData.forEach((consent: DataConsent) => {
          this.consents.set(consent.id, consent);
        });
      }
    } catch (error) {
      console.error('Failed to load data consents:', error);
    }
  }

  private loadAccessControls(): void {
    try {
      const controls = localStorage.getItem('resqai_access_controls');
      if (controls) {
        const controlData = JSON.parse(controls);
        controlData.forEach((control: AccessControl) => {
          this.accessControls.set(control.id, control);
        });
      }
    } catch (error) {
      console.error('Failed to load access controls:', error);
    }
  }

  private loadPrivacySettings(): void {
    try {
      const settings = localStorage.getItem('resqai_privacy_settings');
      if (settings) {
        const settingData = JSON.parse(settings);
        settingData.forEach((setting: PrivacySetting) => {
          this.privacySettings.set(setting.id, setting);
        });
      }
    } catch (error) {
      console.error('Failed to load privacy settings:', error);
    }
  }

  private loadSubjectRequests(): void {
    try {
      const requests = localStorage.getItem('resqai_subject_requests');
      if (requests) {
        const requestData = JSON.parse(requests);
        requestData.forEach((request: DataSubjectRequest) => {
          this.subjectRequests.set(request.id, request);
        });
      }
    } catch (error) {
      console.error('Failed to load subject requests:', error);
    }
  }

  private savePolicies(): void {
    try {
      const policyData = Array.from(this.policies.values());
      localStorage.setItem('resqai_privacy_policies', JSON.stringify(policyData));
    } catch (error) {
      console.error('Failed to save privacy policies:', error);
    }
  }

  private saveConsents(): void {
    try {
      const consentData = Array.from(this.consents.values());
      localStorage.setItem('resqai_data_consents', JSON.stringify(consentData));
    } catch (error) {
      console.error('Failed to save data consents:', error);
    }
  }

  private saveAccessControls(): void {
    try {
      const controlData = Array.from(this.accessControls.values());
      localStorage.setItem('resqai_access_controls', JSON.stringify(controlData));
    } catch (error) {
      console.error('Failed to save access controls:', error);
    }
  }

  private savePrivacySettings(): void {
    try {
      const settingData = Array.from(this.privacySettings.values());
      localStorage.setItem('resqai_privacy_settings', JSON.stringify(settingData));
    } catch (error) {
      console.error('Failed to save privacy settings:', error);
    }
  }

  private saveSubjectRequests(): void {
    try {
      const requestData = Array.from(this.subjectRequests.values());
      localStorage.setItem('resqai_subject_requests', JSON.stringify(requestData));
    } catch (error) {
      console.error('Failed to save subject requests:', error);
    }
  }

  private initializeDefaultSettings(): void {
    if (this.privacySettings.size === 0) {
      const defaultSettings: PrivacySetting[] = [
        {
          id: 'data_collection_minimal',
          category: 'data_collection',
          name: 'Minimal Data Collection',
          description: 'Collect only essential data required for emergency services',
          value: false,
          type: 'boolean',
          defaultValue: false,
          userCanModify: true,
          requiresRestart: false,
          lastModified: Date.now(),
          modifiedBy: 'system'
        },
        {
          id: 'location_sharing',
          category: 'data_sharing',
          name: 'Location Data Sharing',
          description: 'Share location data with emergency services',
          value: true,
          type: 'boolean',
          defaultValue: true,
          userCanModify: true,
          requiresRestart: false,
          lastModified: Date.now(),
          modifiedBy: 'system'
        },
        {
          id: 'data_retention_days',
          category: 'data_retention',
          name: 'Data Retention Period',
          description: 'Number of days to retain user data',
          value: 365,
          type: 'number',
          defaultValue: 365,
          userCanModify: true,
          requiresRestart: false,
          lastModified: Date.now(),
          modifiedBy: 'system'
        },
        {
          id: 'third_party_analytics',
          category: 'third_party_access',
          name: 'Third-Party Analytics',
          description: 'Allow anonymous usage analytics for service improvement',
          value: false,
          type: 'boolean',
          defaultValue: false,
          userCanModify: true,
          requiresRestart: false,
          lastModified: Date.now(),
          modifiedBy: 'system'
        }
      ];

      defaultSettings.forEach(setting => {
        this.privacySettings.set(setting.id, setting);
      });

      this.savePrivacySettings();
    }
  }

  private startPrivacyMonitoring(): void {
    // Monitor consent expiration
    setInterval(() => {
      this.checkConsentExpiry();
    }, 60 * 60 * 1000); // Check every hour

    // Monitor access control compliance
    setInterval(() => {
      this.auditAccessCompliance();
    }, 30 * 60 * 1000); // Check every 30 minutes
  }

  private checkConsentExpiry(): void {
    const now = Date.now();
    let expiredConsents = 0;

    for (const [consentId, consent] of this.consents) {
      if (consent.expiresAt && consent.expiresAt < now && consent.granted) {
        consent.granted = false;
        this.consents.set(consentId, consent);
        expiredConsents++;
        this.emit('consentExpired', consent);
      }
    }

    if (expiredConsents > 0) {
      this.saveConsents();
    }
  }

  private auditAccessCompliance(): void {
    for (const [controlId, control] of this.accessControls) {
      const violations = this.checkAccessViolations(control);
      if (violations.length > 0) {
        this.emit('accessViolation', { control, violations });
      }
    }
  }

  private checkAccessViolations(control: AccessControl): string[] {
    const violations: string[] = [];
    const now = Date.now();

    // Check time-based restrictions
    if (control.restrictions.timeBased.enabled) {
      const currentHour = new Date(now).getHours();
      const currentDay = new Date(now).getDay();
      
      const hourAllowed = control.restrictions.timeBased.allowedHours.some(
        range => currentHour >= range.start && currentHour <= range.end
      );
      
      const dayAllowed = control.restrictions.timeBased.allowedDays.includes(currentDay);
      
      if (!hourAllowed || !dayAllowed) {
        violations.push('Time-based access restriction violated');
      }
    }

    // Check location-based restrictions
    if (control.restrictions.locationBased.enabled) {
      // This would check current location against allowed/blocked locations
      // For now, simulate location check
      const locationViolation = Math.random() > 0.8; // 20% chance of violation
      if (locationViolation) {
        violations.push('Location-based access restriction violated');
      }
    }

    return violations;
  }

  public async createPrivacyPolicy(
    name: string,
    description: string,
    dataCategories: PrivacyPolicy['dataCategories']
  ): Promise<string> {
    const policyId = `policy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const policy: PrivacyPolicy = {
      id: policyId,
      name,
      version: '1.0',
      description,
      dataCategories,
      userRights: [
        {
          right: 'access',
          description: 'Right to access personal data',
          enabled: true
        },
        {
          right: 'portability',
          description: 'Right to data portability',
          enabled: true
        },
        {
          right: 'erasure',
          description: 'Right to be forgotten',
          enabled: true
        },
        {
          right: 'rectification',
          description: 'Right to correct inaccurate data',
          enabled: true
        }
      ],
      complianceStandards: ['GDPR', 'CCPA', 'HIPAA'],
      lastUpdated: Date.now(),
      isActive: true
    };

    this.policies.set(policyId, policy);
    this.savePolicies();
    this.emit('policyCreated', policy);

    return policyId;
  }

  public async grantConsent(
    userId: string,
    dataType: DataConsent['dataType'],
    purpose: string,
    scope: DataConsent['scope'] = 'limited',
    expiresAfterDays?: number
  ): Promise<string> {
    const consentId = `consent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const consent: DataConsent = {
      id: consentId,
      userId,
      dataType,
      purpose,
      granted: true,
      timestamp: Date.now(),
      expiresAt: expiresAfterDays ? Date.now() + (expiresAfterDays * 24 * 60 * 60 * 1000) : undefined,
      scope,
      conditions: [
        'Data will only be used for specified purpose',
        'Consent can be withdrawn at any time',
        'Data protection measures will be applied'
      ],
      metadata: {
        ipAddress: 'unknown', // Would get from request
        userAgent: navigator.userAgent,
        location: this.getCurrentLocation()
      }
    };

    this.consents.set(consentId, consent);
    this.saveConsents();
    this.emit('consentGranted', consent);

    return consentId;
  }

  public async withdrawConsent(consentId: string, reason?: string): Promise<boolean> {
    const consent = this.consents.get(consentId);
    if (!consent) return false;

    consent.granted = false;
    consent.withdrawnAt = Date.now();

    this.consents.set(consentId, consent);
    this.saveConsents();
    this.emit('consentWithdrawn', { consent, reason });

    return true;
  }

  private getCurrentLocation(): { lat: number; lng: number } | undefined {
    // This would integrate with the app's location service
    return undefined;
  }

  public async createAccessControl(
    resourceType: AccessControl['resourceType'],
    resourceId: string,
    userId: string,
    permissions: AccessControl['permissions'],
    restrictions?: Partial<AccessControl['restrictions']>
  ): Promise<string> {
    const controlId = `control_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const accessControl: AccessControl = {
      id: controlId,
      resourceType,
      resourceId,
      userId,
      permissions,
      restrictions: {
        timeBased: {
          enabled: false,
          allowedHours: [],
          allowedDays: []
        },
        locationBased: {
          enabled: false,
          allowedLocations: [],
          blockedLocations: []
        },
        deviceBased: {
          enabled: false,
          allowedDevices: [],
          requireBiometric: false
        },
        purposeBased: {
          enabled: false,
          allowedPurposes: [],
          blockedPurposes: []
        },
        ...restrictions
      },
      auditTrail: [],
      createdAt: Date.now(),
      lastModified: Date.now(),
      isActive: true
    };

    this.accessControls.set(controlId, accessControl);
    this.saveAccessControls();
    this.emit('accessControlCreated', accessControl);

    return controlId;
  }

  public async checkAccessPermission(
    userId: string,
    resourceType: AccessControl['resourceType'],
    resourceId: string,
    action: AccessControl['permissions'][0]['action'],
    context?: {
      ipAddress?: string;
      userAgent?: string;
      location?: { lat: number; lng: number };
    }
  ): Promise<{
    granted: boolean;
    reason?: string;
    controlId?: string;
  }> {
    // Find relevant access controls
    const relevantControls = Array.from(this.accessControls.values())
      .filter(control => 
        control.resourceType === resourceType && 
        control.resourceId === resourceId &&
        control.userId === userId &&
        control.isActive
      );

    if (relevantControls.length === 0) {
      return { granted: false, reason: 'No access control found' };
    }

    for (const control of relevantControls) {
      const permission = control.permissions.find(p => p.action === action);
      
      if (!permission || !permission.granted) {
        this.logAccessAttempt(control.id, action, userId, false, 'Permission not granted');
        return { granted: false, reason: 'Permission not granted', controlId: control.id };
      }

      // Check time-based restrictions
      if (control.restrictions.timeBased.enabled) {
        const now = new Date();
        const currentHour = now.getHours();
        const currentDay = now.getDay();
        
        const hourAllowed = control.restrictions.timeBased.allowedHours.some(
          range => currentHour >= range.start && currentHour <= range.end
        );
        
        const dayAllowed = control.restrictions.timeBased.allowedDays.includes(currentDay);
        
        if (!hourAllowed || !dayAllowed) {
          this.logAccessAttempt(control.id, action, userId, false, 'Time restriction');
          return { granted: false, reason: 'Time-based restriction', controlId: control.id };
        }
      }

      // Check location-based restrictions
      if (control.restrictions.locationBased.enabled && context?.location) {
        const locationAllowed = this.checkLocationPermission(
          context.location,
          control.restrictions.locationBased
        );
        
        if (!locationAllowed) {
          this.logAccessAttempt(control.id, action, userId, false, 'Location restriction');
          return { granted: false, reason: 'Location-based restriction', controlId: control.id };
        }
      }

      // Log successful access
      this.logAccessAttempt(control.id, action, userId, true);
      return { granted: true, controlId: control.id };
    }

    return { granted: false, reason: 'No matching access control' };
  }

  private checkLocationPermission(
    currentLocation: { lat: number; lng: number },
    locationRestriction: AccessControl['restrictions']['locationBased']
  ): boolean {
    // Check if in blocked locations
    for (const blocked of locationRestriction.blockedLocations) {
      const distance = this.calculateDistance(currentLocation, blocked);
      if (distance <= blocked.radius) {
        return false;
      }
    }

    // Check if in allowed locations (if any specified)
    if (locationRestriction.allowedLocations.length > 0) {
      for (const allowed of locationRestriction.allowedLocations) {
        const distance = this.calculateDistance(currentLocation, allowed);
        if (distance <= allowed.radius) {
          return true;
        }
      }
      return false;
    }

    return true; // No location restrictions
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

  private logAccessAttempt(
    controlId: string,
    action: string,
    userId: string,
    granted: boolean,
    reason?: string
  ): void {
    const control = this.accessControls.get(controlId);
    if (!control) return;

    const auditEntry: AccessControl['auditTrail'][0] = {
      timestamp: Date.now(),
      action,
      userId,
      granted,
      reason,
      context: {
        ipAddress: 'unknown', // Would get from request
        userAgent: navigator.userAgent,
        location: this.getCurrentLocation()
      }
    };

    control.auditTrail.push(auditEntry);
    control.lastModified = Date.now();
    
    this.accessControls.set(controlId, control);
    this.saveAccessControls();
  }

  public async updatePrivacySetting(
    settingId: string,
    value: any,
    modifiedBy: string = 'current_user'
  ): Promise<boolean> {
    const setting = this.privacySettings.get(settingId);
    if (!setting || !setting.userCanModify) {
      return false;
    }

    setting.value = value;
    setting.lastModified = Date.now();
    setting.modifiedBy = modifiedBy;

    this.privacySettings.set(settingId, setting);
    this.savePrivacySettings();
    this.emit('settingUpdated', setting);

    return true;
  }

  public async submitDataSubjectRequest(
    type: DataSubjectRequest['type'],
    description: string,
    dataCategories: string[],
    priority: DataSubjectRequest['priority'] = 'medium'
  ): Promise<string> {
    const requestId = `request_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const request: DataSubjectRequest = {
      id: requestId,
      type,
      status: 'pending',
      userId: 'current_user',
      description,
      dataCategories,
      timestamp: Date.now(),
      priority
    };

    this.subjectRequests.set(requestId, request);
    this.saveSubjectRequests();
    this.emit('requestSubmitted', request);

    return requestId;
  }

  public async processDataSubjectRequest(
    requestId: string,
    response: string,
    status: DataSubjectRequest['status']
  ): Promise<boolean> {
    const request = this.subjectRequests.get(requestId);
    if (!request) return false;

    request.status = status;
    request.processedAt = Date.now();
    request.response = response;

    this.subjectRequests.set(requestId, request);
    this.saveSubjectRequests();
    this.emit('requestProcessed', request);

    return true;
  }

  public getPrivacyPolicies(): PrivacyPolicy[] {
    return Array.from(this.policies.values())
      .filter(policy => policy.isActive)
      .sort((a, b) => b.lastUpdated - a.lastUpdated);
  }

  public getUserConsents(userId?: string): DataConsent[] {
    let consents = Array.from(this.consents.values());
    
    if (userId) {
      consents = consents.filter(consent => consent.userId === userId);
    }

    return consents.sort((a, b) => b.timestamp - a.timestamp);
  }

  public getAccessControls(
    userId?: string,
    resourceType?: AccessControl['resourceType']
  ): AccessControl[] {
    let controls = Array.from(this.accessControls.values())
      .filter(control => control.isActive);

    if (userId) {
      controls = controls.filter(control => control.userId === userId);
    }

    if (resourceType) {
      controls = controls.filter(control => control.resourceType === resourceType);
    }

    return controls.sort((a, b) => b.lastModified - a.lastModified);
  }

  public getPrivacySettings(category?: PrivacySetting['category']): PrivacySetting[] {
    let settings = Array.from(this.privacySettings.values());

    if (category) {
      settings = settings.filter(setting => setting.category === category);
    }

    return settings.sort((a, b) => a.name.localeCompare(b.name));
  }

  public getDataSubjectRequests(
    userId?: string,
    status?: DataSubjectRequest['status']
  ): DataSubjectRequest[] {
    let requests = Array.from(this.subjectRequests.values());

    if (userId) {
      requests = requests.filter(request => request.userId === userId);
    }

    if (status) {
      requests = requests.filter(request => request.status === status);
    }

    return requests.sort((a, b) => b.timestamp - a.timestamp);
  }

  public getPrivacyDashboard(): {
    consentStatus: {
      total: number;
      granted: number;
      expired: number;
      byType: { [key: string]: number };
    };
    accessControlStatus: {
      total: number;
      active: number;
      violations: number;
      byResourceType: { [key: string]: number };
    };
    requestStatus: {
      pending: number;
      processing: number;
      completed: number;
      byType: { [key: string]: number };
    };
    settingsCompliance: {
      total: number;
      configured: number;
      default: number;
      byCategory: { [key: string]: number };
    };
  } {
    const consents = Array.from(this.consents.values());
    const controls = Array.from(this.accessControls.values());
    const requests = Array.from(this.subjectRequests.values());
    const settings = Array.from(this.privacySettings.values());

    return {
      consentStatus: {
        total: consents.length,
        granted: consents.filter(c => c.granted && !c.withdrawnAt).length,
        expired: consents.filter(c => c.expiresAt && c.expiresAt < Date.now()).length,
        byType: consents.reduce((acc, consent) => {
          acc[consent.dataType] = (acc[consent.dataType] || 0) + 1;
          return acc;
        }, {} as { [key: string]: number })
      },
      accessControlStatus: {
        total: controls.length,
        active: controls.filter(c => c.isActive).length,
        violations: controls.reduce((total, control) => 
          total + this.checkAccessViolations(control).length, 0
        ),
        byResourceType: controls.reduce((acc, control) => {
          acc[control.resourceType] = (acc[control.resourceType] || 0) + 1;
          return acc;
        }, {} as { [key: string]: number })
      },
      requestStatus: {
        pending: requests.filter(r => r.status === 'pending').length,
        processing: requests.filter(r => r.status === 'processing').length,
        completed: requests.filter(r => r.status === 'completed').length,
        byType: requests.reduce((acc, request) => {
          acc[request.type] = (acc[request.type] || 0) + 1;
          return acc;
        }, {} as { [key: string]: number })
      },
      settingsCompliance: {
        total: settings.length,
        configured: settings.filter(s => s.lastModified > 0).length,
        default: settings.filter(s => s.modifiedBy === 'system').length,
        byCategory: settings.reduce((acc, setting) => {
          acc[setting.category] = (acc[setting.category] || 0) + 1;
          return acc;
        }, {} as { [key: string]: number })
      }
    };
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
    this.callbacks.clear();
    
    // Clear sensitive data from memory
    this.policies.clear();
    this.consents.clear();
    this.accessControls.clear();
    this.privacySettings.clear();
    this.subjectRequests.clear();
  }
}
