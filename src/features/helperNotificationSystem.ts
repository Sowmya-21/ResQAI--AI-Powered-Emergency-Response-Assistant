import { db, ref, set, update, get, push, onValue, off } from '../firebase';

/**
 * Comprehensive Helper Notification System
 * Multi-channel notifications with priority routing, geofencing, and response tracking.
 */

export interface Helper {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  location?: {
    lat: number;
    lng: number;
  };
  trustScore: number; // 0-100
  isOnline: boolean;
  notificationPreferences: {
    push: boolean;
    sms: boolean;
    email: boolean;
    quietHours: {
      enabled: boolean;
      start: string; // HH:MM
      end: string; // HH:MM
    };
    maxNotificationsPerHour: number;
    languages: string[];
  };
  capabilities: string[];
  currentLoad: number; // 0-100 (how busy they are)
  lastActive: number;
}

export interface EmergencyNotification {
  id: string;
  emergencyId: string;
  type: 'medical' | 'accident' | 'fire' | 'security' | 'disaster' | 'other';
  priority: 'critical' | 'urgent' | 'normal' | 'low';
  location: {
    lat: number;
    lng: number;
    address?: string;
  };
  description: string;
  timestamp: number;
  requiredSkills?: string[];
  estimatedDuration?: number; // minutes
  urgency: 'immediate' | 'within_30_min' | 'within_hour' | 'flexible';
  affectedPeople: number;
  specialInstructions?: string;
}

export interface NotificationDelivery {
  id: string;
  helperId: string;
  notificationId: string;
  channels: {
    push?: {
      sent: boolean;
      timestamp?: number;
      response?: 'delivered' | 'read' | 'clicked';
      responseTimestamp?: number;
    };
    sms?: {
      sent: boolean;
      timestamp?: number;
      response?: 'delivered' | 'failed';
      responseTimestamp?: number;
      errorCode?: string;
    };
    email?: {
      sent: boolean;
      timestamp?: number;
      response?: 'delivered' | 'opened' | 'clicked';
      responseTimestamp?: number;
    };
  };
  status: 'pending' | 'sent' | 'delivered' | 'responded' | 'declined' | 'failed';
  response?: {
    type: 'accept' | 'decline' | 'busy';
    message?: string;
    estimatedArrival?: number; // minutes
    timestamp: number;
  };
  createdAt: number;
  expiresAt: number;
  escalationLevel: number; // 0-3
}

export interface NotificationAnalytics {
  totalSent: number;
  delivered: number;
  responded: number;
  accepted: number;
  declined: number;
  failed: number;
  averageResponseTime: number; // minutes
  channelPerformance: {
    push: { sent: number; delivered: number; responded: number };
    sms: { sent: number; delivered: number; responded: number };
    email: { sent: number; delivered: number; responded: number };
  };
  timeToFirstResponse: number; // minutes
  acceptanceRate: number; // percentage
}

export class HelperNotificationSystem {
  private readonly NOTIFICATION_TIMEOUTS = {
    critical: 5 * 60 * 1000, // 5 minutes
    urgent: 15 * 60 * 1000, // 15 minutes
    normal: 30 * 60 * 1000, // 30 minutes
    low: 60 * 60 * 1000 // 1 hour
  };

  private readonly MAX_ESCALATION_LEVELS = 3;
  private readonly MAX_HELPER_DISTANCE = 5000; // 5km in meters

  /**
   * Send emergency notifications to suitable helpers with intelligent routing
   */
  public async notifyHelpers(
    emergency: EmergencyNotification,
    availableHelpers: Helper[]
  ): Promise<string[]> {
    const notificationId = push(ref(db, 'emergencyNotifications')).key!;
    
    // Store emergency notification
    await set(ref(db, `emergencyNotifications/${notificationId}`), emergency);
    
    // Filter and prioritize helpers
    const suitableHelpers = this.filterSuitableHelpers(emergency, availableHelpers);
    const prioritizedHelpers = this.prioritizeHelpers(emergency, suitableHelpers);
    
    // Create notification deliveries
    const deliveries: NotificationDelivery[] = [];
    const notificationPromises: Promise<void>[] = [];
    
    for (const helper of prioritizedHelpers) {
      const delivery: NotificationDelivery = {
        id: push(ref(db, 'notificationDeliveries')).key!,
        helperId: helper.id,
        notificationId,
        channels: {},
        status: 'pending',
        createdAt: Date.now(),
        expiresAt: Date.now() + this.NOTIFICATION_TIMEOUTS[emergency.priority],
        escalationLevel: 0
      };
      
      deliveries.push(delivery);
      
      // Store delivery
      await set(ref(db, `notificationDeliveries/${delivery.id}`), delivery);
      
      // Send notifications through preferred channels
      notificationPromises.push(
        this.sendNotificationToHelper(helper, emergency, delivery)
      );
    }
    
    // Wait for all notifications to be sent
    await Promise.allSettled(notificationPromises);
    
    // Start monitoring for responses and escalation
    this.startResponseMonitoring(notificationId, deliveries);
    
    return deliveries.map(d => d.id);
  }

