/**
 * Behavior Analysis System
 * Analyzes user behavior patterns for safety and emergency prediction
 */

export interface BehaviorPattern {
  id: string;
  name: string;
  type: 'location' | 'temporal' | 'movement' | 'social' | 'device';
  description: string;
  confidence: number; // 0-100
  frequency: number; // occurrences per time period
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  isActive: boolean;
  lastDetected: number;
  data: {
    [key: string]: any;
  };
}

export interface BehaviorEvent {
  id: string;
  type: 'location_update' | 'movement_pattern' | 'device_usage' | 'social_interaction' | 'emergency_action';
  timestamp: number;
  data: {
    [key: string]: any;
  };
  location?: {
    lat: number;
    lng: number;
  };
  context: {
    timeOfDay: number;
    dayOfWeek: number;
    weather?: string;
    connectivity?: boolean;
  };
}

export interface BehaviorProfile {
  id: string;
  userId: string;
  createdAt: number;
  lastUpdated: number;
  patterns: BehaviorPattern[];
  baseline: {
    typicalLocations: Array<{
      lat: number;
      lng: number;
      frequency: number;
      timeSpent: number;
    }>;
    activeHours: {
      start: number;
      end: number;
    };
    movementSpeed: {
      average: number;
      variance: number;
    };
    deviceUsage: {
      [key: string]: number;
    };
  };
  anomalies: Array<{
    id: string;
    type: string;
    description: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    timestamp: number;
    resolved: boolean;
  }>;
}

export interface AnomalyDetection {
  id: string;
  type: 'unusual_location' | 'erratic_movement' | 'deviation_from_routine' | 'abnormal_inactivity' | 'unusual_device_usage';
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number; // 0-100
  description: string;
  timestamp: number;
  location?: {
    lat: number;
    lng: number;
  };
  baselineData: any;
  currentData: any;
  recommendations: string[];
}

export class BehaviorAnalysisSystem {
  private behaviorProfile: BehaviorProfile | null = null;
  private events: BehaviorEvent[] = [];
  private patterns: Map<string, BehaviorPattern> = new Map();
  private anomalies: AnomalyDetection[] = [];
  private analysisInterval: NodeJS.Timeout | null = null;
  private callbacks: Map<string, Function[]> = new Map();

  constructor() {
    this.loadBehaviorData();
    this.initializePatterns();
    this.startBehaviorAnalysis();
  }

  private loadBehaviorData(): void {
    try {
      const profile = localStorage.getItem('resqai_behavior_profile');
      if (profile) {
        this.behaviorProfile = JSON.parse(profile);
      }

      const events = localStorage.getItem('resqai_behavior_events');
      if (events) {
        this.events = JSON.parse(events);
      }

      const anomalies = localStorage.getItem('resqai_behavior_anomalies');
      if (anomalies) {
        this.anomalies = JSON.parse(anomalies);
      }
    } catch (error) {
      console.error('Failed to load behavior data:', error);
    }

    // Initialize profile if none exists
    if (!this.behaviorProfile) {
      this.createBehaviorProfile();
    }
  }

  private createBehaviorProfile(): void {
    this.behaviorProfile = {
      id: `profile_${Date.now()}`,
      userId: 'current_user',
      createdAt: Date.now(),
      lastUpdated: Date.now(),
      patterns: [],
      baseline: {
        typicalLocations: [],
        activeHours: {
          start: 8,
          end: 22
        },
        movementSpeed: {
          average: 5,
          variance: 2
        },
        deviceUsage: {}
      },
      anomalies: []
    };
  }

  private saveBehaviorData(): void {
    try {
      if (this.behaviorProfile) {
        localStorage.setItem('resqai_behavior_profile', JSON.stringify(this.behaviorProfile));
      }
      localStorage.setItem('resqai_behavior_events', JSON.stringify(this.events));
      localStorage.setItem('resqai_behavior_anomalies', JSON.stringify(this.anomalies));
    } catch (error) {
      console.error('Failed to save behavior data:', error);
    }
  }

