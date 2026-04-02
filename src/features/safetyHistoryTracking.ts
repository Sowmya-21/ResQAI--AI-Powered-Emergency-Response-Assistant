/**
 * Safety History Tracking and Analytics
 * Tracks and analyzes safety-related events and patterns over time
 */

export interface SafetyEvent {
  id: string;
  type: 'emergency' | 'alert' | 'risk_detected' | 'area_entry' | 'area_exit' | 'sos_triggered' | 'help_requested';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  location?: {
    lat: number;
    lng: number;
    address?: string;
  };
  timestamp: number;
  duration?: number; // in seconds
  resolved: boolean;
  resolutionTime?: number;
  tags: string[];
  metadata: {
    [key: string]: any;
  };
}

export interface SafetyMetrics {
  totalEvents: number;
  eventsByType: { [key: string]: number };
  eventsBySeverity: { [key: string]: number };
  averageResponseTime: number; // in minutes
  averageResolutionTime: number; // in minutes
  riskTrend: 'improving' | 'stable' | 'declining';
  safetyScore: number; // 0-100
  mostActiveLocations: Array<{
    location: { lat: number; lng: number };
    eventCount: number;
    riskLevel: number;
  }>;
  timePatterns: {
    hourly: number[]; // 24 hours
    daily: number[]; // 7 days
    monthly: number[]; // 12 months
  };
}

export interface SafetyReport {
  id: string;
  type: 'daily' | 'weekly' | 'monthly' | 'custom';
  startDate: number;
  endDate: number;
  metrics: SafetyMetrics;
  events: SafetyEvent[];
  insights: string[];
  recommendations: string[];
  generatedAt: number;
}

export interface SafetyGoal {
  id: string;
  title: string;
  description: string;
  target: number;
  current: number;
  unit: string;
  category: 'emergency_reduction' | 'response_time' | 'safety_score' | 'area_avoidance';
  deadline: number;
  achieved: boolean;
  progress: number; // 0-100
}

export class SafetyHistoryTracking {
  private events: SafetyEvent[] = [];
  private reports: SafetyReport[] = [];
  private goals: SafetyGoal[] = [];
  private callbacks: Map<string, Function[]> = new Map();

  constructor() {
    this.loadData();
    this.startPeriodicAnalysis();
  }

  private loadData(): void {
    this.loadEvents();
    this.loadReports();
    this.loadGoals();
  }

  private loadEvents(): void {
    try {
      const cached = localStorage.getItem('resqai_safety_events');
      if (cached) {
        this.events = JSON.parse(cached);
      }
    } catch (error) {
      console.error('Failed to load safety events:', error);
      this.events = [];
    }
  }

  private loadReports(): void {
    try {
      const cached = localStorage.getItem('resqai_safety_reports');
      if (cached) {
        this.reports = JSON.parse(cached);
      }
    } catch (error) {
      console.error('Failed to load safety reports:', error);
      this.reports = [];
    }
  }

  private loadGoals(): void {
    try {
      const cached = localStorage.getItem('resqai_safety_goals');
      if (cached) {
        this.goals = JSON.parse(cached);
      }
    } catch (error) {
      console.error('Failed to load safety goals:', error);
      this.goals = [];
    }
  }

  private saveEvents(): void {
    try {
      localStorage.setItem('resqai_safety_events', JSON.stringify(this.events));
    } catch (error) {
      console.error('Failed to save safety events:', error);
    }
  }

  private saveReports(): void {
    try {
      localStorage.setItem('resqai_safety_reports', JSON.stringify(this.reports));
    } catch (error) {
      console.error('Failed to save safety reports:', error);
    }
  }

  private saveGoals(): void {
    try {
      localStorage.setItem('resqai_safety_goals', JSON.stringify(this.goals));
    } catch (error) {
      console.error('Failed to save safety goals:', error);
    }
  }

