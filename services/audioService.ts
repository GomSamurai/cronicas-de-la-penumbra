// Audio Service using Web Audio API for multi-layered procedural sound generation

export type AudioLayer = 'drone' | 'orchestra' | 'piano' | 'texture' | 'chimes' | 'choir' | 'subbass';
export type AudioMode = 'intro' | 'game';

class AudioService {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private reverbNode: ConvolverNode | null = null;
  private isInitialized: boolean = false;
  
  // Volume Control
  private masterVolumeValue: number = 1.0;
  
  // Mute State
  private isMutedState: boolean = false;
  private preMuteVolume: number = 1.0;

  // Layer Gains
  private layerGains: Record<AudioLayer, GainNode | null> = {
    drone: null,
    orchestra: null,
    piano: null,
    texture: null,
    chimes: null,
    choir: null,
    subbass: null
  };

  private heartbeatGain: GainNode | null = null;

  // State
  private layerMuted: Record<AudioLayer, boolean> = {
    drone: false,
    orchestra: false,
    piano: false,
    texture: false,
    chimes: false,
    choir: false,
    subbass: false
  };

  private currentMode: AudioMode = 'intro';

  // Active Nodes Reference for Randomization/Updates
  private activeFilters: BiquadFilterNode[] = [];
  private activeOscillators: OscillatorNode[] = [];
  
  // Interval IDs
  private pianoInterval: number | null = null;
  private orchestraInterval: number | null = null;
  private heartbeatInterval: number | null = null;
  private chimesInterval: number | null = null;
  private choirInterval: number | null = null;
  private subbassInterval: number | null = null;

  // Musical Scales (Base frequencies in Hz for 2nd octave)
  private scales = {
    minor: [55, 61.74, 65.41, 73.42, 82.41, 87.31, 98.00], // A natural minor
    phrygian: [55, 58.27, 65.41, 73.42, 82.41, 87.31, 98.00], // A phrygian
    harmonicMinor: [55, 61.74, 65.41, 73.42, 82.41, 87.31, 103.83], // A harmonic minor
    dorian: [55, 61.74, 65.41, 73.42, 82.41, 92.50, 98.00] // A dorian
  };
  private currentScale: number[] = this.scales.minor;

  constructor() {}

  public async init() {
    if (this.isInitialized) return;
    
    this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = this.isMutedState ? 0 : this.masterVolumeValue;
    this.masterGain.connect(this.ctx.destination);
    
    // Create procedural reverb
    this.createReverb();

    // Create Layer Gains and route them
    Object.keys(this.layerGains).forEach((key) => {
      const k = key as AudioLayer;
      this.layerGains[k] = this.ctx!.createGain();
      
      // Route melodic/atmospheric layers through reverb for depth
      if (k === 'piano' || k === 'orchestra' || k === 'chimes' || k === 'choir') {
         // Dry signal direct to master
         this.layerGains[k]!.connect(this.masterGain!);
         // Wet signal to reverb
         if (this.reverbNode) {
            const wetGain = this.ctx!.createGain();
            wetGain.gain.value = 0.8; // 80% sent to reverb
            this.layerGains[k]!.connect(wetGain);
            wetGain.connect(this.reverbNode);
         }
      } else {
         // Direct to master
         this.layerGains[k]!.connect(this.masterGain!);
      }
      
      this.layerGains[k]!.gain.value = this.layerMuted[k] ? 0 : 0.5;
    });

    // Heartbeat Gain (Special Layer)
    this.heartbeatGain = this.ctx.createGain();
    this.heartbeatGain.connect(this.masterGain);
    this.heartbeatGain.gain.value = 0.6; // Base volume

    this.pickRandomScale();
    this.isInitialized = true;
    this.startAllLayers();
    this.setMode('intro');
  }

  private pickRandomScale() {
     const keys = Object.keys(this.scales) as (keyof typeof this.scales)[];
     const randKey = keys[Math.floor(Math.random() * keys.length)];
     this.currentScale = this.scales[randKey];
     console.log("[AudioService] Escala generada:", randKey);
  }

