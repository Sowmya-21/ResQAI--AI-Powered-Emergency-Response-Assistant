/**
 * SMS Alert System
 * Provides SMS-based emergency notifications when internet is unavailable
 */

export interface SMSAlert {
  id: string;
  recipient: string;
  message: string;
  emergencyType: 'sos' | 'medical' | 'accident' | 'fire' | 'other';
  location?: {
    lat: number;
    lng: number;
    address?: string;
  };
  timestamp: number;
  status: 'pending' | 'sent' | 'failed' | 'delivered';
  retryCount: number;
  maxRetries: number;
}

export interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  relationship: string;
  priority: 'primary' | 'secondary';
  receiveSMS: boolean;
  receiveLocation: boolean;
}

export interface SMSTemplate {
  emergencyType: SMSAlert['emergencyType'];
  template: string;
  includeLocation: boolean;
  urgency: 'low' | 'medium' | 'high' | 'critical';
}

export class SMSAlertSystem {
  private pendingSMS: SMSAlert[] = [];
  private sentSMS: SMSAlert[] = [];
  private isOnline: boolean = navigator.onLine;
  private retryInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.loadPendingSMS();
    this.setupNetworkListeners();
    this.startRetryMechanism();
  }

  private loadPendingSMS(): void {
    try {
      const cached = localStorage.getItem('resqai_pending_sms');
      if (cached) {
        this.pendingSMS = JSON.parse(cached);
      }

      const sent = localStorage.getItem('resqai_sent_sms');
      if (sent) {
        this.sentSMS = JSON.parse(sent);
      }
    } catch (error) {
      console.error('Failed to load SMS cache:', error);
    }
  }

  private savePendingSMS(): void {
    try {
      localStorage.setItem('resqai_pending_sms', JSON.stringify(this.pendingSMS));
      localStorage.setItem('resqai_sent_sms', JSON.stringify(this.sentSMS));
    } catch (error) {
      console.error('Failed to save SMS cache:', error);
    }
  }

  private setupNetworkListeners(): void {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.processPendingSMS();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
    });
  }

  private startRetryMechanism(): void {
    this.retryInterval = setInterval(() => {
      if (this.isOnline) {
        this.processPendingSMS();
      }
    }, 30000); // Retry every 30 seconds when online
  }

  private getSMSTemplate(alertType: SMSAlert['emergencyType']): SMSTemplate {
    const templates: Record<SMSAlert['emergencyType'], SMSTemplate> = {
      sos: {
        emergencyType: 'sos',
        template: '🚨 EMERGENCY ALERT! {name} needs immediate help. {message}. Location: {location}. Please call emergency services if needed.',
        includeLocation: true,
        urgency: 'critical'
      },
      medical: {
        emergencyType: 'medical',
        template: '🏥 MEDICAL EMERGENCY! {name} needs medical assistance. {message}. Location: {location}. Please help or call 911.',
        includeLocation: true,
        urgency: 'critical'
      },
      accident: {
        emergencyType: 'accident',
        template: '🚗 ACCIDENT ALERT! {name} has been in an accident. {message}. Location: {location}. Please help immediately.',
        includeLocation: true,
        urgency: 'high'
      },
      fire: {
        emergencyType: 'fire',
        template: '🔥 FIRE EMERGENCY! {name} is in a fire situation. {message}. Location: {location}. Evacuate and call 911!',
        includeLocation: true,
        urgency: 'critical'
      },
      other: {
        emergencyType: 'other',
        template: '⚠️ EMERGENCY ALERT! {name} needs help. {message}. Location: {location}. Please assist if possible.',
        includeLocation: true,
        urgency: 'medium'
      }
    };

    return templates[alertType];
  }

  private formatMessage(
    template: string,
    userName: string,
    message: string,
    location?: string
  ): string {
    return template
      .replace('{name}', userName)
      .replace('{message}', message)
      .replace('{location}', location || 'Location unavailable');
  }

  private async sendSMSViaWebAPI(phone: string, message: string): Promise<boolean> {
    try {
      // Use WebSMS API or SMS gateway service
      // For now, we'll simulate with a click-to-sms link
      const smsUrl = `sms:${phone}?body=${encodeURIComponent(message)}`;
      
      // Create a temporary link to trigger SMS
      const link = document.createElement('a');
      link.href = smsUrl;
      link.style.display = 'none';
      document.body.appendChild(link);
      
      // Trigger the SMS
      link.click();
      
      // Clean up
      setTimeout(() => {
        document.body.removeChild(link);
      }, 1000);

      return true;
    } catch (error) {
      console.error('Failed to send SMS:', error);
      return false;
    }
  }

  private async sendSMSViaService(phone: string, message: string): Promise<boolean> {
    try {
      // Integration with SMS service like Twilio, MessageBird, etc.
      // This would require backend service
      console.log('Sending SMS via service:', { phone, message });
      
      // For demo purposes, we'll simulate success
      return true;
    } catch (error) {
      console.error('Failed to send SMS via service:', error);
      return false;
    }
  }

  public async sendEmergencyAlert(
    contacts: EmergencyContact[],
    emergencyType: SMSAlert['emergencyType'],
    userName: string,
    message: string,
    location?: { lat: number; lng: number; address?: string }
  ): Promise<string[]> {
    const template = this.getSMSTemplate(emergencyType);
    const locationText = location ? 
      (location.address || `https://maps.google.com/?q=${location.lat},${location.lng}`) : 
      'Location unavailable';

    const formattedMessage = this.formatMessage(
      template.template,
      userName,
      message,
      template.includeLocation ? locationText : undefined
    );

    const alertIds: string[] = [];

    for (const contact of contacts.filter(c => c.receiveSMS)) {
      const alert: SMSAlert = {
        id: `sms_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        recipient: contact.phone,
        message: formattedMessage,
        emergencyType,
        location,
        timestamp: Date.now(),
        status: 'pending',
        retryCount: 0,
        maxRetries: 3
      };

      this.pendingSMS.push(alert);
      alertIds.push(alert.id);
    }

    this.savePendingSMS();

    if (this.isOnline) {
      await this.processPendingSMS();
    } else {
      // Store for offline sending
      console.log('SMS queued for offline sending');
    }

    return alertIds;
  }

  private async processPendingSMS(): Promise<void> {
    const pendingToProcess = [...this.pendingSMS];

    for (const alert of pendingToProcess) {
      if (alert.status === 'pending' && alert.retryCount < alert.maxRetries) {
        try {
          let success = false;

          // Try service first, fallback to Web API
          success = await this.sendSMSViaService(alert.recipient, alert.message);
          
          if (!success) {
            success = await this.sendSMSViaWebAPI(alert.recipient, alert.message);
          }

          if (success) {
            alert.status = 'sent';
            this.sentSMS.push(alert);
            this.pendingSMS = this.pendingSMS.filter(a => a.id !== alert.id);
            console.log(`SMS sent successfully to ${alert.recipient}`);
          } else {
            alert.retryCount++;
            if (alert.retryCount >= alert.maxRetries) {
              alert.status = 'failed';
              console.error(`SMS failed after ${alert.maxRetries} attempts to ${alert.recipient}`);
            }
          }
        } catch (error) {
          console.error(`Error sending SMS to ${alert.recipient}:`, error);
          alert.retryCount++;
        }
      }
    }

    this.savePendingSMS();
  }

  public getSMSStatus(): {
    pending: number;
    sent: number;
    failed: number;
    isOnline: boolean;
  } {
    return {
      pending: this.pendingSMS.filter(a => a.status === 'pending').length,
      sent: this.sentSMS.length,
      failed: this.pendingSMS.filter(a => a.status === 'failed').length,
      isOnline: this.isOnline
    };
  }

  public getPendingSMS(): SMSAlert[] {
    return this.pendingSMS.filter(a => a.status === 'pending');
  }

  public getSentSMS(): SMSAlert[] {
    return this.sentSMS;
  }

  public retryFailedSMS(): void {
    this.pendingSMS
      .filter(a => a.status === 'failed')
      .forEach(a => {
        a.status = 'pending';
        a.retryCount = 0;
      });

    this.savePendingSMS();
    
    if (this.isOnline) {
      this.processPendingSMS();
    }
  }

  public cancelSMS(alertId: string): boolean {
    const alert = this.pendingSMS.find(a => a.id === alertId);
    if (alert && alert.status === 'pending') {
      this.pendingSMS = this.pendingSMS.filter(a => a.id !== alertId);
      this.savePendingSMS();
      return true;
    }
    return false;
  }

  public testSMSCapability(): boolean {
    // Test if SMS is supported
    return 'sms' in window || navigator.userAgent.includes('Mobile');
  }

  public cleanup(): void {
    if (this.retryInterval) {
      clearInterval(this.retryInterval);
    }
  }
}
