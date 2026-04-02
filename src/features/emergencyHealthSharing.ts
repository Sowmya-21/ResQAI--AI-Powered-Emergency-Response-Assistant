/**
 * Emergency Health Sharing
 * Secure sharing of medical information during emergencies
 */

export interface HealthShareRequest {
  id: string;
  requesterId: string;
  requesterType: 'emergency_service' | 'hospital' | 'medical_professional' | 'emergency_contact';
  requesterInfo: {
    name: string;
    organization?: string;
    credentials?: string;
    contact: string;
  };
  purpose: string;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  requestedData: Array<{
    type: 'personal_info' | 'medical_conditions' | 'medications' | 'allergies' | 'emergency_contact' | 'insurance' | 'medical_documents';
    reason: string;
  }>;
  timestamp: number;
  expiresAt: number;
  status: 'pending' | 'approved' | 'denied' | 'expired' | 'accessed';
  accessCode?: string;
  approvedAt?: number;
  accessedAt?: number;
  accessCount: number;
  maxAccess: number;
  location?: {
    lat: number;
    lng: number;
  };
}

export interface HealthShareSession {
  id: string;
  requestId: string;
  profileId: string;
  accessToken: string;
  createdAt: number;
  expiresAt: number;
  accessedAt: number;
  lastAccessAt: number;
  accessCount: number;
  maxAccess: number;
  ipAddress?: string;
  userAgent?: string;
  dataShared: string[];
  isActive: boolean;
}

export interface EmergencyDataPacket {
  id: string;
  profileId: string;
  emergencyType: 'medical' | 'accident' | 'other';
  severity: 'low' | 'medium' | 'high' | 'critical';
  patientInfo: {
    name: string;
    age: number;
    bloodType: string;
    emergencyContact: {
      name: string;
      phone: string;
      relationship: string;
    };
  };
  medicalInfo: {
    conditions: Array<{
      name: string;
      severity: string;
      medications: string[];
    }>;
    medications: Array<{
      name: string;
      dosage: string;
      frequency: string;
    }>;
    allergies: Array<{
      allergen: string;
      severity: string;
      reaction: string;
    }>;
    lastUpdated: string;
  };
  location?: {
    lat: number;
    lng: number;
    address?: string;
    timestamp: number;
  };
  qrCode?: string;
  shortUrl?: string;
  createdAt: number;
  expiresAt: number;
  accessLog: Array<{
    timestamp: number;
    accessor: string;
    purpose: string;
    ipAddress?: string;
  }>;
}

export interface SharingSettings {
  autoShareInEmergency: boolean;
  requireApproval: boolean;
  expireAfterHours: number;
  allowedRequesters: Array<'emergency_service' | 'hospital' | 'medical_professional' | 'emergency_contact'>;
  dataToShare: Array<{
    type: HealthShareRequest['requestedData'][0]['type'];
    enabled: boolean;
    requireApproval: boolean;
  }>;
  notificationSettings: {
    email: boolean;
    sms: boolean;
    push: boolean;
  };
}

export class EmergencyHealthSharing {
  private shareRequests: Map<string, HealthShareRequest> = new Map();
  private shareSessions: Map<string, HealthShareSession> = new Map();
  private emergencyPackets: Map<string, EmergencyDataPacket> = new Map();
  private sharingSettings: SharingSettings;
  private callbacks: Map<string, Function[]> = new Map();

  constructor() {
    this.loadSharingData();
    this.initializeDefaultSettings();
    this.startExpirationMonitoring();
  }

