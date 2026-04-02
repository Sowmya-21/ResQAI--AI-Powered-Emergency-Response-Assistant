/**
 * Voice-Guided Help
 * Uses speech synthesis to read out instructions.
 */
export class VoiceGuidance {
  public speak(text: string, lang: string = 'en-US') {
    if ('speechSynthesis' in window) {
      const utterance = new window.SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      window.speechSynthesis.speak(utterance);
    } else {
      console.warn('Speech synthesis not supported.');
    }
  }
}
