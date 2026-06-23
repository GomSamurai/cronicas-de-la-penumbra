// Audio Service using Web Audio API for multi-layered procedural sound generation

type AudioLayer = 'drone' | 'orchestra' | 'piano' | 'texture';
type AudioMode = 'intro' | 'game';

class AudioService {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private isInitialized: boolean = false;
  
  // Volume Control
  private masterVolumeValue: number = 1.0;
  
  // Mute State
  private isMutedState: boolean = false;
  private preMuteVolume: number = 1.0;

  // Layer Gains (for Muting/Unmuting)
  private layerGains: Record<AudioLayer, GainNode | null> = {
    drone: null,
    orchestra: null,
    piano: null,
    texture: null
  };

  private heartbeatGain: GainNode | null = null;

  // State
  private layerMuted: Record<AudioLayer, boolean> = {
    drone: false,
    orchestra: false,
    piano: false,
    texture: false 
  };

  private currentMode: AudioMode = 'intro';

  // Active Nodes Reference for Randomization/Updates
  private activeFilters: BiquadFilterNode[] = [];
  private activeOscillators: OscillatorNode[] = [];
  
  // Interval IDs
  private pianoInterval: number | null = null;
  private orchestraInterval: number | null = null;
  private heartbeatInterval: number | null = null;

  // Musical Scales (Minor/Dark)
  private baseFreqs = [55, 65.41, 73.42, 82.41, 98.00, 110.00, 130.81, 146.83]; // A, C, D, E...

  constructor() {}

  public async init() {
    if (this.isInitialized) return;
    
    this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = this.isMutedState ? 0 : this.masterVolumeValue;
    this.masterGain.connect(this.ctx.destination);
    
    // Create Layer Gains
    Object.keys(this.layerGains).forEach((key) => {
      const k = key as AudioLayer;
      this.layerGains[k] = this.ctx!.createGain();
      this.layerGains[k]!.connect(this.masterGain!);
      this.layerGains[k]!.gain.value = this.layerMuted[k] ? 0 : 0.5;
    });

    // Heartbeat Gain (Special Layer)
    this.heartbeatGain = this.ctx.createGain();
    this.heartbeatGain.connect(this.masterGain);
    this.heartbeatGain.gain.value = 0.6; // Base volume

    this.isInitialized = true;
    this.startAllLayers();
    this.setMode('intro');
  }