  private loadSharingData(): void {
    try {
      const requests = localStorage.getItem('resqai_health_share_requests');
      if (requests) {
        const requestData = JSON.parse(requests);
        requestData.forEach((req: HealthShareRequest) => {
          this.shareRequests.set(req.id, req);
        });
      }

      const sessions = localStorage.getItem('resqai_health_share_sessions');
      if (sessions) {
        const sessionData = JSON.parse(sessions);
        sessionData.forEach((session: HealthShareSession) => {
          this.shareSessions.set(session.id, session);
        });
      }

      const packets = localStorage.getItem('resqai_emergency_packets');
      if (packets) {
        const packetData = JSON.parse(packets);
        packetData.forEach((packet: EmergencyDataPacket) => {
          this.emergencyPackets.set(packet.id, packet);
        });
      }

      const settings = localStorage.getItem('resqai_sharing_settings');
      if (settings) {
        this.sharingSettings = JSON.parse(settings);
      }
    } catch (error) {
      console.error('Failed to load sharing data:', error);
    }
  }

  private initializeDefaultSettings(): void {
    if (!this.sharingSettings) {
      this.sharingSettings = {
        autoShareInEmergency: true,
        requireApproval: false,
        expireAfterHours: 24,
        allowedRequesters: ['emergency_service', 'hospital', 'medical_professional', 'emergency_contact'],
        dataToShare: [
          { type: 'personal_info', enabled: true, requireApproval: false },
          { type: 'medical_conditions', enabled: true, requireApproval: false },
          { type: 'medications', enabled: true, requireApproval: false },
          { type: 'allergies', enabled: true, requireApproval: false },
          { type: 'emergency_contact', enabled: true, requireApproval: false },
          { type: 'insurance', enabled: false, requireApproval: true },
          { type: 'medical_documents', enabled: false, requireApproval: true }
        ],
        notificationSettings: {
          email: true,
          sms: true,
          push: true
        }
      };
      this.saveSharingSettings();
    }
  }

  private saveSharingData(): void {
    try {
      localStorage.setItem('resqai_health_share_requests', 
        JSON.stringify(Array.from(this.shareRequests.values())));
      localStorage.setItem('resqai_health_share_sessions', 
        JSON.stringify(Array.from(this.shareSessions.values())));
      localStorage.setItem('resqai_emergency_packets', 
        JSON.stringify(Array.from(this.emergencyPackets.values())));
      localStorage.setItem('resqai_sharing_settings', 
        JSON.stringify(this.sharingSettings));
    } catch (error) {
      console.error('Failed to save sharing data:', error);
    }
  }

  private saveSharingSettings(): void {
    try {
      localStorage.setItem('resqai_sharing_settings', JSON.stringify(this.sharingSettings));
    } catch (error) {
      console.error('Failed to save sharing settings:', error);
    }
  }

  private startExpirationMonitoring(): void {
    setInterval(() => {
      this.checkExpirations();
    }, 60000); // Check every minute
  }

  private checkExpirations(): void {
    const now = Date.now();

    // Check expired requests
    for (const request of this.shareRequests.values()) {
      if (request.expiresAt < now && request.status === 'pending') {
        request.status = 'expired';
        this.emit('requestExpired', request);
      }
    }

    // Check expired sessions
    for (const session of this.shareSessions.values()) {
      if (session.expiresAt < now && session.isActive) {
        session.isActive = false;
        this.emit('sessionExpired', session);
      }
    }

    // Check expired emergency packets
    for (const packet of this.emergencyPackets.values()) {
      if (packet.expiresAt < now) {
        this.emergencyPackets.delete(packet.id);
        this.emit('packetExpired', packet);
      }
    }

    this.saveSharingData();
  }

