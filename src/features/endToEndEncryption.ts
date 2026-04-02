/**
 * End-to-End Encryption
 * Comprehensive encryption system for sensitive data protection
 */

export interface EncryptionKey {
  id: string;
  algorithm: 'AES-256-GCM' | 'RSA-4096' | 'ChaCha20-Poly1305';
  keyData: string; // Base64 encoded
  iv: string; // Initialization vector
  salt: string; // For key derivation
  createdAt: number;
  expiresAt?: number;
  purpose: 'data_encryption' | 'key_exchange' | 'signature' | 'authentication';
  isRevoked: boolean;
  metadata: {
    [key: string]: any;
  };
}

export interface EncryptedData {
  id: string;
  data: string; // Encrypted content (Base64)
  keyId: string;
  algorithm: string;
  iv: string;
  tag?: string; // Authentication tag
  timestamp: number;
  checksum: string; // Data integrity verification
  metadata: {
    type: string;
    size: number;
    encryptedBy: string;
    accessLevel: 'public' | 'private' | 'restricted' | 'emergency';
  };
}

export interface KeyExchange {
  id: string;
  fromUserId: string;
  toUserId: string;
  publicKey: string;
  algorithm: string;
  keyId: string;
  timestamp: number;
  expiresAt: number;
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
  signature: string; // Digital signature
}

export interface EncryptionSession {
  id: string;
  participants: string[];
  sessionId: string;
  sharedSecret: string;
  algorithm: string;
  createdAt: number;
  expiresAt: number;
  isActive: boolean;
  lastActivity: number;
}

export class EndToEndEncryption {
  private keys: Map<string, EncryptionKey> = new Map();
  private encryptedData: Map<string, EncryptedData> = new Map();
  private keyExchanges: Map<string, KeyExchange> = new Map();
  private sessions: Map<string, EncryptionSession> = new Map();
  private masterKey: string | null = null;
  private callbacks: Map<string, Function[]> = new Map();

  constructor() {
    this.initializeEncryption();
    this.loadKeys();
    this.loadEncryptedData();
    this.startKeyRotation();
  }

  private async initializeEncryption(): Promise<void> {
    // Initialize Web Crypto API
    if (!window.crypto || !window.crypto.subtle) {
      throw new Error('Web Crypto API not supported');
    }

    // Generate or load master key
    await this.ensureMasterKey();
  }

  private async ensureMasterKey(): Promise<void> {
    const storedMasterKey = localStorage.getItem('resqai_master_key');
    
    if (storedMasterKey) {
      this.masterKey = storedMasterKey;
    } else {
      this.masterKey = await this.generateMasterKey();
      localStorage.setItem('resqai_master_key', this.masterKey);
    }
  }

  private async generateMasterKey(): Promise<string> {
    const key = await window.crypto.subtle.generateKey(
      {
        name: 'AES-GCM',
        length: 256
      },
      true,
      ['encrypt', 'decrypt']
    );

    const exportedKey = await window.crypto.subtle.exportKey('raw', key);
    return btoa(String.fromCharCode(...new Uint8Array(exportedKey)));
  }

  private loadKeys(): void {
    try {
      const keys = localStorage.getItem('resqai_encryption_keys');
      if (keys) {
        const keyData = JSON.parse(keys);
        keyData.forEach((key: EncryptionKey) => {
          this.keys.set(key.id, key);
        });
      }
    } catch (error) {
      console.error('Failed to load encryption keys:', error);
    }
  }

  private loadEncryptedData(): void {
    try {
      const data = localStorage.getItem('resqai_encrypted_data');
      if (data) {
        const encryptedData = JSON.parse(data);
        encryptedData.forEach((item: EncryptedData) => {
          this.encryptedData.set(item.id, item);
        });
      }
    } catch (error) {
      console.error('Failed to load encrypted data:', error);
    }
  }

  private saveKeys(): void {
    try {
      const keyData = Array.from(this.keys.values());
      localStorage.setItem('resqai_encryption_keys', JSON.stringify(keyData));
    } catch (error) {
      console.error('Failed to save encryption keys:', error);
    }
  }

