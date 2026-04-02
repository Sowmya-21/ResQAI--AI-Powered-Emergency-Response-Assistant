/**
 * Medical Profile Storage
 * Comprehensive medical information storage and management
 */

export interface PersonalInfo {
  firstName: string;
  lastName: string;
  dateOfBirth: string; // ISO format
  gender: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  height: number; // in cm
  weight: number; // in kg
  bloodType: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-' | 'unknown';
  organDonor: boolean;
  emergencyContact: {
    name: string;
    relationship: string;
    phone: string;
    email?: string;
  };
}

export interface MedicalCondition {
  id: string;
  name: string;
  type: 'chronic' | 'acute' | 'allergy' | 'medication_condition';
  severity: 'mild' | 'moderate' | 'severe' | 'life_threatening';
  diagnosedDate: string;
  diagnosedBy: string;
  symptoms: string[];
  treatments: string[];
  medications: string[];
  notes?: string;
  isActive: boolean;
}

export interface Medication {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  route: 'oral' | 'injectable' | 'topical' | 'inhaler' | 'other';
  startDate: string;
  endDate?: string;
  prescribedBy: string;
  purpose: string;
  sideEffects: string[];
  isActive: boolean;
  instructions: string;
}

export interface Allergy {
  id: string;
  type: 'food' | 'medication' | 'environmental' | 'other';
  allergen: string;
  severity: 'mild' | 'moderate' | 'severe' | 'anaphylactic';
  reaction: string;
  treatment?: string;
  diagnosedDate: string;
  isActive: boolean;
}

export interface MedicalProcedure {
  id: string;
  name: string;
  type: 'surgery' | 'diagnostic' | 'therapeutic' | 'vaccination' | 'other';
  date: string;
  performedBy: string;
  facility: string;
  reason: string;
  complications?: string;
  followUpRequired: boolean;
  followUpDate?: string;
  documents?: string[]; // URLs to medical documents
}

export interface InsuranceInfo {
  provider: string;
  policyNumber: string;
  groupNumber?: string;
  memberId: string;
  phone: string;
  coverageType: 'primary' | 'secondary' | 'supplemental';
  copayAmount?: number;
  deductible?: number;
  emergencyCoverage: boolean;
  internationalCoverage: boolean;
}

export interface MedicalProfile {
  id: string;
  userId: string;
  personalInfo: PersonalInfo;
  medicalConditions: MedicalCondition[];
  medications: Medication[];
  allergies: Allergy[];
  procedures: MedicalProcedure[];
  insurance: InsuranceInfo[];
  primaryCarePhysician: {
    name: string;
    phone: string;
    address: string;
    email?: string;
  };
  emergencyInstructions: string[];
  medicalDocuments: Array<{
    id: string;
    name: string;
    type: 'xray' | 'mri' | 'ct_scan' | 'blood_test' | 'prescription' | 'other';
    url: string;
    uploadDate: string;
    description?: string;
  }>;
  lastUpdated: number;
  isComplete: boolean;
  sharingSettings: {
    shareWithEmergencyServices: boolean;
    shareWithEmergencyContacts: boolean;
    shareWithHospitals: boolean;
    autoShareInEmergency: boolean;
    expireAfterHours: number;
  };
}

export interface MedicalAlert {
  id: string;
  type: 'medication_reminder' | 'appointment_reminder' | 'refill_reminder' | 'emergency_update';
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  timestamp: number;
  acknowledged: boolean;
  actionRequired: boolean;
  actionUrl?: string;
}

export class MedicalProfileStorage {
  private profile: MedicalProfile | null = null;
  private alerts: MedicalAlert[] = [];
  private encryptionKey: string | null = null;
  private callbacks: Map<string, Function[]> = new Map();

  constructor() {
    this.loadProfile();
    this.loadAlerts();
    this.generateEncryptionKey();
  }

