/**
 * Doctor Matchmaking System
 * Manages doctor availability, matching, and video call coordination using Firebase.
 */

import { db, ref, set, push, query, orderByChild, equalTo, onValue, off, update, serverTimestamp } from '../firebase';

export interface Doctor {
  id: string;
  name: string;
  specialty: string;
  experience: number;
  rating: number;
  isOnline: boolean;
  currentCallId?: string;
  languages: string[];
  location?: {
    lat: number;
    lng: number;
  };
  lastActive: any;
  verified: boolean;
}

export interface EmergencyCall {
  id: string;
  userId: string;
  doctorId?: string;
  status: 'waiting' | 'connecting' | 'connected' | 'completed' | 'cancelled';
  emergencyType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  location?: {
    lat: number;
    lng: number;
  };
  channelName: string;
  token?: string;
  startedAt: any;
  endedAt?: any;
  userRating?: number;
  doctorRating?: number;
}

export class DoctorMatchmakingSystem {
  private doctorsRef = ref(db, 'doctors');
  private callsRef = ref(db, 'emergencyCalls');
  private availableDoctors: Doctor[] = [];
  private currentCall: EmergencyCall | null = null;

  constructor() {
    this.initializeDoctorListener();
  }

  /**
   * Initialize listener for available doctors
   */
  private initializeDoctorListener(): void {
    const onlineDoctorsQuery = query(
      this.doctorsRef,
      orderByChild('isOnline'),
      equalTo(true)
    );

    onValue(onlineDoctorsQuery, (snapshot) => {
      const doctors: Doctor[] = [];
      snapshot.forEach((childSnapshot) => {
        const doctor = childSnapshot.val();
        if (doctor && !doctor.currentCallId) { // Only available doctors
          doctors.push({
            id: childSnapshot.key!,
            ...doctor
          });
        }
      });
      this.availableDoctors = doctors;
    });
  }

  /**
   * Register a doctor in the system
   */
  async registerDoctor(doctorData: Omit<Doctor, 'id' | 'isOnline' | 'lastActive'>): Promise<string> {
    try {
      const newDoctorRef = push(this.doctorsRef);
      const doctor: Doctor = {
        id: newDoctorRef.key!,
        ...doctorData,
        isOnline: false,
        lastActive: serverTimestamp()
      };

      await set(newDoctorRef, doctor);
      return doctor.id;
    } catch (error) {
      console.error('Error registering doctor:', error);
      throw error;
    }
  }

