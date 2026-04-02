import type { Helper } from './nearbyHelpersDetection';

/**
 * Responder Matching System
 * Matches the user in need with the most suitable nearby responder/helper.
 */
export class ResponderMatchingSystem {
  /**
   * Match the best responder based on skills, trust, and verification.
   * @param helpers - List of nearby helpers
   * @param emergencyType - Type of emergency (e.g., 'Fire', 'Medical')
   */
  public matchResponder(helpers: Helper[], emergencyType: string): Helper | null {
    if (!helpers.length) return null;
    // Prioritize: verified > skill match > trustScore > closest
    const skillMatch = (helper: Helper) =>
      helper.skills && helper.skills.map(s => s.toLowerCase()).includes(emergencyType.toLowerCase());
    return (
      helpers
        .filter(h => h.isVerified)
        .sort((a, b) => (b.trustScore ?? 0) - (a.trustScore ?? 0))
        .find(skillMatch)
      || helpers
        .sort((a, b) => (b.trustScore ?? 0) - (a.trustScore ?? 0))
        .find(skillMatch)
      || helpers
        .filter(h => h.isVerified)
        .sort((a, b) => (b.trustScore ?? 0) - (a.trustScore ?? 0))
        [0]
      || helpers
        .sort((a, b) => (b.trustScore ?? 0) - (a.trustScore ?? 0))
        [0]
    );
  }
}
