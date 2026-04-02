/**
 * Preloaded Guidance System
 * Provides offline access to emergency guidance and first aid instructions
 */

import { OFFLINE_FIRST_AID_DATA, type OfflineFirstAid } from '../constants/offlineFirstAid';

export interface GuidanceStep {
  id: string;
  title: string;
  instruction: string;
  duration?: number; // in seconds
  critical: boolean;
  image?: string; // base64 encoded or local path
  audio?: string; // base64 encoded audio instruction
}

export interface GuidanceSection {
  id: string;
  title: string;
  category: 'cpr' | 'bleeding' | 'burns' | 'choking' | 'seizure' | 'fracture' | 'other';
  severity: 'low' | 'medium' | 'high' | 'critical';
  steps: GuidanceStep[];
  dos: string[];
  donts: string[];
  warnings: string[];
  estimatedTime: number; // total time in minutes
  requiredMaterials: string[];
}

export interface VoiceInstruction {
  text: string;
  language: string;
  speed: number; // 0.5 to 2.0
  pitch: number; // 0.5 to 2.0
}

export class PreloadedGuidanceSystem {
  private guidanceData: GuidanceSection[] = [];
  private currentSession: GuidanceSession | null = null;
  private speechSynthesis: SpeechSynthesis;
  private isOffline: boolean = !navigator.onLine;

  constructor() {
    this.speechSynthesis = window.speechSynthesis;
    this.loadGuidanceData();
    this.setupOfflineDetection();
  }

  private loadGuidanceData(): void {
    // Convert existing first aid data to enhanced guidance format
    this.guidanceData = OFFLINE_FIRST_AID_DATA.map(firstAid => this.convertToGuidanceSection(firstAid));
    
    // Add additional comprehensive guidance
    this.guidanceData.push(...this.getAdditionalGuidance());
  }

  private convertToGuidanceSection(firstAid: OfflineFirstAid): GuidanceSection {
    return {
      id: firstAid.id,
      title: firstAid.title,
      category: firstAid.id as any,
      severity: firstAid.severity,
      steps: firstAid.steps.map((step, index) => ({
        id: `step_${firstAid.id}_${index}`,
        title: `Step ${index + 1}`,
        instruction: step,
        critical: step.toLowerCase().includes('critical') || step.toLowerCase().includes('immediately'),
        duration: this.estimateStepDuration(step)
      })),
      dos: firstAid.dos,
      donts: firstAid.donts,
      warnings: this.extractWarnings(firstAid.steps),
      estimatedTime: this.estimateTotalTime(firstAid.steps),
      requiredMaterials: this.getRequiredMaterials(firstAid.id)
    };
  }

