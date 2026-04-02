/**
 * CPR Guidance Module
 * Provides step-by-step CPR instructions with optional timers.
 */
export const CPR_STEPS = [
  'Check responsiveness and breathing.',
  'Call emergency services or ask someone to call.',
  'Place the heel of your hand on the center of the chest.',
  'Put your other hand on top and interlock your fingers.',
  'Keep your arms straight and shoulders above your hands.',
  'Push hard and fast (100-120 compressions per minute).',
  'Allow the chest to rise completely between compressions.',
  'Continue until help arrives or the person recovers.'
];

export class CPRGuidance {
  public getSteps(): string[] {
    return CPR_STEPS;
  }
}