  /**
   * Filter helpers based on emergency requirements and preferences
   */
  private filterSuitableHelpers(emergency: EmergencyNotification, helpers: Helper[]): Helper[] {
    return helpers.filter(helper => {
      // Must be online
      if (!helper.isOnline) return false;
      
      // Must be within reasonable distance
      if (helper.location && emergency.location) {
        const distance = this.calculateDistance(
          helper.location,
          emergency.location
        );
        if (distance > this.MAX_HELPER_DISTANCE) return false;
      }
      
      // Check quiet hours (unless critical)
      if (emergency.priority !== 'critical' && helper.notificationPreferences.quietHours.enabled) {
        const now = new Date();
        const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        const { start, end } = helper.notificationPreferences.quietHours;
        
        if (this.isTimeInRange(currentTime, start, end)) return false;
      }
      
      // Check required skills
      if (emergency.requiredSkills && emergency.requiredSkills.length > 0) {
        const hasRequiredSkill = emergency.requiredSkills.some(skill => 
          helper.capabilities.includes(skill)
        );
        if (!hasRequiredSkill) return false;
      }
      
      // Check current load (don't overload helpers)
      if (helper.currentLoad > 80) return false;
      
      // Check minimum trust score
      if (helper.trustScore < 30) return false;
      
      return true;
    });
  }

  /**
   * Prioritize helpers based on multiple factors
   */
  private prioritizeHelpers(emergency: EmergencyNotification, helpers: Helper[]): Helper[] {
    return helpers.sort((a, b) => {
      let scoreA = 0;
      let scoreB = 0;
      
      // Trust score (40% weight)
      scoreA += a.trustScore * 0.4;
      scoreB += b.trustScore * 0.4;
      
      // Distance (30% weight) - closer is better
      if (a.location && b.location && emergency.location) {
        const distA = this.calculateDistance(a.location, emergency.location);
        const distB = this.calculateDistance(b.location, emergency.location);
        scoreA += (1 - Math.min(distA / this.MAX_HELPER_DISTANCE, 1)) * 0.3;
        scoreB += (1 - Math.min(distB / this.MAX_HELPER_DISTANCE, 1)) * 0.3;
      }
      
      // Current load (20% weight) - less busy is better
      scoreA += (1 - a.currentLoad / 100) * 0.2;
      scoreB += (1 - b.currentLoad / 100) * 0.2;
      
      // Recent activity (10% weight) - more recently active is better
      const now = Date.now();
      const hoursSinceA = (now - a.lastActive) / (60 * 60 * 1000);
      const hoursSinceB = (now - b.lastActive) / (60 * 60 * 1000);
      scoreA += Math.max(0, 1 - hoursSinceA / 24) * 0.1;
      scoreB += Math.max(0, 1 - hoursSinceB / 24) * 0.1;
      
      return scoreB - scoreA; // Higher score first
    });
  }

  /**
   * Send notification to helper through preferred channels
   */
  private async sendNotificationToHelper(
    helper: Helper,
    emergency: EmergencyNotification,
    delivery: NotificationDelivery
  ): Promise<void> {
    const message = this.createNotificationMessage(emergency, helper);
    const channels = helper.notificationPreferences;
    
    const promises: Promise<void>[] = [];
    
    // Push notification
    if (channels.push) {
      promises.push(this.sendPushNotification(helper, emergency, message, delivery));
    }
    
    // SMS notification
    if (channels.sms && helper.phone) {
      promises.push(this.sendSMSNotification(helper, emergency, message, delivery));
    }
    
    // Email notification
    if (channels.email && helper.email) {
      promises.push(this.sendEmailNotification(helper, emergency, message, delivery));
    }
    
    await Promise.allSettled(promises);
    
    // Update delivery status
    await update(ref(db, `notificationDeliveries/${delivery.id}`), {
      channels: delivery.channels,
      status: this.getDeliveryStatus(delivery.channels)
    });
  }

