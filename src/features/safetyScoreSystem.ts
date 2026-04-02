/**
 * Safety Score System
 * Calculates and tracks user safety scores based on various factors
 */

export interface SafetyFactors {
  locationSafety: number; // 0-100
  timeOfDay: number; // 0-100
  weatherConditions: number; // 0-100
  crimeRate: number; // 0-100
  connectivity: number; // 0-100
  batteryLevel: number; // 0-100
  emergencyContacts: number; // 0-100
  recentIncidents: number; // 0-100
}

export interface SafetyScore {
  overall: number; // 0-100
  factors: SafetyFactors;
  level: 'very_low' | 'low' | 'medium' | 'high' | 'very_high';
  timestamp: number;
  location?: {
    lat: number;
    lng: number;
  };
  recommendations: string[];
  riskFactors: string[];
}

export interface SafetyHistory {
  scores: SafetyScore[];
  trends: {
    daily: number[];
    weekly: number[];
    monthly: number[];
  };
  averageScore: number;
  lowestScore: number;
  highestScore: number;
  lastUpdated: number;
}

export interface SafetyThreshold {
  level: SafetyScore['level'];
  minScore: number;
  maxScore: number;
  color: string;
  actions: string[];
}

export class SafetyScoreSystem {
  private safetyHistory: SafetyHistory;
  private currentScore: SafetyScore | null = null;
  private thresholds: SafetyThreshold[];
  private updateInterval: NodeJS.Timeout | null = null;
  private callbacks: Map<string, Function[]> = new Map();

  constructor() {
    this.safetyHistory = this.loadSafetyHistory();
    this.thresholds = this.initializeThresholds();
    this.startPeriodicUpdates();
  }

  private loadSafetyHistory(): SafetyHistory {
    try {
      const cached = localStorage.getItem('resqai_safety_history');
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      console.error('Failed to load safety history:', error);
    }

    return {
      scores: [],
      trends: {
        daily: [],
        weekly: [],
        monthly: []
      },
      averageScore: 75,
      lowestScore: 100,
      highestScore: 0,
      lastUpdated: Date.now()
    };
  }

  private saveSafetyHistory(): void {
    try {
      localStorage.setItem('resqai_safety_history', JSON.stringify(this.safetyHistory));
    } catch (error) {
      console.error('Failed to save safety history:', error);
    }
  }

  private initializeThresholds(): SafetyThreshold[] {
    return [
      {
        level: 'very_low',
        minScore: 0,
        maxScore: 20,
        color: '#DC2626',
        actions: [
          'Alert emergency contacts immediately',
          'Share location with trusted contacts',
          'Avoid the area if possible',
          'Keep phone accessible and charged'
        ]
      },
      {
        level: 'low',
        minScore: 21,
        maxScore: 40,
        color: '#F97316',
        actions: [
          'Stay alert and aware of surroundings',
          'Inform someone of your location',
          'Keep emergency contacts ready',
          'Avoid isolated areas'
        ]
      },
      {
        level: 'medium',
        minScore: 41,
        maxScore: 60,
        color: '#F59E0B',
        actions: [
          'Exercise normal caution',
          'Keep phone charged',
          'Be aware of exits',
          'Have emergency plan ready'
        ]
      },
      {
        level: 'high',
        minScore: 61,
        maxScore: 80,
        color: '#84CC16',
        actions: [
          'Maintain situational awareness',
          'Keep emergency app accessible',
          'Regular safety check-ins'
        ]
      },
      {
        level: 'very_high',
        minScore: 81,
        maxScore: 100,
        color: '#22C55E',
        actions: [
          'Continue normal activities',
          'Maintain emergency preparedness',
          'Regular safety updates'
        ]
      }
    ];
  }

  private startPeriodicUpdates(): void {
    this.updateInterval = setInterval(() => {
      this.updateSafetyScore();
    }, 60000); // Update every minute
  }

  public async calculateSafetyScore(
    location?: { lat: number; lng: number }
  ): Promise<SafetyScore> {
    const factors = await this.calculateSafetyFactors(location);
    const overall = this.calculateOverallScore(factors);
    const level = this.getSafetyLevel(overall);
    const recommendations = this.generateRecommendations(factors, level);
    const riskFactors = this.identifyRiskFactors(factors);

    const score: SafetyScore = {
      overall,
      factors,
      level,
      timestamp: Date.now(),
      location,
      recommendations,
      riskFactors
    };

    this.currentScore = score;
    this.updateHistory(score);
    this.emit('scoreUpdated', score);

    return score;
  }

  private async calculateSafetyFactors(
    location?: { lat: number; lng: number }
  ): Promise<SafetyFactors> {
    const factors: SafetyFactors = {
      locationSafety: await this.calculateLocationSafety(location),
      timeOfDay: this.calculateTimeOfDaySafety(),
      weatherConditions: await this.calculateWeatherSafety(location),
      crimeRate: await this.calculateCrimeRateSafety(location),
      connectivity: this.calculateConnectivitySafety(),
      batteryLevel: this.calculateBatterySafety(),
      emergencyContacts: this.calculateEmergencyContactsSafety(),
      recentIncidents: this.calculateRecentIncidentsSafety()
    };

    return factors;
  }

