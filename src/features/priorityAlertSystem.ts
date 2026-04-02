/**
 * Priority Alert System
 * Intelligent alert routing and priority management
 */

export interface PriorityAlert {
  id: string;
  type: 'emergency' | 'safety' | 'health' | 'security' | 'system' | 'user_action';
  priority: 'critical' | 'high' | 'medium' | 'low' | 'info';
  title: string;
  message: string;
  source: {
    component: string;
    userId?: string;
    deviceId?: string;
    location?: {
      lat: number;
      lng: number;
      address?: string;
    };
  };
  urgency: 'immediate' | 'urgent' | 'normal' | 'low';
  escalationLevel: number; // 1-10
  requiresAcknowledgment: boolean;
  autoEscalate: boolean;
  escalationRules: Array<{
    condition: string;
    action: string;
    delay: number; // in minutes
    triggered: boolean;
  }>;
  channels: Array<{
    type: 'push' | 'sms' | 'email' | 'in_app' | 'voice' | 'visual' | 'haptic';
    enabled: boolean;
    priority: number; // 1-10 for channel ordering
    delivered: boolean;
    deliveryAttempts: number;
    lastAttempt: number;
  }>;
  metadata: {
    category: string;
    tags: string[];
    severity: number; // 1-100
    confidence: number; // 0-100
    lifespan: number; // in minutes
  };
  timestamp: number;
  acknowledged: boolean;
  acknowledgedAt?: number;
  acknowledgedBy?: string;
  resolved: boolean;
  resolvedAt?: number;
  resolvedBy?: string;
  resolution?: string;
}

export interface AlertRouting {
  id: string;
  alertId: string;
  rule: string;
  conditions: Array<{
    field: string;
    operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'greater_than' | 'less_than' | 'in_range' | 'not_in_range';
    value: any;
    caseSensitive?: boolean;
  }>;
  actions: Array<{
    type: 'route_to' | 'escalate' | 'suppress' | 'transform' | 'batch';
    target: string;
    parameters?: {
      [key: string]: any;
    };
    delay?: number; // in seconds
  }>;
  priority: number; // 1-100
  isActive: boolean;
  createdAt: number;
  lastTriggered: number;
  triggerCount: number;
}

export interface NotificationChannel {
  id: string;
  type: 'push' | 'sms' | 'email' | 'in_app' | 'voice' | 'visual' | 'haptic';
  name: string;
  enabled: boolean;
  config: {
    endpoint?: string;
    apiKey?: string;
    template?: string;
    maxRetries: number;
    retryDelay: number;
    rateLimit: {
      maxPerMinute: number;
      maxPerHour: number;
      maxPerDay: number;
    };
    customization: {
      sound?: string;
      vibration?: boolean;
      led?: boolean;
      priority?: number;
    };
  };
  status: {
    isAvailable: boolean;
    lastChecked: number;
    errorCount: number;
    lastError?: string;
  };
}

export interface AlertEscalation {
  id: string;
  alertId: string;
  level: number; // Current escalation level
  maxLevel: number; // Maximum escalation level
  currentLevel: number;
  triggeredAt: number;
  escalatedTo: Array<{
    userId?: string;
    role?: string;
    contact?: string;
    method: 'push' | 'sms' | 'email' | 'call' | 'system';
    acknowledged: boolean;
    acknowledgedAt?: number;
  }>;
  rules: Array<{
    condition: string;
    delay: number; // in minutes
    action: string;
    target: string;
    triggered: boolean;
  }>;
  isActive: boolean;
  resolved: boolean;
  resolvedAt?: number;
  resolvedBy?: string;
}

export class PriorityAlertSystem {
  private alerts: Map<string, PriorityAlert> = new Map();
  private routingRules: Map<string, AlertRouting> = new Map();
  private notificationChannels: Map<string, NotificationChannel> = new Map();
  private escalations: Map<string, AlertEscalation> = new Map();
  private alertQueue: PriorityAlert[] = [];
  private processingQueue: PriorityAlert[] = [];
  private isProcessing: boolean = false;
  private callbacks: Map<string, Function[]> = new Map();