  private startPeriodicAnalysis(): void {
    // Generate daily report at midnight
    setInterval(() => {
      const now = new Date();
      if (now.getHours() === 0 && now.getMinutes() === 0) {
        this.generateDailyReport();
      }
    }, 60000); // Check every minute

    // Generate weekly report on Sunday
    setInterval(() => {
      const now = new Date();
      if (now.getDay() === 0 && now.getHours() === 0 && now.getMinutes() === 0) {
        this.generateWeeklyReport();
      }
    }, 60000);

    // Generate monthly report on 1st of month
    setInterval(() => {
      const now = new Date();
      if (now.getDate() === 1 && now.getHours() === 0 && now.getMinutes() === 0) {
        this.generateMonthlyReport();
      }
    }, 60000);
  }

  public addEvent(event: Omit<SafetyEvent, 'id'>): string {
    const newEvent: SafetyEvent = {
      ...event,
      id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };

    this.events.push(newEvent);
    this.trimEvents();
    this.saveEvents();
    this.emit('eventAdded', newEvent);

    // Update related goals
    this.updateGoals();

    return newEvent.id;
  }

  public resolveEvent(eventId: string, resolutionTime?: number): boolean {
    const event = this.events.find(e => e.id === eventId);
    if (!event) return false;

    event.resolved = true;
    event.resolutionTime = resolutionTime || Date.now();
    this.saveEvents();
    this.emit('eventResolved', event);

    return true;
  }

  private trimEvents(): void {
    // Keep only last 10000 events to prevent storage issues
    if (this.events.length > 10000) {
      this.events = this.events.slice(-10000);
    }
  }

  public generateMetrics(startDate?: number, endDate?: number): SafetyMetrics {
    const filteredEvents = this.filterEventsByDate(startDate, endDate);
    
    return {
      totalEvents: filteredEvents.length,
      eventsByType: this.groupEventsByType(filteredEvents),
      eventsBySeverity: this.groupEventsBySeverity(filteredEvents),
      averageResponseTime: this.calculateAverageResponseTime(filteredEvents),
      averageResolutionTime: this.calculateAverageResolutionTime(filteredEvents),
      riskTrend: this.calculateRiskTrend(filteredEvents),
      safetyScore: this.calculateSafetyScore(filteredEvents),
      mostActiveLocations: this.getMostActiveLocations(filteredEvents),
      timePatterns: this.analyzeTimePatterns(filteredEvents)
    };
  }

  private filterEventsByDate(startDate?: number, endDate?: number): SafetyEvent[] {
    let filtered = [...this.events];
    
    if (startDate) {
      filtered = filtered.filter(event => event.timestamp >= startDate);
    }
    
    if (endDate) {
      filtered = filtered.filter(event => event.timestamp <= endDate);
    }
    
    return filtered;
  }

  private groupEventsByType(events: SafetyEvent[]): { [key: string]: number } {
    const grouped: { [key: string]: number } = {};
    
    events.forEach(event => {
      grouped[event.type] = (grouped[event.type] || 0) + 1;
    });
    
    return grouped;
  }

  private groupEventsBySeverity(events: SafetyEvent[]): { [key: string]: number } {
    const grouped: { [key: string]: number } = {};
    
    events.forEach(event => {
      grouped[event.severity] = (grouped[event.severity] || 0) + 1;
    });
    
    return grouped;
  }

  private calculateAverageResponseTime(events: SafetyEvent[]): number {
    const responseEvents = events.filter(event => event.metadata.responseTime);
    if (responseEvents.length === 0) return 0;
    
    const totalTime = responseEvents.reduce((sum, event) => 
      sum + (event.metadata.responseTime || 0), 0);
    
    return Math.round(totalTime / responseEvents.length / 60000); // Convert to minutes
  }

  private calculateAverageResolutionTime(events: SafetyEvent[]): number {
    const resolvedEvents = events.filter(event => event.resolutionTime);
    if (resolvedEvents.length === 0) return 0;
    
    const totalTime = resolvedEvents.reduce((sum, event) => 
      sum + (event.resolutionTime! - event.timestamp), 0);
    
    return Math.round(totalTime / resolvedEvents.length / 60000); // Convert to minutes
  }

