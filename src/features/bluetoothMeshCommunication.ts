/**
 * Bluetooth Mesh Communication
 * Provides peer-to-peer emergency communication when internet is unavailable
 */

export interface MeshNode {
  id: string;
  name: string;
  deviceName?: string;
  signalStrength: number;
  lastSeen: number;
  isOnline: boolean;
  distance?: number;
  batteryLevel?: number;
}

export interface MeshMessage {
  id: string;
  type: 'emergency' | 'location' | 'status' | 'help_request' | 'heartbeat';
  senderId: string;
  recipientId?: string; // undefined for broadcast
  content: any;
  timestamp: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  ttl: number; // time to live in hops
  hopCount: number;
  requiresAck: boolean;
}

export interface EmergencyBroadcast {
  id: string;
  emergencyType: 'sos' | 'medical' | 'accident' | 'fire' | 'other';
  message: string;
  location?: {
    lat: number;
    lng: number;
    accuracy: number;
  };
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: number;
  senderId: string;
  status: 'active' | 'resolved' | 'cancelled';
  helpersResponded: string[];
}

export class BluetoothMeshCommunication {
  private isSupported: boolean = false;
  private isAdvertising: boolean = false;
  private isScanning: boolean = false;
  private meshNodes: Map<string, MeshNode> = new Map();
  private messageQueue: MeshMessage[] = [];
  private emergencyBroadcasts: Map<string, EmergencyBroadcast> = new Map();
  private callbacks: Map<string, Function[]> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private scanInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.checkBluetoothSupport();
    this.setupEventListeners();
  }

  private checkBluetoothSupport(): void {
    this.isSupported = !!(navigator as any).bluetooth || !!(navigator as any).webkitBluetooth;
    if (!this.isSupported) {
      console.warn('Bluetooth is not supported on this device');
    }
  }

  private setupEventListeners(): void {
    // Listen for page visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.pauseScanning();
      } else {
        this.resumeScanning();
      }
    });

    // Listen for disconnection
    if (this.isSupported) {
      (navigator as any).bluetooth?.addEventListener('availabilitychanged', (event) => {
        console.log('Bluetooth availability changed:', event);
      });
    }
  }

  public async initialize(): Promise<boolean> {
    if (!this.isSupported) {
      throw new Error('Bluetooth is not supported on this device');
    }

    try {
      // Request Bluetooth permission
      await this.requestBluetoothPermission();
      
      // Start mesh network
      await this.startMeshNetwork();
      
      return true;
    } catch (error) {
      console.error('Failed to initialize Bluetooth mesh:', error);
      return false;
    }
  }

  private async requestBluetoothPermission(): Promise<void> {
    // This would use Web Bluetooth API
    // For now, we'll simulate permission request
    console.log('Requesting Bluetooth permission...');
  }

  private async startMeshNetwork(): Promise<void> {
    // Start advertising this device as a mesh node
    await this.startAdvertising();
    
    // Start scanning for other mesh nodes
    await this.startScanning();
    
    // Start heartbeat mechanism
    this.startHeartbeat();
  }

  private async startAdvertising(): Promise<void> {
    if (this.isAdvertising) return;
    
    this.isAdvertising = true;
    console.log('Starting Bluetooth mesh advertising...');
    
    // Simulate advertising with Web Bluetooth API
    // In a real implementation, this would use Bluetooth LE advertising
  }

  private async stopAdvertising(): Promise<void> {
    this.isAdvertising = false;
    console.log('Stopping Bluetooth mesh advertising...');
  }

  private async startScanning(): Promise<void> {
    if (this.isScanning) return;
    
    this.isScanning = true;
    console.log('Starting Bluetooth mesh scanning...');
    
    // Simulate scanning for nearby devices
    this.scanInterval = setInterval(() => {
      this.simulateDeviceDiscovery();
    }, 5000); // Scan every 5 seconds
  }

  private async stopScanning(): Promise<void> {
    this.isScanning = false;
    if (this.scanInterval) {
      clearInterval(this.scanInterval);
      this.scanInterval = null;
    }
    console.log('Stopping Bluetooth mesh scanning...');
  }

  private pauseScanning(): void {
    if (this.isScanning) {
      this.stopScanning();
    }
  }

  private resumeScanning(): void {
    if (!this.isScanning && this.isSupported) {
      this.startScanning();
    }
  }

  private simulateDeviceDiscovery(): void {
    // Simulate discovering nearby devices
    // In a real implementation, this would use Web Bluetooth API
    
    const mockDevices: MeshNode[] = [
      {
        id: 'device_001',
        name: 'Helper Phone',
        deviceName: 'iPhone 12',
        signalStrength: -45,
        lastSeen: Date.now(),
        isOnline: true,
        distance: 10,
        batteryLevel: 85
      },
      {
        id: 'device_002',
        name: 'Emergency Tablet',
        deviceName: 'iPad Pro',
        signalStrength: -67,
        lastSeen: Date.now(),
        isOnline: true,
        distance: 25,
        batteryLevel: 60
      }
    ];

    mockDevices.forEach(device => {
      this.meshNodes.set(device.id, device);
      this.emit('nodeDiscovered', device);
    });
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      this.broadcastHeartbeat();
    }, 30000); // Send heartbeat every 30 seconds
  }

  private broadcastHeartbeat(): void {
    const heartbeatMessage: MeshMessage = {
      id: `heartbeat_${Date.now()}`,
      type: 'heartbeat',
      senderId: this.getLocalNodeId(),
      timestamp: Date.now(),
      priority: 'low',
      ttl: 3,
      hopCount: 0,
      requiresAck: false,
      content: {
        batteryLevel: this.getBatteryLevel(),
        status: 'active'
      }
    };

    this.broadcastMessage(heartbeatMessage);
  }

  private getLocalNodeId(): string {
    // Generate or retrieve a unique ID for this device
    let nodeId = localStorage.getItem('bluetooth_mesh_node_id');
    if (!nodeId) {
      nodeId = `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('bluetooth_mesh_node_id', nodeId);
    }
    return nodeId;
  }

  private getBatteryLevel(): number {
    // Get battery level if available
    if ('getBattery' in navigator) {
      return 0; // Placeholder - would use Battery API
    }
    return 100; // Default
  }

  public async broadcastEmergency(
    emergencyType: EmergencyBroadcast['emergencyType'],
    message: string,
    severity: EmergencyBroadcast['severity'],
    location?: { lat: number; lng: number; accuracy: number }
  ): Promise<string> {
    const broadcast: EmergencyBroadcast = {
      id: `emergency_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      emergencyType,
      message,
      location,
      severity,
      timestamp: Date.now(),
      senderId: this.getLocalNodeId(),
      status: 'active',
      helpersResponded: []
    };

    this.emergencyBroadcasts.set(broadcast.id, broadcast);

    const meshMessage: MeshMessage = {
      id: broadcast.id,
      type: 'emergency',
      senderId: this.getLocalNodeId(),
      content: broadcast,
      timestamp: Date.now(),
      priority: severity,
      ttl: 10, // Emergency messages travel further
      hopCount: 0,
      requiresAck: true
    };

    await this.broadcastMessage(meshMessage);
    this.emit('emergencyBroadcast', broadcast);

    return broadcast.id;
  }

  private async broadcastMessage(message: MeshMessage): Promise<void> {
    this.messageQueue.push(message);
    
    // Send to all nearby nodes
    for (const node of this.meshNodes.values()) {
      if (node.isOnline) {
        await this.sendMessageToNode(node.id, message);
      }
    }
  }

  private async sendMessageToNode(nodeId: string, message: MeshMessage): Promise<boolean> {
    try {
      // In a real implementation, this would use Web Bluetooth API
      console.log(`Sending message to node ${nodeId}:`, message);
      
      // Simulate message sending
      const success = Math.random() > 0.1; // 90% success rate
      
      if (success) {
        this.emit('messageSent', { nodeId, message });
      } else {
        this.emit('messageFailed', { nodeId, message });
      }
      
      return success;
    } catch (error) {
      console.error(`Failed to send message to node ${nodeId}:`, error);
      return false;
    }
  }

  public async requestHelp(message: string, urgency: 'low' | 'medium' | 'high' | 'critical' = 'high'): Promise<string> {
    const helpMessage: MeshMessage = {
      id: `help_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'help_request',
      senderId: this.getLocalNodeId(),
      content: {
        message,
        urgency,
        location: this.getCurrentLocation()
      },
      timestamp: Date.now(),
      priority: urgency,
      ttl: 5,
      hopCount: 0,
      requiresAck: true
    };

    await this.broadcastMessage(helpMessage);
    this.emit('helpRequested', helpMessage);

    return helpMessage.id;
  }

  private getCurrentLocation(): { lat: number; lng: number } | undefined {
    // Get current location if available
    // This would integrate with the app's location service
    return undefined;
  }

  public respondToEmergency(emergencyId: string, response: 'accepting' | 'declining' | 'on_way'): void {
    const emergency = this.emergencyBroadcasts.get(emergencyId);
    if (!emergency) return;

    const responseMessage: MeshMessage = {
      id: `response_${Date.now()}`,
      type: 'status',
      senderId: this.getLocalNodeId(),
      recipientId: emergency.senderId,
      content: {
        emergencyId,
        response,
        responderId: this.getLocalNodeId(),
        timestamp: Date.now()
      },
      timestamp: Date.now(),
      priority: 'medium',
      ttl: 3,
      hopCount: 0,
      requiresAck: true
    };

    this.sendMessageToNode(emergency.senderId, responseMessage);
    this.emit('emergencyResponse', { emergencyId, response });
  }

  public getNearbyNodes(): MeshNode[] {
    return Array.from(this.meshNodes.values()).filter(node => node.isOnline);
  }

  public getActiveEmergencies(): EmergencyBroadcast[] {
    return Array.from(this.emergencyBroadcasts.values())
      .filter(emergency => emergency.status === 'active');
  }

  public getNetworkStatus(): {
    isSupported: boolean;
    isAdvertising: boolean;
    isScanning: boolean;
    nodeCount: number;
    activeEmergencies: number;
    messageQueueSize: number;
  } {
    return {
      isSupported: this.isSupported,
      isAdvertising: this.isAdvertising,
      isScanning: this.isScanning,
      nodeCount: this.meshNodes.size,
      activeEmergencies: this.getActiveEmergencies().length,
      messageQueueSize: this.messageQueue.length
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

  public async testConnectivity(): Promise<{
    canAdvertise: boolean;
    canScan: boolean;
    nearbyDevices: number;
    messageLatency: number;
  }> {
    const startTime = Date.now();
    
    // Test basic connectivity
    const canAdvertise = this.isSupported;
    const canScan = this.isSupported;
    const nearbyDevices = this.meshNodes.size;
    
    // Test message latency
    await this.broadcastMessage({
      id: `test_${Date.now()}`,
      type: 'status',
      senderId: this.getLocalNodeId(),
      timestamp: Date.now(),
      priority: 'low',
      ttl: 1,
      hopCount: 0,
      requiresAck: false,
      content: { test: true }
    });
    
    const messageLatency = Date.now() - startTime;

    return {
      canAdvertise,
      canScan,
      nearbyDevices,
      messageLatency
    };
  }

  public cleanup(): void {
    this.stopAdvertising();
    this.stopScanning();
    
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    if (this.scanInterval) {
      clearInterval(this.scanInterval);
      this.scanInterval = null;
    }

    this.meshNodes.clear();
    this.messageQueue = [];
    this.emergencyBroadcasts.clear();
    this.callbacks.clear();
  }
}
