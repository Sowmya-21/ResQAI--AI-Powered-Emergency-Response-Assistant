/**
 * Risk Detection Engine
 * Predictive analysis for potential emergency situations
 */

export interface RiskFactor {
  id: string;
  type: 'location' | 'behavioral' | 'environmental' | 'temporal' | 'social';
  name: string;
  weight: number; // 0-1
  severity: 'low' | 'medium' | 'high' | 'critical';
  value: number; // 0-100
  threshold: number; // Alert threshold
  isActive: boolean;
  lastUpdated: number;
}

export interface RiskAssessment {
  id: string;
  overallRisk: number; // 0-100
  riskLevel: 'minimal' | 'low' | 'moderate' | 'high' | 'extreme';
  factors: RiskFactor[];
  predictions: RiskPrediction[];
  recommendations: string[];
  confidence: number; // 0-100
  timestamp: number;
  location?: {
    lat: number;
    lng: number;
  };
}

export interface RiskPrediction {
  id: string;
  type: 'accident' | 'medical' | 'crime' | 'natural_disaster' | 'other';
  probability: number; // 0-100
  timeframe: string; // e.g., "next 30 minutes", "next 2 hours"
  confidence: number; // 0-100
  factors: string[];
  mitigation: string[];
}

export interface RiskPattern {
  id: string;
  name: string;
  description: string;
  factors: string[];
  conditions: {
    [key: string]: {
      operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
      value: number;
    };
  };
  severity: 'low' | 'medium' | 'high' | 'critical';
  frequency: number; // How often this pattern occurs
  lastDetected: number;
}

export class RiskDetectionEngine {
  private riskFactors: Map<string, RiskFactor> = new Map();
  private riskPatterns: Map<string, RiskPattern> = new Map();
  private historicalData: RiskAssessment[] = [];
  private currentAssessment: RiskAssessment | null = null;
  private detectionInterval: NodeJS.Timeout | null = null;
  private callbacks: Map<string, Function[]> = new Map();

  constructor() {
    this.initializeRiskFactors();
    this.initializeRiskPatterns();
    this.loadHistoricalData();
    this.startRiskDetection();
  }

  private initializeRiskFactors(): void {
    const factors: RiskFactor[] = [
      // Location-based factors
      {
        id: 'high_crime_area',
        type: 'location',
        name: 'High Crime Area',
        weight: 0.25,
        severity: 'high',
        value: 0,
        threshold: 70,
        isActive: false,
        lastUpdated: Date.now()
      },
      {
        id: 'isolated_location',
        type: 'location',
        name: 'Isolated Location',
        weight: 0.20,
        severity: 'medium',
        value: 0,
        threshold: 60,
        isActive: false,
        lastUpdated: Date.now()
      },
      {
        id: 'poor_lighting',
        type: 'environmental',
        name: 'Poor Lighting',
        weight: 0.15,
        severity: 'medium',
        value: 0,
        threshold: 50,
        isActive: false,
        lastUpdated: Date.now()
      },
      
      // Behavioral factors
      {
        id: 'unusual_movement',
        type: 'behavioral',
        name: 'Unusual Movement Pattern',
        weight: 0.20,
        severity: 'medium',
        value: 0,
        threshold: 65,
        isActive: false,
        lastUpdated: Date.now()
      },
      {
        id: 'deviation_from_route',
        type: 'behavioral',
        name: 'Deviation from Normal Route',
        weight: 0.15,
        severity: 'low',
        value: 0,
        threshold: 55,
        isActive: false,
        lastUpdated: Date.now()
      },
      
      // Environmental factors
      {
        id: 'extreme_weather',
        type: 'environmental',
        name: 'Extreme Weather Conditions',
        weight: 0.30,
        severity: 'high',
        value: 0,
        threshold: 75,
        isActive: false,
        lastUpdated: Date.now()
      },
      {
        id: 'poor_visibility',
        type: 'environmental',
        name: 'Poor Visibility',
        weight: 0.20,
        severity: 'medium',
        value: 0,
        threshold: 60,
        isActive: false,
        lastUpdated: Date.now()
      },
      
      // Temporal factors
      {
        id: 'late_night_hours',
        type: 'temporal',
        name: 'Late Night Hours',
        weight: 0.15,
        severity: 'medium',
        value: 0,
        threshold: 50,
        isActive: false,
        lastUpdated: Date.now()
      },
      {
        id: 'weekend_hours',
        type: 'temporal',
        name: 'Weekend Hours',
        weight: 0.10,
        severity: 'low',
        value: 0,
        threshold: 40,
        isActive: false,
        lastUpdated: Date.now()
      },
      
      // Social factors
      {
        id: 'alone_in_area',
        type: 'social',
        name: 'Alone in Area',
        weight: 0.20,
        severity: 'medium',
        value: 0,
        threshold: 55,
        isActive: false,
        lastUpdated: Date.now()
      },
      {
        id: 'no_nearby_help',
        type: 'social',
        name: 'No Nearby Help',
        weight: 0.25,
        severity: 'high',
        value: 0,
        threshold: 70,
        isActive: false,
        lastUpdated: Date.now()
      }
    ];

    factors.forEach(factor => {
      this.riskFactors.set(factor.id, factor);
    });
  }

