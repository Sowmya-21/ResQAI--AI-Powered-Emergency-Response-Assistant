/**
 * Decision Engine
 * This module provides recommendations or actions based on the classified emergency.
 */

export class DecisionEngine {
  /**
   * Provide recommendations based on the emergency category.
   * @param category - The classified emergency category.
   * @returns A list of recommended actions.
   */
  public getRecommendations(category: string): string[] {
    switch (category) {
      case 'Fire':
        return [
          'Evacuate the building immediately.',
          'Call the fire department (911).',
          'Use a fire extinguisher if safe to do so.'
        ];
      case 'Medical':
        return [
          'Call an ambulance (911).',
          'Provide first aid if trained.',
          'Keep the person calm and comfortable.'
        ];
      case 'Accident':
        return [
          'Ensure your safety first.',
          'Call emergency services (911).',
          'Provide assistance if safe to do so.'
        ];
      default:
        return ['No specific recommendations available.'];
    }
  }
}