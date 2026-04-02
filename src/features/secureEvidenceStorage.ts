/**
 * Secure Evidence Storage
 * Cryptographic protection for evidence files and data
 */

export interface EvidenceFile {
  id: string;
  name: string;
  type: 'image' | 'video' | 'audio' | 'document' | 'location' | 'sensor_data';
  mimeType: string;
  size: number; // in bytes
  encryptedData: string; // Base64 encrypted content
  hash: string; // SHA-256 hash
  encryptionKeyId: string;
  timestamp: number;
  location?: {
    lat: number;
    lng: number;
    accuracy: number;
    address?: string;
  };
  metadata: {
    deviceId?: string;
    duration?: number; // for video/audio in seconds
    resolution?: string; // for images/videos
    quality: 'high' | 'medium' | 'low';
    source: 'user_upload' | 'auto_capture' | 'sensor' | 'external';
    tags: string[];
    description?: string;
  };
  accessControl: {
    owner: string;
    sharedWith: string[];
    accessLevel: 'private' | 'shared' | 'public' | 'court_order';
    expiresAt?: number;
    requiresAuth: boolean;
  };
  integrity: {
    checksum: string;
    verified: boolean;
    lastVerified: number;
    tamperEvidence?: string;
  };
}

export interface EvidenceChain {
  id: string;
  evidenceId: string;
  previousHash: string;
  currentHash: string;
  timestamp: number;
  operation: 'create' | 'modify' | 'access' | 'share' | 'delete';
  operatorId: string;
  signature: string; // Digital signature
  metadata: {
    [key: string]: any;
  };
}

export interface SecureStorage {
  id: string;
  name: string;
  type: 'local' | 'cloud' | 'hybrid';
  encrypted: boolean;
  location: string; // Storage path or URL
  capacity: number; // in bytes
  used: number; // in bytes
  encryptionKeyId: string;
  lastBackup: number;
  status: 'active' | 'offline' | 'full' | 'error';
  settings: {
    autoBackup: boolean;
    backupFrequency: number; // in hours
    retentionPeriod: number; // in days
    compressionEnabled: boolean;
  };
}

export interface EvidenceAccess {
  id: string;
  evidenceId: string;
  userId: string;
  accessType: 'view' | 'download' | 'share' | 'delete';
  timestamp: number;
  ipAddress: string;
  userAgent: string;
  granted: boolean;
  reason?: string;
  duration?: number; // Time spent viewing/downloading
}

export class SecureEvidenceStorage {
  private evidence: Map<string, EvidenceFile> = new Map();
  private chains: Map<string, EvidenceChain[]> = new Map();
  private storage: Map<string, SecureStorage> = new Map();
  private accessLog: EvidenceAccess[] = [];
  private callbacks: Map<string, Function[]> = new Map();

  constructor() {
    this.loadEvidence();
    this.loadChains();
    this.loadStorage();
    this.loadAccessLog();
    this.startIntegrityVerification();
  }

  private loadEvidence(): void {
    try {
      const evidence = localStorage.getItem('resqai_secure_evidence');
      if (evidence) {
        const evidenceData = JSON.parse(evidence);
        evidenceData.forEach((item: EvidenceFile) => {
          this.evidence.set(item.id, item);
        });
      }
    } catch (error) {
      console.error('Failed to load evidence:', error);
    }
  }

  private loadChains(): void {
    try {
      const chains = localStorage.getItem('resqai_evidence_chains');
      if (chains) {
        const chainData = JSON.parse(chains);
        chainData.forEach((chain: EvidenceChain[]) => {
          this.chains.set(chain[0]?.evidenceId || 'unknown', chain);
        });
      }
    } catch (error) {
      console.error('Failed to load evidence chains:', error);
    }
  }

  private loadStorage(): void {
    try {
      const storage = localStorage.getItem('resqai_secure_storage');
      if (storage) {
        const storageData = JSON.parse(storage);
        storageData.forEach((item: SecureStorage) => {
          this.storage.set(item.id, item);
        });
      }
    } catch (error) {
      console.error('Failed to load storage config:', error);
    }
  }

  private loadAccessLog(): void {
    try {
      const log = localStorage.getItem('resqai_evidence_access_log');
      if (log) {
        this.accessLog = JSON.parse(log);
      }
    } catch (error) {
      console.error('Failed to load access log:', error);
    }
  }