  private initializeRiskPatterns(): void {
    const patterns: RiskPattern[] = [
      {
        id: 'night_isolation_pattern',
        name: 'Night Isolation Risk',
        description: 'High risk when alone in isolated areas at night',
        factors: ['late_night_hours', 'isolated_location', 'alone_in_area'],
        conditions: {
          'late_night_hours': { operator: 'gte', value: 60 },
          'isolated_location': { operator: 'gte', value: 50 },
          'alone_in_area': { operator: 'gte', value: 50 }
        },
        severity: 'high',
        frequency: 0,
        lastDetected: 0
      },
      {
        id: 'weather_vulnerability_pattern',
        name: 'Weather Vulnerability Risk',
        description: 'Increased risk during extreme weather with poor connectivity',
        factors: ['extreme_weather', 'poor_visibility', 'poor_connectivity'],
        conditions: {
          'extreme_weather': { operator: 'gte', value: 70 },
          'poor_visibility': { operator: 'gte', value: 50 }
        },
        severity: 'high',
        frequency: 0,
        lastDetected: 0
      },
      {
        id: 'crime_area_pattern',
        name: 'High Crime Area Risk',
        description: 'Elevated risk in high crime areas during vulnerable times',
        factors: ['high_crime_area', 'late_night_hours', 'alone_in_area'],
        conditions: {
          'high_crime_area': { operator: 'gte', value: 70 },
          'late_night_hours': { operator: 'gte', value: 50 }
        },
        severity: 'critical',
        frequency: 0,
        lastDetected: 0
      }
    ];

    patterns.forEach(pattern => {
      this.riskPatterns.set(pattern.id, pattern);
    });
  }

  private loadHistoricalData(): void {
    try {
      const cached = localStorage.getItem('resqai_risk_history');
      if (cached) {
        this.historicalData = JSON.parse(cached);
      }
    } catch (error) {
      console.error('Failed to load risk history:', error);
    }
  }

  private saveHistoricalData(): void {
    try {
      localStorage.setItem('resqai_risk_history', JSON.stringify(this.historicalData));
    } catch (error) {
      console.error('Failed to save risk history:', error);
    }
  }

  private startRiskDetection(): void {
    this.detectionInterval = setInterval(() => {
      this.performRiskAssessment();
    }, 30000); // Assess every 30 seconds
  }

  public async performRiskAssessment(
    location?: { lat: number; lng: number }
  ): Promise<RiskAssessment> {
    // Update risk factors with current data
    await this.updateRiskFactors(location);

    // Calculate overall risk
    const overallRisk = this.calculateOverallRisk();
    const riskLevel = this.getRiskLevel(overallRisk);

    // Generate predictions
    const predictions = await this.generateRiskPredictions();

    // Generate recommendations
    const recommendations = this.generateRecommendations();

    // Calculate confidence
    const confidence = this.calculateConfidence();

    const assessment: RiskAssessment = {
      id: `assessment_${Date.now()}`,
      overallRisk,
      riskLevel,
      factors: Array.from(this.riskFactors.values()),
      predictions,
      recommendations,
      confidence,
      timestamp: Date.now(),
      location
    };

    this.currentAssessment = assessment;
    this.historicalData.push(assessment);
    this.trimHistoricalData();
    this.saveHistoricalData();

    // Check for risk patterns
    this.checkRiskPatterns();

    this.emit('riskAssessment', assessment);

    return assessment;
  }