  public setMasterVolume(val: number) {
    this.masterVolumeValue = val;
    if (!this.isMutedState && this.masterGain) {
      this.masterGain.gain.setTargetAtTime(val, this.ctx!.currentTime, 0.1);
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
        // Unmute
        this.isMutedState = false;
        this.masterGain.gain.setTargetAtTime(this.preMuteVolume, this.ctx.currentTime, 0.1);
        this.masterVolumeValue = this.preMuteVolume;
    } else {
        // Mute
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
    const targetGains: Record<AudioLayer, number> = mode === 'intro' 
      ? { drone: 0.3, orchestra: 0.5, piano: 0.4, texture: 0.1 }
      : { drone: 0.5, orchestra: 0.25, piano: 0.3, texture: 0.4 };

    Object.keys(targetGains).forEach(k => {
      const key = k as AudioLayer;
      if (!this.layerMuted[key] && this.layerGains[key]) {
        this.layerGains[key]!.gain.setTargetAtTime(targetGains[key], now, 2);
      }
    });

    // Reset heartbeat when changing modes (stops it if going to intro)
    if (mode === 'intro') {
       this.stopHeartbeat();
    }
  }

  public toggleLayer(layer: AudioLayer): boolean {
    if (!this.ctx) return true;
    this.layerMuted[layer] = !this.layerMuted[layer];
    
    const now = this.ctx.currentTime;
    let targetGain = 0.4; // default
    if (this.currentMode === 'intro') {
       if (layer === 'texture') targetGain = 0.1;
    }
    
    const val = this.layerMuted[layer] ? 0 : targetGain;
    this.layerGains[layer]?.gain.setTargetAtTime(val, now, 0.5);

    return this.layerMuted[layer];
  }

  public isLayerMuted(layer: AudioLayer): boolean {
    return this.layerMuted[layer];
  }

  // --- HEARTBEAT SYSTEM (Procedural) ---
  public updateHeartbeat(hp: number, maxHp: number) {
    if (!this.ctx || this.currentMode !== 'game') return;

    const hpRatio = hp / maxHp;

    // Only play if HP < 40%
    if (hpRatio > 0.4 || hp <= 0) {
      this.stopHeartbeat();
      return;
    }

    // Calculate BPM based on HP (Lower HP = Faster)
    // 40% -> 60 BPM (1000ms)
    // 0% -> 160 BPM (375ms)
    const minDelay = 375;
    const maxDelay = 1000;
    const delay = minDelay + (hpRatio / 0.4) * (maxDelay - minDelay);

    // Calculate Volume (Lower HP = Louder)
    // 40% -> 0.3
    // 5% -> 1.0
    let intensity = 1.0 - (hpRatio / 0.4); 
    intensity = Math.max(0.3, Math.min(1.2, intensity * 1.5));

    this.startHeartbeatLoop(delay, intensity);
  }

  private startHeartbeatLoop(delayMs: number, intensity: number) {
     if (this.heartbeatInterval) window.clearInterval(this.heartbeatInterval);
     
     const beat = () => {
        if (!this.ctx || !this.heartbeatGain) return;
        
        const now = this.ctx.currentTime;
        
        // Thump 1 (Lub)
        this.playThump(now, 100, intensity);
        
        // Thump 2 (Dub) - slightly higher pitch, slightly quieter, 150ms later
        this.playThump(now + 0.15, 110, intensity * 0.8);
     };

     beat(); // Play immediately
     this.heartbeatInterval = window.setInterval(beat, delayMs);
  }

  private playThump(time: number, freq: number, vol: number) {
     if (!this.ctx || !this.heartbeatGain) return;
     
     const osc = this.ctx.createOscillator();
     const gain = this.ctx.createGain();
     const filter = this.ctx.createBiquadFilter();

     osc.type = 'sine'; // Low sine for visceral feel
     osc.frequency.setValueAtTime(freq, time);
     osc.frequency.exponentialRampToValueAtTime(50, time + 0.1); // Pitch drop

     // Soft attack, fast decay
     gain.gain.setValueAtTime(0, time);
     gain.gain.linearRampToValueAtTime(vol, time + 0.02);
     gain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);

     // Lowpass to make it muffled like inside a chest
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
    this.activeFilters.forEach(filter => {
      if ((filter as any).label === 'texture') {
        const r = Math.random();
        if (r < 0.33) {
          filter.type = 'bandpass';
          filter.Q.value = 1; 
          filter.frequency.exponentialRampToValueAtTime(150 + Math.random() * 200, now + 2);
        } else if (r < 0.66) {
          filter.type = 'lowpass';
          filter.Q.value = 0.5;
          filter.frequency.exponentialRampToValueAtTime(200 + Math.random() * 300, now + 2);
        } else {
          filter.type = 'highpass';
          filter.Q.value = 0.5;
          filter.frequency.exponentialRampToValueAtTime(800 + Math.random() * 400, now + 1);
        }
      }
    });
    const detuneAmount = (Math.random() * 400) - 200; 
    this.activeOscillators.forEach(osc => {
      osc.detune.setTargetAtTime(detuneAmount, now, 4);
    });
    this.restartProceduralLoops();
  }

  private startAllLayers() {
    this.startDrone();
    this.startOrchestra();
    this.startPiano();
    this.startTexture();
  }