  constructor() {
    this.loadAlerts();
    this.loadRoutingRules();
    this.loadNotificationChannels();
    this.loadEscalations();
    this.initializeDefaultChannels();
    this.startAlertProcessing();
    this.startChannelMonitoring();
    this.startEscalationMonitoring();
  }

  private loadAlerts(): void {
    try {
      const alerts = localStorage.getItem('resqai_priority_alerts');
      if (alerts) {
        const alertData = JSON.parse(alerts);
        alertData.forEach((alert: PriorityAlert) => {
          this.alerts.set(alert.id, alert);
        });
      }
    } catch (error) {
      console.error('Failed to load alerts:', error);
    }
  }

  private loadRoutingRules(): void {
    try {
      const rules = localStorage.getItem('resqai_alert_routing');
      if (rules) {
        const ruleData = JSON.parse(rules);
        ruleData.forEach((rule: AlertRouting) => {
          this.routingRules.set(rule.id, rule);
        });
      }
    } catch (error) {
      console.error('Failed to load routing rules:', error);
    }
  }

  private loadNotificationChannels(): void {
    try {
      const channels = localStorage.getItem('resqai_notification_channels');
      if (channels) {
        const channelData = JSON.parse(channels);
        channelData.forEach((channel: NotificationChannel) => {
          this.notificationChannels.set(channel.id, channel);
        });
      }
    } catch (error) {
      console.error('Failed to load notification channels:', error);
    }
  }

  private loadEscalations(): void {
    try {
      const escalations = localStorage.getItem('resqai_alert_escalations');
      if (escalations) {
        const escalationData = JSON.parse(escalations);
        escalationData.forEach((escalation: AlertEscalation) => {
          this.escalations.set(escalation.id, escalation);
        });
      }
    } catch (error) {
      console.error('Failed to load escalations:', error);
    }
  }

  private saveAlerts(): void {
    try {
      const alertData = Array.from(this.alerts.values());
      localStorage.setItem('resqai_priority_alerts', JSON.stringify(alertData));
    } catch (error) {
      console.error('Failed to save alerts:', error);
    }
  }

  private saveRoutingRules(): void {
    try {
      const ruleData = Array.from(this.routingRules.values());
      localStorage.setItem('resqai_alert_routing', JSON.stringify(ruleData));
    } catch (error) {
      console.error('Failed to save routing rules:', error);
    }
  }

  private saveNotificationChannels(): void {
    try {
      const channelData = Array.from(this.notificationChannels.values());
      localStorage.setItem('resqai_notification_channels', JSON.stringify(channelData));
    } catch (error) {
      console.error('Failed to save notification channels:', error);
    }
  }

  private saveEscalations(): void {
    try {
      const escalationData = Array.from(this.escalations.values());
      localStorage.setItem('resqai_alert_escalations', JSON.stringify(escalationData));
    } catch (error) {
      console.error('Failed to save escalations:', error);
    }
  }

