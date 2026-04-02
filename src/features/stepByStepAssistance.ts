/**
 * Step-by-Step Assistance UI Logic
 * Tracks and manages progress through assistance steps.
 */
export class StepByStepAssistance {
  private steps: string[];
  private currentStep: number;

  constructor(steps: string[]) {
    this.steps = steps;
    this.currentStep = 0;
  }

  public getCurrentStep(): string {
    return this.steps[this.currentStep] || '';
  }

  public nextStep(): string | null {
    if (this.currentStep < this.steps.length - 1 && this.steps.length > 0) {
      this.currentStep++;
      return this.getCurrentStep();
    }
    return null;
  }

  public prevStep(): string | null {
    if (this.currentStep > 0 && this.steps.length > 0) {
      this.currentStep--;
      return this.getCurrentStep();
    }
    return null;
  }

  public reset() {
    this.currentStep = 0;
  }

  public getProgress(): { current: number, total: number } {
    return { current: this.currentStep + 1, total: this.steps.length };
  }
}