  private restartProceduralLoops() {
    if (this.pianoInterval) window.clearInterval(this.pianoInterval);
    if (this.orchestraInterval) window.clearInterval(this.orchestraInterval);
    this.startPiano();
    this.startOrchestra();
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
      data[i] *= 3.5; 
    }
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 70;
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
      const duration = 6 + Math.random() * 6; 
      for (let i = 0; i < numNotes; i++) {
         const osc = this.ctx.createOscillator();
         const gain = this.ctx.createGain();
         const filter = this.ctx.createBiquadFilter();
         osc.type = 'sawtooth';
         const freq = this.baseFreqs[Math.floor(Math.random() * this.baseFreqs.length)] * (Math.random() > 0.5 ? 2 : 1);
         osc.frequency.value = freq;
         osc.detune.value = (Math.random() * 20) - 10;
         filter.type = 'lowpass';
         filter.frequency.value = 200;
         filter.frequency.linearRampToValueAtTime(400 + Math.random() * 200, now + (duration/2));
         filter.frequency.linearRampToValueAtTime(200, now + duration);
         const lfo = this.ctx.createOscillator();
         lfo.frequency.value = 4 + Math.random(); 
         const lfoGain = this.ctx.createGain();
         lfoGain.gain.value = 3;
         lfo.connect(lfoGain);
         lfoGain.connect(osc.frequency);
         lfo.start();
         gain.gain.value = 0;
         gain.gain.linearRampToValueAtTime(0.08, now + (duration * 0.3)); 
         gain.gain.linearRampToValueAtTime(0, now + duration); 
         osc.connect(filter);
         filter.connect(gain);
         gain.connect(this.layerGains.orchestra!);
         osc.start();
         osc.stop(now + duration + 1);
         this.activeOscillators.push(osc);
      }
    };
    playChord();
    this.orchestraInterval = window.setInterval(playChord, 8000); 
  }

  // --- LAYER 3: PIANO (Procedural Dark Keys) ---
  private startPiano() {
    if (!this.ctx || !this.layerGains.piano) return;
    const playPhrase = () => {
       if (!this.ctx || this.layerMuted.piano) return;
       if (Math.random() > 0.4) return; 
       
       const now = this.ctx.currentTime;
       const numNotes = 2 + Math.floor(Math.random() * 2);
       let timeOffset = 0;
       
       for(let i=0; i<numNotes; i++) {
           const osc = this.ctx.createOscillator();
           const gain = this.ctx.createGain();
           osc.type = 'sine';
           const freq = this.baseFreqs[Math.floor(Math.random() * this.baseFreqs.length)] * (Math.random() > 0.7 ? 4 : 2);
           osc.frequency.value = freq;
           
           gain.gain.setValueAtTime(0, now + timeOffset);
           gain.gain.linearRampToValueAtTime(0.15, now + timeOffset + 0.05); 
           gain.gain.exponentialRampToValueAtTime(0.001, now + timeOffset + 3); 
           
           osc.connect(gain);
           
           const delay = this.ctx.createDelay();
           delay.delayTime.value = 0.4;
           const feedback = this.ctx.createGain();
           feedback.gain.value = 0.3;
           
           gain.connect(delay);
           delay.connect(feedback);
           feedback.connect(delay);
           
           delay.connect(this.layerGains.piano!);
           gain.connect(this.layerGains.piano!); 
           
           osc.start(now + timeOffset);
           osc.stop(now + timeOffset + 4);
           
           timeOffset += 0.8 + Math.random() * 0.5;
       }
    };
    this.pianoInterval = window.setInterval(playPhrase, 6000); 
  }

  // --- LAYER 4: TEXTURE (Materia) ---
  private startTexture() {
    if (!this.ctx || !this.layerGains.texture) return;
    const bufferSize = this.ctx.sampleRate * 2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let b0, b1, b2, b3, b4, b5, b6;
    b0 = b1 = b2 = b3 = b4 = b5 = b6 = 0.0;
    for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        data[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
        data[i] *= 0.11;
        b6 = white * 0.115926;
    }
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass'; 
    filter.frequency.value = 350; 
    filter.Q.value = 0.5; 
    (filter as any).label = 'texture'; 
    const lfo = this.ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.1; 
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 150; 
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);
    lfo.start();
    source.connect(filter);
    filter.connect(this.layerGains.texture);
    source.start();
    this.activeFilters.push(filter);
  }

  // --- SFX ---
  public playClick() {
    if (!this.ctx || !this.masterGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.frequency.setValueAtTime(800, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, this.ctx.currentTime + 0.05);
    gain.gain.setValueAtTime(0.1 * (this.isMutedState ? 0.2 : this.masterVolumeValue), this.ctx.currentTime);
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
     gain.gain.setValueAtTime(0.15 * (this.isMutedState ? 0.2 : this.masterVolumeValue), this.ctx.currentTime);
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
      gain.gain.setValueAtTime(0.1 * (this.isMutedState ? 0.2 : this.masterVolumeValue), now + t);
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
        gain.gain.linearRampToValueAtTime(0.05 * (this.isMutedState ? 0.2 : this.masterVolumeValue), now + 0.1 + (i*0.05));
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
    gain.gain.linearRampToValueAtTime(0.015 * (this.isMutedState ? 0.2 : this.masterVolumeValue), now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    
    osc.start(now);
    osc.stop(now + 0.06);
  }
}

export const audioSystem = new AudioService();