  private getAdditionalGuidance(): GuidanceSection[] {
    return [
      {
        id: 'heart_attack',
        title: 'Heart Attack',
        category: 'other',
        severity: 'critical',
        steps: [
          {
            id: 'heart_attack_1',
            title: 'Call 911 Immediately',
            instruction: 'Call emergency services right away. Every minute counts.',
            critical: true,
            duration: 30
          },
          {
            id: 'heart_attack_2',
            title: 'Keep Person Calm',
            instruction: 'Have the person sit or lie down comfortably. Loosen tight clothing.',
            critical: false,
            duration: 60
          },
          {
            id: 'heart_attack_3',
            title: 'Give Aspirin',
            instruction: 'If available, give the person one aspirin to chew slowly, unless allergic.',
            critical: false,
            duration: 30
          },
          {
            id: 'heart_attack_4',
            title: 'Monitor Breathing',
            instruction: 'Watch for changes in breathing or consciousness. Be ready to perform CPR.',
            critical: true,
            duration: 120
          }
        ],
        dos: [
          'Stay with the person until help arrives',
          'Keep them warm and comfortable',
          'Note the time symptoms started'
        ],
        donts: [
          'Do not give anything by mouth except aspirin',
          'Do not leave the person alone',
          'Do not wait to see if symptoms improve'
        ],
        warnings: [
          'Heart attack symptoms can vary between men and women',
          'Women may experience nausea, back pain, or jaw pain'
        ],
        estimatedTime: 15,
        requiredMaterials: ['Phone', 'Aspirin (if available)', 'Blanket']
      },
      {
        id: 'stroke',
        title: 'Stroke - F.A.S.T.',
        category: 'other',
        severity: 'critical',
        steps: [
          {
            id: 'stroke_1',
            title: 'F - Face Drooping',
            instruction: 'Ask the person to smile. Does one side of the face droop?',
            critical: true,
            duration: 15
          },
          {
            id: 'stroke_2',
            title: 'A - Arm Weakness',
            instruction: 'Ask the person to raise both arms. Does one arm drift downward?',
            critical: true,
            duration: 15
          },
          {
            id: 'stroke_3',
            title: 'S - Speech Difficulty',
            instruction: 'Ask the person to repeat a simple phrase. Is their speech slurred?',
            critical: true,
            duration: 15
          },
          {
            id: 'stroke_4',
            title: 'T - Time to Call 911',
            instruction: 'If you see any of these signs, call emergency services immediately.',
            critical: true,
            duration: 30
          }
        ],
        dos: [
          'Note the time symptoms started',
          'Keep the person comfortable',
          'Stay with them until help arrives'
        ],
        donts: [
          'Do not give food or drink',
          'Do not drive to the hospital (wait for ambulance)',
          'Do not ignore symptoms even if they go away'
        ],
        warnings: [
          'Time is brain - every minute counts',
          'Some stroke symptoms may be painless'
        ],
        estimatedTime: 5,
        requiredMaterials: ['Phone']
      },
      {
        id: 'diabetic_emergency',
        title: 'Diabetic Emergency',
        category: 'other',
        severity: 'high',
        steps: [
          {
            id: 'diabetic_1',
            title: 'Check Consciousness',
            instruction: 'Is the person conscious and able to swallow?',
            critical: true,
            duration: 10
          },
          {
            id: 'diabetic_2',
            title: 'Give Sugar',
            instruction: 'If conscious, give sugar: fruit juice, candy, or glucose tablets.',
            critical: false,
            duration: 30
          },
          {
            id: 'diabetic_3',
            title: 'Monitor Response',
            instruction: 'Watch for improvement within 10-15 minutes.',
            critical: false,
            duration: 60
          },
          {
            id: 'diabetic_4',
            title: 'Call for Help',
            instruction: 'If no improvement or unconscious, call emergency services.',
            critical: true,
            duration: 30
          }
        ],
        dos: [
          'Keep sugar sources available',
          'Learn to recognize symptoms',
          'Wear medical identification'
        ],
        donts: [
          'Do not give food or drink to unconscious person',
          'Do not give insulin (will lower blood sugar more)',
          'Do not assume it will pass'
        ],
        warnings: [
          'Low blood sugar can be life-threatening',
          'Symptoms can come on quickly'
        ],
        estimatedTime: 10,
        requiredMaterials: ['Sugar source', 'Phone']
      }
    ];
  }

  private estimateStepDuration(step: string): number {
    // Estimate time based on step complexity
    const words = step.split(' ').length;
    const baseTime = words * 2; // 2 seconds per word to read
    const actionTime = step.toLowerCase().includes('call') ? 30 : 0;
    const criticalTime = step.toLowerCase().includes('immediately') ? 10 : 0;
    
    return baseTime + actionTime + criticalTime;
  }

  private extractWarnings(steps: string[]): string[] {
    return steps.filter(step => 
      step.toLowerCase().includes('warning') ||
      step.toLowerCase().includes('do not') ||
      step.toLowerCase().includes('never')
    );
  }

  private estimateTotalTime(steps: string[]): number {
    return Math.ceil(steps.reduce((total, step) => total + this.estimateStepDuration(step), 0) / 60);
  }

  private getRequiredMaterials(category: string): string[] {
    const materials: Record<string, string[]> = {
      cpr: ['Phone', 'AED (if available)', 'Face mask (if trained)'],
      bleeding: ['Gloves', 'Clean cloth/bandage', 'Tape', 'Tourniquet (last resort)'],
      burns: ['Cool water', 'Clean cloth', 'Sterile bandage', 'Pain reliever'],
      choking: ['None (hands-only technique)'],
      seizure: ['Phone', 'Cushion for head', 'Watch'],
      fracture: ['Splint material', 'Bandages', 'Ice pack', 'Tape'],
      heart_attack: ['Phone', 'Aspirin', 'Blanket'],
      stroke: ['Phone'],
      diabetic_emergency: ['Sugar source', 'Phone']
    };

    return materials[category] || ['Phone'];
  }

  private setupOfflineDetection(): void {
    window.addEventListener('online', () => {
      this.isOffline = false;
    });

    window.addEventListener('offline', () => {
      this.isOffline = true;
    });
  }

  public searchGuidance(query: string): GuidanceSection[] {
    const lowercaseQuery = query.toLowerCase();
    
    return this.guidanceData.filter(guidance => 
      guidance.title.toLowerCase().includes(lowercaseQuery) ||
      guidance.category.toLowerCase().includes(lowercaseQuery) ||
      guidance.steps.some(step => 
        step.instruction.toLowerCase().includes(lowercaseQuery)
      )
    );
  }

  public getGuidanceByCategory(category: string): GuidanceSection | undefined {
    return this.guidanceData.find(guidance => guidance.category === category);
  }

  public getGuidanceBySeverity(severity: GuidanceSection['severity']): GuidanceSection[] {
    return this.guidanceData.filter(guidance => guidance.severity === severity);
  }