  private async updateRiskFactors(
    location?: { lat: number; lng: number }
  ): Promise<void> {
    for (const factor of this.riskFactors.values()) {
      const newValue = await this.calculateFactorValue(factor.id, location);
      factor.value = newValue;
      factor.isActive = newValue >= factor.threshold;
      factor.lastUpdated = Date.now();
    }
  }

  private async calculateFactorValue(
    factorId: string,
    location?: { lat: number; lng: number }
  ): Promise<number> {
    switch (factorId) {
      case 'high_crime_area':
        return await this.calculateCrimeRisk(location);
      case 'isolated_location':
        return await this.calculateIsolationRisk(location);
      case 'poor_lighting':
        return await this.calculateLightingRisk();
      case 'unusual_movement':
        return await this.calculateMovementRisk();
      case 'deviation_from_route':
        return await this.calculateRouteDeviationRisk();
      case 'extreme_weather':
        return await this.calculateWeatherRisk(location);
      case 'poor_visibility':
        return await this.calculateVisibilityRisk();
      case 'late_night_hours':
        return this.calculateTimeRisk();
      case 'weekend_hours':
        return this.calculateWeekendRisk();
      case 'alone_in_area':
        return await this.calculateAloneRisk(location);
      case 'no_nearby_help':
        return await this.calculateHelpAvailabilityRisk(location);
      default:
        return 0;
    }
  }

  private async calculateCrimeRisk(
    location?: { lat: number; lng: number }
  ): Promise<number> {
    // Simulate crime risk calculation
    // In real implementation, this would use crime data APIs
    const baseRisk = 30;
    const timeMultiplier = this.isNightTime() ? 1.5 : 1.0;
    const locationVariation = Math.random() * 40;
    
    return Math.min(100, baseRisk * timeMultiplier + locationVariation);
  }

  private async calculateIsolationRisk(
    location?: { lat: number; lng: number }
  ): Promise<number> {
    // Simulate isolation risk based on population density and nearby help
    const populationDensity = Math.random() * 100; // Simulated
    const nearbyHelp = Math.random() * 100; // Simulated
    
    const isolationScore = Math.max(0, 100 - populationDensity - nearbyHelp);
    return isolationScore;
  }

  private async calculateLightingRisk(): Promise<number> {
    const hour = new Date().getHours();
    const isNight = hour >= 20 || hour <= 6;
    
    if (!isNight) return 10; // Low risk during day
    
    // Simulate lighting conditions
    const lightingQuality = Math.random() * 100;
    return Math.max(0, 100 - lightingQuality);
  }

  private async calculateMovementRisk(): Promise<number> {
    // Simulate movement pattern analysis
    // In real implementation, this would analyze GPS data patterns
    const movementIrregularity = Math.random() * 100;
    return movementIrregularity;
  }

  private async calculateRouteDeviationRisk(): Promise<number> {
    // Simulate route deviation analysis
    // In real implementation, this would compare with historical routes
    const deviationAmount = Math.random() * 100;
    return deviationAmount;
  }

  private async calculateWeatherRisk(
    location?: { lat: number; lng: number }
  ): Promise<number> {
    // Simulate weather risk calculation
    const weatherConditions = ['clear', 'cloudy', 'rain', 'storm', 'snow'];
    const currentWeather = weatherConditions[Math.floor(Math.random() * weatherConditions.length)];
    
    const weatherRisk: { [key: string]: number } = {
      'clear': 10,
      'cloudy': 20,
      'rain': 40,
      'storm': 85,
      'snow': 60
    };
    
    return weatherRisk[currentWeather] || 30;
  }

  private async calculateVisibilityRisk(): Promise<number> {
    const hour = new Date().getHours();
    const weatherRisk = await this.calculateWeatherRisk();
    
    let visibilityRisk = 0;
    
    // Time-based visibility
    if (hour >= 20 || hour <= 6) {
      visibilityRisk += 40;
    }
    
    // Weather-based visibility
    if (weatherRisk > 60) {
      visibilityRisk += 30;
    }
    
    return Math.min(100, visibilityRisk);
  }

  private calculateTimeRisk(): number {
    const hour = new Date().getHours();
    
    // Risk increases significantly during late night hours
    if (hour >= 22 || hour <= 4) return 80;
    if (hour >= 20 || hour <= 6) return 60;
    if (hour >= 18 || hour <= 8) return 40;
    
    return 20;
  }

  private calculateWeekendRisk(): number {
    const day = new Date().getDay();
    const isWeekend = day === 0 || day === 6; // Sunday or Saturday
    
    return isWeekend ? 60 : 30;
  }

