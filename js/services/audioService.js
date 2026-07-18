/* Smart Alarm Pro - Web Audio API Sound Synthesizer */

class AudioService {
  constructor() {
    this.ctx = null;
    this.mainGain = null;
    this.activeNodes = [];
    this.isPlaying = false;
    this.soundLoopInterval = null;
    this.currentSound = null;
    this.uploadedAudio = null; // HTMLAudioElement for custom MP3s
  }

  // Ensure AudioContext is active
  init() {
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContextClass();
      this.mainGain = this.ctx.createGain();
      this.mainGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // Set main volume (0 to 1)
  setVolume(vol) {
    this.init();
    if (this.mainGain) {
      this.mainGain.gain.setValueAtTime(vol, this.ctx.currentTime);
    }
  }

  // Play a sound by name, or play a custom File/Blob
  play(soundName, volume = 0.8, loop = true, fadeIn = 3, customBlob = null) {
    this.init();
    this.stop(); // Stop any active playback

    this.isPlaying = true;
    this.currentSound = soundName;
    this.setVolume(volume);

    // If it's a custom sound blob
    if (soundName === 'custom' && customBlob) {
      this.playCustomBlob(customBlob, loop, fadeIn);
      return;
    }

    // Programmatic Synthesizers
    if (['ocean', 'rain', 'forest'].includes(soundName)) {
      this.playNoiseAtmosphere(soundName, fadeIn);
    } else if (soundName === 'birds') {
      this.playBirdsSynthesis();
    } else if (soundName === 'piano') {
      this.playPianoSynthesis(fadeIn);
    } else if (soundName === 'bell') {
      this.playBellSynthesis();
    } else if (soundName === 'meditation') {
      this.playMeditationSynthesis(fadeIn);
    } else if (soundName === 'digital') {
      this.playDigitalAlarm();
    } else if (soundName === 'emergency') {
      this.playEmergencyAlarm();
    } else {
      // Default: Classic Beep
      this.playClassicAlarm();
    }
  }

  // Stop all playback
  stop() {
    this.isPlaying = false;
    if (this.soundLoopInterval) {
      clearInterval(this.soundLoopInterval);
      this.soundLoopInterval = null;
    }

    // Stop and disconnect Web Audio nodes
    this.activeNodes.forEach(node => {
      try {
        node.stop();
      } catch (e) {}
      try {
        node.disconnect();
      } catch (e) {}
    });
    this.activeNodes = [];

    // Stop custom HTMLAudioElement
    if (this.uploadedAudio) {
      this.uploadedAudio.pause();
      this.uploadedAudio.currentTime = 0;
      this.uploadedAudio = null;
    }
  }

  // Custom Blob playback
  playCustomBlob(blob, loop, fadeIn) {
    const audioUrl = URL.createObjectURL(blob);
    this.uploadedAudio = new Audio(audioUrl);
    this.uploadedAudio.loop = loop;
    
    // Apply volume settings via Web Audio context for unified control
    const source = this.ctx.createMediaElementSource(this.uploadedAudio);
    source.connect(this.mainGain);

    if (fadeIn > 0) {
      this.mainGain.gain.setValueAtTime(0, this.ctx.currentTime);
      this.mainGain.gain.linearRampToValueAtTime(0.8, this.ctx.currentTime + fadeIn);
    }

    this.uploadedAudio.play().catch(e => {
      console.error('Custom sound autoplay blocked, waiting for user gesture:', e);
    });
  }

  // Helper: Create a White Noise Buffer
  createNoiseBuffer() {
    const bufferSize = 2 * this.ctx.sampleRate;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    return noiseBuffer;
  }

  // Noise Generators: Ocean, Rain, Forest Wind
  playNoiseAtmosphere(type, fadeIn) {
    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = this.createNoiseBuffer();
    noiseSource.loop = true;

    const filter = this.ctx.createBiquadFilter();
    
    if (type === 'ocean') {
      // Sweep lowpass cutoff filter dynamically to simulate waves
      filter.type = 'lowpass';
      filter.Q.value = 1.0;
      
      const lfo = this.ctx.createOscillator();
      lfo.frequency.value = 0.125; // 8-second cycle
      
      const lfoGain = this.ctx.createGain();
      lfoGain.gain.value = 300; // Sweep range in Hz

      lfo.connect(lfoGain);
      lfoGain.connect(filter.frequency);
      
      filter.frequency.value = 500; // Base frequency

      lfo.start();
      this.activeNodes.push(lfo);
    } else if (type === 'rain') {
      filter.type = 'highpass';
      filter.frequency.value = 1200;
    } else if (type === 'forest') {
      // Bandpass sweep simulating wind blowing through trees
      filter.type = 'bandpass';
      filter.Q.value = 2.0;

      const lfo = this.ctx.createOscillator();
      lfo.frequency.value = 0.05; // 20-second cycle
      const lfoGain = this.ctx.createGain();
      lfoGain.gain.value = 250;

      lfo.connect(lfoGain);
      lfoGain.connect(filter.frequency);
      filter.frequency.value = 600;

      lfo.start();
      this.activeNodes.push(lfo);
    }

    noiseSource.connect(filter);
    filter.connect(this.mainGain);
    noiseSource.start();

    this.activeNodes.push(noiseSource);
  }

  // Birds Chirping Synthesis
  playBirdsSynthesis() {
    const playChirp = () => {
      if (!this.isPlaying) return;

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(2500, now);
      // Sweep pitch up and down rapidly (chirp)
      osc.frequency.exponentialRampToValueAtTime(4500, now + 0.1);
      osc.frequency.exponentialRampToValueAtTime(3000, now + 0.25);

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.3, now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      osc.connect(gain);
      gain.connect(this.mainGain);
      osc.start(now);
      osc.stop(now + 0.3);

      this.activeNodes.push(osc);
    };

    // Schedule chirps periodically
    playChirp();
    this.soundLoopInterval = setInterval(() => {
      if (Math.random() > 0.3) {
        playChirp();
        setTimeout(playChirp, 300); // Double chirp
      }
    }, 1500);
  }

  // Piano Synthesis (Warm Major Triad)
  playPianoSynthesis(fadeIn) {
    const playChord = () => {
      if (!this.isPlaying) return;
      
      const freqs = [196.00, 261.63, 329.63, 392.00, 523.25]; // G3, C4, E4, G4, C5
      const now = this.ctx.currentTime;

      freqs.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.05); // arpeggiate slightly
        
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.2, now + 0.1 + idx * 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 2.8); // 3 seconds decay

        osc.connect(gain);
        gain.connect(this.mainGain);
        osc.start(now);
        osc.stop(now + 3.0);

        this.activeNodes.push(osc);
      });
    };

    playChord();
    this.soundLoopInterval = setInterval(playChord, 3500);
  }

  // Bell Synthesis (Rich Inharmonics)
  playBellSynthesis() {
    const playBell = () => {
      if (!this.isPlaying) return;

      const now = this.ctx.currentTime;
      const baseFreq = 440; // A4
      const partials = [1.0, 1.5, 1.95, 2.3, 2.65, 3.1, 3.8];
      const gains = [0.5, 0.25, 0.2, 0.15, 0.1, 0.08, 0.05];

      partials.forEach((mult, i) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(baseFreq * mult, now);

        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(gains[i] * 0.4, now + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 3.5 / (mult * 0.8)); // Higher partials decay faster

        osc.connect(gain);
        gain.connect(this.mainGain);
        osc.start(now);
        osc.stop(now + 4.0);

        this.activeNodes.push(osc);
      });
    };

    playBell();
    this.soundLoopInterval = setInterval(playBell, 4000);
  }

  // Meditation binaural waves
  playMeditationSynthesis(fadeIn) {
    const oscL = this.ctx.createOscillator();
    const oscR = this.ctx.createOscillator();
    const pannerL = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;
    const pannerR = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;
    
    // Solfeggio frequency: 432Hz in Left, 436Hz in Right (creates 4Hz Theta beat)
    oscL.frequency.value = 432;
    oscR.frequency.value = 436;

    if (pannerL && pannerR) {
      pannerL.pan.value = -1;
      pannerR.pan.value = 1;

      oscL.connect(pannerL);
      pannerL.connect(this.mainGain);

      oscR.connect(pannerR);
      pannerR.connect(this.mainGain);
    } else {
      oscL.connect(this.mainGain);
      oscR.connect(this.mainGain);
    }

    oscL.start();
    oscR.start();

    this.activeNodes.push(oscL, oscR);
  }

  // Digital Alarm Beep Beep
  playDigitalAlarm() {
    const playBeep = () => {
      if (!this.isPlaying) return;

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(1000, now);

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.25, now + 0.01);
      gain.gain.setValueAtTime(0.25, now + 0.15);
      gain.gain.linearRampToValueAtTime(0, now + 0.18);

      osc.connect(gain);
      gain.connect(this.mainGain);
      osc.start(now);
      osc.stop(now + 0.2);

      this.activeNodes.push(osc);
    };

    const pattern = () => {
      playBeep();
      setTimeout(playBeep, 250);
      setTimeout(playBeep, 500);
    };

    pattern();
    this.soundLoopInterval = setInterval(pattern, 1200);
  }

  // Emergency Siren Beep
  playEmergencyAlarm() {
    const playSiren = () => {
      if (!this.isPlaying) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.linearRampToValueAtTime(1200, now + 0.4);
      osc.frequency.linearRampToValueAtTime(600, now + 0.8);

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.3, now + 0.05);
      gain.gain.setValueAtTime(0.3, now + 0.7);
      gain.gain.linearRampToValueAtTime(0, now + 0.8);

      osc.connect(gain);
      gain.connect(this.mainGain);
      osc.start(now);
      osc.stop(now + 0.8);

      this.activeNodes.push(osc);
    };

    playSiren();
    this.soundLoopInterval = setInterval(playSiren, 800);
  }

  // Classic mechanical Bell Alarm
  playClassicAlarm() {
    const playDoubleBeep = () => {
      if (!this.isPlaying) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(2000, now);
      
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.3, now + 0.02);
      gain.gain.setValueAtTime(0.3, now + 0.08);
      gain.gain.linearRampToValueAtTime(0, now + 0.1);

      osc.connect(gain);
      gain.connect(this.mainGain);
      osc.start(now);
      osc.stop(now + 0.12);

      this.activeNodes.push(osc);
    };

    const runPattern = () => {
      playDoubleBeep();
      setTimeout(playDoubleBeep, 150);
    };

    runPattern();
    this.soundLoopInterval = setInterval(runPattern, 800);
  }
}

export const AudioServiceInstance = new AudioService();