  private initializeDefaultChannels(): void {
    if (this.notificationChannels.size === 0) {
      const defaultChannels: NotificationChannel[] = [
        {
          id: 'push',
          type: 'push',
          name: 'Push Notifications',
          enabled: true,
          config: {
            maxRetries: 3,
            retryDelay: 5000,
            rateLimit: {
              maxPerMinute: 10,
              maxPerHour: 100,
              maxPerDay: 1000
            },
            customization: {
              sound: 'default',
              vibration: true,
              led: true,
              priority: 5
            }
          },
          status: {
            isAvailable: true,
            lastChecked: Date.now(),
            errorCount: 0
          }
        },
        {
          id: 'sms',
          type: 'sms',
          name: 'SMS Alerts',
          enabled: true,
          config: {
            maxRetries: 5,
            retryDelay: 30000,
            rateLimit: {
              maxPerMinute: 5,
              maxPerHour: 50,
              maxPerDay: 200
            },
            customization: {
              sound: 'default',
              vibration: true,
              led: true,
              priority: 1
            }
          },
          status: {
            isAvailable: true,
            lastChecked: Date.now(),
            errorCount: 0
          }
        },
        {
          id: 'email',
          type: 'email',
          name: 'Email Notifications',
          enabled: true,
          config: {
            maxRetries: 3,
            retryDelay: 60000,
            rateLimit: {
              maxPerMinute: 3,
              maxPerHour: 30,
              maxPerDay: 300
            },
            customization: {
              sound: 'default',
              vibration: false,
              led: false,
              priority: 2
            }
          },
          status: {
            isAvailable: true,
            lastChecked: Date.now(),
            errorCount: 0
          }
        },
        {
          id: 'in_app',
          type: 'in_app',
          name: 'In-App Notifications',
          enabled: true,
          config: {
            maxRetries: 1,
            retryDelay: 1000,
            rateLimit: {
              maxPerMinute: 10,
              maxPerHour: 100,
              maxPerDay: 500
            },
            customization: {
              sound: 'default',
              vibration: true,
              led: true,
              priority: 3
            }
          },
          status: {
            isAvailable: true,
            lastChecked: Date.now(),
            errorCount: 0
          }
        }
      ];

      defaultChannels.forEach(channel => {
        this.notificationChannels.set(channel.id, channel);
      });

      this.saveNotificationChannels();
    }
  }

  private startAlertProcessing(): void {
    // Process alerts every 5 seconds
    setInterval(() => {
      this.processAlertQueue();
    }, 5000);
  }

  private startChannelMonitoring(): void {
    // Check channel availability every minute
    setInterval(() => {
      this.checkChannelAvailability();
    }, 60000);
  }

  private startEscalationMonitoring(): void {
    // Check escalations every 30 seconds
    setInterval(() => {
      this.processEscalations();
    }, 30000);
  }

  private processEscalations(): void {
    for (const [escalationId, escalation] of this.escalations) {
      if (escalation.isActive && !escalation.resolved) {
        // Check if escalation rules should be triggered
        escalation.rules.forEach(rule => {
          if (!rule.triggered && this.shouldTriggerRule(rule, escalation)) {
            rule.triggered = true;
            this.executeEscalationRule(rule, escalation);
          }
        });
      }
    }
  }

  private shouldTriggerRule(rule: any, escalation: any): boolean {
    // Simple logic for rule triggering
    const timeSinceEscalation = Date.now() - escalation.triggeredAt;
    return timeSinceEscalation > rule.delay * 1000;
  }

  private executeEscalationRule(rule: any, escalation: any): void {
    // Execute escalation action
    console.log(`Executing escalation rule: ${rule.action} for ${escalation.alertId}`);
    // This would integrate with actual notification systems
  }