  private async calculateAloneRisk(
    location?: { lat: number; lng: number }
  ): Promise<number> {
    // Simulate detection of nearby people
    const nearbyPeople = Math.random() * 10; // Simulated count
    
    if (nearbyPeople === 0) return 90;
    if (nearbyPeople <= 2) return 60;
    if (nearbyPeople <= 5) return 30;
    
    return 10;
  }

  private async calculateHelpAvailabilityRisk(
    location?: { lat: number; lng: number }
  ): Promise<number> {
    // Simulate help availability (emergency services, nearby helpers, etc.)
    const emergencyServicesDistance = Math.random() * 10; // km
    const nearbyHelpers = Math.random() * 5; // count
    
    let riskScore = 0;
    
    if (emergencyServicesDistance > 5) riskScore += 40;
    if (nearbyHelpers === 0) riskScore += 30;
    if (emergencyServicesDistance > 10) riskScore += 30;
    
    return Math.min(100, riskScore);
  }

  private calculateOverallRisk(): number {
    let weightedRisk = 0;
    let totalWeight = 0;

    for (const factor of this.riskFactors.values()) {
      if (factor.isActive) {
        weightedRisk += factor.value * factor.weight;
        totalWeight += factor.weight;
      }
    }

    // If no active factors, return minimal risk
    if (totalWeight === 0) return 5;

    return Math.round(weightedRisk / totalWeight);
  }

  private getRiskLevel(risk: number): RiskAssessment['riskLevel'] {
    if (risk <= 20) return 'minimal';
    if (risk <= 40) return 'low';
    if (risk <= 60) return 'moderate';
    if (risk <= 80) return 'high';
    return 'extreme';
  }

  private async generateRiskPredictions(): Promise<RiskPrediction[]> {
    const predictions: RiskPrediction[] = [];
    const activeFactors = Array.from(this.riskFactors.values()).filter(f => f.isActive);

    // Medical emergency prediction
    const medicalRisk = this.calculateMedicalRisk(activeFactors);
    if (medicalRisk > 30) {
      predictions.push({
        id: `medical_${Date.now()}`,
        type: 'medical',
        probability: medicalRisk,
        timeframe: 'next 2 hours',
        confidence: 75,
        factors: ['extreme_weather', 'isolated_location'],
        mitigation: ['Stay hydrated', 'Keep emergency contacts informed', 'Have medical supplies ready']
      });
    }

    // Accident prediction
    const accidentRisk = this.calculateAccidentRisk(activeFactors);
    if (accidentRisk > 40) {
      predictions.push({
        id: `accident_${Date.now()}`,
        type: 'accident',
        probability: accidentRisk,
        timeframe: 'next 30 minutes',
        confidence: 80,
        factors: ['poor_visibility', 'unusual_movement', 'extreme_weather'],
        mitigation: ['Reduce speed', 'Increase following distance', 'Use extra caution']
      });
    }

    // Crime prediction
    const crimeRisk = this.calculateCrimePredictionRisk(activeFactors);
    if (crimeRisk > 50) {
      predictions.push({
        id: `crime_${Date.now()}`,
        type: 'crime',
        probability: crimeRisk,
        timeframe: 'next hour',
        confidence: 70,
        factors: ['high_crime_area', 'late_night_hours', 'alone_in_area'],
        mitigation: ['Stay in well-lit areas', 'Travel with others', 'Keep phone accessible']
      });
    }

    return predictions;
  }

  private calculateMedicalRisk(factors: RiskFactor[]): number {
    let risk = 0;
    
    factors.forEach(factor => {
      if (factor.id === 'extreme_weather') risk += factor.value * 0.4;
      if (factor.id === 'isolated_location') risk += factor.value * 0.3;
      if (factor.id === 'no_nearby_help') risk += factor.value * 0.3;
    });
    
    return Math.min(100, risk);
  }

  private calculateAccidentRisk(factors: RiskFactor[]): number {
    let risk = 0;
    
    factors.forEach(factor => {
      if (factor.id === 'poor_visibility') risk += factor.value * 0.4;
      if (factor.id === 'extreme_weather') risk += factor.value * 0.3;
      if (factor.id === 'unusual_movement') risk += factor.value * 0.3;
    });
    
    return Math.min(100, risk);
  }

