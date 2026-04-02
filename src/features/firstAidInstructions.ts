/**
 * First Aid Instruction System
 * Provides first aid instructions for common emergencies.
 */
import { FIRST_AID_KNOWLEDGE_BASE, FirstAidGuideline } from '../constants/firstAid';

export class FirstAidInstructions {
  public getInstructions(emergencyType: string): FirstAidGuideline | undefined {
    return FIRST_AID_KNOWLEDGE_BASE.find(g => g.type.toLowerCase() === emergencyType.toLowerCase());
  }
}