  public async createAlert(
    type: PriorityAlert['type'],
    priority: PriorityAlert['priority'],
    title: string,
    message: string,
    source: PriorityAlert['source'],
    metadata?: Partial<PriorityAlert['metadata']>,
    channels?: Array<{ type: NotificationChannel['type']; enabled?: boolean }>,
    escalationRules?: PriorityAlert['escalationRules']
  ): Promise<string> {
    const alertId = `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const alert: PriorityAlert = {
      id: alertId,
      type,
      priority,
      title,
      message,
      source,
      urgency: this.determineUrgency(priority),
      escalationLevel: this.calculateEscalationLevel(priority),
      requiresAcknowledgment: priority === 'critical' || priority === 'high',
      autoEscalate: priority === 'critical',
      escalationRules: escalationRules || this.getDefaultEscalationRules(),
      channels: this.initializeAlertChannels(channels),
      metadata: {
        category: this.determineCategory(type),
        tags: this.generateTags(type, priority),
        severity: this.calculateSeverity(priority),
        confidence: 100,
        lifespan: this.calculateLifespan(priority),
        ...metadata
      },
      timestamp: Date.now(),
      acknowledged: false,
      resolved: false
    };

    this.alerts.set(alertId, alert);
    this.alertQueue.push(alert);
    this.saveAlerts();

    // Process immediately for critical alerts
    if (priority === 'critical') {
      await this.processAlert(alert);
    }

    this.emit('alertCreated', alert);
    return alertId;
  }

  private determineUrgency(priority: PriorityAlert['priority']): PriorityAlert['urgency'] {
    switch (priority) {
      case 'critical': return 'immediate';
      case 'high': return 'urgent';
      case 'medium': return 'normal';
      case 'low': return 'low';
      case 'info': return 'low';
      default: return 'normal';
    }
  }

  private calculateEscalationLevel(priority: PriorityAlert['priority']): number {
    switch (priority) {
      case 'critical': return 10;
      case 'high': return 7;
      case 'medium': return 5;
      case 'low': return 3;
      case 'info': return 1;
      default: return 5;
    }
  }

  private calculateSeverity(priority: PriorityAlert['priority']): number {
    switch (priority) {
      case 'critical': return 100;
      case 'high': return 80;
      case 'medium': return 60;
      case 'low': return 40;
      case 'info': return 20;
      default: return 50;
    }
  }

  private calculateLifespan(priority: PriorityAlert['priority']): number {
    switch (priority) {
      case 'critical': return 60; // 1 hour
      case 'high': return 180; // 3 hours
      case 'medium': return 720; // 12 hours
      case 'low': return 1440; // 24 hours
      case 'info': return 2880; // 48 hours
      default: return 720;
    }
  }

  private determineCategory(type: PriorityAlert['type']): string {
    switch (type) {
      case 'emergency': return 'emergency_response';
      case 'safety': return 'safety_monitoring';
      case 'health': return 'health_alerts';
      case 'security': return 'security_incidents';
      case 'system': return 'system_notifications';
      case 'user_action': return 'user_activity';
      default: return 'general';
    }
  }

  private generateTags(type: PriorityAlert['type'], priority: PriorityAlert['priority']): string[] {
    const tags = [type, priority];
    
    if (type === 'emergency') {
      tags.push('emergency', 'user_action');
    }
    
    if (priority === 'critical') {
      tags.push('critical', 'high');
    }

    return tags;
  }

  private initializeAlertChannels(
    channelPreferences?: Array<{ type: NotificationChannel['type']; enabled?: boolean }>
  ): PriorityAlert['channels'] {
    const channels: PriorityAlert['channels'] = [];

    // Default channel priorities based on alert priority
    const channelPriorities = {
      critical: ['push', 'sms', 'voice', 'haptic'],
      high: ['push', 'sms', 'in_app'],
      medium: ['push', 'in_app', 'email'],
      low: ['in_app', 'email'],
      info: ['in_app']
    };

    const defaultChannels = channelPriorities[this.determineUrgency(this.alerts.get(this.alertQueue[this.alertQueue.length - 1]?.id || '')?.priority || 'medium')] || ['push'];

    defaultChannels.forEach(channelType => {
      const channel = this.notificationChannels.get(channelType);
      const userPreference = channelPreferences?.find(p => p.type === channelType);
      
      channels.push({
        type: channelType,
        enabled: userPreference?.enabled !== false && (channel?.enabled || false),
        priority: this.getChannelPriority(channelType, defaultChannels),
        delivered: false,
        deliveryAttempts: 0,
        lastAttempt: 0
      });
    });

    return channels;
  }

  private getChannelPriority(channelType: string, defaultChannels: string[]): number {
    const index = defaultChannels.indexOf(channelType);
    return index >= 0 ? index + 1 : 10; // +1 to make it 1-based, 10 as default
  }

  private getDefaultEscalationRules(): PriorityAlert['escalationRules'] {
    return [
      {
        condition: 'not_acknowledged_within_5_minutes',
        action: 'escalate_to_supervisor',
        delay: 5,
        triggered: false
      },
      {
        condition: 'not_acknowledged_within_15_minutes',
        action: 'escalate_to_emergency_contacts',
        delay: 15,
        triggered: false
      },
      {
        condition: 'not_acknowledged_within_30_minutes',
        action: 'escalate_to_emergency_services',
        delay: 30,
        triggered: false
      }
    ];
  }

  private async processAlertQueue(): Promise<void> {
    if (this.isProcessing || this.alertQueue.length === 0) return;

    this.isProcessing = true;

    try {
      // Sort by priority and timestamp
      const sortedAlerts = this.alertQueue.sort((a, b) => {
        const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1, info: 0 };
        const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
        if (priorityDiff !== 0) return priorityDiff;
        return b.timestamp - a.timestamp;
      });

      // Process top 5 alerts
      const alertsToProcess = sortedAlerts.splice(0, Math.min(5, sortedAlerts.length));
      
      for (const alert of alertsToProcess) {
        await this.processAlert(alert);
        this.alertQueue = this.alertQueue.filter(a => a.id !== alert.id);
      }

      this.saveAlerts();
    } catch (error) {
      console.error('Error processing alert queue:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  private async processAlert(alert: PriorityAlert): Promise<void> {
    try {
      // Apply routing rules
      const routing = this.applyRoutingRules(alert);
      
      if (routing) {
        await this.executeRoutingActions(alert, routing);
      }

      // Send to enabled channels
      await this.sendToChannels(alert);

      // Check escalation rules
      await this.checkEscalationRules(alert);

      this.emit('alertProcessed', alert);
    } catch (error) {
      console.error('Error processing alert:', error);
      this.emit('alertProcessingError', { alert, error });
    }
  }

  private applyRoutingRules(alert: PriorityAlert): AlertRouting | null {
    for (const rule of this.routingRules.values()) {
      if (!rule.isActive) continue;

      const matches = this.evaluateRoutingConditions(alert, rule.conditions);
      if (matches) {
        rule.lastTriggered = Date.now();
        rule.triggerCount++;
        return rule;
      }
    }
    return null;
  }

  private evaluateRoutingConditions(alert: PriorityAlert, conditions: AlertRouting['conditions']): boolean {
    return conditions.every(condition => {
      const alertValue = this.getAlertFieldValue(alert, condition.field);
      return this.evaluateCondition(alertValue, condition.operator, condition.value, condition.caseSensitive);
    });
  }

  private getAlertFieldValue(alert: PriorityAlert, field: string): any {
    const fieldPath = field.split('.');
    let value: any = alert;

    for (const path of fieldPath) {
      value = value?.[path];
    }

    return value;
  }

  private evaluateCondition(
    actualValue: any,
    operator: AlertRouting['conditions'][0]['operator'],
    expectedValue: any,
    caseSensitive: boolean = false
  ): boolean {
    if (typeof actualValue === 'string' && typeof expectedValue === 'string' && !caseSensitive) {
      actualValue = actualValue.toLowerCase();
      expectedValue = expectedValue.toLowerCase();
    }

    switch (operator) {
      case 'equals':
        return actualValue === expectedValue;
      case 'not_equals':
        return actualValue !== expectedValue;
      case 'contains':
        return typeof actualValue === 'string' && actualValue.includes(expectedValue);
      case 'not_contains':
        return typeof actualValue === 'string' && !actualValue.includes(expectedValue);
      case 'greater_than':
        return typeof actualValue === 'number' && actualValue > expectedValue;
      case 'less_than':
        return typeof actualValue === 'number' && actualValue < expectedValue;
      case 'in_range':
        return Array.isArray(expectedValue) && 
               typeof actualValue === 'number' && 
               actualValue >= expectedValue[0] && 
               actualValue <= expectedValue[1];
      case 'not_in_range':
        return !Array.isArray(expectedValue) || 
               typeof actualValue !== 'number' || 
               actualValue < expectedValue[0] || 
               actualValue > expectedValue[1];
      default:
        return false;
    }
  }

  private async executeRoutingActions(alert: PriorityAlert, routing: AlertRouting): Promise<void> {
    for (const action of routing.actions) {
      switch (action.type) {
        case 'route_to':
          await this.routeAlert(alert, action.target, action.parameters);
          break;
        case 'escalate':
          await this.escalateAlert(alert, action.target);
          break;
        case 'suppress':
          await this.suppressAlert(alert.id);
          break;
        case 'transform':
          await this.transformAlert(alert, action.parameters);
          break;
        case 'batch':
          await this.batchAlerts(alert, action.parameters);
          break;
      }
    }
  }

  private async routeAlert(alert: PriorityAlert, target: string, parameters?: any): Promise<void> {
    // This would integrate with other system components
    console.log(`Routing alert ${alert.id} to ${target}`, parameters);
    this.emit('alertRouted', { alert, target, parameters });
  }

  private async escalateAlert(alert: PriorityAlert, target: string): Promise<void> {
    const escalationId = `escalation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const escalation: AlertEscalation = {
      id: escalationId,
      alertId: alert.id,
      level: alert.escalationLevel + 1,
      maxLevel: 10,
      currentLevel: alert.escalationLevel + 1,
      triggeredAt: Date.now(),
      escalatedTo: [{
        role: target,
        method: 'push',
        acknowledged: false
      }],
      rules: alert.escalationRules.map(rule => ({ ...rule, triggered: false } as { condition: string; delay: number; action: string; target: string; triggered: boolean })),
      isActive: true,
      resolved: false
    };

    this.escalations.set(escalationId, escalation);
    this.saveEscalations();
    this.emit('alertEscalated', escalation);
  }