  private calculateCrimePredictionRisk(factors: RiskFactor[]): number {
    let risk = 0;
    
    factors.forEach(factor => {
      if (factor.id === 'high_crime_area') risk += factor.value * 0.4;
      if (factor.id === 'late_night_hours') risk += factor.value * 0.3;
      if (factor.id === 'alone_in_area') risk += factor.value * 0.3;
    });
    
    return Math.min(100, risk);
  }

  private generateRecommendations(): string[] {
    const recommendations: string[] = [];
    const activeFactors = Array.from(this.riskFactors.values()).filter(f => f.isActive);

    activeFactors.forEach(factor => {
      switch (factor.id) {
        case 'high_crime_area':
          recommendations.push('Avoid this area if possible', 'Stay alert and aware of surroundings');
          break;
        case 'isolated_location':
          recommendations.push('Share your location with trusted contacts', 'Keep phone fully charged');
          break;
        case 'poor_lighting':
          recommendations.push('Use flashlight or phone light', 'Stick to well-lit paths');
          break;
        case 'extreme_weather':
          recommendations.push('Seek shelter immediately', 'Monitor weather updates');
          break;
        case 'late_night_hours':
          recommendations.push('Consider postponing travel', 'Use trusted transportation');
          break;
        case 'alone_in_area':
          recommendations.push('Contact someone to check in', 'Consider traveling with others');
          break;
      }
    });

    // Remove duplicates
    return [...new Set(recommendations)];
  }

  private calculateConfidence(): number {
    const activeFactors = Array.from(this.riskFactors.values()).filter(f => f.isActive);
    const totalFactors = this.riskFactors.size;
    
    // Higher confidence with more active factors
    let confidence = (activeFactors.length / totalFactors) * 50;
    
    // Add confidence based on data quality
    confidence += 30; // Base confidence
    
    // Add confidence based on historical accuracy
    const historicalAccuracy = this.calculateHistoricalAccuracy();
    confidence += historicalAccuracy * 0.2;
    
    return Math.min(100, Math.round(confidence));
  }

  private calculateHistoricalAccuracy(): number {
    if (this.historicalData.length < 10) return 50;
    
    // In real implementation, this would compare predictions with actual outcomes
    return 75; // Placeholder
  }

  private checkRiskPatterns(): void {
    for (const pattern of this.riskPatterns.values()) {
      const isPatternDetected = this.evaluatePattern(pattern);
      
      if (isPatternDetected) {
        pattern.frequency++;
        pattern.lastDetected = Date.now();
        this.emit('riskPatternDetected', pattern);
      }
    }
  }

  private evaluatePattern(pattern: RiskPattern): boolean {
    for (const [factorId, condition] of Object.entries(pattern.conditions)) {
      const factor = this.riskFactors.get(factorId);
      if (!factor) continue;
      
      const meetsCondition = this.evaluateCondition(factor.value, condition);
      if (!meetsCondition) return false;
    }
    
    return true;
  }

  private evaluateCondition(
    value: number,
    condition: { operator: string; value: number }
  ): boolean {
    switch (condition.operator) {
      case 'gt': return value > condition.value;
      case 'lt': return value < condition.value;
      case 'eq': return value === condition.value;
      case 'gte': return value >= condition.value;
      case 'lte': return value <= condition.value;
      default: return false;
    }
  }

  private isNightTime(): boolean {
    const hour = new Date().getHours();
    return hour >= 20 || hour <= 6;
  }

  private trimHistoricalData(): void {
    // Keep only last 1000 assessments
    if (this.historicalData.length > 1000) {
      this.historicalData = this.historicalData.slice(-1000);
    }
  }

  public getCurrentAssessment(): RiskAssessment | null {
    return this.currentAssessment;
  }

  public getHistoricalData(): RiskAssessment[] {
    return this.historicalData;
  }

  public getRiskFactors(): RiskFactor[] {
    return Array.from(this.riskFactors.values());
  }

  public getRiskPatterns(): RiskPattern[] {
    return Array.from(this.riskPatterns.values());
  }

  public updateRiskFactor(factorId: string, updates: Partial<RiskFactor>): void {
    const factor = this.riskFactors.get(factorId);
    if (factor) {
      Object.assign(factor, updates);
      this.emit('riskFactorUpdated', factor);
    }
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
    if (this.detectionInterval) {
      clearInterval(this.detectionInterval);
      this.detectionInterval = null;
    }
    this.callbacks.clear();
  }
}