  private saveEncryptedData(): void {
    try {
      const data = Array.from(this.encryptedData.values());
      localStorage.setItem('resqai_encrypted_data', JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save encrypted data:', error);
    }
  }

  private startKeyRotation(): void {
    // Rotate keys every 30 days
    setInterval(() => {
      this.rotateExpiredKeys();
    }, 24 * 60 * 60 * 1000); // Check daily
  }

  private async rotateExpiredKeys(): Promise<void> {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [keyId, key] of this.keys) {
      if (key.expiresAt && key.expiresAt < now && !key.isRevoked) {
        await this.revokeKey(keyId);
        expiredKeys.push(keyId);
      }
    }

    if (expiredKeys.length > 0) {
      this.emit('keysRotated', expiredKeys);
    }
  }

  public async generateKey(
    algorithm: EncryptionKey['algorithm'] = 'AES-256-GCM',
    purpose: EncryptionKey['purpose'] = 'data_encryption',
    expiresAfterDays: number = 30
  ): Promise<string> {
    const keyId = `key_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const salt = this.generateSalt();
    
    let keyData: string;
    let iv: string;

    switch (algorithm) {
      case 'AES-256-GCM':
        const aesKey = await window.crypto.subtle.generateKey(
          {
            name: 'AES-GCM',
            length: 256
          },
          true,
          ['encrypt', 'decrypt']
        );
        
        const exportedKey = await window.crypto.subtle.exportKey('raw', aesKey);
        keyData = btoa(String.fromCharCode(...new Uint8Array(exportedKey)));
        iv = btoa(String.fromCharCode(...new Uint8Array(window.crypto.getRandomValues(new Uint8Array(12)))));
        break;

      case 'ChaCha20-Poly1305':
        // Fallback for browsers that don't support ChaCha20
        const chachaKey = await window.crypto.subtle.generateKey(
          {
            name: 'AES-GCM',
            length: 256
          },
          true,
          ['encrypt', 'decrypt']
        );
        
        const chachaExported = await window.crypto.subtle.exportKey('raw', chachaKey);
        keyData = btoa(String.fromCharCode(...new Uint8Array(chachaExported)));
        iv = btoa(String.fromCharCode(...new Uint8Array(window.crypto.getRandomValues(new Uint8Array(12)))));
        break;

      default:
        throw new Error(`Unsupported algorithm: ${algorithm}`);
    }

    const encryptionKey: EncryptionKey = {
      id: keyId,
      algorithm,
      keyData,
      iv,
      salt,
      createdAt: Date.now(),
      expiresAt: Date.now() + (expiresAfterDays * 24 * 60 * 60 * 1000),
      purpose,
      isRevoked: false,
      metadata: {
        strength: this.getAlgorithmStrength(algorithm),
        version: '1.0'
      }
    };

    this.keys.set(keyId, encryptionKey);
    this.saveKeys();
    this.emit('keyGenerated', encryptionKey);

    return keyId;
  }

  private generateSalt(): string {
    const salt = window.crypto.getRandomValues(new Uint8Array(32));
    return btoa(String.fromCharCode(...salt));
  }

  private getAlgorithmStrength(algorithm: string): string {
    switch (algorithm) {
      case 'AES-256-GCM': return '256-bit';
      case 'RSA-4096': return '4096-bit';
      case 'ChaCha20-Poly1305': return '256-bit';
      default: return 'unknown';
    }
  }

  public async encryptData(
    data: any,
    keyId: string,
    accessLevel: EncryptedData['metadata']['accessLevel'] = 'private',
    metadata?: { [key: string]: any }
  ): Promise<string> {
    const key = this.keys.get(keyId);
    if (!key) throw new Error('Encryption key not found');

    try {
      const jsonString = JSON.stringify(data);
      const encoder = new TextEncoder();
      const dataBuffer = encoder.encode(jsonString);

      let encrypted: ArrayBuffer;
      let iv: Uint8Array;
      let tag: Uint8Array | undefined;

      switch (key.algorithm) {
        case 'AES-256-GCM':
          iv = window.crypto.getRandomValues(new Uint8Array(12));
          const cryptoKey = await this.importKey(key.keyData, 'AES-GCM');
          
          const result = await window.crypto.subtle.encrypt(
            {
              name: 'AES-GCM',
              iv: iv
            },
            cryptoKey,
            dataBuffer
          );
          
          const resultArray = new Uint8Array(result);
          tag = new Uint8Array(resultArray.slice(resultArray.length - 16));
          encrypted = resultArray.slice(0, resultArray.length - 16).buffer;
          break;

        default:
          throw new Error(`Unsupported encryption algorithm: ${key.algorithm}`);
      }

      const encryptedBase64 = btoa(String.fromCharCode(...new Uint8Array(encrypted)));
      const ivBase64 = btoa(String.fromCharCode(...iv));
      const tagBase64 = tag ? btoa(String.fromCharCode(...tag)) : '';
      const checksum = await this.calculateChecksum(dataBuffer);

      const encryptedData: EncryptedData = {
        id: `encrypted_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        data: encryptedBase64,
        keyId,
        algorithm: key.algorithm,
        iv: ivBase64,
        tag: tagBase64,
        timestamp: Date.now(),
        checksum,
        metadata: {
          type: this.detectDataType(data),
          size: dataBuffer.byteLength,
          encryptedBy: 'current_user',
          accessLevel,
          ...metadata
        }
      };