  private async calculateLocationSafety(
    location?: { lat: number; lng: number }
  ): Promise<number> {
    if (!location) return 50; // Neutral score if no location

    // Simulate location safety calculation
    // In real implementation, this would use:
    // - Crime data APIs
    // - Safe location databases
    // - User-reported safety data
    // - Historical incident data

    const baseScore = 70;
    const randomVariation = Math.random() * 20 - 10; // ±10 variation
    return Math.max(0, Math.min(100, baseScore + randomVariation));
  }

  private calculateTimeOfDaySafety(): number {
    const hour = new Date().getHours();
    
    // Safety scores by hour (24-hour format)
    const hourSafety: { [key: number]: number } = {
      0: 20, 1: 15, 2: 15, 3: 20, 4: 25, 5: 35,
      6: 50, 7: 65, 8: 75, 9: 80, 10: 85, 11: 85,
      12: 80, 13: 80, 14: 85, 15: 85, 16: 80, 17: 75,
      18: 65, 19: 55, 20: 45, 21: 35, 22: 30, 23: 25
    };

    return hourSafety[hour] || 50;
  }

  private async calculateWeatherSafety(
    location?: { lat: number; lng: number }
  ): Promise<number> {
    // Simulate weather safety calculation
    // In real implementation, this would use weather APIs
    const weatherConditions = ['sunny', 'cloudy', 'rainy', 'stormy', 'snowy'];
    const randomWeather = weatherConditions[Math.floor(Math.random() * weatherConditions.length)];
    
    const weatherSafety: { [key: string]: number } = {
      'sunny': 90,
      'cloudy': 80,
      'rainy': 60,
      'stormy': 25,
      'snowy': 40
    };

    return weatherSafety[randomWeather] || 70;
  }

  private async calculateCrimeRateSafety(
    location?: { lat: number; lng: number }
  ): Promise<number> {
    // Simulate crime rate calculation
    // In real implementation, this would use crime data APIs
    const baseScore = 75;
    const variation = Math.random() * 30 - 15; // ±15 variation
    return Math.max(0, Math.min(100, baseScore + variation));
  }

  private calculateConnectivitySafety(): number {
    const isOnline = navigator.onLine;
    const connection = (navigator as any).connection;
    
    let score = isOnline ? 80 : 30;
    
    if (connection) {
      // Adjust score based on connection quality
      if (connection.effectiveType === '4g') score += 15;
      else if (connection.effectiveType === '3g') score += 5;
      else if (connection.effectiveType === '2g') score -= 10;
    }

    return Math.max(0, Math.min(100, score));
  }

  private calculateBatterySafety(): number {
    if ('getBattery' in navigator) {
      // Use Battery API if available
      return 75; // Placeholder
    }

    // Fallback estimation
    const batteryLevel = this.estimateBatteryLevel();
    
    if (batteryLevel > 75) return 95;
    if (batteryLevel > 50) return 80;
    if (batteryLevel > 25) return 50;
    if (batteryLevel > 10) return 25;
    return 10;
  }

  private estimateBatteryLevel(): number {
    // This is a rough estimation - real implementation would use Battery API
    return Math.random() * 100;
  }

  private calculateEmergencyContactsSafety(): number {
    // Get number of emergency contacts
    const contacts = this.getEmergencyContacts();
    const contactCount = contacts.length;
    
    if (contactCount >= 3) return 95;
    if (contactCount >= 2) return 80;
    if (contactCount >= 1) return 60;
    return 20;
  }

  private getEmergencyContacts(): any[] {
    try {
      const contacts = localStorage.getItem('resqai_emergency_contacts');
      return contacts ? JSON.parse(contacts) : [];
    } catch (error) {
      return [];
    }
  }

  private calculateRecentIncidentsSafety(): number {
    // Calculate based on recent incidents in the area
    const recentIncidents = this.getRecentIncidents();
    const incidentCount = recentIncidents.length;
    
    if (incidentCount === 0) return 95;
    if (incidentCount <= 2) return 75;
    if (incidentCount <= 5) return 50;
    if (incidentCount <= 10) return 25;
    return 10;
  }

  private getRecentIncidents(): any[] {
    try {
      const incidents = localStorage.getItem('resqai_recent_incidents');
      return incidents ? JSON.parse(incidents) : [];
    } catch (error) {
      return [];
    }
  }