  private initializePatterns(): void {
    const defaultPatterns: BehaviorPattern[] = [
      {
        id: 'home_work_pattern',
        name: 'Home-Work Commute Pattern',
        type: 'location',
        description: 'Regular movement between home and work locations',
        confidence: 0,
        frequency: 0,
        riskLevel: 'low',
        isActive: false,
        lastDetected: 0,
        data: {
          homeLocation: null,
          workLocation: null,
          commuteTimes: []
        }
      },
      {
        id: 'night_activity_pattern',
        name: 'Late Night Activity',
        type: 'temporal',
        description: 'Activity during late night hours (10 PM - 4 AM)',
        confidence: 0,
        frequency: 0,
        riskLevel: 'medium',
        isActive: false,
        lastDetected: 0,
        data: {
          occurrences: [],
          averageDuration: 0
        }
      },
      {
        id: 'isolated_location_pattern',
        name: 'Isolated Location Visits',
        type: 'location',
        description: 'Frequent visits to isolated or low-population areas',
        confidence: 0,
        frequency: 0,
        riskLevel: 'medium',
        isActive: false,
        lastDetected: 0,
        data: {
          locations: [],
          visitFrequency: {}
        }
      },
      {
        id: 'erratic_movement_pattern',
        name: 'Erratic Movement Pattern',
        type: 'movement',
        description: 'Unusual or erratic movement patterns',
        confidence: 0,
        frequency: 0,
        riskLevel: 'high',
        isActive: false,
        lastDetected: 0,
        data: {
          speedVariations: [],
          directionChanges: []
        }
      },
      {
        id: 'device_inactivity_pattern',
        name: 'Extended Device Inactivity',
        type: 'device',
        description: 'Unusually long periods of device inactivity',
        confidence: 0,
        frequency: 0,
        riskLevel: 'medium',
        isActive: false,
        lastDetected: 0,
        data: {
          inactivityPeriods: [],
          averageDuration: 0
        }
      }
    ];

    defaultPatterns.forEach(pattern => {
      this.patterns.set(pattern.id, pattern);
    });
  }

  private startBehaviorAnalysis(): void {
    this.analysisInterval = setInterval(() => {
      this.analyzeBehavior();
    }, 60000); // Analyze every minute
  }

  public recordEvent(event: Omit<BehaviorEvent, 'id'>): string {
    const newEvent: BehaviorEvent = {
      ...event,
      id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };

    this.events.push(newEvent);
    this.trimEvents();
    this.updatePatterns(newEvent);
    this.detectAnomalies(newEvent);
    this.saveBehaviorData();

    this.emit('behaviorEvent', newEvent);

    return newEvent.id;
  }

  private trimEvents(): void {
    // Keep only last 1000 events
    if (this.events.length > 1000) {
      this.events = this.events.slice(-1000);
    }
  }

  private updatePatterns(event: BehaviorEvent): void {
    for (const pattern of this.patterns.values()) {
      const updateResult = this.analyzePattern(pattern, event);
      if (updateResult.updated) {
        pattern.confidence = updateResult.confidence;
        pattern.frequency = updateResult.frequency;
        pattern.lastDetected = Date.now();
        pattern.isActive = pattern.confidence > 50;
      }
    }
  }

  private analyzePattern(
    pattern: BehaviorPattern,
    event: BehaviorEvent
  ): { updated: boolean; confidence: number; frequency: number } {
    switch (pattern.id) {
      case 'home_work_pattern':
        return this.analyzeHomeWorkPattern(pattern, event);
      case 'night_activity_pattern':
        return this.analyzeNightActivityPattern(pattern, event);
      case 'isolated_location_pattern':
        return this.analyzeIsolatedLocationPattern(pattern, event);
      case 'erratic_movement_pattern':
        return this.analyzeErraticMovementPattern(pattern, event);
      case 'device_inactivity_pattern':
        return this.analyzeDeviceInactivityPattern(pattern, event);
      default:
        return { updated: false, confidence: pattern.confidence, frequency: pattern.frequency };
    }
  }