  private createReverb() {
    if(!this.ctx || !this.masterGain) return;
    this.reverbNode = this.ctx.createConvolver();
    
    const rate = this.ctx.sampleRate;
    const length = rate * 4.0; // 4 seconds decay for huge space
    const impulse = this.ctx.createBuffer(2, length, rate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);
    
    for (let i = 0; i < length; i++) {
       const decay = Math.exp(-i / (rate * 1.5)); // Exponential decay curve
       left[i] = (Math.random() * 2 - 1) * decay;
       right[i] = (Math.random() * 2 - 1) * decay;
    }
    
    this.reverbNode.buffer = impulse;
    this.reverbNode.connect(this.masterGain);
  }

  public setMasterVolume(val: number) {
    this.masterVolumeValue = val;
    if (!this.isMutedState && this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(val, this.ctx.currentTime, 0.1);
    }
  }

  public getMasterVolume() {
    return this.masterVolumeValue;
  }

  public toggleMute(): boolean {
    if (!this.ctx || !this.masterGain) {
        this.isMutedState = !this.isMutedState;
        return this.isMutedState;
    }

    if (this.isMutedState) {
        this.isMutedState = false;
        this.masterGain.gain.setTargetAtTime(this.preMuteVolume, this.ctx.currentTime, 0.1);
        this.masterVolumeValue = this.preMuteVolume;
    } else {
        this.preMuteVolume = this.masterVolumeValue > 0 ? this.masterVolumeValue : 1.0;
        this.isMutedState = true;
        this.masterGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.1);
        this.masterVolumeValue = 0; 
    }
    return this.isMutedState;
  }

  public isMuted(): boolean {
    return this.isMutedState;
  }

  public setMode(mode: AudioMode) {
    if (!this.ctx) return;
    this.currentMode = mode;
    
    const now = this.ctx.currentTime;
    // Mix target levels for each layer depending on game state
    const targetGains: Record<AudioLayer, number> = mode === 'intro' 
      ? { drone: 0.15, orchestra: 0.3, piano: 0.4, texture: 0.05, chimes: 0.2, choir: 0.3, subbass: 0.4 }
      : { drone: 0.25, orchestra: 0.2, piano: 0.3, texture: 0.15, chimes: 0.1, choir: 0.15, subbass: 0.3 };

    Object.keys(targetGains).forEach(k => {
      const key = k as AudioLayer;
      if (!this.layerMuted[key] && this.layerGains[key]) {
        this.layerGains[key]!.gain.setTargetAtTime(targetGains[key], now, 3); // Smooth 3s transition
      }
    });

    if (mode === 'intro') {
       this.stopHeartbeat();
    }
  }

  public toggleLayer(layer: AudioLayer): boolean {
    if (!this.ctx) return true;
    this.layerMuted[layer] = !this.layerMuted[layer];
    
    const now = this.ctx.currentTime;
    let targetGain = 0.3; 
    if (layer === 'texture') targetGain = 0.1;
    if (layer === 'subbass') targetGain = 0.4;
    
    const val = this.layerMuted[layer] ? 0 : targetGain;
    this.layerGains[layer]?.gain.setTargetAtTime(val, now, 0.5);

    return this.layerMuted[layer];
  }

  public isLayerMuted(layer: AudioLayer): boolean {
    return this.layerMuted[layer];
  }

  // --- HEARTBEAT SYSTEM ---
  public updateHeartbeat(hp: number, maxHp: number) {
    if (!this.ctx || this.currentMode !== 'game') return;
    const hpRatio = hp / maxHp;
    if (hpRatio > 0.4 || hp <= 0) {
      this.stopHeartbeat();
      return;
    }
    const minDelay = 375;
    const maxDelay = 1000;
    const delay = minDelay + (hpRatio / 0.4) * (maxDelay - minDelay);
    let intensity = 1.0 - (hpRatio / 0.4); 
    intensity = Math.max(0.3, Math.min(1.2, intensity * 1.5));
    this.startHeartbeatLoop(delay, intensity);
  }

  private startHeartbeatLoop(delayMs: number, intensity: number) {
     if (this.heartbeatInterval) window.clearInterval(this.heartbeatInterval);
     const beat = () => {
        if (!this.ctx || !this.heartbeatGain) return;
        const now = this.ctx.currentTime;
        this.playThump(now, 100, intensity);
        this.playThump(now + 0.15, 110, intensity * 0.8);
     };
     beat();
     this.heartbeatInterval = window.setInterval(beat, delayMs);
  }

  private playThump(time: number, freq: number, vol: number) {
     if (!this.ctx || !this.heartbeatGain) return;
     const osc = this.ctx.createOscillator();
     const gain = this.ctx.createGain();
     const filter = this.ctx.createBiquadFilter();
     osc.type = 'sine';
     osc.frequency.setValueAtTime(freq, time);
     osc.frequency.exponentialRampToValueAtTime(50, time + 0.1);
     gain.gain.setValueAtTime(0, time);
     gain.gain.linearRampToValueAtTime(vol, time + 0.02);
     gain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);
     filter.type = 'lowpass';
     filter.frequency.value = 150;
     osc.connect(filter);
     filter.connect(gain);
     gain.connect(this.heartbeatGain);
     osc.start(time);
     osc.stop(time + 0.2);
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      window.clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  public randomize() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    this.pickRandomScale(); // Cambiar escala aleatoriamente en el juego puede ser un evento guay
    this.restartProceduralLoops();
  }

  private startAllLayers() {
    this.startDrone();
    this.startOrchestra();
    this.startPiano();
    this.startTexture();
    this.startChimes();
    this.startChoir();
    this.startSubbass();
  }

  private restartProceduralLoops() {
    if (this.pianoInterval) window.clearInterval(this.pianoInterval);
    if (this.orchestraInterval) window.clearInterval(this.orchestraInterval);
    if (this.chimesInterval) window.clearInterval(this.chimesInterval);
    if (this.choirInterval) window.clearInterval(this.choirInterval);
    if (this.subbassInterval) window.clearInterval(this.subbassInterval);
    this.startPiano();
    this.startOrchestra();
    this.startChimes();
    this.startChoir();
    this.startSubbass();
  }

  // --- LAYER 1: VOID (Drone) ---
  private startDrone() {
    if (!this.ctx || !this.layerGains.drone) return;
    const bufferSize = this.ctx.sampleRate * 5;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let lastOut = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      data[i] = (lastOut + (0.02 * white)) / 1.02;
      lastOut = data[i];
      data[i] *= 2.0; // Reduced drone volume
    }
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 60; // Lowered cutoff to make it subbier and less noisy
    source.connect(filter);
    filter.connect(this.layerGains.drone);
    source.start();
  }

  // --- LAYER 2: ORCHESTRA (Procedural Strings) ---
  private startOrchestra() {
    if (!this.ctx || !this.layerGains.orchestra) return;
    const playChord = () => {
      if (!this.ctx || this.layerMuted.orchestra) return;
      const numNotes = 2 + Math.floor(Math.random() * 2);
      const now = this.ctx.currentTime;
      const duration = 8 + Math.random() * 4; 
      
      for (let i = 0; i < numNotes; i++) {
         const osc = this.ctx.createOscillator();
         const gain = this.ctx.createGain();
         const filter = this.ctx.createBiquadFilter();
         osc.type = 'sawtooth';
         // Use dynamic scale
         const freq = this.currentScale[Math.floor(Math.random() * this.currentScale.length)] * (Math.random() > 0.5 ? 2 : 1);
         osc.frequency.value = freq;
         osc.detune.value = (Math.random() * 20) - 10;
         
         filter.type = 'lowpass';
         filter.frequency.value = 150;
         filter.frequency.linearRampToValueAtTime(300 + Math.random() * 200, now + (duration/2));
         filter.frequency.linearRampToValueAtTime(150, now + duration);
         
         const lfo = this.ctx.createOscillator();
         lfo.frequency.value = 4 + Math.random(); 
         const lfoGain = this.ctx.createGain();
         lfoGain.gain.value = 5;
         lfo.connect(lfoGain);
         lfoGain.connect(osc.frequency);
         lfo.start();
         
         gain.gain.value = 0;
         gain.gain.linearRampToValueAtTime(0.05, now + (duration * 0.4)); 
         gain.gain.linearRampToValueAtTime(0, now + duration); 
         
         osc.connect(filter);
         filter.connect(gain);
         gain.connect(this.layerGains.orchestra!);
         osc.start(now);
         osc.stop(now + duration + 1);
         this.activeOscillators.push(osc);
      }
    };
    playChord();
    this.orchestraInterval = window.setInterval(playChord, 12000); 
  }

  // --- LAYER 3: PIANO (Procedural Dark Keys) ---
  private startPiano() {
    if (!this.ctx || !this.layerGains.piano) return;
    const playPhrase = () => {
       if (!this.ctx || this.layerMuted.piano) return;
       if (Math.random() > 0.3) return; // Play less frequently
       
       const now = this.ctx.currentTime;
       const numNotes = 2 + Math.floor(Math.random() * 3);
       let timeOffset = 0;
       
       for(let i=0; i<numNotes; i++) {
           const osc = this.ctx.createOscillator();
           const gain = this.ctx.createGain();
           osc.type = 'sine';
           const freq = this.currentScale[Math.floor(Math.random() * this.currentScale.length)] * (Math.random() > 0.6 ? 4 : 2);
           osc.frequency.value = freq;
           
           gain.gain.setValueAtTime(0, now + timeOffset);
           gain.gain.linearRampToValueAtTime(0.15, now + timeOffset + 0.05); // Attack
           gain.gain.exponentialRampToValueAtTime(0.001, now + timeOffset + 3); // Long decay
           
           osc.connect(gain);
           gain.connect(this.layerGains.piano!); 
           
           osc.start(now + timeOffset);
           osc.stop(now + timeOffset + 4);
           
           timeOffset += 0.6 + Math.random() * 0.8; // Slower, more deliberate timing
       }
    };
    this.pianoInterval = window.setInterval(playPhrase, 5000); 
  }

  // --- LAYER 4: TEXTURE (Materia / Background Noise) ---
  private startTexture() {
    if (!this.ctx || !this.layerGains.texture) return;
    const bufferSize = this.ctx.sampleRate * 2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        data[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
        data[i] *= 0.05; // Considerably reduced noise volume
        b6 = white * 0.115926;
    }
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass'; 
    filter.frequency.value = 250; // Darker noise
    filter.Q.value = 0.5; 
    
    const lfo = this.ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.05; // Very slow sweeping
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 100; 
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);
    lfo.start();
    
    source.connect(filter);
    filter.connect(this.layerGains.texture);
    source.start();
  }

  // --- LAYER 5: CHIMES (Arpeggios) ---
  private startChimes() {
    if (!this.ctx || !this.layerGains.chimes) return;
    const playArp = () => {
       if (!this.ctx || this.layerMuted.chimes) return;
       if (Math.random() > 0.4) return;
       
       const now = this.ctx.currentTime;
       const numNotes = 3 + Math.floor(Math.random() * 3);
       let timeOffset = 0;
       
       for(let i=0; i<numNotes; i++) {
           const osc = this.ctx.createOscillator();
           const gain = this.ctx.createGain();
           osc.type = 'triangle';
           
           // Octave 4 or 5
           const freq = this.currentScale[Math.floor(Math.random() * this.currentScale.length)] * 8; 
           osc.frequency.value = freq;
           
           gain.gain.setValueAtTime(0, now + timeOffset);
           gain.gain.linearRampToValueAtTime(0.08, now + timeOffset + 0.02); // Fast attack
           gain.gain.exponentialRampToValueAtTime(0.001, now + timeOffset + 1.5); // Quick decay
           
           osc.connect(gain);
           gain.connect(this.layerGains.chimes!); 
           
           osc.start(now + timeOffset);
           osc.stop(now + timeOffset + 2);
           
           timeOffset += 0.2 + Math.random() * 0.1; // Fast arpeggio
       }
    };
    this.chimesInterval = window.setInterval(playArp, 7000); 
  }

  // --- LAYER 6: CHOIR (Formant voices) ---
  private startChoir() {
    if (!this.ctx || !this.layerGains.choir) return;
    const playChoir = () => {
       if (!this.ctx || this.layerMuted.choir) return;
       if (Math.random() > 0.5) return;
       
       const now = this.ctx.currentTime;
       const duration = 10 + Math.random() * 5; 
       
       const osc = this.ctx.createOscillator();
       const gain = this.ctx.createGain();
       const filter1 = this.ctx.createBiquadFilter();
       const filter2 = this.ctx.createBiquadFilter();
       
       osc.type = 'sawtooth';
       const freq = this.currentScale[Math.floor(Math.random() * this.currentScale.length)] * 2;
       osc.frequency.value = freq;
       
       // Formant filtering (simulating vocal tract 'ah' or 'oh')
       filter1.type = 'bandpass';
       filter1.frequency.value = 600;
       filter1.Q.value = 2;
       
       filter2.type = 'bandpass';
       filter2.frequency.value = 1000;
       filter2.Q.value = 2;
       
       gain.gain.setValueAtTime(0, now);
       gain.gain.linearRampToValueAtTime(0.04, now + (duration * 0.3)); 
       gain.gain.linearRampToValueAtTime(0, now + duration); 
       
       osc.connect(filter1);
       filter1.connect(filter2);
       filter2.connect(gain);
       gain.connect(this.layerGains.choir!);
       
       osc.start(now);
       osc.stop(now + duration + 1);
    };
    this.choirInterval = window.setInterval(playChoir, 15000); 
  }

  // --- LAYER 7: SUBBASS (Cinematic low hits) ---
  private startSubbass() {
    if (!this.ctx || !this.layerGains.subbass) return;
    const playHit = () => {
       if (!this.ctx || this.layerMuted.subbass) return;
       if (Math.random() > 0.5) return;
       
       const now = this.ctx.currentTime;
       const osc = this.ctx.createOscillator();
       const gain = this.ctx.createGain();
       
       osc.type = 'sine';
       // Very low frequency (around 30-50Hz)
       const baseFreq = this.currentScale[0] / 2; // Root note 1 octave down
       osc.frequency.setValueAtTime(baseFreq * 1.5, now);
       osc.frequency.exponentialRampToValueAtTime(baseFreq, now + 0.3); // Pitch drop
       
       gain.gain.setValueAtTime(0, now);
       gain.gain.linearRampToValueAtTime(0.6, now + 0.1); 
       gain.gain.exponentialRampToValueAtTime(0.001, now + 4); 
       
       osc.connect(gain);
       gain.connect(this.layerGains.subbass!);
       
       osc.start(now);
       osc.stop(now + 4.1);
    };
    this.subbassInterval = window.setInterval(playHit, 11000); 
  }

  // --- SFX ---
  public playClick() {
    if (!this.ctx || !this.masterGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.frequency.setValueAtTime(800, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, this.ctx.currentTime + 0.05);
    gain.gain.setValueAtTime(0.05 * (this.isMutedState ? 0.2 : this.masterVolumeValue), this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.05);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.05);
  }

  public playLowButton() {
     if (!this.ctx || !this.masterGain) return;
     const osc = this.ctx.createOscillator();
     const gain = this.ctx.createGain();
     osc.type = 'triangle';
     osc.frequency.setValueAtTime(150, this.ctx.currentTime);
     osc.frequency.exponentialRampToValueAtTime(50, this.ctx.currentTime + 0.15);
     gain.gain.setValueAtTime(0.1 * (this.isMutedState ? 0.2 : this.masterVolumeValue), this.ctx.currentTime);
     gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.15);
     osc.connect(gain);
     gain.connect(this.masterGain);
     osc.start();
     osc.stop(this.ctx.currentTime + 0.15);
  }

  public playDiceRoll() {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    [0, 0.1, 0.18, 0.25, 0.4].forEach(t => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'square'; 
      osc.frequency.value = 100 + Math.random() * 50;
      const filter = this.ctx!.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 300;
      gain.gain.setValueAtTime(0.05 * (this.isMutedState ? 0.2 : this.masterVolumeValue), now + t);
      gain.gain.exponentialRampToValueAtTime(0.001, now + t + 0.05);
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain!);
      osc.start(now + t);
      osc.stop(now + t + 0.06);
    });
  }
  
  public playSuccess() {
    if (!this.ctx || !this.masterGain) return;
    const freqs = [440, 554.37, 659.25];
    freqs.forEach((f, i) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'sine';
        osc.frequency.value = f;
        const now = this.ctx!.currentTime;
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.03 * (this.isMutedState ? 0.2 : this.masterVolumeValue), now + 0.1 + (i*0.05));
        gain.gain.exponentialRampToValueAtTime(0.001, now + 2);
        osc.connect(gain);
        gain.connect(this.masterGain!);
        osc.start();
        osc.stop(now + 2.1);
    });
  }

  public playTypingSound() {
    if (!this.ctx || !this.masterGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();
    
    osc.type = 'sawtooth';
    osc.frequency.value = 50 + Math.random() * 50;
    
    filter.type = 'bandpass';
    filter.frequency.value = 1500 + Math.random() * 1500;
    filter.Q.value = 1.0;
    
    const now = this.ctx.currentTime;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.01 * (this.isMutedState ? 0.2 : this.masterVolumeValue), now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    
    osc.start(now);
    osc.stop(now + 0.06);
  }
}

export const audioSystem = new AudioService();