  /**
   * Update doctor online status
   */
  async setDoctorOnline(doctorId: string, isOnline: boolean): Promise<void> {
    try {
      await update(ref(db, `doctors/${doctorId}`), {
        isOnline,
        lastActive: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating doctor status:', error);
      throw error;
    }
  }

  /**
   * Find the best available doctor for an emergency
   */
  findBestDoctor(emergencyType: string, severity: string, userLocation?: { lat: number; lng: number }): Doctor | null {
    if (this.availableDoctors.length === 0) return null;

    // Filter by specialty relevance
    let candidates = this.availableDoctors.filter(doctor => {
      const specialties = doctor.specialty.toLowerCase().split(',');
      const emergencyLower = emergencyType.toLowerCase();

      return specialties.some(specialty =>
        emergencyLower.includes(specialty.trim()) ||
        specialty.trim().includes(emergencyLower) ||
        specialty.trim() === 'emergency' ||
        specialty.trim() === 'general'
      );
    });

    // If no specialty match, use all available doctors
    if (candidates.length === 0) {
      candidates = this.availableDoctors;
    }

    // Sort by priority: verified, rating, experience, proximity
    candidates.sort((a, b) => {
      // Verified doctors first
      if (a.verified && !b.verified) return -1;
      if (!a.verified && b.verified) return 1;

      // Higher rating first
      if (a.rating !== b.rating) return b.rating - a.rating;

      // More experience first
      if (a.experience !== b.experience) return b.experience - a.experience;

      // Closer proximity (if location available)
      if (userLocation && a.location && b.location) {
        const distA = this.calculateDistance(userLocation, a.location);
        const distB = this.calculateDistance(userLocation, b.location);
        return distA - distB;
      }

      return 0;
    });

    return candidates[0] || null;
  }

  /**
   * Create a new emergency call and match with doctor
   */
  async createEmergencyCall(
    userId: string,
    emergencyType: string,
    severity: string,
    location?: { lat: number; lng: number }
  ): Promise<EmergencyCall> {
    try {
      // Find best available doctor
      const matchedDoctor = this.findBestDoctor(emergencyType, severity, location);

      if (!matchedDoctor) {
        throw new Error('No doctors available');
      }

      // Generate Agora channel name and token (simplified - in production, use Agora token server)
      const channelName = `emergency_${userId}_${Date.now()}`;
      const token = this.generateAgoraToken(channelName);

      // Create call record
      const callData: Omit<EmergencyCall, 'id'> = {
        userId,
        doctorId: matchedDoctor.id,
        status: 'connecting',
        emergencyType,
        severity: severity as any,
        location,
        channelName,
        token,
        startedAt: serverTimestamp()
      };

      const newCallRef = push(this.callsRef);
      await set(newCallRef, callData);

      const call: EmergencyCall = {
        id: newCallRef.key!,
        ...callData
      };

      this.currentCall = call;

      // Update doctor's current call
      await update(ref(db, `doctors/${matchedDoctor.id}`), {
        currentCallId: call.id
      });

      return call;
    } catch (error) {
      console.error('Error creating emergency call:', error);
      throw error;
    }
  }

  /**
   * Update call status
   */
  async updateCallStatus(callId: string, status: EmergencyCall['status']): Promise<void> {
    try {
      const updates: any = {
        status,
        lastActive: serverTimestamp()
      };

      if (status === 'connected' && !this.currentCall?.startedAt) {
        updates.startedAt = serverTimestamp();
      }

      if (status === 'completed' || status === 'cancelled') {
        updates.endedAt = serverTimestamp();
      }

      await update(ref(db, `emergencyCalls/${callId}`), updates);

      if (this.currentCall) {
        this.currentCall.status = status;
      }
    } catch (error) {
      console.error('Error updating call status:', error);
      throw error;
    }
  }

  /**
   * End current call and free up doctor
   */
  async endCall(callId: string, userRating?: number, doctorRating?: number): Promise<void> {
    try {
      const callRef = ref(db, `emergencyCalls/${callId}`);
      const callSnapshot = await new Promise<any>((resolve) => {
        onValue(callRef, (snapshot) => {
          resolve(snapshot.val());
          off(callRef);
        }, { onlyOnce: true });
      });

      if (callSnapshot && callSnapshot.doctorId) {
        // Free up the doctor
        await update(ref(db, `doctors/${callSnapshot.doctorId}`), {
          currentCallId: null,
          lastActive: serverTimestamp()
        });
      }

      // Update call with ratings
      await update(callRef, {
        status: 'completed',
        endedAt: serverTimestamp(),
        userRating,
        doctorRating
      });

      this.currentCall = null;
    } catch (error) {
      console.error('Error ending call:', error);
      throw error;
    }
  }

  /**
   * Get current call information
   */
  getCurrentCall(): EmergencyCall | null {
    return this.currentCall;
  }

  /**
   * Get available doctors count
   */
  getAvailableDoctorsCount(): number {
    return this.availableDoctors.length;
  }

  /**
   * Calculate distance between two points (Haversine formula)
   */
  private calculateDistance(point1: { lat: number; lng: number }, point2: { lat: number; lng: number }): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(point2.lat - point1.lat);
    const dLng = this.toRadians(point2.lng - point1.lng);

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(point1.lat)) * Math.cos(this.toRadians(point2.lat)) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Generate Agora token (simplified - in production, use Agora token server)
   */
  private generateAgoraToken(channelName: string): string {
    // This is a placeholder. In production, you would call Agora's token server
    // For now, return a mock token
    return `mock_token_${channelName}_${Date.now()}`;
  }

  /**
   * Clean up listeners
   */
  destroy(): void {
    off(this.doctorsRef);
    off(this.callsRef);
  }
}