  private analyzeHomeWorkPattern(
    pattern: BehaviorPattern,
    event: BehaviorEvent
  ): { updated: boolean; confidence: number; frequency: number } {
    if (event.type !== 'location_update' || !event.location) {
      return { updated: false, confidence: pattern.confidence, frequency: pattern.frequency };
    }

    // This is a simplified analysis - real implementation would be more sophisticated
    const now = new Date(event.timestamp);
    const hour = now.getHours();

    // Assume work hours are 9 AM - 5 PM
    const isWorkHour = hour >= 9 && hour <= 17;
    
    if (isWorkHour) {
      pattern.data.workLocation = event.location;
    } else {
      pattern.data.homeLocation = event.location;
    }

    // Update confidence based on consistency
    pattern.confidence = Math.min(100, pattern.confidence + 2);
    pattern.frequency = Math.min(100, pattern.frequency + 1);

    return { updated: true, confidence: pattern.confidence, frequency: pattern.frequency };
  }

  private analyzeNightActivityPattern(
    pattern: BehaviorPattern,
    event: BehaviorEvent
  ): { updated: boolean; confidence: number; frequency: number } {
    const hour = event.context.timeOfDay;
    const isNightTime = hour >= 22 || hour <= 4;

    if (isNightTime) {
      pattern.data.occurrences.push(event.timestamp);
      pattern.confidence = Math.min(100, pattern.confidence + 3);
      pattern.frequency = Math.min(100, pattern.frequency + 2);
    }

    return { updated: isNightTime, confidence: pattern.confidence, frequency: pattern.frequency };
  }

  private analyzeIsolatedLocationPattern(
    pattern: BehaviorPattern,
    event: BehaviorEvent
  ): { updated: boolean; confidence: number; frequency: number } {
    if (event.type !== 'location_update' || !event.location) {
      return { updated: false, confidence: pattern.confidence, frequency: pattern.frequency };
    }

    // Simplified isolation detection - real implementation would use population density APIs
    const isIsolated = Math.random() > 0.8; // 20% chance of being isolated

    if (isIsolated) {
      const locationKey = `${event.location.lat},${event.location.lng}`;
      pattern.data.locations.push(event.location);
      pattern.data.visitFrequency[locationKey] = (pattern.data.visitFrequency[locationKey] || 0) + 1;
      
      pattern.confidence = Math.min(100, pattern.confidence + 2);
      pattern.frequency = Math.min(100, pattern.frequency + 1);
    }

    return { updated: isIsolated, confidence: pattern.confidence, frequency: pattern.frequency };
  }

  private analyzeErraticMovementPattern(
    pattern: BehaviorPattern,
    event: BehaviorEvent
  ): { updated: boolean; confidence: number; frequency: number } {
    if (event.type !== 'movement_pattern') {
      return { updated: false, confidence: pattern.confidence, frequency: pattern.frequency };
    }

    const speed = event.data.speed || 0;
    const isErratic = speed > 50 || speed < 5; // Unusual speeds

    if (isErratic) {
      pattern.data.speedVariations.push(speed);
      pattern.confidence = Math.min(100, pattern.confidence + 4);
      pattern.frequency = Math.min(100, pattern.frequency + 2);
    }

    return { updated: isErratic, confidence: pattern.confidence, frequency: pattern.frequency };
  }

  private analyzeDeviceInactivityPattern(
    pattern: BehaviorPattern,
    event: BehaviorEvent
  ): { updated: boolean; confidence: number; frequency: number } {
    if (event.type !== 'device_usage') {
      return { updated: false, confidence: pattern.confidence, frequency: pattern.frequency };
    }

    const isActive = event.data.active || false;
    
    if (!isActive) {
      const inactivityDuration = event.data.duration || 0;
      if (inactivityDuration > 3600000) { // More than 1 hour
        pattern.data.inactivityPeriods.push({
          start: event.timestamp - inactivityDuration,
          end: event.timestamp,
          duration: inactivityDuration
        });
        
        pattern.confidence = Math.min(100, pattern.confidence + 3);
        pattern.frequency = Math.min(100, pattern.frequency + 1);
      }
    }

    return { updated: !isActive, confidence: pattern.confidence, frequency: pattern.frequency };
  }