  public startGuidanceSession(guidanceId: string): GuidanceSession {
    const guidance = this.guidanceData.find(g => g.id === guidanceId);
    if (!guidance) {
      throw new Error(`Guidance not found: ${guidanceId}`);
    }

    this.currentSession = new GuidanceSessionImpl(guidance, this.speechSynthesis);
    return this.currentSession;
  }

  public getCurrentSession(): GuidanceSession | null {
    return this.currentSession;
  }

  public stopCurrentSession(): void {
    if (this.currentSession) {
      this.currentSession.stop();
      this.currentSession = null;
    }
  }

  public getAllGuidance(): GuidanceSection[] {
    return this.guidanceData;
  }

  public getOfflineStatus(): {
    isOffline: boolean;
    totalGuidance: number;
    cachedSize: string;
  } {
    const dataSize = new Blob([JSON.stringify(this.guidanceData)]).size;
    const sizeInKB = Math.round(dataSize / 1024);

    return {
      isOffline: this.isOffline,
      totalGuidance: this.guidanceData.length,
      cachedSize: `${sizeInKB} KB`
    };
  }

  public downloadOfflineData(): string {
    return JSON.stringify(this.guidanceData, null, 2);
  }

  public preloadAudioInstructions(): Promise<void> {
    // Preload audio instructions for faster access
    return new Promise((resolve) => {
      // This would preload audio files if available
      console.log('Preloading audio instructions...');
      resolve();
    });
  }
}

export interface GuidanceSession {
  guidance: GuidanceSection;
  currentStepIndex: number;
  isActive: boolean;
  startTime: number;
  completedSteps: string[];
  
  start(): void;
  nextStep(): void;
  previousStep(): void;
  pause(): void;
  resume(): void;
  stop(): void;
  getCurrentStep(): GuidanceStep | undefined;
  getProgress(): number;
  enableVoiceGuidance(language?: string): void;
  disableVoiceGuidance(): void;
}

class GuidanceSessionImpl implements GuidanceSession {
  public guidance: GuidanceSection;
  public currentStepIndex: number = 0;
  public isActive: boolean = false;
  public startTime: number = 0;
  public completedSteps: string[] = [];
  
  private voiceEnabled: boolean = false;
  private speechSynthesis: SpeechSynthesis;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private voiceLanguage: string = 'en-US';

  constructor(guidance: GuidanceSection, speechSynthesis: SpeechSynthesis) {
    this.guidance = guidance;
    this.speechSynthesis = speechSynthesis;
  }

  public start(): void {
    this.isActive = true;
    this.startTime = Date.now();
    this.currentStepIndex = 0;
    this.completedSteps = [];
    
    if (this.voiceEnabled) {
      this.speakCurrentStep();
    }
  }

  public nextStep(): void {
    if (this.currentStepIndex < this.guidance.steps.length - 1) {
      this.completedSteps.push(this.guidance.steps[this.currentStepIndex].id);
      this.currentStepIndex++;
      
      if (this.voiceEnabled) {
        this.speakCurrentStep();
      }
    }
  }

  public previousStep(): void {
    if (this.currentStepIndex > 0) {
      this.currentStepIndex--;
      
      if (this.voiceEnabled) {
        this.speakCurrentStep();
      }
    }
  }

  public pause(): void {
    this.isActive = false;
    this.stopSpeaking();
  }

  public resume(): void {
    this.isActive = true;
    
    if (this.voiceEnabled) {
      this.speakCurrentStep();
    }
  }

  public stop(): void {
    this.isActive = false;
    this.stopSpeaking();
    this.currentStepIndex = 0;
    this.completedSteps = [];
  }

  public getCurrentStep(): GuidanceStep | undefined {
    return this.guidance.steps[this.currentStepIndex];
  }

  public getProgress(): number {
    return (this.completedSteps.length / this.guidance.steps.length) * 100;
  }

  public enableVoiceGuidance(language: string = 'en-US'): void {
    this.voiceEnabled = true;
    this.voiceLanguage = language;
    
    if (this.isActive) {
      this.speakCurrentStep();
    }
  }

  public disableVoiceGuidance(): void {
    this.voiceEnabled = false;
    this.stopSpeaking();
  }

  private speakCurrentStep(): void {
    const step = this.getCurrentStep();
    if (!step) return;

    this.stopSpeaking();

    this.currentUtterance = new SpeechSynthesisUtterance(step.instruction);
    this.currentUtterance.lang = this.voiceLanguage;
    this.currentUtterance.rate = 0.9; // Slightly slower for clarity
    
    this.speechSynthesis.speak(this.currentUtterance);
  }

  private stopSpeaking(): void {
    if (this.currentUtterance) {
      this.speechSynthesis.cancel();
      this.currentUtterance = null;
    }
  }
}

// GuidanceSessionImpl is already exported as GuidanceSession in the interface
