/**
 * 3-Layer Emergency Response System
 * Implements the layered emergency response with AI First Responder, Smart Escalation, and Live Expert support.
 */

export enum EmergencyLayer {
  LAYER_1_AI_FIRST_RESPONDER = 'layer1',
  LAYER_2_SMART_ESCALATION = 'layer2',
  LAYER_3_LIVE_EXPERT = 'layer3'
}

export interface Layer1Response {
  instructions: string[];
  voiceGuidance: string;
  safetyChecks: string[];
  escalationTriggers: string[];
}

export interface Layer2Escalation {
  shouldEscalate: boolean;
  reason: string;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  ambulanceTriggered: boolean;
}

export interface Layer3LiveExpert {
  expertType: 'doctor' | 'helpline';
  connectionStatus: 'connecting' | 'connected' | 'failed';
  sessionId?: string;
  videoEnabled: boolean;
  audioEnabled: boolean;
}

export class EmergencyLayerSystem {
  private currentLayer: EmergencyLayer = EmergencyLayer.LAYER_1_AI_FIRST_RESPONDER;
  private layer1Response: Layer1Response | null = null;
  private layer2Escalation: Layer2Escalation | null = null;
  private layer3LiveExpert: Layer3LiveExpert | null = null;

  constructor() {
    this.reset();
  }

  /**
   * Reset the emergency system to initial state
   */
  public reset(): void {
    this.currentLayer = EmergencyLayer.LAYER_1_AI_FIRST_RESPONDER;
    this.layer1Response = null;
    this.layer2Escalation = null;
    this.layer3LiveExpert = null;
  }

  /**
   * Get current active layer
   */
  public getCurrentLayer(): EmergencyLayer {
    return this.currentLayer;
  }

  /**
   * Process emergency input and determine initial response (Layer 1)
   */
  public async processEmergencyInput(input: string, severity: string): Promise<Layer1Response> {
    this.currentLayer = EmergencyLayer.LAYER_1_AI_FIRST_RESPONDER;

    // Analyze input for immediate safety instructions
    const instructions = this.generateSafetyInstructions(input, severity);
    const voiceGuidance = this.generateVoiceGuidance(input, severity);
    const safetyChecks = this.generateSafetyChecks(input);
    const escalationTriggers = this.determineEscalationTriggers(input, severity);

    this.layer1Response = {
      instructions,
      voiceGuidance,
      safetyChecks,
      escalationTriggers
    };

    return this.layer1Response;
  }

  /**
   * Check if should escalate to Layer 2 based on user responses or conditions
   */
  public shouldEscalateToLayer2(userResponse: string, timeElapsed: number, conditions: any): Layer2Escalation {
    let shouldEscalate = false;
    let reason = '';
    let urgency: 'low' | 'medium' | 'high' | 'critical' = 'low';
    let ambulanceTriggered = false;

    // Check for critical keywords
    const criticalKeywords = ['not breathing', 'no breathing', 'unconscious', 'no pulse', 'severe bleeding', 'choking'];
    const hasCriticalKeyword = criticalKeywords.some(keyword =>
      userResponse.toLowerCase().includes(keyword)
    );

    // Check for no response after time
    const noResponseTimeout = timeElapsed > 30000; // 30 seconds

    // Check for severe conditions
    const severeConditions = conditions.severity === 'critical' || conditions.severity === 'high';

    if (hasCriticalKeyword) {
      shouldEscalate = true;
      reason = 'Critical keywords detected in user response';
      urgency = 'critical';
      ambulanceTriggered = true;
    } else if (noResponseTimeout) {
      shouldEscalate = true;
      reason = 'No response from victim after 30 seconds';
      urgency = 'high';
      ambulanceTriggered = true;
    } else if (severeConditions) {
      shouldEscalate = true;
      reason = 'Severe emergency condition detected';
      urgency = 'high';
      ambulanceTriggered = false;
    }

    this.layer2Escalation = {
      shouldEscalate,
      reason,
      urgency,
      ambulanceTriggered
    };

    if (shouldEscalate) {
      this.currentLayer = EmergencyLayer.LAYER_2_SMART_ESCALATION;
    }

    return this.layer2Escalation;
  }

  /**
   * Escalate to Layer 3 - Live Expert
   */
  public async escalateToLayer3(expertType: 'doctor' | 'helpline' = 'doctor'): Promise<Layer3LiveExpert> {
    this.currentLayer = EmergencyLayer.LAYER_3_LIVE_EXPERT;

    // Simulate connection attempt
    const connectionStatus = await this.attemptLiveConnection(expertType);

    this.layer3LiveExpert = {
      expertType,
      connectionStatus,
      videoEnabled: expertType === 'doctor',
      audioEnabled: true
    };

    return this.layer3LiveExpert;
  }