  private calculateRiskTrend(events: SafetyEvent[]): 'improving' | 'stable' | 'declining' {
    if (events.length < 10) return 'stable';
    
    // Split events into two halves
    const midpoint = Math.floor(events.length / 2);
    const firstHalf = events.slice(0, midpoint);
    const secondHalf = events.slice(midpoint);
    
    const firstHalfRisk = this.calculateRiskScore(firstHalf);
    const secondHalfRisk = this.calculateRiskScore(secondHalf);
    
    const difference = secondHalfRisk - firstHalfRisk;
    
    if (difference > 10) return 'declining';
    if (difference < -10) return 'improving';
    return 'stable';
  }

  private calculateSafetyScore(events: SafetyEvent[]): number {
    if (events.length === 0) return 100;
    
    let totalRisk = 0;
    let weightSum = 0;
    
    events.forEach(event => {
      const severityWeight = this.getSeverityWeight(event.severity);
      const recencyWeight = this.getRecencyWeight(event.timestamp);
      const weight = severityWeight * recencyWeight;
      
      totalRisk += (100 - this.getRiskScore(event)) * weight;
      weightSum += weight;
    });
    
    return Math.round(weightSum > 0 ? totalRisk / weightSum : 100);
  }

  private getSeverityWeight(severity: SafetyEvent['severity']): number {
    switch (severity) {
      case 'critical': return 1.0;
      case 'high': return 0.8;
      case 'medium': return 0.6;
      case 'low': return 0.4;
      default: return 0.5;
    }
  }

  private getRecencyWeight(timestamp: number): number {
    const now = Date.now();
    const ageInHours = (now - timestamp) / (1000 * 60 * 60);
    
    // More recent events have higher weight
    return Math.max(0.1, 1 - (ageInHours / 168)); // Decay over 1 week
  }

  private getRiskScore(event: SafetyEvent): number {
    switch (event.severity) {
      case 'critical': return 90;
      case 'high': return 70;
      case 'medium': return 50;
      case 'low': return 30;
      default: return 50;
    }
  }

  private getMostActiveLocations(events: SafetyEvent[]): Array<{
    location: { lat: number; lng: number };
    eventCount: number;
    riskLevel: number;
  }> {
    const locationMap = new Map<string, {
      location: { lat: number; lng: number };
      events: SafetyEvent[];
    }>();
    
    events.forEach(event => {
      if (event.location) {
        const key = `${event.location.lat},${event.location.lng}`;
        const existing = locationMap.get(key);
        
        if (existing) {
          existing.events.push(event);
        } else {
          locationMap.set(key, {
            location: event.location,
            events: [event]
          });
        }
      }
    });
    
    return Array.from(locationMap.values())
      .map(data => ({
        location: data.location,
        eventCount: data.events.length,
        riskLevel: this.calculateRiskScore(data.events)
      }))
      .sort((a, b) => b.eventCount - a.eventCount)
      .slice(0, 10); // Top 10 locations
  }

  private calculateRiskScore(events: SafetyEvent[]): number {
    if (events.length === 0) return 0;
    
    const totalRisk = events.reduce((sum, event) => sum + this.getRiskScore(event), 0);
    return Math.round(totalRisk / events.length);
  }

  private analyzeTimePatterns(events: SafetyEvent[]): {
    hourly: number[];
    daily: number[];
    monthly: number[];
  } {
    const hourly = new Array(24).fill(0);
    const daily = new Array(7).fill(0);
    const monthly = new Array(12).fill(0);
    
    events.forEach(event => {
      const date = new Date(event.timestamp);
      
      hourly[date.getHours()]++;
      daily[date.getDay()]++;
      monthly[date.getMonth()]++;
    });
    
    return { hourly, daily, monthly };
  }

  public generateDailyReport(): SafetyReport {
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const endDate = startDate + (24 * 60 * 60 * 1000) - 1;
    
    return this.generateReport('daily', startDate, endDate);
  }

  public generateWeeklyReport(): SafetyReport {
    const now = new Date();
    const startDate = now.getTime() - (7 * 24 * 60 * 60 * 1000);
    const endDate = now.getTime();
    
    return this.generateReport('weekly', startDate, endDate);
  }

  public generateMonthlyReport(): SafetyReport {
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const endDate = now.getTime();
    
    return this.generateReport('monthly', startDate, endDate);
  }

  public generateCustomReport(
    startDate: number,
    endDate: number,
    title?: string
  ): SafetyReport {
    return this.generateReport('custom', startDate, endDate, title);
  }