  public async createShareRequest(
    requesterInfo: HealthShareRequest['requesterInfo'],
    requesterType: HealthShareRequest['requesterType'],
    purpose: string,
    urgency: HealthShareRequest['urgency'],
    requestedData: HealthShareRequest['requestedData']
  ): Promise<string> {
    const request: HealthShareRequest = {
      id: `request_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      requesterId: `requester_${Date.now()}`,
      requesterType,
      requesterInfo,
      purpose,
      urgency,
      requestedData,
      timestamp: Date.now(),
      expiresAt: Date.now() + (this.sharingSettings.expireAfterHours * 60 * 60 * 1000),
      status: 'pending',
      accessCount: 0,
      maxAccess: this.getMaxAccessForUrgency(urgency),
      accessCode: this.generateAccessCode()
    };

    this.shareRequests.set(request.id, request);
    this.saveSharingData();
    this.emit('shareRequestCreated', request);

    // Send notifications
    await this.sendRequestNotifications(request);

    return request.id;
  }

  private getMaxAccessForUrgency(urgency: HealthShareRequest['urgency']): number {
    switch (urgency) {
      case 'critical': return 10;
      case 'high': return 5;
      case 'medium': return 3;
      case 'low': return 1;
      default: return 1;
    }
  }

  private generateAccessCode(): string {
    return Math.random().toString(36).substr(2, 8).toUpperCase();
  }

  private async sendRequestNotifications(request: HealthShareRequest): Promise<void> {
    // In a real implementation, this would send actual notifications
    console.log('Sending health share request notifications:', request);
    
    if (this.sharingSettings.notificationSettings.push) {
      this.emit('notificationRequired', {
        type: 'share_request',
        title: 'Medical Information Request',
        message: `${request.requesterInfo.name} is requesting access to your medical information`,
        data: request
      });
    }
  }

  public async approveRequest(requestId: string, approvedBy?: string): Promise<boolean> {
    const request = this.shareRequests.get(requestId);
    if (!request || request.status !== 'pending') return false;

    request.status = 'approved';
    request.approvedAt = Date.now();
    
    this.shareRequests.set(requestId, request);
    this.saveSharingData();
    
    // Create access session
    const session = await this.createShareSession(requestId);
    
    this.emit('requestApproved', { request, session, approvedBy });
    await this.sendApprovalNotifications(request, session);

    return true;
  }

  public async denyRequest(requestId: string, reason?: string): Promise<boolean> {
    const request = this.shareRequests.get(requestId);
    if (!request || request.status !== 'pending') return false;

    request.status = 'denied';
    
    this.shareRequests.set(requestId, request);
    this.saveSharingData();
    
    this.emit('requestDenied', { request, reason });
    await this.sendDenialNotifications(request, reason);

    return true;
  }

  private async createShareSession(requestId: string): Promise<HealthShareSession> {
    const request = this.shareRequests.get(requestId);
    if (!request) throw new Error('Request not found');

    const session: HealthShareSession = {
      id: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      requestId,
      profileId: 'current_profile', // Would get from medical profile system
      accessToken: this.generateAccessToken(),
      createdAt: Date.now(),
      expiresAt: Date.now() + (this.sharingSettings.expireAfterHours * 60 * 60 * 1000),
      accessedAt: Date.now(),
      lastAccessAt: Date.now(),
      accessCount: 0,
      maxAccess: request.maxAccess,
      dataShared: request.requestedData.map(d => d.type),
      isActive: true
    };

    this.shareSessions.set(session.id, session);
    this.saveSharingData();

    return session;
  }

  private generateAccessToken(): string {
    return Buffer.from(`${Date.now()}_${Math.random().toString(36)}`).toString('base64');
  }

  private async sendApprovalNotifications(
    request: HealthShareRequest,
    session: HealthShareSession
  ): Promise<void> {
    console.log('Sending approval notifications:', { request, session });
    
    if (this.sharingSettings.notificationSettings.email) {
      this.emit('notificationRequired', {
        type: 'share_approved',
        title: 'Medical Information Access Approved',
        message: `Your medical information has been shared with ${request.requesterInfo.name}`,
        data: { request, session }
      });
    }
  }

  private async sendDenialNotifications(
    request: HealthShareRequest,
    reason?: string
  ): Promise<void> {
    console.log('Sending denial notifications:', { request, reason });
    
    if (this.sharingSettings.notificationSettings.email) {
      this.emit('notificationRequired', {
        type: 'share_denied',
        title: 'Medical Information Request Denied',
        message: `Your request for medical information access has been denied${reason ? ': ' + reason : ''}`,
        data: { request, reason }
      });
    }
  }

  public async accessSharedData(
    accessToken: string,
    accessCode?: string
  ): Promise<{
    success: boolean;
    data?: any;
    error?: string;
  }> {
    // Find session by access token
    const session = Array.from(this.shareSessions.values())
      .find(s => s.accessToken === accessToken && s.isActive);
    
    if (!session) {
      return { success: false, error: 'Invalid or expired access token' };
    }

    // Find the request
    const request = this.shareRequests.get(session.requestId);
    if (!request) {
      return { success: false, error: 'Associated request not found' };
    }

    // Verify access code if required
    if (request.accessCode && request.accessCode !== accessCode) {
      return { success: false, error: 'Invalid access code' };
    }

    // Check access limits
    if (session.accessCount >= session.maxAccess) {
      return { success: false, error: 'Access limit exceeded' };
    }

    // Update session
    session.accessCount++;
    session.lastAccessAt = Date.now();
    this.shareSessions.set(session.id, session);

    // Get medical data (would integrate with medical profile system)
    const medicalData = await this.getMedicalDataForSharing(session.dataShared);

    // Log access
    this.logAccess(session.id, request.requesterInfo.name, request.purpose);

    this.emit('dataAccessed', { session, request, medicalData });

    return { success: true, data: medicalData };
  }

  private async getMedicalDataForSharing(dataTypes: string[]): Promise<any> {
    // This would integrate with the medical profile storage system
    // For now, return mock data
    return {
      personalInfo: {
        name: 'John Doe',
        age: 35,
        bloodType: 'O+',
        emergencyContact: {
          name: 'Jane Doe',
          phone: '+1-555-0123',
          relationship: 'Spouse'
        }
      },
      medicalConditions: [],
      medications: [],
      allergies: []
    };
  }

  private logAccess(sessionId: string, accessor: string, purpose: string): void {
    // In a real implementation, this would log to secure audit trail
    console.log(`Health data access logged: Session ${sessionId}, Accessor: ${accessor}, Purpose: ${purpose}`);
  }

  public async createEmergencyPacket(
    emergencyType: EmergencyDataPacket['emergencyType'],
    severity: EmergencyDataPacket['severity'],
    location?: { lat: number; lng: number; address?: string }
  ): Promise<string> {
    // Get critical medical info (would integrate with medical profile system)
    const patientInfo = await this.getEmergencyPatientInfo();
    const medicalInfo = await this.getEmergencyMedicalInfo();

    const packet: EmergencyDataPacket = {
      id: `packet_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      profileId: 'current_profile',
      emergencyType,
      severity,
      patientInfo,
      medicalInfo,
      location: location ? {
        ...location,
        timestamp: Date.now()
      } : undefined,
      createdAt: Date.now(),
      expiresAt: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
      accessLog: []
    };

    // Generate QR code and short URL
    packet.qrCode = await this.generateQRCode(packet.id);
    packet.shortUrl = await this.generateShortUrl(packet.id);

    this.emergencyPackets.set(packet.id, packet);
    this.saveSharingData();
    this.emit('emergencyPacketCreated', packet);

    return packet.id;
  }