  /**
   * Generate immediate safety instructions for Layer 1
   */
  private generateSafetyInstructions(input: string, severity: string): string[] {
    const instructions: string[] = [];
    const inputLower = input.toLowerCase();

    // Basic safety instructions
    instructions.push("Stay calm and assess the situation");

    if (inputLower.includes('bleeding') || inputLower.includes('cut')) {
      instructions.push("Apply direct pressure to the wound");
      instructions.push("Keep the wound above heart level if possible");
      instructions.push("Do NOT remove embedded objects");
    }

    if (inputLower.includes('choking')) {
      instructions.push("Encourage coughing if conscious");
      instructions.push("Perform abdominal thrusts if unresponsive");
    }

    if (inputLower.includes('burn')) {
      instructions.push("Cool the burn with running water for 20 minutes");
      instructions.push("Do NOT apply ice or creams");
      instructions.push("Cover with clean cloth");
    }

    if (inputLower.includes('unconscious') || inputLower.includes('not breathing')) {
      instructions.push("Check for breathing and pulse");
      instructions.push("Start CPR if no breathing");
      instructions.push("Do NOT move neck if spinal injury suspected");
    }

    // Add severity-based instructions
    if (severity === 'critical') {
      instructions.push("Call emergency services immediately");
      instructions.push("Do not leave the victim alone");
    }

    return instructions;
  }

  /**
   * Generate voice guidance for Layer 1
   */
  private generateVoiceGuidance(input: string, severity: string): string {
    const inputLower = input.toLowerCase();

    if (inputLower.includes('bleeding')) {
      return "Apply firm pressure to the wound with a clean cloth. Keep pressure on for at least 10 minutes. Stay with the person and call for help.";
    }

    if (inputLower.includes('choking')) {
      return "If the person can cough, encourage them to keep coughing. If they cannot breathe, perform the Heimlich maneuver.";
    }

    if (inputLower.includes('burn')) {
      return "Run cool water over the burn for 20 minutes. Do not use ice. Cover with a clean cloth and seek medical help.";
    }

    if (inputLower.includes('unconscious') || inputLower.includes('not breathing')) {
      return "Check for breathing by looking at chest movement and listening for breath sounds. If not breathing, start CPR immediately.";
    }

    return "Stay calm. Assess the situation and provide basic first aid. Help is on the way if needed.";
  }

  /**
   * Generate safety checks for Layer 1
   */
  private generateSafetyChecks(input: string): string[] {
    const checks: string[] = [
      "Is the area safe for you to help?",
      "Are you in danger?",
      "Do you need to call emergency services?"
    ];

    const inputLower = input.toLowerCase();

    if (inputLower.includes('bleeding')) {
      checks.push("Is the bleeding severe or life-threatening?");
      checks.push("Are there any embedded objects in the wound?");
    }

    if (inputLower.includes('unconscious')) {
      checks.push("Is the person breathing?");
      checks.push("Do they have a pulse?");
    }

    return checks;
  }

  /**
   * Determine escalation triggers
   */
  private determineEscalationTriggers(input: string, severity: string): string[] {
    const triggers: string[] = [];

    if (severity === 'critical') {
      triggers.push("Critical emergency detected");
    }

    const inputLower = input.toLowerCase();

    if (inputLower.includes('not breathing') || inputLower.includes('no breathing')) {
      triggers.push("Victim not breathing");
    }

    if (inputLower.includes('unconscious')) {
      triggers.push("Victim unconscious");
    }

    if (inputLower.includes('severe') && inputLower.includes('bleeding')) {
      triggers.push("Severe bleeding");
    }

    triggers.push("No response from victim after 30 seconds");

    return triggers;
  }

  /**
   * Attempt to connect to live expert
   */
  private async attemptLiveConnection(expertType: 'doctor' | 'helpline'): Promise<'connecting' | 'connected' | 'failed'> {
    // Simulate connection attempt
    return new Promise((resolve) => {
      setTimeout(() => {
        // Simulate 80% success rate
        const success = Math.random() > 0.2;
        resolve(success ? 'connected' : 'failed');
      }, 2000);
    });
  }

  /**
   * Get current Layer 1 response
   */
  public getLayer1Response(): Layer1Response | null {
    return this.layer1Response;
  }

  /**
   * Get current Layer 2 escalation status
   */
  public getLayer2Escalation(): Layer2Escalation | null {
    return this.layer2Escalation;
  }

  /**
   * Get current Layer 3 live expert status
   */
  public getLayer3LiveExpert(): Layer3LiveExpert | null {
    return this.layer3LiveExpert;
  }
}