  private calculateOverallScore(factors: SafetyFactors): number {
    const weights = {
      locationSafety: 0.20,
      timeOfDay: 0.15,
      weatherConditions: 0.10,
      crimeRate: 0.20,
      connectivity: 0.10,
      batteryLevel: 0.10,
      emergencyContacts: 0.10,
      recentIncidents: 0.05
    };

    const weightedScore = Object.entries(factors).reduce((total, [factor, value]) => {
      const weight = weights[factor as keyof SafetyFactors];
      return total + (value * weight);
    }, 0);

    return Math.round(weightedScore);
  }

  private getSafetyLevel(score: number): SafetyScore['level'] {
    if (score <= 20) return 'very_low';
    if (score <= 40) return 'low';
    if (score <= 60) return 'medium';
    if (score <= 80) return 'high';
    return 'very_high';
  }

  private generateRecommendations(
    factors: SafetyFactors,
    level: SafetyScore['level']
  ): string[] {
    const recommendations: string[] = [];
    const threshold = this.thresholds.find(t => t.level === level);
    
    if (threshold) {
      recommendations.push(...threshold.actions);
    }

    // Factor-specific recommendations
    if (factors.batteryLevel < 30) {
      recommendations.push('Charge your device immediately');
    }

    if (factors.connectivity < 50) {
      recommendations.push('Move to an area with better connectivity');
    }

    if (factors.timeOfDay < 40) {
      recommendations.push('Avoid walking alone at night');
    }

    if (factors.emergencyContacts < 60) {
      recommendations.push('Add more emergency contacts');
    }

    return recommendations;
  }

  private identifyRiskFactors(factors: SafetyFactors): string[] {
    const riskFactors: string[] = [];

    Object.entries(factors).forEach(([factor, value]) => {
      if (value < 40) {
        switch (factor) {
          case 'locationSafety':
            riskFactors.push('High-risk location');
            break;
          case 'timeOfDay':
            riskFactors.push('Late night hours');
            break;
          case 'weatherConditions':
            riskFactors.push('Poor weather conditions');
            break;
          case 'crimeRate':
            riskFactors.push('High crime rate area');
            break;
          case 'connectivity':
            riskFactors.push('Poor network connectivity');
            break;
          case 'batteryLevel':
            riskFactors.push('Low battery level');
            break;
          case 'emergencyContacts':
            riskFactors.push('Insufficient emergency contacts');
            break;
          case 'recentIncidents':
            riskFactors.push('Recent incidents in area');
            break;
        }
      }
    });

    return riskFactors;
  }

  private updateHistory(score: SafetyScore): void {
    this.safetyHistory.scores.push(score);
    
    // Keep only last 1000 scores to prevent memory issues
    if (this.safetyHistory.scores.length > 1000) {
      this.safetyHistory.scores = this.safetyHistory.scores.slice(-1000);
    }

    this.updateTrends();
    this.updateStatistics();
    this.saveSafetyHistory();
  }

  private updateTrends(): void {
    const scores = this.safetyHistory.scores.map(s => s.overall);
    
    // Daily trend (last 24 hours)
    const dailyScores = scores.slice(-24 * 60); // Assuming one score per minute
    this.safetyHistory.trends.daily = this.calculateMovingAverage(dailyScores, 60);
    
    // Weekly trend (last 7 days)
    const weeklyScores = scores.slice(-7 * 24 * 60);
    this.safetyHistory.trends.weekly = this.calculateMovingAverage(weeklyScores, 60 * 24);
    
    // Monthly trend (last 30 days)
    const monthlyScores = scores.slice(-30 * 24 * 60);
    this.safetyHistory.trends.monthly = this.calculateMovingAverage(monthlyScores, 60 * 24 * 7);
  }

  private calculateMovingAverage(data: number[], windowSize: number): number[] {
    const result: number[] = [];
    for (let i = 0; i < data.length; i++) {
      const start = Math.max(0, i - windowSize + 1);
      const window = data.slice(start, i + 1);
      const average = window.reduce((sum, val) => sum + val, 0) / window.length;
      result.push(Math.round(average));
    }
    return result;
  }

  private updateStatistics(): void {
    const scores = this.safetyHistory.scores.map(s => s.overall);
    
    if (scores.length > 0) {
      this.safetyHistory.averageScore = Math.round(
        scores.reduce((sum, score) => sum + score, 0) / scores.length
      );
      this.safetyHistory.lowestScore = Math.min(...scores);
      this.safetyHistory.highestScore = Math.max(...scores);
    }
    
    this.safetyHistory.lastUpdated = Date.now();
  }

  public getCurrentScore(): SafetyScore | null {
    return this.currentScore;
  }

  public getSafetyHistory(): SafetyHistory {
    return this.safetyHistory;
  }

  public getThresholds(): SafetyThreshold[] {
    return this.thresholds;
  }

  public async updateSafetyScore(): Promise<SafetyScore> {
    return await this.calculateSafetyScore();
  }

  public setSafetyThresholds(thresholds: SafetyThreshold[]): void {
    this.thresholds = thresholds;
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
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    this.callbacks.clear();
  }
}