  private async getEmergencyPatientInfo(): Promise<EmergencyDataPacket['patientInfo']> {
    // This would integrate with medical profile storage
    return {
      name: 'John Doe',
      age: 35,
      bloodType: 'O+',
      emergencyContact: {
        name: 'Jane Doe',
        phone: '+1-555-0123',
        relationship: 'Spouse'
      }
    };
  }

  private async getEmergencyMedicalInfo(): Promise<EmergencyDataPacket['medicalInfo']> {
    // This would integrate with medical profile storage
    return {
      conditions: [],
      medications: [],
      allergies: [],
      lastUpdated: new Date().toISOString()
    };
  }

  private async generateQRCode(packetId: string): Promise<string> {
    // In a real implementation, this would generate an actual QR code
    // For now, return a data URL
    return `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==`;
  }

  private async generateShortUrl(packetId: string): Promise<string> {
    // In a real implementation, this would create a short URL
    return `https://resq.ai/emergency/${packetId}`;
  }

  public async accessEmergencyPacket(
    packetId: string,
    accessorInfo: {
      name: string;
      organization?: string;
      purpose: string;
    }
  ): Promise<{
    success: boolean;
    data?: EmergencyDataPacket;
    error?: string;
  }> {
    const packet = this.emergencyPackets.get(packetId);
    
    if (!packet) {
      return { success: false, error: 'Emergency packet not found' };
    }

    if (packet.expiresAt < Date.now()) {
      return { success: false, error: 'Emergency packet has expired' };
    }

    // Log access
    packet.accessLog.push({
      timestamp: Date.now(),
      accessor: accessorInfo.name,
      purpose: accessorInfo.purpose,
      ipAddress: 'unknown' // Would get from request
    });

    this.emergencyPackets.set(packetId, packet);
    this.saveSharingData();
    this.emit('emergencyPacketAccessed', { packet, accessorInfo });

    return { success: true, data: packet };
  }