      this.encryptedData.set(encryptedData.id, encryptedData);
      this.saveEncryptedData();
      this.emit('dataEncrypted', encryptedData);

      return encryptedData.id;
    } catch (error) {
      console.error('Encryption failed:', error);
      throw new Error(`Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async importKey(keyData: string, algorithm: string): Promise<CryptoKey> {
    const keyBytes = Uint8Array.from(atob(keyData), c => c.charCodeAt(0));
    
    return await window.crypto.subtle.importKey(
      'raw',
      keyBytes,
      {
        name: algorithm === 'AES-256-GCM' ? 'AES-GCM' : algorithm
      },
      false,
      ['encrypt', 'decrypt']
    );
  }

  private detectDataType(data: any): string {
    if (typeof data === 'string') return 'text';
    if (typeof data === 'number') return 'number';
    if (typeof data === 'boolean') return 'boolean';
    if (Array.isArray(data)) return 'array';
    if (typeof data === 'object' && data !== null) {
      if (data instanceof File) return 'file';
      if (data instanceof Blob) return 'blob';
      return 'object';
    }
    return 'unknown';
  }

  private async calculateChecksum(data: ArrayBuffer): Promise<string> {
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  public async decryptData(encryptedDataId: string): Promise<any> {
    const encryptedData = this.encryptedData.get(encryptedDataId);
    if (!encryptedData) throw new Error('Encrypted data not found');

    const key = this.keys.get(encryptedData.keyId);
    if (!key) throw new Error('Decryption key not found');

    if (key.isRevoked) throw new Error('Key has been revoked');

    try {
      const encryptedBytes = Uint8Array.from(atob(encryptedData.data), c => c.charCodeAt(0));
      const iv = Uint8Array.from(atob(encryptedData.iv), c => c.charCodeAt(0));
      const tag = encryptedData.tag ? 
        Uint8Array.from(atob(encryptedData.tag), c => c.charCodeAt(0)) : 
        undefined;

      let decrypted: ArrayBuffer;

      switch (key.algorithm) {
        case 'AES-256-GCM':
          const cryptoKey = await this.importKey(key.keyData, 'AES-GCM');
          
          const encryptedWithTag = new Uint8Array(encryptedBytes.length + (tag ? tag.length : 0));
          encryptedWithTag.set(encryptedBytes);
          if (tag) encryptedWithTag.set(tag, encryptedBytes.length);

          decrypted = await window.crypto.subtle.decrypt(
            {
              name: 'AES-GCM',
              iv: iv
            },
            cryptoKey,
            encryptedWithTag.buffer
          );
          break;

        default:
          throw new Error(`Unsupported decryption algorithm: ${key.algorithm}`);
      }

      // Verify integrity
      const decoder = new TextDecoder();
      const jsonString = decoder.decode(decrypted);
      const parsedData = JSON.parse(jsonString);

      const checksum = await this.calculateChecksum(decrypted);
      if (checksum !== encryptedData.checksum) {
        throw new Error('Data integrity check failed - possible tampering detected');
      }

      this.emit('dataDecrypted', { encryptedDataId, data: parsedData });
      return parsedData;
    } catch (error) {
      console.error('Decryption failed:', error);
      throw new Error(`Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  public async initiateKeyExchange(
    toUserId: string,
    algorithm: string = 'AES-256-GCM'
  ): Promise<string> {
    const keyId = await this.generateKey('AES-256-GCM' as EncryptionKey['algorithm'], 'key_exchange', 7); // 7 days expiry
    const key = this.keys.get(keyId);
    
    if (!key) throw new Error('Failed to generate exchange key');

    const exchange: KeyExchange = {
      id: `exchange_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      fromUserId: 'current_user',
      toUserId,
      publicKey: key.keyData,
      algorithm,
      keyId,
      timestamp: Date.now(),
      expiresAt: Date.now() + (7 * 24 * 60 * 60 * 1000),
      status: 'pending',
      signature: await this.signData(key.keyData)
    };

    this.keyExchanges.set(exchange.id, exchange);
    this.emit('keyExchangeInitiated', exchange);

    return exchange.id;
  }

  private async signData(data: string): Promise<string> {
    // Simplified signing - in production would use proper digital signatures
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', dataBuffer);
    return btoa(String.fromCharCode(...new Uint8Array(hashBuffer)));
  }

  public async acceptKeyExchange(exchangeId: string): Promise<boolean> {
    const exchange = this.keyExchanges.get(exchangeId);
    if (!exchange) return false;

    // Verify signature
    const isValid = await this.verifySignature(exchange.publicKey, exchange.signature);
    if (!isValid) {
      exchange.status = 'rejected';
      this.emit('keyExchangeRejected', exchange);
      return false;
    }

    exchange.status = 'accepted';
    this.keyExchanges.set(exchangeId, exchange);

    // Create shared secret
    await this.createSharedSecret(exchange);

    this.emit('keyExchangeAccepted', exchange);
    return true;
  }

  private async verifySignature(data: string, signature: string): Promise<boolean> {
    // Simplified verification - in production would use proper signature verification
    const expectedSignature = await this.signData(data);
    return signature === expectedSignature;
  }

  private async createSharedSecret(exchange: KeyExchange): Promise<void> {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const session: EncryptionSession = {
      id: sessionId,
      participants: [exchange.fromUserId, exchange.toUserId],
      sessionId,
      sharedSecret: exchange.publicKey, // Simplified - would use proper DH exchange
      algorithm: exchange.algorithm,
      createdAt: Date.now(),
      expiresAt: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
      isActive: true,
      lastActivity: Date.now()
    };

    this.sessions.set(sessionId, session);
    this.emit('sessionCreated', session);
  }

  public async revokeKey(keyId: string, reason?: string): Promise<boolean> {
    const key = this.keys.get(keyId);
    if (!key) return false;

    key.isRevoked = true;
    this.keys.set(keyId, key);
    this.saveKeys();

    // Re-encrypt data with new keys if needed
    await this.reencryptDataWithNewKey(keyId);

    this.emit('keyRevoked', { keyId, reason });
    return true;
  }

  private async reencryptDataWithNewKey(revokedKeyId: string): Promise<void> {
    const affectedData = Array.from(this.encryptedData.values())
      .filter(data => data.keyId === revokedKeyId && !data.metadata.accessLevel.includes('emergency'));

    for (const data of affectedData) {
      try {
        const decrypted = await this.decryptData(data.id);
        const newKeyId = await this.generateKey();
        await this.encryptData(decrypted, newKeyId, data.metadata.accessLevel, data.metadata);
        
        // Mark old data as deprecated
        (data.metadata as any).deprecated = true;
        this.encryptedData.set(data.id, data);
      } catch (error) {
        console.error(`Failed to re-encrypt data ${data.id}:`, error);
      }
    }

    this.saveEncryptedData();
  }

  public getKeys(purpose?: EncryptionKey['purpose']): EncryptionKey[] {
    let keys = Array.from(this.keys.values());
    
    if (purpose) {
      keys = keys.filter(k => k.purpose === purpose);
    }

    return keys.filter(k => !k.isRevoked)
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  public getEncryptedData(
    accessLevel?: EncryptedData['metadata']['accessLevel'],
    dataType?: string
  ): EncryptedData[] {
    let data = Array.from(this.encryptedData.values());

    if (accessLevel) {
      data = data.filter(d => d.metadata.accessLevel === accessLevel);
    }

    if (dataType) {
      data = data.filter(d => d.metadata.type === dataType);
    }

    return data.filter(d => !(d.metadata as any).deprecated)
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  public getActiveSessions(): EncryptionSession[] {
    return Array.from(this.sessions.values())
      .filter(s => s.isActive && s.expiresAt > Date.now())
      .sort((a, b) => b.lastActivity - a.lastActivity);
  }

  public getKeyExchanges(status?: KeyExchange['status']): KeyExchange[] {
    let exchanges = Array.from(this.keyExchanges.values());
    
    if (status) {
      exchanges = exchanges.filter(e => e.status === status);
    }

    return exchanges.sort((a, b) => b.timestamp - a.timestamp);
  }

  public async verifyDataIntegrity(encryptedDataId: string): Promise<{
    isValid: boolean;
    checksum?: string;
    error?: string;
  }> {
    const encryptedData = this.encryptedData.get(encryptedDataId);
    if (!encryptedData) {
      return { isValid: false, error: 'Data not found' };
    }

    try {
      const encryptedBytes = Uint8Array.from(atob(encryptedData.data), c => c.charCodeAt(0));
      const currentChecksum = await this.calculateChecksum(encryptedBytes.buffer);
      
      return {
        isValid: currentChecksum === encryptedData.checksum,
        checksum: currentChecksum
      };
    } catch (error) {
      return {
        isValid: false,
        error: `Integrity check failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  public getEncryptionStatus(): {
    totalKeys: number;
    activeKeys: number;
    revokedKeys: number;
    totalEncryptedData: number;
    activeSessions: number;
    pendingExchanges: number;
    masterKeyExists: boolean;
  } {
    const keys = Array.from(this.keys.values());
    const data = Array.from(this.encryptedData.values());
    const sessions = Array.from(this.sessions.values());
    const exchanges = Array.from(this.keyExchanges.values());

    return {
      totalKeys: keys.length,
      activeKeys: keys.filter(k => !k.isRevoked && (!k.expiresAt || k.expiresAt > Date.now())).length,
      revokedKeys: keys.filter(k => k.isRevoked).length,
      totalEncryptedData: data.filter(d => !d.metadata.deprecated).length,
      activeSessions: sessions.filter(s => s.isActive && s.expiresAt > Date.now()).length,
      pendingExchanges: exchanges.filter(e => e.status === 'pending').length,
      masterKeyExists: this.masterKey !== null
    };
  }

  public async exportKeys(includePrivate: boolean = false): Promise<string> {
    const keys = Array.from(this.keys.values()).map(key => {
      const exportKey = { ...key };
      if (!includePrivate && key.purpose === 'key_exchange') {
        delete exportKey.keyData;
      }
      return exportKey;
    });

    const exportData = {
      keys,
      exportedAt: Date.now(),
      version: '1.0',
      includePrivate
    };

    return JSON.stringify(exportData, null, 2);
  }

  public async importKeys(keyData: string, passphrase?: string): Promise<{
    success: boolean;
    imported: number;
    errors: string[];
  }> {
    try {
      const data = JSON.parse(keyData);
      let imported = 0;
      const errors: string[] = [];

      for (const key of data.keys) {
        try {
          // Validate key format
          if (!key.id || !key.keyData || !key.algorithm) {
            errors.push(`Invalid key format: ${key.id}`);
            continue;
          }

          // Check for duplicates
          if (this.keys.has(key.id)) {
            errors.push(`Key already exists: ${key.id}`);
            continue;
          }

          this.keys.set(key.id, key);
          imported++;
        } catch (error) {
          errors.push(`Failed to import key ${key.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      this.saveKeys();
      this.emit('keysImported', { imported, errors });

      return { success: imported > 0, imported, errors };
    } catch (error) {
      return {
        success: false,
        imported: 0,
        errors: [`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`]
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
    this.masterKey = null;
    this.keys.clear();
    this.encryptedData.clear();
    this.sessions.clear();
    this.keyExchanges.clear();
  }
}