  private generateEncryptionKey(): void {
    // In a real implementation, this would use proper encryption
    // For demo purposes, we'll use a simple key
    const existingKey = localStorage.getItem('resqai_medical_key');
    if (existingKey) {
      this.encryptionKey = existingKey;
    } else {
      this.encryptionKey = `key_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('resqai_medical_key', this.encryptionKey);
    }
  }

  private async encryptData(data: any): Promise<string> {
    // Simplified encryption - real implementation would use proper encryption
    if (typeof btoa !== 'undefined') {
      return btoa(JSON.stringify(data));
    } else {
      // Fallback for Node.js environment
      return Buffer.from(JSON.stringify(data)).toString('base64');
    }
  }

  private async decryptData(encryptedData: string): Promise<any> {
    try {
      if (typeof atob !== 'undefined') {
        return JSON.parse(atob(encryptedData));
      } else {
        // Fallback for Node.js environment
        return JSON.parse(Buffer.from(encryptedData, 'base64').toString());
      }
    } catch (error) {
      console.error('Failed to decrypt medical data:', error);
      return null;
    }
  }

  private loadProfile(): void {
    try {
      const encryptedProfile = localStorage.getItem('resqai_medical_profile');
      if (encryptedProfile) {
        this.decryptData(encryptedProfile).then(profile => {
          this.profile = profile;
          this.emit('profileLoaded', profile);
        });
      }
    } catch (error) {
      console.error('Failed to load medical profile:', error);
    }
  }

  private loadAlerts(): void {
    try {
      const alerts = localStorage.getItem('resqai_medical_alerts');
      if (alerts) {
        this.alerts = JSON.parse(alerts);
      }
    } catch (error) {
      console.error('Failed to load medical alerts:', error);
      this.alerts = [];
    }
  }

  private async saveProfile(): Promise<void> {
    if (!this.profile) return;

    try {
      const encryptedProfile = await this.encryptData(this.profile);
      localStorage.setItem('resqai_medical_profile', encryptedProfile);
      this.emit('profileSaved', this.profile);
    } catch (error) {
      console.error('Failed to save medical profile:', error);
    }
  }

  private saveAlerts(): void {
    try {
      localStorage.setItem('resqai_medical_alerts', JSON.stringify(this.alerts));
    } catch (error) {
      console.error('Failed to save medical alerts:', error);
    }
  }

  public async createProfile(profileData: Omit<MedicalProfile, 'id' | 'lastUpdated' | 'isComplete'>): Promise<string> {
    const profile: MedicalProfile = {
      ...profileData,
      id: `profile_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      lastUpdated: Date.now(),
      isComplete: this.validateProfileCompleteness(profileData)
    };

    this.profile = profile;
    await this.saveProfile();
    this.emit('profileCreated', profile);

    return profile.id;
  }

  public async updateProfile(updates: Partial<MedicalProfile>): Promise<boolean> {
    if (!this.profile) return false;

    Object.assign(this.profile, updates, { lastUpdated: Date.now() });
    this.profile.isComplete = this.validateProfileCompleteness(this.profile);
    
    await this.saveProfile();
    this.emit('profileUpdated', this.profile);

    return true;
  }

  public async updatePersonalInfo(personalInfo: Partial<PersonalInfo>): Promise<boolean> {
    if (!this.profile) return false;

    Object.assign(this.profile.personalInfo, personalInfo);
    this.profile.lastUpdated = Date.now();
    this.profile.isComplete = this.validateProfileCompleteness(this.profile);
    
    await this.saveProfile();
    this.emit('personalInfoUpdated', this.profile.personalInfo);

    return true;
  }

  public async addMedicalCondition(condition: Omit<MedicalCondition, 'id'>): Promise<string> {
    if (!this.profile) throw new Error('No profile found');

    const newCondition: MedicalCondition = {
      ...condition,
      id: `condition_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };

    this.profile.medicalConditions.push(newCondition);
    this.profile.lastUpdated = Date.now();
    
    await this.saveProfile();
    this.emit('conditionAdded', newCondition);

    return newCondition.id;
  }

  public async updateMedicalCondition(conditionId: string, updates: Partial<MedicalCondition>): Promise<boolean> {
    if (!this.profile) return false;

    const condition = this.profile.medicalConditions.find(c => c.id === conditionId);
    if (!condition) return false;

    Object.assign(condition, updates);
    this.profile.lastUpdated = Date.now();
    
    await this.saveProfile();
    this.emit('conditionUpdated', condition);

    return true;
  }

  public async removeMedicalCondition(conditionId: string): Promise<boolean> {
    if (!this.profile) return false;

    const index = this.profile.medicalConditions.findIndex(c => c.id === conditionId);
    if (index === -1) return false;

    this.profile.medicalConditions.splice(index, 1);
    this.profile.lastUpdated = Date.now();
    
    await this.saveProfile();
    this.emit('conditionRemoved', conditionId);

    return true;
  }

  public async addMedication(medication: Omit<Medication, 'id'>): Promise<string> {
    if (!this.profile) throw new Error('No profile found');

    const newMedication: Medication = {
      ...medication,
      id: `medication_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };

    this.profile.medications.push(newMedication);
    this.profile.lastUpdated = Date.now();
    
    await this.saveProfile();
    this.emit('medicationAdded', newMedication);

    // Create refill reminder
    this.createMedicationReminder(newMedication);

    return newMedication.id;
  }