  private async suppressAlert(alertId: string): Promise<void> {
    const alert = this.alerts.get(alertId);
    if (alert) {
      alert.channels.forEach(channel => {
        channel.delivered = true;
        channel.deliveryAttempts = 1;
        channel.lastAttempt = Date.now();
      });
      
      this.alerts.set(alertId, alert);
      this.saveAlerts();
      this.emit('alertSuppressed', alertId);
    }
  }

  private async transformAlert(alert: PriorityAlert, parameters?: any): Promise<void> {
    // Transform alert properties based on parameters
    if (parameters) {
      Object.assign(alert, parameters);
      this.alerts.set(alert.id, alert);
      this.saveAlerts();
      this.emit('alertTransformed', { alert, parameters });
    }
  }

  private async batchAlerts(alert: PriorityAlert, parameters?: any): Promise<void> {
    // Batch multiple alerts together
    console.log(`Batching alert ${alert.id}`, parameters);
    this.emit('alertBatched', { alert, parameters });
  }

  private async sendToChannels(alert: PriorityAlert): Promise<void> {
    const enabledChannels = alert.channels.filter(c => c.enabled);
    
    // Sort by priority
    enabledChannels.sort((a, b) => a.priority - b.priority);

    for (const channel of enabledChannels) {
      try {
        await this.sendToChannel(alert, channel);
      } catch (error) {
        console.error(`Failed to send to channel ${channel.type}:`, error);
        channel.deliveryAttempts++;
        channel.lastAttempt = Date.now();
      }
    }

    this.saveAlerts();
  }

