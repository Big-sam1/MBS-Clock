/* Smart Alarm Pro - Web Speech API Voice Synthesizer */

class VoiceService {
  constructor() {
    this.synth = window.speechSynthesis;
    this.voices = [];
    this.supported = 'speechSynthesis' in window;
    this.init();
  }

  init() {
    if (!this.supported) return;

    // Load voices
    this.loadVoices();
    if (this.synth.onvoiceschanged !== undefined) {
      this.synth.onvoiceschanged = () => this.loadVoices();
    }
  }

  loadVoices() {
    this.voices = this.synth.getVoices();
  }

  getVoices() {
    this.init();
    return this.voices;
  }

  stop() {
    if (this.supported && this.synth.speaking) {
      this.synth.cancel();
    }
  }

  speak(text, volume = 0.8, rate = 1.0, pitch = 1.0, voiceName = '') {
    if (!this.supported) return;

    this.stop(); // cancel previous speaking

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.volume = volume;
    utterance.rate = rate;
    utterance.pitch = pitch;

    // Try to match voice by name
    if (voiceName) {
      const selectedVoice = this.voices.find(v => v.name === voiceName);
      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }
    } else {
      // Fallback: search for a premium/default English voice
      const defaultVoice = this.voices.find(v => v.lang.startsWith('en') && v.localService) ||
                           this.voices.find(v => v.lang.startsWith('en')) ||
                           this.voices[0];
      if (defaultVoice) {
        utterance.voice = defaultVoice;
      }
    }

    this.synth.speak(utterance);
  }
}

export const VoiceServiceInstance = new VoiceService();