  private detectAnomalies(event: BehaviorEvent): void {
    const anomalies = this.identifyAnomalies(event);
    
    anomalies.forEach(anomaly => {
      this.anomalies.push(anomaly);
      this.emit('anomalyDetected', anomaly);
    });

    this.trimAnomalies();
  }

  private identifyAnomalies(event: BehaviorEvent): AnomalyDetection[] {
    const anomalies: AnomalyDetection[] = [];

    // Unusual location detection
    if (event.type === 'location_update' && event.location) {
      const locationAnomaly = this.detectUnusualLocation(event.location);
      if (locationAnomaly) {
        anomalies.push(locationAnomaly);
      }
    }

    // Erratic movement detection
    if (event.type === 'movement_pattern') {
      const movementAnomaly = this.detectErraticMovement(event.data);
      if (movementAnomaly) {
        anomalies.push(movementAnomaly);
      }
    }

    // Deviation from routine
    const routineAnomaly = this.detectRoutineDeviation(event);
    if (routineAnomaly) {
      anomalies.push(routineAnomaly);
    }

    // Abnormal inactivity
    if (event.type === 'device_usage') {
      const inactivityAnomaly = this.detectAbnormalInactivity(event.data);
      if (inactivityAnomaly) {
        anomalies.push(inactivityAnomaly);
      }
    }

    return anomalies;
  }

  private detectUnusualLocation(location: { lat: number; lng: number }): AnomalyDetection | null {
    if (!this.behaviorProfile) return null;

    const typicalLocations = this.behaviorProfile.baseline.typicalLocations;
    const isUnusual = !typicalLocations.some(typical => {
      const distance = this.calculateDistance(location, typical);
      return distance < 1000; // Within 1km of typical location
    });

    if (isUnusual) {
      return {
        id: `unusual_location_${Date.now()}`,
        type: 'unusual_location',
        severity: 'medium',
        confidence: 75,
        description: 'User is in an unusual location',
        timestamp: Date.now(),
        location,
        baselineData: typicalLocations,
        currentData: location,
        recommendations: [
          'Verify if you are safe',
          'Share your location with trusted contacts',
          'Be aware of your surroundings'
        ]
      };
    }

    return null;
  }

  private detectErraticMovement(data: any): AnomalyDetection | null {
    const speed = data.speed || 0;
    const isErratic = speed > 100 || speed < 0; // Impossible speeds

    if (isErratic) {
      return {
        id: `erratic_movement_${Date.now()}`,
        type: 'erratic_movement',
        severity: 'high',
        confidence: 85,
        description: 'Erratic or impossible movement detected',
        timestamp: Date.now(),
        baselineData: { normalSpeedRange: [5, 50] },
        currentData: { speed },
        recommendations: [
          'Check if device is functioning properly',
          'Verify your current location',
          'Contact emergency services if needed'
        ]
      };
    }

    return null;
  }

  private detectRoutineDeviation(event: BehaviorEvent): AnomalyDetection | null {
    const hour = event.context.timeOfDay;
    const isUnusualTime = hour < 6 || hour > 23;

    if (isUnusualTime && event.type === 'location_update') {
      return {
        id: `routine_deviation_${Date.now()}`,
        type: 'deviation_from_routine',
        severity: 'low',
        confidence: 60,
        description: 'Activity detected outside usual hours',
        timestamp: Date.now(),
        baselineData: { activeHours: this.behaviorProfile?.baseline.activeHours },
        currentData: { currentHour: hour },
        recommendations: [
          'Ensure this activity is intentional',
          'Let someone know your plans',
          'Exercise extra caution'
        ]
      };
    }

    return null;
  }