  private async sendToChannel(alert: PriorityAlert, channel: PriorityAlert['channels'][0]): Promise<void> {
    const channelConfig = this.notificationChannels.get(channel.type);
    if (!channelConfig || !channelConfig.enabled) return;

    try {
      switch (channel.type) {
        case 'push':
          await this.sendPushNotification(alert, channelConfig);
          break;
        case 'sms':
          await this.sendSMSNotification(alert, channelConfig);
          break;
        case 'email':
          await this.sendEmailNotification(alert, channelConfig);
          break;
        case 'in_app':
          await this.sendInAppNotification(alert, channelConfig);
          break;
        case 'voice':
          await this.sendVoiceNotification(alert, channelConfig);
          break;
        case 'visual':
          await this.sendVisualNotification(alert, channelConfig);
          break;
        case 'haptic':
          await this.sendHapticNotification(alert, channelConfig);
          break;
      }

      channel.delivered = true;
      channel.lastAttempt = Date.now();
    } catch (error) {
      channel.deliveryAttempts++;
      channel.lastAttempt = Date.now();
      throw error;
    }
  }

  private async sendPushNotification(alert: PriorityAlert, channel: NotificationChannel): Promise<void> {
    // This would integrate with push notification service
    console.log(`Sending push notification: ${alert.title}`);
    this.emit('notificationSent', { alert, channel: 'push', success: true });
  }

