/**
 * AI Guided Emergency Assistance
 * Provides tailored emergency instructions using AI analysis.
 */
import { SituationUnderstanding } from './situationUnderstanding';
import { EmergencyClassification } from './emergencyClassification';
import { DecisionEngine } from './decisionEngine';

export class AIGuidedAssistance {
  private situationAI = new SituationUnderstanding();
  private classifier = new EmergencyClassification();
  private decisionEngine = new DecisionEngine();

  public async getAssistance(input: string): Promise<{ situation: string, category: string, steps: string[] }> {
    const situation = await this.situationAI.analyzeSituation(input);
    const category = await this.classifier.classifyEmergency(situation);
    const steps = this.decisionEngine.getRecommendations(category);
    return { situation, category, steps };
  }
}