  private generateReport(
    type: SafetyReport['type'],
    startDate: number,
    endDate: number,
    title?: string
  ): SafetyReport {
    const events = this.filterEventsByDate(startDate, endDate);
    const metrics = this.generateMetrics(startDate, endDate);
    const insights = this.generateInsights(metrics, events);
    const recommendations = this.generateRecommendations(metrics, events);
    
    const report: SafetyReport = {
      id: `report_${type}_${Date.now()}`,
      type,
      startDate,
      endDate,
      metrics,
      events,
      insights,
      recommendations,
      generatedAt: Date.now()
    };
    
    this.reports.push(report);
    this.trimReports();
    this.saveReports();
    this.emit('reportGenerated', report);
    
    return report;
  }

  private generateInsights(metrics: SafetyMetrics, events: SafetyEvent[]): string[] {
    const insights: string[] = [];
    
    // Event frequency insights
    if (metrics.totalEvents > 10) {
      insights.push(`High activity detected with ${metrics.totalEvents} events in this period`);
    } else if (metrics.totalEvents < 3) {
      insights.push('Low activity period with minimal safety events');
    }
    
    // Severity insights
    const criticalEvents = metrics.eventsBySeverity.critical || 0;
    if (criticalEvents > 0) {
      insights.push(`${criticalEvents} critical events require immediate attention`);
    }
    
    // Trend insights
    if (metrics.riskTrend === 'improving') {
      insights.push('Safety trend is improving - keep up the good practices');
    } else if (metrics.riskTrend === 'declining') {
      insights.push('Safety trend is declining - review safety measures');
    }
    
    // Time pattern insights
    const peakHour = metrics.timePatterns.hourly.indexOf(Math.max(...metrics.timePatterns.hourly));
    if (peakHour >= 22 || peakHour <= 4) {
      insights.push('Most events occur during late night hours');
    }
    
    // Location insights
    if (metrics.mostActiveLocations.length > 0) {
      const topLocation = metrics.mostActiveLocations[0];
      insights.push(`Highest activity location with ${topLocation.eventCount} events`);
    }
    
    return insights;
  }

  private generateRecommendations(
    metrics: SafetyMetrics,
    events: SafetyEvent[]
  ): string[] {
    const recommendations: string[] = [];
    
    // Response time recommendations
    if (metrics.averageResponseTime > 5) {
      recommendations.push('Improve emergency response time - practice quick action plans');
    }
    
    // Safety score recommendations
    if (metrics.safetyScore < 70) {
      recommendations.push('Safety score is below optimal - review and improve safety practices');
    }
    
    // Event type recommendations
    const emergencyEvents = metrics.eventsByType.emergency || 0;
    if (emergencyEvents > metrics.totalEvents * 0.5) {
      recommendations.push('High number of emergencies - consider preventive measures');
    }
    
    // Time-based recommendations
    const peakHour = metrics.timePatterns.hourly.indexOf(Math.max(...metrics.timePatterns.hourly));
    if (peakHour >= 22 || peakHour <= 4) {
      recommendations.push('Increase caution during late night hours');
    }
    
    // Location-based recommendations
    if (metrics.mostActiveLocations.length > 0) {
      const topLocation = metrics.mostActiveLocations[0];
      if (topLocation.riskLevel > 70) {
        recommendations.push('Avoid high-risk locations when possible');
      }
    }
    
    return recommendations;
  }

  private trimReports(): void {
    // Keep only last 100 reports
    if (this.reports.length > 100) {
      this.reports = this.reports.slice(-100);
    }
  }