  private async sendSMSNotification(alert: PriorityAlert, channel: NotificationChannel): Promise<void> {
    // This would integrate with SMS service
    console.log(`Sending SMS notification: ${alert.title}`);
    this.emit('notificationSent', { alert, channel: 'sms', success: true });
  }

  private async sendEmailNotification(alert: PriorityAlert, channel: NotificationChannel): Promise<void> {
    // This would integrate with email service
    console.log(`Sending email notification: ${alert.title}`);
    this.emit('notificationSent', { alert, channel: 'email', success: true });
  }

  private async sendInAppNotification(alert: PriorityAlert, channel: NotificationChannel): Promise<void> {
    // This would trigger in-app notification UI
    console.log(`Sending in-app notification: ${alert.title}`);
    this.emit('notificationSent', { alert, channel: 'in_app', success: true });
  }

  private async sendVoiceNotification(alert: PriorityAlert, channel: NotificationChannel): Promise<void> {
    // This would use text-to-speech
    console.log(`Sending voice notification: ${alert.title}`);
    this.emit('notificationSent', { alert, channel: 'voice', success: true });
  }

  private async sendVisualNotification(alert: PriorityAlert, channel: NotificationChannel): Promise<void> {
    // This would trigger visual alerts (flashing lights, etc.)
    console.log(`Sending visual notification: ${alert.title}`);
    this.emit('notificationSent', { alert, channel: 'visual', success: true });
  }

  private async sendHapticNotification(alert: PriorityAlert, channel: NotificationChannel): Promise<void> {
    // This would trigger haptic feedback
    console.log(`Sending haptic notification: ${alert.title}`);
    this.emit('notificationSent', { alert, channel: 'haptic', success: true });
  }

  private async checkEscalationRules(alert: PriorityAlert): Promise<void> {
    const now = Date.now();
    const timeSinceAlert = now - alert.timestamp;

    for (const rule of alert.escalationRules) {
      if (rule.triggered) continue;

      const delayMs = rule.delay * 60 * 1000; // Convert minutes to milliseconds
      
      if (timeSinceAlert >= delayMs) {
        rule.triggered = true;
        
        switch (rule.action) {
          case 'escalate_to_supervisor':
            await this.escalateAlert(alert, 'supervisor');
            break;
          case 'escalate_to_emergency_contacts':
            await this.escalateAlert(alert, 'emergency_contacts');
            break;
          case 'escalate_to_emergency_services':
            await this.escalateAlert(alert, 'emergency_services');
            break;
        }

        this.emit('escalationRuleTriggered', { alert, rule });
      }
    }
  }

  private async checkChannelAvailability(): Promise<void> {
    for (const [channelId, channel] of this.notificationChannels) {
      try {
        const isAvailable = await this.testChannelAvailability(channel);
        
        if (channel.status.isAvailable !== isAvailable) {
          channel.status.isAvailable = isAvailable;
          channel.status.lastChecked = Date.now();
          
          if (!isAvailable) {
            channel.status.errorCount++;
          } else {
            channel.status.errorCount = 0;
            channel.status.lastError = undefined;
          }
        }
      } catch (error) {
        channel.status.isAvailable = false;
        channel.status.lastChecked = Date.now();
        channel.status.errorCount++;
        channel.status.lastError = error instanceof Error ? error.message : 'Unknown error';
      }
    }

    this.saveNotificationChannels();
  }

  private async testChannelAvailability(channel: NotificationChannel): Promise<boolean> {
    // This would test actual channel availability
    // For now, simulate availability check
    return Math.random() > 0.1; // 90% availability
  }

  public async acknowledgeAlert(alertId: string, userId: string): Promise<boolean> {
    const alert = this.alerts.get(alertId);
    if (!alert) return false;

    alert.acknowledged = true;
    alert.acknowledgedAt = Date.now();
    alert.acknowledgedBy = userId;

    this.alerts.set(alertId, alert);
    this.saveAlerts();
    this.emit('alertAcknowledged', alert);

    return true;
  }