  /**
   * Send push notification
   */
  private async sendPushNotification(
    helper: Helper,
    emergency: EmergencyNotification,
    message: string,
    delivery: NotificationDelivery
  ): Promise<void> {
    try {
      // In production, integrate with push notification services (Firebase Cloud Messaging, etc.)
      console.log(`Push notification sent to ${helper.name}:`, message);
      
      delivery.channels.push = {
        sent: true,
        timestamp: Date.now(),
        response: 'delivered'
      };
      
      // Store in Firebase for real-time delivery
      await set(ref(db, `helperNotifications/${helper.id}/${delivery.id}`), {
        type: 'push',
        emergency,
        message,
        timestamp: Date.now(),
        read: false
      });
    } catch (error) {
      console.error(`Push notification failed for ${helper.name}:`, error);
      delivery.channels.push = {
        sent: true,
        timestamp: Date.now(),
        response: 'failed'
      };
    }
  }

  /**
   * Send SMS notification
   */
  private async sendSMSNotification(
    helper: Helper,
    emergency: EmergencyNotification,
    message: string,
    delivery: NotificationDelivery
  ): Promise<void> {
    try {
      // In production, integrate with SMS services (Twilio, etc.)
      console.log(`SMS sent to ${helper.phone}:`, message);
      
      delivery.channels.sms = {
        sent: true,
        timestamp: Date.now(),
        response: 'delivered'
      };
    } catch (error) {
      console.error(`SMS failed for ${helper.name}:`, error);
      delivery.channels.sms = {
        sent: true,
        timestamp: Date.now(),
        response: 'failed',
        errorCode: 'SMS_SERVICE_ERROR'
      };
    }
  }

  /**
   * Send email notification
   */
  private async sendEmailNotification(
    helper: Helper,
    emergency: EmergencyNotification,
    message: string,
    delivery: NotificationDelivery
  ): Promise<void> {
    try {
      // In production, integrate with email services (SendGrid, etc.)
      console.log(`Email sent to ${helper.email}:`, message);
      
      delivery.channels.email = {
        sent: true,
        timestamp: Date.now(),
        response: 'delivered'
      };
    } catch (error) {
      console.error(`Email failed for ${helper.name}:`, error);
      delivery.channels.email = {
        sent: true,
        timestamp: Date.now(),
        response: 'failed'
      };
    }
  }

  /**
   * Create personalized notification message
   */
  private createNotificationMessage(emergency: EmergencyNotification, helper: Helper): string {
    const priorityText = {
      critical: '🚨 CRITICAL',
      urgent: '⚡ URGENT',
      normal: '📢 Emergency',
      low: 'ℹ️ Assistance needed'
    };
    
    const distanceText = helper.location && emergency.location
      ? ` (${Math.round(this.calculateDistance(helper.location, emergency.location) / 100) / 10}km away)`
      : '';
    
    return `${priorityText[emergency.priority]}: ${emergency.description}${distanceText}. ${emergency.specialInstructions || ''}`;
  }

  /**
   * Start monitoring for responses and handle escalation
   */
  private startResponseMonitoring(notificationId: string, deliveries: NotificationDelivery[]): void {
    const checkInterval = setInterval(async () => {
      const now = Date.now();
      let allExpired = true;
      
      for (const delivery of deliveries) {
        if (now < delivery.expiresAt && delivery.status === 'pending') {
          allExpired = false;
          
          // Check for timeout and escalate if needed
          if (now > delivery.expiresAt && delivery.escalationLevel < this.MAX_ESCALATION_LEVELS) {
            await this.escalateNotification(delivery);
          }
        }
      }
      
      if (allExpired) {
        clearInterval(checkInterval);
      }
    }, 30000); // Check every 30 seconds
  }