  private detectAbnormalInactivity(data: any): AnomalyDetection | null {
    const inactivityDuration = data.inactivityDuration || 0;
    const isAbnormal = inactivityDuration > 7200000; // More than 2 hours

    if (isAbnormal) {
      return {
        id: `abnormal_inactivity_${Date.now()}`,
        type: 'abnormal_inactivity',
        severity: 'medium',
        confidence: 70,
        description: 'Unusually long period of device inactivity',
        timestamp: Date.now(),
        baselineData: { normalInactivity: 3600000 }, // 1 hour
        currentData: { inactivityDuration },
        recommendations: [
          'Check if user is safe',
          'Attempt to contact user',
          'Consider emergency check-in'
        ]
      };
    }

    return null;
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

  private trimAnomalies(): void {
    // Keep only last 100 anomalies
    if (this.anomalies.length > 100) {
      this.anomalies = this.anomalies.slice(-100);
    }
  }

  private analyzeBehavior(): void {
    if (!this.behaviorProfile) return;

    // Update baseline data
    this.updateBaseline();

    // Re-analyze patterns
    this.reanalyzePatterns();

    // Check for new anomalies
    this.checkForAnomalies();

    // Update profile
    this.behaviorProfile.lastUpdated = Date.now();
    this.saveBehaviorData();
  }

  private updateBaseline(): void {
    if (!this.behaviorProfile) return;

    // Update typical locations
    const locationEvents = this.events.filter(e => e.type === 'location_update' && e.location);
    const locationFrequency = new Map<string, { lat: number; lng: number; count: number }>();

    locationEvents.forEach(event => {
      if (event.location) {
        const key = `${event.location.lat.toFixed(4)},${event.location.lng.toFixed(4)}`;
        const existing = locationFrequency.get(key);
        if (existing) {
          existing.count++;
        } else {
          locationFrequency.set(key, {
            lat: event.location.lat,
            lng: event.location.lng,
            count: 1
          });
        }
      }
    });

    this.behaviorProfile.baseline.typicalLocations = Array.from(locationFrequency.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map(loc => ({
        lat: loc.lat,
        lng: loc.lng,
        frequency: loc.count,
        timeSpent: 0 // Would calculate from duration data
      }));

    // Update active hours
    const eventHours = this.events.map(e => e.context.timeOfDay);
    if (eventHours.length > 0) {
      const earliest = Math.min(...eventHours);
      const latest = Math.max(...eventHours);
      this.behaviorProfile.baseline.activeHours = {
        start: earliest,
        end: latest
      };
    }
  }

  private reanalyzePatterns(): void {
    // Reset pattern confidence and recalculate
    for (const pattern of this.patterns.values()) {
      pattern.confidence = Math.max(0, pattern.confidence - 1); // Decay over time
      pattern.isActive = pattern.confidence > 50;
    }
  }

  private checkForAnomalies(): void {
    // Check for patterns that might indicate problems
    const activePatterns = Array.from(this.patterns.values()).filter(p => p.isActive);
    
    activePatterns.forEach(pattern => {
      if (pattern.riskLevel === 'high' || pattern.riskLevel === 'critical') {
        // Create anomaly for high-risk patterns
        const anomaly: AnomalyDetection = {
          id: `pattern_anomaly_${pattern.id}_${Date.now()}`,
          type: 'deviation_from_routine',
          severity: pattern.riskLevel,
          confidence: pattern.confidence,
          description: `High-risk behavior pattern detected: ${pattern.name}`,
          timestamp: Date.now(),
          baselineData: { normalRiskLevel: 'low' },
          currentData: { pattern: pattern.name, riskLevel: pattern.riskLevel },
          recommendations: [
            'Review recent activities',
            'Ensure safety measures are in place',
            'Consider changing routines if unsafe'
          ]
        };

        this.anomalies.push(anomaly);
        this.emit('anomalyDetected', anomaly);
      }
    });
  }

  public getBehaviorProfile(): BehaviorProfile | null {
    return this.behaviorProfile;
  }

  public getPatterns(): BehaviorPattern[] {
    return Array.from(this.patterns.values());
  }

  public getActivePatterns(): BehaviorPattern[] {
    return Array.from(this.patterns.values()).filter(p => p.isActive);
  }

  public getAnomalies(severity?: AnomalyDetection['severity']): AnomalyDetection[] {
    let filtered = [...this.anomalies];
    
    if (severity) {
      filtered = filtered.filter(a => a.severity === severity);
    }
    
    return filtered.sort((a, b) => b.timestamp - a.timestamp);
  }

  public acknowledgeAnomaly(anomalyId: string): boolean {
    const anomaly = this.anomalies.find(a => a.id === anomalyId);
    if (anomaly && this.behaviorProfile) {
      const profileAnomaly = {
        id: anomaly.id,
        type: anomaly.type,
        description: anomaly.description,
        severity: anomaly.severity,
        timestamp: anomaly.timestamp,
        resolved: true
      };
      
      this.behaviorProfile.anomalies.push(profileAnomaly);
      this.saveBehaviorData();
      this.emit('anomalyAcknowledged', anomaly);
      
      return true;
    }
    
    return false;
  }

  public getBehaviorInsights(): {
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    confidence: number;
    summary: string;
    recommendations: string[];
  } {
    const activePatterns = this.getActivePatterns();
    const recentAnomalies = this.anomalies.filter(a => 
      Date.now() - a.timestamp < 24 * 60 * 60 * 1000 // Last 24 hours
    );

    let riskLevel: AnomalyDetection['severity'] = 'low';
    let confidence = 50;

    // Determine overall risk level
    if (recentAnomalies.some(a => a.severity === 'critical')) {
      riskLevel = 'critical';
      confidence = 90;
    } else if (recentAnomalies.some(a => a.severity === 'high')) {
      riskLevel = 'high';
      confidence = 80;
    } else if (recentAnomalies.some(a => a.severity === 'medium')) {
      riskLevel = 'medium';
      confidence = 70;
    }

    const summary = this.generateBehaviorSummary(activePatterns, recentAnomalies);
    const recommendations = this.generateBehaviorRecommendations(riskLevel, activePatterns);

    return {
      riskLevel,
      confidence,
      summary,
      recommendations
    };
  }

  private generateBehaviorSummary(
    patterns: BehaviorPattern[],
    anomalies: AnomalyDetection[]
  ): string {
    if (anomalies.length === 0 && patterns.length === 0) {
      return 'Normal behavior patterns detected. No anomalies or unusual activities.';
    }

    if (anomalies.length > 0) {
      return `${anomalies.length} unusual behavior patterns detected recently. Review recommended for safety.`;
    }

    if (patterns.length > 0) {
      return `${patterns.length} established behavior patterns identified. Generally normal activity.`;
    }

    return 'Behavior analysis in progress. More data needed for accurate assessment.';
  }

  private generateBehaviorRecommendations(
    riskLevel: AnomalyDetection['severity'],
    patterns: BehaviorPattern[]
  ): string[] {
    const recommendations: string[] = [];

    switch (riskLevel) {
      case 'critical':
        recommendations.push('Immediate safety check recommended', 'Contact emergency services if needed');
        break;
      case 'high':
        recommendations.push('Review recent activities carefully', 'Consider safety precautions');
        break;
      case 'medium':
        recommendations.push('Monitor behavior patterns', 'Maintain situational awareness');
        break;
      case 'low':
        recommendations.push('Continue normal safety practices', 'Regular check-ins recommended');
        break;
    }

    // Pattern-specific recommendations
    patterns.forEach(pattern => {
      if (pattern.id === 'night_activity_pattern' && pattern.isActive) {
        recommendations.push('Be extra cautious during late night activities');
      }
      if (pattern.id === 'isolated_location_pattern' && pattern.isActive) {
        recommendations.push('Avoid isolated locations when possible');
      }
    });

    return recommendations;
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
    if (this.analysisInterval) {
      clearInterval(this.analysisInterval);
      this.analysisInterval = null;
    }
    this.callbacks.clear();
  }
}