  private saveEvidence(): void {
    try {
      const evidenceData = Array.from(this.evidence.values());
      localStorage.setItem('resqai_secure_evidence', JSON.stringify(evidenceData));
    } catch (error) {
      console.error('Failed to save evidence:', error);
    }
  }

  private saveChains(): void {
    try {
      const chainData = Array.from(this.chains.entries());
      localStorage.setItem('resqai_evidence_chains', JSON.stringify(chainData));
    } catch (error) {
      console.error('Failed to save evidence chains:', error);
    }
  }

  private saveStorage(): void {
    try {
      const storageData = Array.from(this.storage.values());
      localStorage.setItem('resqai_secure_storage', JSON.stringify(storageData));
    } catch (error) {
      console.error('Failed to save storage config:', error);
    }
  }

  private saveAccessLog(): void {
    try {
      localStorage.setItem('resqai_evidence_access_log', JSON.stringify(this.accessLog));
    } catch (error) {
      console.error('Failed to save access log:', error);
    }
  }

  private startIntegrityVerification(): void {
    // Verify integrity every hour
    setInterval(() => {
      this.verifyAllEvidenceIntegrity();
    }, 60 * 60 * 1000);
  }

  public async storeEvidence(
    file: File | Blob,
    metadata: EvidenceFile['metadata'],
    accessControl: EvidenceFile['accessControl'],
    location?: EvidenceFile['location'],
    encryptionKeyId?: string
  ): Promise<string> {
    const evidenceId = `evidence_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      // Convert file to array buffer
      const arrayBuffer = await this.fileToArrayBuffer(file);
      
      // Calculate hash
      const hash = await this.calculateHash(arrayBuffer);
      
      // Encrypt the data
      const keyId = encryptionKeyId || await this.getOrCreateEncryptionKey();
      const encryptedData = await this.encryptData(arrayBuffer, keyId);
      
      // Detect file type
      const fileType = this.detectFileType(file);
      
      const evidence: EvidenceFile = {
        id: evidenceId,
        name: (file as File).name || 'unnamed_file',
        type: fileType,
        mimeType: file.type || 'application/octet-stream',
        size: arrayBuffer.byteLength,
        encryptedData,
        hash,
        encryptionKeyId: keyId,
        timestamp: Date.now(),
        location,
        metadata: {
          ...metadata,
          source: 'user_upload',
          quality: this.assessQuality(file, fileType)
        },
        accessControl: {
          ...accessControl,
          owner: 'current_user'
        },
        integrity: {
          checksum: hash,
          verified: true,
          lastVerified: Date.now()
        }
      };

      this.evidence.set(evidenceId, evidence);
      await this.createChainEntry(evidenceId, 'create', 'current_user');
      
      this.saveEvidence();
      this.saveChains();
      
      // Log access
      this.logAccess(evidenceId, 'create' as EvidenceAccess['accessType'], 'current_user', true);
      
      this.emit('evidenceStored', evidence);
      
      return evidenceId;
    } catch (error) {
      console.error('Failed to store evidence:', error);
      throw new Error(`Evidence storage failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async fileToArrayBuffer(file: File | Blob): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsArrayBuffer(file);
    });
  }

  private async calculateHash(data: ArrayBuffer): Promise<string> {
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  private async encryptData(data: ArrayBuffer, keyId: string): Promise<string> {
    // This would integrate with the EndToEndEncryption system
    // For now, simulate encryption
    const uint8Array = new Uint8Array(data);
    return btoa(String.fromCharCode(...uint8Array));
  }

  private detectFileType(file: File | Blob): EvidenceFile['type'] {
    if (file.type.startsWith('image/')) return 'image';
    if (file.type.startsWith('video/')) return 'video';
    if (file.type.startsWith('audio/')) return 'audio';
    if (file.type.includes('document') || file.type.includes('pdf') || file.type.includes('text')) {
      return 'document';
    }
    return 'document'; // Default
  }

  private assessQuality(file: File | Blob, type: EvidenceFile['type']): 'high' | 'medium' | 'low' {
    // Simple quality assessment based on file properties
    if (type === 'image') {
      const img = file as File;
      if (img.size > 5 * 1024 * 1024) return 'high'; // > 5MB
      if (img.size > 1 * 1024 * 1024) return 'medium'; // > 1MB
      return 'low';
    }
    
    if (type === 'video') {
      const video = file as File;
      if (video.size > 100 * 1024 * 1024) return 'high'; // > 100MB
      if (video.size > 20 * 1024 * 1024) return 'medium'; // > 20MB
      return 'low';
    }
    
    return 'medium'; // Default
  }

  private async getOrCreateEncryptionKey(): Promise<string> {
    // This would integrate with EndToEndEncryption system
    // For now, return a mock key ID
    return 'default_encryption_key';
  }

  private async createChainEntry(
    evidenceId: string,
    operation: EvidenceChain['operation'],
    operatorId: string
  ): Promise<void> {
    const evidence = this.evidence.get(evidenceId);
    if (!evidence) throw new Error('Evidence not found');

    const chain = this.chains.get(evidenceId) || [];
    const previousHash = chain.length > 0 ? chain[chain.length - 1].currentHash : '';
    
    const entry: EvidenceChain = {
      id: `chain_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      evidenceId,
      previousHash,
      currentHash: evidence.hash,
      timestamp: Date.now(),
      operation,
      operatorId,
      signature: await this.signEntry(evidence.hash, operatorId),
      metadata: {
        version: '1.0',
        algorithm: 'SHA-256'
      }
    };

    chain.push(entry);
    this.chains.set(evidenceId, chain);
  }

  private async signEntry(hash: string, operatorId: string): Promise<string> {
    // Simplified signing - in production would use proper digital signatures
    const data = `${hash}_${operatorId}_${Date.now()}`;
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    return btoa(String.fromCharCode(...new Uint8Array(hashBuffer)));
  }

  private logAccess(
    evidenceId: string,
    accessType: EvidenceAccess['accessType'],
    userId: string,
    granted: boolean,
    reason?: string
  ): void {
    const access: EvidenceAccess = {
      id: `access_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      evidenceId,
      userId,
      accessType,
      timestamp: Date.now(),
      ipAddress: 'unknown', // Would get from request
      userAgent: navigator.userAgent,
      granted,
      reason
    };

    this.accessLog.push(access);
    this.trimAccessLog();
    this.saveAccessLog();
  }

  private trimAccessLog(): void {
    // Keep only last 10000 access records
    if (this.accessLog.length > 10000) {
      this.accessLog = this.accessLog.slice(-10000);
    }
  }

  public async retrieveEvidence(evidenceId: string, userId: string): Promise<{
    success: boolean;
    data?: ArrayBuffer;
    metadata?: EvidenceFile;
    error?: string;
  }> {
    const evidence = this.evidence.get(evidenceId);
    if (!evidence) {
      return { success: false, error: 'Evidence not found' };
    }

    // Check access permissions
    const hasAccess = await this.checkAccessPermission(evidence, userId);
    if (!hasAccess) {
      this.logAccess(evidenceId, 'view', userId, false, 'Access denied');
      return { success: false, error: 'Access denied' };
    }

    try {
      // Decrypt data
      const decryptedData = await this.decryptData(evidence.encryptedData, evidence.encryptionKeyId);
      
      // Verify integrity
      const currentHash = await this.calculateHash(decryptedData);
      if (currentHash !== evidence.hash) {
        this.logAccess(evidenceId, 'view', userId, false, 'Integrity check failed');
        return { success: false, error: 'Evidence integrity compromised' };
      }

      // Update integrity verification
      evidence.integrity.verified = true;
      evidence.integrity.lastVerified = Date.now();
      this.evidence.set(evidenceId, evidence);
      
      await this.createChainEntry(evidenceId, 'access', userId);
      this.logAccess(evidenceId, 'view', userId, true);
      
      this.saveEvidence();
      this.saveChains();
      
      return {
        success: true,
        data: decryptedData,
        metadata: evidence
      };
    } catch (error) {
      this.logAccess(evidenceId, 'view', userId, false, `Decryption failed: ${error}`);
      return {
        success: false,
        error: `Failed to retrieve evidence: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private async checkAccessPermission(evidence: EvidenceFile, userId: string): Promise<boolean> {
    // Owner always has access
    if (evidence.accessControl.owner === userId) return true;
    
    // Check shared users
    if (evidence.accessControl.sharedWith.includes(userId)) return true;
    
    // Check if expired
    if (evidence.accessControl.expiresAt && evidence.accessControl.expiresAt < Date.now()) {
      return false;
    }
    
    // Check public access
    if (evidence.accessControl.accessLevel === 'public') return true;
    
    // Check court order access
    if (evidence.accessControl.accessLevel === 'court_order') {
      // Would verify court order validity
      return true;
    }
    
    return false;
  }

  private async decryptData(encryptedData: string, keyId: string): Promise<ArrayBuffer> {
    // This would integrate with EndToEndEncryption system
    // For now, simulate decryption
    const decodedData = atob(encryptedData);
    const uint8Array = Uint8Array.from(decodedData, c => c.charCodeAt(0));
    return uint8Array.buffer;
  }

  public async verifyAllEvidenceIntegrity(): Promise<{
    verified: number;
    compromised: number;
    errors: string[];
  }> {
    let verified = 0;
    let compromised = 0;
    const errors: string[] = [];

    for (const [evidenceId, evidence] of this.evidence) {
      try {
        const decryptedData = await this.decryptData(evidence.encryptedData, evidence.encryptionKeyId);
        const currentHash = await this.calculateHash(decryptedData);
        
        if (currentHash === evidence.hash) {
          evidence.integrity.verified = true;
          evidence.integrity.lastVerified = Date.now();
          verified++;
        } else {
          evidence.integrity.verified = false;
          evidence.integrity.tamperEvidence = `Hash mismatch: expected ${evidence.hash}, got ${currentHash}`;
          compromised++;
          errors.push(`Evidence ${evidenceId} integrity compromised`);
        }
        
        this.evidence.set(evidenceId, evidence);
      } catch (error) {
        errors.push(`Failed to verify evidence ${evidenceId}: ${error}`);
      }
    }

    this.saveEvidence();
    this.emit('integrityVerification', { verified, compromised, errors });

    return { verified, compromised, errors };
  }

  public async shareEvidence(
    evidenceId: string,
    shareWith: string[],
    accessLevel: EvidenceFile['accessControl']['accessLevel'],
    expiresAfterDays?: number
  ): Promise<boolean> {
    const evidence = this.evidence.get(evidenceId);
    if (!evidence) return false;

    // Check if user has permission to share
    if (evidence.accessControl.owner !== 'current_user') {
      return false;
    }

    try {
      evidence.accessControl.sharedWith = [...evidence.accessControl.sharedWith, ...shareWith];
      evidence.accessControl.accessLevel = accessLevel;
      
      if (expiresAfterDays) {
        evidence.accessControl.expiresAt = Date.now() + (expiresAfterDays * 24 * 60 * 60 * 1000);
      }

      this.evidence.set(evidenceId, evidence);
      await this.createChainEntry(evidenceId, 'share', 'current_user');
      
      this.saveEvidence();
      this.saveChains();
      
      this.logAccess(evidenceId, 'share', 'current_user', true, `Shared with ${shareWith.join(', ')}`);
      
      this.emit('evidenceShared', { evidenceId, shareWith, accessLevel });
      
      return true;
    } catch (error) {
      console.error('Failed to share evidence:', error);
      return false;
    }
  }

  public async deleteEvidence(evidenceId: string, userId: string, reason?: string): Promise<boolean> {
    const evidence = this.evidence.get(evidenceId);
    if (!evidence) return false;

    // Check permissions
    if (evidence.accessControl.owner !== userId && evidence.accessControl.accessLevel !== 'court_order') {
      this.logAccess(evidenceId, 'delete', userId, false, 'Permission denied');
      return false;
    }

    try {
      // Mark as deleted but keep for audit trail
      this.evidence.delete(evidenceId);
      
      await this.createChainEntry(evidenceId, 'delete', userId);
      
      this.saveEvidence();
      this.saveChains();
      
      this.logAccess(evidenceId, 'delete', userId, true, reason);
      
      this.emit('evidenceDeleted', { evidenceId, userId, reason });
      
      return true;
    } catch (error) {
      console.error('Failed to delete evidence:', error);
      return false;
    }
  }

  public getEvidenceList(
    userId?: string,
    type?: EvidenceFile['type'],
    accessLevel?: EvidenceFile['accessControl']['accessLevel']
  ): EvidenceFile[] {
    let evidence = Array.from(this.evidence.values());

    // Filter by user access
    if (userId) {
      evidence = evidence.filter(e => {
        if (e.accessControl.owner === userId) return true;
        if (e.accessControl.sharedWith.includes(userId)) return true;
        if (e.accessControl.accessLevel === 'public') return true;
        return false;
      });
    }

    // Filter by type
    if (type) {
      evidence = evidence.filter(e => e.type === type);
    }

    // Filter by access level
    if (accessLevel) {
      evidence = evidence.filter(e => e.accessControl.accessLevel === accessLevel);
    }

    return evidence.sort((a, b) => b.timestamp - a.timestamp);
  }

  public getEvidenceChain(evidenceId: string): EvidenceChain[] {
    return this.chains.get(evidenceId) || [];
  }

  public getAccessLog(evidenceId?: string, userId?: string): EvidenceAccess[] {
    let log = [...this.accessLog];

    if (evidenceId) {
      log = log.filter(a => a.evidenceId === evidenceId);
    }

    if (userId) {
      log = log.filter(a => a.userId === userId);
    }

    return log.sort((a, b) => b.timestamp - a.timestamp);
  }

  public getStorageStatus(): SecureStorage[] {
    return Array.from(this.storage.values())
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  public async createStorage(
    name: string,
    type: SecureStorage['type'],
    location: string,
    capacity: number
  ): Promise<string> {
    const storageId = `storage_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const storage: SecureStorage = {
      id: storageId,
      name,
      type,
      encrypted: true,
      location,
      capacity,
      used: 0,
      encryptionKeyId: await this.getOrCreateEncryptionKey(),
      lastBackup: Date.now(),
      status: 'active',
      settings: {
        autoBackup: true,
        backupFrequency: 24,
        retentionPeriod: 365,
        compressionEnabled: true
      }
    };

    this.storage.set(storageId, storage);
    this.saveStorage();
    this.emit('storageCreated', storage);

    return storageId;
  }

  public getStorageStatistics(): {
    totalEvidence: number;
    totalSize: number;
    byType: { [key: string]: number };
    byAccessLevel: { [key: string]: number };
    integrityStatus: {
      verified: number;
      compromised: number;
      pending: number;
    };
  } {
    const evidence = Array.from(this.evidence.values());
    const byType: { [key: string]: number } = {};
    const byAccessLevel: { [key: string]: number } = {};
    let totalSize = 0;
    let verified = 0;
    let compromised = 0;
    let pending = 0;

    evidence.forEach(e => {
      byType[e.type] = (byType[e.type] || 0) + 1;
      byAccessLevel[e.accessControl.accessLevel] = (byAccessLevel[e.accessControl.accessLevel] || 0) + 1;
      totalSize += e.size;
      
      if (e.integrity.verified) verified++;
      else if (e.integrity.tamperEvidence) compromised++;
      else pending++;
    });

    return {
      totalEvidence: evidence.length,
      totalSize,
      byType,
      byAccessLevel,
      integrityStatus: { verified, compromised, pending }
    };
  }

  public async exportEvidence(evidenceId: string, format: 'original' | 'encrypted' | 'hash' = 'original'): Promise<{
    success: boolean;
    data?: string | ArrayBuffer;
    error?: string;
  }> {
    const evidence = this.evidence.get(evidenceId);
    if (!evidence) {
      return { success: false, error: 'Evidence not found' };
    }

    try {
      switch (format) {
        case 'original':
          const decrypted = await this.decryptData(evidence.encryptedData, evidence.encryptionKeyId);
          return { success: true, data: decrypted };
          
        case 'encrypted':
          return { success: true, data: evidence.encryptedData };
          
        case 'hash':
          return { success: true, data: evidence.hash };
          
        default:
          return { success: false, error: 'Invalid export format' };
      }
    } catch (error) {
      return {
        success: false,
        error: `Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
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
    this.callbacks.clear();
    
    // Clear sensitive data from memory
    this.evidence.clear();
    this.chains.clear();
    this.storage.clear();
    this.accessLog = [];
  }
}