  /**
   * Escalate notification to next level
   */
  private async escalateNotification(delivery: NotificationDelivery): Promise<void> {
    delivery.escalationLevel++;
    
    // Get helper and emergency details
    const helperSnapshot = await get(ref(db, `helpers/${delivery.helperId}`));
    const emergencySnapshot = await get(ref(db, `emergencyNotifications/${delivery.notificationId}`));
    
    if (!helperSnapshot.exists() || !emergencySnapshot.exists()) return;
    
    const helper = helperSnapshot.val() as Helper;
    const emergency = emergencySnapshot.val() as EmergencyNotification;
    
    // Try alternative notification channels
    const unusedChannels = this.getUnusedChannels(helper, delivery);
    
    for (const channel of unusedChannels) {
      try {
        if (channel === 'push') {
          await this.sendPushNotification(helper, emergency, 
            `ESCALATION: ${this.createNotificationMessage(emergency, helper)}`, delivery);
        } else if (channel === 'sms' && helper.phone) {
          await this.sendSMSNotification(helper, emergency, 
            `ESCALATION: ${this.createNotificationMessage(emergency, helper)}`, delivery);
        } else if (channel === 'email' && helper.email) {
          await this.sendEmailNotification(helper, emergency, 
            `ESCALATION: ${this.createNotificationMessage(emergency, helper)}`, delivery);
        }
        
        // Update expiration for escalation
        delivery.expiresAt = Date.now() + (this.NOTIFICATION_TIMEOUTS[emergency.priority] / 2);
        break;
      } catch (error) {
        console.error(`Escalation failed for ${channel}:`, error);
      }
    }
    
    await update(ref(db, `notificationDeliveries/${delivery.id}`), {
      escalationLevel: delivery.escalationLevel,
      channels: delivery.channels,
      expiresAt: delivery.expiresAt
    });
  }

  /**
   * Handle helper response to notification
   */
  public async handleHelperResponse(
    deliveryId: string,
    response: NotificationDelivery['response']
  ): Promise<void> {
    const deliverySnapshot = await get(ref(db, `notificationDeliveries/${deliveryId}`));
    
    if (!deliverySnapshot.exists()) return;
    
    const delivery = deliverySnapshot.val() as NotificationDelivery;
    
    await update(ref(db, `notificationDeliveries/${deliveryId}`), {
      status: response.type === 'accept' ? 'responded' : 'declined',
      response: {
        ...response,
        timestamp: Date.now()
      }
    });
    
    // Update helper current load if accepted
    if (response.type === 'accept') {
      await update(ref(db, `helpers/${delivery.helperId}`), {
        currentLoad: Math.min(100, (await get(ref(db, `helpers/${delivery.helperId}/currentLoad`))).val() + 20)
      });
    }
  }

  /**
   * Get notification analytics
   */
  public async getNotificationAnalytics(notificationId: string): Promise<NotificationAnalytics> {
    const deliveriesSnapshot = await get(ref(db, 'notificationDeliveries'));
    
    if (!deliveriesSnapshot.exists()) {
      return this.createDefaultAnalytics();
    }
    
    const deliveries = Object.values(deliveriesSnapshot.val())
      .filter((d: any) => d.notificationId === notificationId) as NotificationDelivery[];
    
    const analytics = this.calculateAnalytics(deliveries);
    
    return analytics;
  }

  /**
   * Cancel notification (if emergency is resolved)
   */
  public async cancelNotification(notificationId: string): Promise<void> {
    const deliveriesSnapshot = await get(ref(db, 'notificationDeliveries'));
    
    if (!deliveriesSnapshot.exists()) return;
    
    const deliveries = Object.values(deliveriesSnapshot.val())
      .filter((d: any) => d.notificationId === notificationId) as NotificationDelivery[];
    
    for (const delivery of deliveries) {
      await update(ref(db, `notificationDeliveries/${delivery.id}`), {
        status: 'failed',
        expiresAt: Date.now()
      });
    }
  }