  public getShareRequests(status?: HealthShareRequest['status']): HealthShareRequest[] {
    let requests = Array.from(this.shareRequests.values());
    
    if (status) {
      requests = requests.filter(r => r.status === status);
    }
    
    return requests.sort((a, b) => b.timestamp - a.timestamp);
  }

  public getActiveSessions(): HealthShareSession[] {
    return Array.from(this.shareSessions.values())
      .filter(s => s.isActive)
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  public getEmergencyPackets(): EmergencyDataPacket[] {
    return Array.from(this.emergencyPackets.values())
      .filter(p => p.expiresAt > Date.now())
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  public updateSharingSettings(updates: Partial<SharingSettings>): void {
    Object.assign(this.sharingSettings, updates);
    this.saveSharingSettings();
    this.emit('settingsUpdated', this.sharingSettings);
  }

  public getSharingSettings(): SharingSettings {
    return this.sharingSettings;
  }

  public revokeAccess(sessionId: string): boolean {
    const session = this.shareSessions.get(sessionId);
    if (!session) return false;

    session.isActive = false;
    this.shareSessions.set(sessionId, session);
    this.saveSharingData();
    this.emit('accessRevoked', session);

    return true;
  }

  public deleteRequest(requestId: string): boolean {
    const deleted = this.shareRequests.delete(requestId);
    if (deleted) {
      this.saveSharingData();
      this.emit('requestDeleted', requestId);
    }
    return deleted;
  }

  public deletePacket(packetId: string): boolean {
    const deleted = this.emergencyPackets.delete(packetId);
    if (deleted) {
      this.saveSharingData();
      this.emit('packetDeleted', packetId);
    }
    return deleted;
  }

  public getAccessHistory(packetId?: string): Array<{
    timestamp: number;
    accessor: string;
    purpose: string;
    type: 'share_request' | 'emergency_packet';
  }> {
    const history: Array<{
      timestamp: number;
      accessor: string;
      purpose: string;
      type: 'share_request' | 'emergency_packet';
    }> = [];

    // Add share request access history
    for (const session of this.shareSessions.values()) {
      const request = this.shareRequests.get(session.requestId);
      if (request) {
        history.push({
          timestamp: session.accessedAt,
          accessor: request.requesterInfo.name,
          purpose: request.purpose,
          type: 'share_request'
        });
      }
    }

    // Add emergency packet access history
    if (packetId) {
      const packet = this.emergencyPackets.get(packetId);
      if (packet) {
        packet.accessLog.forEach(access => {
          history.push({
            timestamp: access.timestamp,
            accessor: access.accessor,
            purpose: access.purpose,
            type: 'emergency_packet'
          });
        });
      }
    }

    return history.sort((a, b) => b.timestamp - a.timestamp);
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
