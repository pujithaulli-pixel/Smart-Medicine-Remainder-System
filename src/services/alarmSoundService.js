// Web Audio API Sound Service for Smart Medical Reminder
// Generates pleasant, audible, synthesized healthcare chimes without external audio file dependencies.

class AlarmSoundService {
  constructor() {
    this.audioCtx = null;
    this.isPlaying = false;
    this.loopTimer = null;
    this.userInteracted = false;
  }

  // Initialize or resume the AudioContext after user interaction
  initAudioContext() {
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }

    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch((err) => {
        console.warn('[AlarmSoundService] AudioContext resume failed:', err);
      });
    }

    this.userInteracted = true;
    return this.audioCtx;
  }

  // Check if audio can be played
  canPlayAudio() {
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      return Boolean(AudioContextClass);
    }
    return this.audioCtx.state === 'running';
  }

  // Play a single gentle harmonic medical reminder chime
  playChimeTone() {
    try {
      const ctx = this.initAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;

      // Two-tone medical chime (D5 = 587.33Hz, A5 = 880Hz)
      const freqs = [587.33, 880.00];

      freqs.forEach((freq, idx) => {
        const startTime = now + idx * 0.22;
        const duration = 0.45;

        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);

        // Soft attack, gentle exponential decay
        gainNode.gain.setValueAtTime(0.001, startTime);
        gainNode.gain.exponentialRampToValueAtTime(0.3, startTime + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

        osc.connect(gainNode);
        gainNode.connect(ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + duration);
      });
    } catch (err) {
      console.warn('[AlarmSoundService] Play chime failed:', err);
    }
  }

  // Start continuous repeating alarm loop until stopped
  startAlarm() {
    if (this.isPlaying) return;

    this.isPlaying = true;
    this.initAudioContext();

    // Play immediate first chime
    this.playChimeTone();

    // Repeat chime every 2.5 seconds
    this.loopTimer = setInterval(() => {
      if (this.isPlaying) {
        this.playChimeTone();
      } else {
        clearInterval(this.loopTimer);
      }
    }, 2500);
  }

  // Stop currently playing alarm immediately
  stopAlarm() {
    this.isPlaying = false;
    if (this.loopTimer) {
      clearInterval(this.loopTimer);
      this.loopTimer = null;
    }
  }

  // Test sound: plays a single chime sequence
  testAlarm() {
    this.initAudioContext();
    this.playChimeTone();
  }
}

export const alarmSoundService = new AlarmSoundService();