  /**
   * Helper methods
   */
  private calculateDistance(loc1: { lat: number; lng: number }, loc2: { lat: number; lng: number }): number {
    const R = 6371000; // Earth's radius in meters
    const dLat = (loc2.lat - loc1.lat) * Math.PI / 180;
    const dLon = (loc2.lng - loc1.lng) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(loc1.lat * Math.PI / 180) * Math.cos(loc2.lat * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  private isTimeInRange(current: string, start: string, end: string): boolean {
    const currentMinutes = parseInt(current.split(':')[0]) * 60 + parseInt(current.split(':')[1]);
    const startMinutes = parseInt(start.split(':')[0]) * 60 + parseInt(start.split(':')[1]);
    const endMinutes = parseInt(end.split(':')[0]) * 60 + parseInt(end.split(':')[1]);
    
    if (startMinutes <= endMinutes) {
      return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
    } else {
      // Overnight range (e.g., 22:00 to 06:00)
      return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
    }
  }

  private getDeliveryStatus(channels: NotificationDelivery['channels']): NotificationDelivery['status'] {
    const channelStatuses = Object.values(channels).map(c => c?.response);
    
    if (channelStatuses.includes('delivered') || channelStatuses.includes('read')) {
      return 'delivered';
    } else if (channelStatuses.includes('failed')) {
      return 'failed';
    } else if (channelStatuses.some(c => c !== undefined)) {
      return 'sent';
    }
    
    return 'pending';
  }

  private getUnusedChannels(helper: Helper, delivery: NotificationDelivery): Array<'push' | 'sms' | 'email'> {
    const unused: Array<'push' | 'sms' | 'email'> = [];
    
    if (!delivery.channels.push && helper.notificationPreferences.push) {
      unused.push('push');
    }
    if (!delivery.channels.sms && helper.notificationPreferences.sms && helper.phone) {
      unused.push('sms');
    }
    if (!delivery.channels.email && helper.notificationPreferences.email && helper.email) {
      unused.push('email');
    }
    
    return unused;
  }

  private calculateAnalytics(deliveries: NotificationDelivery[]): NotificationAnalytics {
    const totalSent = deliveries.length;
    const delivered = deliveries.filter(d => d.status === 'delivered').length;
    const responded = deliveries.filter(d => d.status === 'responded').length;
    const accepted = deliveries.filter(d => d.response?.type === 'accept').length;
    const declined = deliveries.filter(d => d.response?.type === 'decline').length;
    const failed = deliveries.filter(d => d.status === 'failed').length;
    
    const responseTimes = deliveries
      .filter(d => d.response)
      .map(d => (d.response!.timestamp - d.createdAt) / (60 * 1000)); // minutes
    
    const averageResponseTime = responseTimes.length > 0 
      ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length 
      : 0;
    
    const channelPerformance = {
      push: { sent: 0, delivered: 0, responded: 0 },
      sms: { sent: 0, delivered: 0, responded: 0 },
      email: { sent: 0, delivered: 0, responded: 0 }
    };
    
    deliveries.forEach(delivery => {
      if (delivery.channels.push?.sent) {
        channelPerformance.push.sent++;
        if (delivery.channels.push.response === 'delivered') channelPerformance.push.delivered++;
        if (delivery.status === 'responded') channelPerformance.push.responded++;
      }
      if (delivery.channels.sms?.sent) {
        channelPerformance.sms.sent++;
        if (delivery.channels.sms.response === 'delivered') channelPerformance.sms.delivered++;
        if (delivery.status === 'responded') channelPerformance.sms.responded++;
      }
      if (delivery.channels.email?.sent) {
        channelPerformance.email.sent++;
        if (delivery.channels.email.response === 'delivered') channelPerformance.email.delivered++;
        if (delivery.status === 'responded') channelPerformance.email.responded++;
      }
    });
    
    const timeToFirstResponse = responseTimes.length > 0 ? Math.min(...responseTimes) : 0;
    const acceptanceRate = responded > 0 ? (accepted / responded) * 100 : 0;
    
    return {
      totalSent,
      delivered,
      responded,
      accepted,
      declined,
      failed,
      averageResponseTime,
      channelPerformance,
      timeToFirstResponse,
      acceptanceRate
    };
  }

  private createDefaultAnalytics(): NotificationAnalytics {
    return {
      totalSent: 0,
      delivered: 0,
      responded: 0,
      accepted: 0,
      declined: 0,
      failed: 0,
      averageResponseTime: 0,
      channelPerformance: {
        push: { sent: 0, delivered: 0, responded: 0 },
        sms: { sent: 0, delivered: 0, responded: 0 },
        email: { sent: 0, delivered: 0, responded: 0 }
      },
      timeToFirstResponse: 0,
      acceptanceRate: 0
    };
  }
}