  public async resolveAlert(alertId: string, resolution: string, resolvedBy?: string): Promise<boolean> {
    const alert = this.alerts.get(alertId);
    if (!alert) return false;

    alert.resolved = true;
    alert.resolvedAt = Date.now();
    alert.resolvedBy = resolvedBy;
    alert.resolution = resolution;

    this.alerts.set(alertId, alert);
    this.saveAlerts();
    this.emit('alertResolved', alert);

    return true;
  }

  public getAlerts(
    type?: PriorityAlert['type'],
    priority?: PriorityAlert['priority'],
    status?: 'acknowledged' | 'unacknowledged' | 'resolved' | 'unresolved',
    limit?: number
  ): PriorityAlert[] {
    let alerts = Array.from(this.alerts.values());

    if (type) {
      alerts = alerts.filter(alert => alert.type === type);
    }

    if (priority) {
      alerts = alerts.filter(alert => alert.priority === priority);
    }

    if (status) {
      switch (status) {
        case 'acknowledged':
          alerts = alerts.filter(alert => alert.acknowledged);
          break;
        case 'unacknowledged':
          alerts = alerts.filter(alert => !alert.acknowledged);
          break;
        case 'resolved':
          alerts = alerts.filter(alert => alert.resolved);
          break;
        case 'unresolved':
          alerts = alerts.filter(alert => !alert.resolved);
          break;
      }
    }

    alerts.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1, info: 0 };
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return b.timestamp - a.timestamp;
    });

    return limit ? alerts.slice(0, limit) : alerts;
  }

  public createRoutingRule(
    name: string,
    conditions: AlertRouting['conditions'],
    actions: AlertRouting['actions'],
    priority: number = 50
  ): string {
    const ruleId = `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const rule: AlertRouting = {
      id: ruleId,
      alertId: '', // Will be set when matched
      rule: name,
      conditions,
      actions,
      priority,
      isActive: true,
      createdAt: Date.now(),
      lastTriggered: 0,
      triggerCount: 0
    };

    this.routingRules.set(ruleId, rule);
    this.saveRoutingRules();
    this.emit('routingRuleCreated', rule);

    return ruleId;
  }

  public getRoutingRules(activeOnly?: boolean): AlertRouting[] {
    let rules = Array.from(this.routingRules.values());
    
    if (activeOnly) {
      rules = rules.filter(rule => rule.isActive);
    }

    return rules.sort((a, b) => b.priority - a.priority);
  }

  public getNotificationChannels(enabledOnly?: boolean): NotificationChannel[] {
    let channels = Array.from(this.notificationChannels.values());
    
    if (enabledOnly) {
      channels = channels.filter(channel => channel.enabled);
    }

    return channels.sort((a, b) => a.type.localeCompare(b.type));
  }

  public getEscalations(activeOnly?: boolean): AlertEscalation[] {
    let escalations = Array.from(this.escalations.values());
    
    if (activeOnly) {
      escalations = escalations.filter(escalation => escalation.isActive);
    }

    return escalations.sort((a, b) => b.triggeredAt - a.triggeredAt);
  }

  public getSystemStatus(): {
    totalAlerts: number;
    unacknowledgedCritical: number;
    channelStatus: {
      available: number;
      unavailable: number;
      total: number;
    };
    queueStatus: {
      pending: number;
      processing: number;
      averageProcessingTime: number;
    };
  } {
    const alerts = Array.from(this.alerts.values());
    const channels = Array.from(this.notificationChannels.values());

    return {
      totalAlerts: alerts.length,
      unacknowledgedCritical: alerts.filter(a => a.priority === 'critical' && !a.acknowledged).length,
      channelStatus: {
        available: channels.filter(c => c.status.isAvailable).length,
        unavailable: channels.filter(c => !c.status.isAvailable).length,
        total: channels.length
      },
      queueStatus: {
        pending: this.alertQueue.length,
        processing: this.processingQueue.length,
        averageProcessingTime: 5000 // Mock value
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
    this.alertQueue = [];
    this.processingQueue = [];
    this.isProcessing = false;
  }
}