  public async updateMedication(medicationId: string, updates: Partial<Medication>): Promise<boolean> {
    if (!this.profile) return false;

    const medication = this.profile.medications.find(m => m.id === medicationId);
    if (!medication) return false;

    Object.assign(medication, updates);
    this.profile.lastUpdated = Date.now();
    
    await this.saveProfile();
    this.emit('medicationUpdated', medication);

    return true;
  }

  public async removeMedication(medicationId: string): Promise<boolean> {
    if (!this.profile) return false;

    const index = this.profile.medications.findIndex(m => m.id === medicationId);
    if (index === -1) return false;

    this.profile.medications.splice(index, 1);
    this.profile.lastUpdated = Date.now();
    
    await this.saveProfile();
    this.emit('medicationRemoved', medicationId);

    return true;
  }

  public async addAllergy(allergy: Omit<Allergy, 'id'>): Promise<string> {
    if (!this.profile) throw new Error('No profile found');

    const newAllergy: Allergy = {
      ...allergy,
      id: `allergy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };

    this.profile.allergies.push(newAllergy);
    this.profile.lastUpdated = Date.now();
    
    await this.saveProfile();
    this.emit('allergyAdded', newAllergy);

    return newAllergy.id;
  }

  public async updateAllergy(allergyId: string, updates: Partial<Allergy>): Promise<boolean> {
    if (!this.profile) return false;

    const allergy = this.profile.allergies.find(a => a.id === allergyId);
    if (!allergy) return false;

    Object.assign(allergy, updates);
    this.profile.lastUpdated = Date.now();
    
    await this.saveProfile();
    this.emit('allergyUpdated', allergy);

    return true;
  }

  public async removeAllergy(allergyId: string): Promise<boolean> {
    if (!this.profile) return false;

    const index = this.profile.allergies.findIndex(a => a.id === allergyId);
    if (index === -1) return false;

    this.profile.allergies.splice(index, 1);
    this.profile.lastUpdated = Date.now();
    
    await this.saveProfile();
    this.emit('allergyRemoved', allergyId);

    return true;
  }

  private createMedicationReminder(medication: Medication): void {
    if (!medication.endDate) return;

    const reminderDate = new Date(medication.endDate);
    reminderDate.setDate(reminderDate.getDate() - 7); // 7 days before

    const alert: MedicalAlert = {
      id: `med_reminder_${medication.id}`,
      type: 'refill_reminder',
      title: 'Medication Refill Needed',
      message: `Your prescription for ${medication.name} needs to be refilled soon.`,
      priority: 'medium',
      timestamp: reminderDate.getTime(),
      acknowledged: false,
      actionRequired: true,
      actionUrl: '#medications'
    };

    this.alerts.push(alert);
    this.saveAlerts();
    this.emit('alertCreated', alert);
  }

  public validateProfileCompleteness(profile: Partial<MedicalProfile>): boolean {
    const requiredFields = [
      'personalInfo.firstName',
      'personalInfo.lastName',
      'personalInfo.dateOfBirth',
      'personalInfo.bloodType',
      'personalInfo.emergencyContact.name',
      'personalInfo.emergencyContact.phone'
    ];

    for (const field of requiredFields) {
      const value = this.getNestedValue(profile, field);
      if (!value || value === '') return false;
    }

    return true;
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  public getProfile(): MedicalProfile | null {
    return this.profile;
  }

  public getCriticalInfo(): {
    name: string;
    bloodType: string;
    emergencyContact: { name: string; phone: string };
    allergies: string[];
    criticalMedications: string[];
    medicalConditions: string[];
  } | null {
    if (!this.profile) return null;

    return {
      name: `${this.profile.personalInfo.firstName} ${this.profile.personalInfo.lastName}`,
      bloodType: this.profile.personalInfo.bloodType,
      emergencyContact: this.profile.personalInfo.emergencyContact,
      allergies: this.profile.allergies
        .filter(a => a.isActive && a.severity !== 'mild')
        .map(a => `${a.allergen} (${a.severity})`),
      criticalMedications: this.profile.medications
        .filter(m => m.isActive)
        .map(m => `${m.name} - ${m.dosage}`),
      medicalConditions: this.profile.medicalConditions
        .filter(c => c.isActive && c.severity !== 'mild')
        .map(c => `${c.name} (${c.severity})`)
    };
  }

  public getActiveMedications(): Medication[] {
    return this.profile?.medications.filter(m => m.isActive) || [];
  }

  public getActiveAllergies(): Allergy[] {
    return this.profile?.allergies.filter(a => a.isActive) || [];
  }

  public getActiveConditions(): MedicalCondition[] {
    return this.profile?.medicalConditions.filter(c => c.isActive) || [];
  }

  public searchMedicalHistory(query: string): {
    conditions: MedicalCondition[];
    medications: Medication[];
    allergies: Allergy[];
    procedures: MedicalProcedure[];
  } {
    if (!this.profile) {
      return { conditions: [], medications: [], allergies: [], procedures: [] };
    }

    const lowercaseQuery = query.toLowerCase();

    return {
      conditions: this.profile.medicalConditions.filter(c => 
        c.name.toLowerCase().includes(lowercaseQuery) ||
        c.symptoms.some(s => s.toLowerCase().includes(lowercaseQuery))
      ),
      medications: this.profile.medications.filter(m => 
        m.name.toLowerCase().includes(lowercaseQuery) ||
        m.purpose.toLowerCase().includes(lowercaseQuery)
      ),
      allergies: this.profile.allergies.filter(a => 
        a.allergen.toLowerCase().includes(lowercaseQuery) ||
        a.reaction.toLowerCase().includes(lowercaseQuery)
      ),
      procedures: this.profile.procedures.filter(p => 
        p.name.toLowerCase().includes(lowercaseQuery) ||
        p.reason.toLowerCase().includes(lowercaseQuery)
      )
    };
  }

  public createAlert(alert: Omit<MedicalAlert, 'id' | 'timestamp' | 'acknowledged'>): string {
    const newAlert: MedicalAlert = {
      ...alert,
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      acknowledged: false
    };

    this.alerts.push(newAlert);
    this.saveAlerts();
    this.emit('alertCreated', newAlert);

    return newAlert.id;
  }

  public acknowledgeAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (!alert) return false;

    alert.acknowledged = true;
    this.saveAlerts();
    this.emit('alertAcknowledged', alert);

    return true;
  }

  public getActiveAlerts(): MedicalAlert[] {
    return this.alerts.filter(a => !a.acknowledged)
      .sort((a, b) => {
        // Sort by priority first, then by timestamp
        const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
        if (priorityDiff !== 0) return priorityDiff;
        return b.timestamp - a.timestamp;
      });
  }

  public getAlerts(type?: MedicalAlert['type']): MedicalAlert[] {
    let filtered = [...this.alerts];
    
    if (type) {
      filtered = filtered.filter(a => a.type === type);
    }
    
    return filtered.sort((a, b) => b.timestamp - a.timestamp);
  }

  public async updateSharingSettings(settings: Partial<MedicalProfile['sharingSettings']>): Promise<boolean> {
    if (!this.profile) return false;

    Object.assign(this.profile.sharingSettings, settings);
    this.profile.lastUpdated = Date.now();
    
    await this.saveProfile();
    this.emit('sharingSettingsUpdated', this.profile.sharingSettings);

    return true;
  }

  public getSharingSettings(): MedicalProfile['sharingSettings'] | null {
    return this.profile?.sharingSettings || null;
  }

  public exportMedicalData(): string {
    if (!this.profile) return '';

    const exportData = {
      profile: this.profile,
      exportedAt: Date.now(),
      version: '1.0'
    };

    return JSON.stringify(exportData, null, 2);
  }

  public async importMedicalData(jsonData: string): Promise<boolean> {
    try {
      const importData = JSON.parse(jsonData);
      
      if (!importData.profile) {
        throw new Error('Invalid medical data format');
      }

      this.profile = {
        ...importData.profile,
        id: this.profile?.id || `imported_${Date.now()}`,
        lastUpdated: Date.now(),
        isComplete: this.validateProfileCompleteness(importData.profile)
      };

      await this.saveProfile();
      this.emit('profileImported', this.profile);

      return true;
    } catch (error) {
      console.error('Failed to import medical data:', error);
      return false;
    }
  }

  public deleteProfile(): boolean {
    if (!this.profile) return false;

    this.profile = null;
    localStorage.removeItem('resqai_medical_profile');
    this.emit('profileDeleted');

    return true;
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