  public createGoal(goal: Omit<SafetyGoal, 'id' | 'progress' | 'achieved'>): string {
    const newGoal: SafetyGoal = {
      ...goal,
      id: `goal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      progress: 0,
      achieved: false
    };
    
    this.goals.push(newGoal);
    this.saveGoals();
    this.emit('goalCreated', newGoal);
    
    return newGoal.id;
  }

  private updateGoals(): void {
    this.goals.forEach(goal => {
      const previousProgress = goal.progress;
      goal.progress = this.calculateGoalProgress(goal);
      goal.achieved = goal.progress >= 100;
      
      if (goal.achieved && previousProgress < 100) {
        this.emit('goalAchieved', goal);
      }
    });
    
    this.saveGoals();
  }

  private calculateGoalProgress(goal: SafetyGoal): number {
    const now = Date.now();
    const timeRange = goal.deadline - (goal.deadline - (30 * 24 * 60 * 60 * 1000)); // Last 30 days
    const recentEvents = this.events.filter(event => 
      event.timestamp >= (now - timeRange)
    );
    
    switch (goal.category) {
      case 'emergency_reduction':
        const emergencyCount = recentEvents.filter(e => e.type === 'emergency').length;
        return Math.max(0, Math.min(100, ((goal.target - emergencyCount) / goal.target) * 100));
        
      case 'response_time':
        const avgResponseTime = this.calculateAverageResponseTime(recentEvents);
        return Math.max(0, Math.min(100, ((goal.target - avgResponseTime) / goal.target) * 100));
        
      case 'safety_score':
        const safetyScore = this.calculateSafetyScore(recentEvents);
        return Math.min(100, (safetyScore / goal.target) * 100);
        
      case 'area_avoidance':
        // This would require location tracking implementation
        return 50; // Placeholder
        
      default:
        return 0;
    }
  }

  public getEvents(
    type?: SafetyEvent['type'],
    severity?: SafetyEvent['severity'],
    startDate?: number,
    endDate?: number,
    limit?: number
  ): SafetyEvent[] {
    let filtered = [...this.events];
    
    if (type) {
      filtered = filtered.filter(event => event.type === type);
    }
    
    if (severity) {
      filtered = filtered.filter(event => event.severity === severity);
    }
    
    if (startDate) {
      filtered = filtered.filter(event => event.timestamp >= startDate);
    }
    
    if (endDate) {
      filtered = filtered.filter(event => event.timestamp <= endDate);
    }
    
    filtered.sort((a, b) => b.timestamp - a.timestamp);
    
    return limit ? filtered.slice(0, limit) : filtered;
  }

  public getReports(type?: SafetyReport['type'], limit?: number): SafetyReport[] {
    let filtered = [...this.reports];
    
    if (type) {
      filtered = filtered.filter(report => report.type === type);
    }
    
    filtered.sort((a, b) => b.generatedAt - a.generatedAt);
    
    return limit ? filtered.slice(0, limit) : filtered;
  }

  public getGoals(includeAchieved?: boolean): SafetyGoal[] {
    let filtered = [...this.goals];
    
    if (!includeAchieved) {
      filtered = filtered.filter(goal => !goal.achieved);
    }
    
    filtered.sort((a, b) => a.deadline - b.deadline);
    
    return filtered;
  }

  public getAnalyticsSummary(): {
    totalEvents: number;
    safetyScore: number;
    activeGoals: number;
    achievedGoals: number;
    recentTrend: 'improving' | 'stable' | 'declining';
  } {
    const last30Days = Date.now() - (30 * 24 * 60 * 60 * 1000);
    const recentEvents = this.events.filter(event => event.timestamp >= last30Days);
    const metrics = this.generateMetrics(last30Days);
    
    return {
      totalEvents: recentEvents.length,
      safetyScore: metrics.safetyScore,
      activeGoals: this.goals.filter(g => !g.achieved).length,
      achievedGoals: this.goals.filter(g => g.achieved).length,
      recentTrend: metrics.riskTrend
    };
  }

  public exportData(format: 'json' | 'csv' = 'json'): string {
    const data = {
      events: this.events,
      reports: this.reports,
      goals: this.goals,
      exportedAt: Date.now()
    };
    
    if (format === 'json') {
      return JSON.stringify(data, null, 2);
    } else {
      return this.convertToCSV(data);
    }
  }

  private convertToCSV(data: any): string {
    // Simple CSV conversion for events
    const headers = ['id', 'type', 'severity', 'title', 'description', 'timestamp', 'resolved'];
    const rows = data.events.map((event: SafetyEvent) => [
      event.id,
      event.type,
      event.severity,
      event.title,
      event.description,
      event.timestamp,
      event.resolved
    ]);
    
    return [headers, ...rows].map(row => row.join(',')).join('\n');
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
  }
}
