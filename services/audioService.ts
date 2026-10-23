// Audio Service using Web Audio API for multi-layered procedural sound generation
import { TensionLevel } from '../types';

export type AudioLayer = 'drone' | 'orchestra' | 'piano' | 'texture' | 'chimes' | 'choir' | 'subbass';
export type AudioMode = 'intro' | 'game';

class AudioService {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private masterFilter: BiquadFilterNode | null = null;
  private reverbNode: ConvolverNode | null = null;
  private isInitialized: boolean = false;
  
  // Volume Control
  private masterVolumeValue: number = 1.0;
  
  // Mute State
  private isMutedState: boolean = false;
  private preMuteVolume: number = 1.0;

  // Tension & Reactive Audio
  private currentTension: TensionLevel = 'calma';
  private isReactiveAudioEnabled: boolean = true;

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
  private combatDrumsGain: GainNode | null = null;

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
  private combatDrumsInterval: number | null = null;

  // Tinnitus System (Low Sanity Mental Strain)
  private tinnitusOsc: OscillatorNode | null = null;
  private tinnitusGain: GainNode | null = null;
  private isTinnitusActive: boolean = false;

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
    
    // Master Filter (for muffled agony/shock effect)
    this.masterFilter = this.ctx.createBiquadFilter();
    this.masterFilter.type = 'lowpass';
    this.masterFilter.frequency.value = 20000;
    this.masterFilter.connect(this.ctx.destination);

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = this.isMutedState ? 0 : this.masterVolumeValue * 1.8;
    this.masterGain.connect(this.masterFilter);
    
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
    this.heartbeatGain.gain.value = 0.6;

    // Combat War Drums Gain
    this.combatDrumsGain = this.ctx.createGain();
    this.combatDrumsGain.connect(this.masterGain);
    this.combatDrumsGain.gain.value = 0;

    this.pickRandomScale();
    this.isInitialized = true;
    this.startAllLayers();
    this.setMode('intro');
  }

  private pickRandomScale() {
     const keys = Object.keys(this.scales) as (keyof typeof this.scales)[];
     const randKey = keys[Math.floor(Math.random() * keys.length)];
     this.currentScale = this.scales[randKey];
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
       const decay = Math.exp(-i / (rate * 1.5));
       left[i] = (Math.random() * 2 - 1) * decay;
       right[i] = (Math.random() * 2 - 1) * decay;
    }
    
    this.reverbNode.buffer = impulse;
    this.reverbNode.connect(this.masterGain);
  }

  public setMasterVolume(val: number) {
    this.masterVolumeValue = val;
    if (!this.isMutedState && this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(val * 1.8, this.ctx.currentTime, 0.1);
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
        this.masterGain.gain.setTargetAtTime(this.preMuteVolume * 1.8, this.ctx.currentTime, 0.1);
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

  public toggleReactiveAudio(): boolean {
    this.isReactiveAudioEnabled = !this.isReactiveAudioEnabled;
    if (!this.isReactiveAudioEnabled) {
      this.stopCombatDrums();
      if (this.masterFilter && this.ctx) {
        this.masterFilter.frequency.setTargetAtTime(20000, this.ctx.currentTime, 0.5);
      }
    }
    return this.isReactiveAudioEnabled;
  }

  public isReactive(): boolean {
    return this.isReactiveAudioEnabled;
  }

  public getTension(): TensionLevel {
    return this.currentTension;
  }

  public setMode(mode: AudioMode) {
    if (!this.ctx) return;
    this.currentMode = mode;
    
    const now = this.ctx.currentTime;
    const targetGains: Record<AudioLayer, number> = mode === 'intro' 
      ? { drone: 0.25, orchestra: 0.45, piano: 0.55, texture: 0.12, chimes: 0.35, choir: 0.45, subbass: 0.55 }
      : { drone: 0.35, orchestra: 0.35, piano: 0.45, texture: 0.22, chimes: 0.22, choir: 0.30, subbass: 0.45 };

    Object.keys(targetGains).forEach(k => {
      const key = k as AudioLayer;
      if (!this.layerMuted[key] && this.layerGains[key]) {
        this.layerGains[key]!.gain.setTargetAtTime(targetGains[key], now, 3);
      }
    });

    if (mode === 'intro') {
       this.stopHeartbeat();
       this.stopCombatDrums();
    }
  }

  // --- ADAPTIVE TENSION SYSTEM ---
  public updateTension(tension: TensionLevel = 'calma', hp?: number, maxHp?: number, sanity?: number) {
    if (!this.ctx || this.currentMode !== 'game') return;

    // Detect tension escalation
    const tensionRanks: Record<TensionLevel, number> = {
      calma: 1,
      sospecha: 2,
      tension: 3,
      peligro: 4,
      combate: 5,
      agonico: 6
    };
    const prevRank = tensionRanks[this.currentTension] || 1;
    const newRank = tensionRanks[tension] || 1;

    // Trigger sharp danger chord on sudden escalation
    if (newRank >= 4 && newRank > prevRank) {
      this.playDangerStab();
    }

    this.currentTension = tension;

    if (!this.isReactiveAudioEnabled) return;

    const now = this.ctx.currentTime;

    // Muffled auditory shock in agony/near death (blood loss shock)
    const isAgony = tension === 'agonico' || (hp !== undefined && maxHp !== undefined && hp < maxHp * 0.25);
    if (this.masterFilter) {
      const targetCutoff = isAgony ? 650 : 20000;
      this.masterFilter.frequency.setTargetAtTime(targetCutoff, now, 1.2);
    }

    // War drums toggle
    if (tension === 'combate') {
      this.startCombatDrums();
    } else {
      this.stopCombatDrums();
    }

    // Tinnitus ring on low sanity (< 30)
    if (sanity !== undefined) {
      if (sanity < 30 && !this.isTinnitusActive) {
        this.startTinnitus();
      } else if (sanity >= 30 && this.isTinnitusActive) {
        this.stopTinnitus();
      }
    }

    // Occasional sanity whispers when mentally broken
    if (sanity !== undefined && sanity < 30 && Math.random() < 0.5) {
      setTimeout(() => this.playSanityWhisper(), 800 + Math.random() * 2000);
    }

    // Fine-tuned target gains per tension level
    const tensionGains: Record<TensionLevel, Record<AudioLayer, number>> = {
      calma: {
        drone: 0.20, orchestra: 0.28, piano: 0.50, texture: 0.10, chimes: 0.35, choir: 0.20, subbass: 0.35
      },
      sospecha: {
        drone: 0.30, orchestra: 0.24, piano: 0.32, texture: 0.28, chimes: 0.40, choir: 0.25, subbass: 0.28
      },
      tension: {
        drone: 0.38, orchestra: 0.35, piano: 0.28, texture: 0.28, chimes: 0.25, choir: 0.32, subbass: 0.50
      },
      peligro: {
        drone: 0.48, orchestra: 0.45, piano: 0.18, texture: 0.38, chimes: 0.12, choir: 0.40, subbass: 0.65
      },
      combate: {
        drone: 0.42, orchestra: 0.52, piano: 0.12, texture: 0.30, chimes: 0.05, choir: 0.35, subbass: 0.75
      },
      agonico: {
        drone: 0.55, orchestra: 0.22, piano: 0.20, texture: 0.45, chimes: 0.05, choir: 0.45, subbass: 0.80
      }
    };

    const target = tensionGains[tension] || tensionGains.calma;
    Object.keys(target).forEach(k => {
      const key = k as AudioLayer;
      if (!this.layerMuted[key] && this.layerGains[key]) {
        this.layerGains[key]!.gain.setTargetAtTime(target[key], now, 2.5);
      }
    });

    // Update heartbeat
    if (hp !== undefined && maxHp !== undefined) {
      this.updateHeartbeat(hp, maxHp);
    }
  }

  // --- PROCEDURAL TINNITUS (MENTAL STRAIN RING) ---
  public startTinnitus() {
    if (!this.ctx || !this.masterGain || this.isTinnitusActive) return;
    try {
      this.tinnitusOsc = this.ctx.createOscillator();
      this.tinnitusGain = this.ctx.createGain();
      
      this.tinnitusOsc.type = 'sine';
      this.tinnitusOsc.frequency.setValueAtTime(4800, this.ctx.currentTime);
      
      // Micro LFO frequency drift
      const lfo = this.ctx.createOscillator();
      const lfoGain = this.ctx.createGain();
      lfo.frequency.value = 0.35;
      lfoGain.gain.value = 35;
      lfo.connect(lfoGain);
      lfoGain.connect(this.tinnitusOsc.frequency);
      lfo.start();

      this.tinnitusGain.gain.setValueAtTime(0, this.ctx.currentTime);
      this.tinnitusGain.gain.linearRampToValueAtTime(0.035 * (this.isMutedState ? 0.2 : this.masterVolumeValue), this.ctx.currentTime + 3);

      this.tinnitusOsc.connect(this.tinnitusGain);
      this.tinnitusGain.connect(this.masterGain);
      this.tinnitusOsc.start();
      this.isTinnitusActive = true;
    } catch(e) {
      console.warn("Tinnitus init error:", e);
    }
  }

  public stopTinnitus() {
    if (!this.ctx || !this.tinnitusGain || !this.isTinnitusActive) return;
    try {
      const now = this.ctx.currentTime;
      this.tinnitusGain.gain.linearRampToValueAtTime(0.0001, now + 1.5);
      setTimeout(() => {
        if (this.tinnitusOsc) {
          try { this.tinnitusOsc.stop(); } catch(e) {}
          this.tinnitusOsc.disconnect();
          this.tinnitusOsc = null;
        }
        if (this.tinnitusGain) {
          this.tinnitusGain.disconnect();
          this.tinnitusGain = null;
        }
        this.isTinnitusActive = false;
      }, 1600);
    } catch(e) {}
  }

  // --- CARTOGRAPHY & LOCATION ACOUSTICS ---
  public updateLocationAcoustics(locationName?: string, lighting?: string) {
    if (!this.ctx || this.currentMode !== 'game') return;
    const name = (locationName || '').toLowerCase();
    const now = this.ctx.currentTime;

    // Subterranean / Cavernous (Crypts, Catacombs, Sewers, Caves)
    if (name.includes('cripta') || name.includes('catacumba') || name.includes('fosa') || 
        name.includes('osario') || name.includes('alcantarilla') || name.includes('subterr') || 
        name.includes('cueva')) {
      if (this.layerGains.texture) {
        this.layerGains.texture.gain.setTargetAtTime(0.28, now, 2); // Distant water drops / stone resonance
      }
      if (this.layerGains.choir) {
        this.layerGains.choir.gain.setTargetAtTime(0.25, now, 3); // Cavernous acoustic reflection
      }
    } 
    // Open Wilds / Wasteland / Roads
    else if (name.includes('camino') || name.includes('bosque') || name.includes('páramo') || 
             name.includes('sendero') || name.includes('pantano') || name.includes('puente')) {
      if (this.layerGains.texture) {
        this.layerGains.texture.gain.setTargetAtTime(0.35, now, 2); // Cold desolate wind
      }
      if (this.layerGains.choir) {
        this.layerGains.choir.gain.setTargetAtTime(0.08, now, 3);
      }
    }
  }

  // --- COMBAT WAR DRUMS (Procedural Percussion) ---
  private startCombatDrums() {
    if (this.combatDrumsInterval) return;
    if (!this.ctx || !this.combatDrumsGain) return;

    this.combatDrumsGain.gain.setTargetAtTime(0.7, this.ctx.currentTime, 1.0);

    let step = 0;
    const bpm = 80;
    const intervalMs = (60 / bpm) * 1000;

    const tick = () => {
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      // Pattern: Beat 1 (accent), Beat 2 (normal), Beat 3 (double tap), Beat 4 (normal)
      const isAccent = step % 4 === 0;
      this.playWarDrum(now, isAccent);
      if (step % 4 === 2) {
        this.playWarDrum(now + (intervalMs / 2000), false);
      }
      step = (step + 1) % 4;
    };

    tick();
    this.combatDrumsInterval = window.setInterval(tick, intervalMs);
  }

  private stopCombatDrums() {
    if (this.combatDrumsGain && this.ctx) {
      this.combatDrumsGain.gain.setTargetAtTime(0, this.ctx.currentTime, 1.5);
    }
    if (this.combatDrumsInterval) {
      window.clearInterval(this.combatDrumsInterval);
      this.combatDrumsInterval = null;
    }
  }

  private playWarDrum(time: number, isAccent: boolean) {
    if (!this.ctx || !this.combatDrumsGain || this.isMutedState) return;

    // Drum oscillator: fast pitch drop
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'triangle';
    const startFreq = isAccent ? 140 : 100;
    const endFreq = isAccent ? 45 : 35;
    osc.frequency.setValueAtTime(startFreq, time);
    osc.frequency.exponentialRampToValueAtTime(endFreq, time + 0.18);

    filter.type = 'lowpass';
    filter.frequency.value = isAccent ? 250 : 180;

    const baseVol = isAccent ? 0.65 : 0.40;
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(baseVol, time + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, time + (isAccent ? 0.45 : 0.3));

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.combatDrumsGain);

    osc.start(time);
    osc.stop(time + 0.5);

    // Subtle noise impact for drum skin slap
    const noiseBuffer = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * 0.05), this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < noiseBuffer.length; i++) {
      output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.01));
    }
    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.value = 400;
    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(isAccent ? 0.15 : 0.08, time);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);

    noiseSource.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.combatDrumsGain);

    noiseSource.start(time);
    noiseSource.stop(time + 0.06);
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
    this.pickRandomScale();
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
      data[i] *= 3.0;
    }
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 60;
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
         gain.gain.linearRampToValueAtTime(0.14, now + (duration * 0.4)); 
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
       if (Math.random() > 0.3) return;
       
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
           gain.gain.linearRampToValueAtTime(0.32, now + timeOffset + 0.05);
           gain.gain.exponentialRampToValueAtTime(0.001, now + timeOffset + 3);
           
           osc.connect(gain);
           gain.connect(this.layerGains.piano!); 
           
           osc.start(now + timeOffset);
           osc.stop(now + timeOffset + 4);
           
           timeOffset += 0.6 + Math.random() * 0.8;
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
        data[i] *= 0.05;
        b6 = white * 0.115926;
    }
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass'; 
    filter.frequency.value = 250;
    filter.Q.value = 0.5; 
    
    const lfo = this.ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.05;
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
           
           const freq = this.currentScale[Math.floor(Math.random() * this.currentScale.length)] * 8; 
           osc.frequency.value = freq;
           
           gain.gain.setValueAtTime(0, now + timeOffset);
           gain.gain.linearRampToValueAtTime(0.18, now + timeOffset + 0.02);
           gain.gain.exponentialRampToValueAtTime(0.001, now + timeOffset + 1.5);
           
           osc.connect(gain);
           gain.connect(this.layerGains.chimes!); 
           
           osc.start(now + timeOffset);
           osc.stop(now + timeOffset + 2);
           
           timeOffset += 0.2 + Math.random() * 0.1;
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
       
       filter1.type = 'bandpass';
       filter1.frequency.value = 600;
       filter1.Q.value = 2;
       
       filter2.type = 'bandpass';
       filter2.frequency.value = 1000;
       filter2.Q.value = 2;
       
       gain.gain.setValueAtTime(0, now);
       gain.gain.linearRampToValueAtTime(0.12, now + (duration * 0.3)); 
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
       const baseFreq = this.currentScale[0] / 2;
       osc.frequency.setValueAtTime(baseFreq * 1.5, now);
       osc.frequency.exponentialRampToValueAtTime(baseFreq, now + 0.3);
       
       gain.gain.setValueAtTime(0, now);
       gain.gain.linearRampToValueAtTime(0.85, now + 0.1); 
       gain.gain.exponentialRampToValueAtTime(0.001, now + 4); 
       
       osc.connect(gain);
       gain.connect(this.layerGains.subbass!);
       
       osc.start(now);
       osc.stop(now + 4.1);
    };
    this.subbassInterval = window.setInterval(playHit, 11000); 
  }

  // --- SPECIAL ADAPTIVE SFX ---
  public playDangerStab() {
    if (!this.ctx || !this.masterGain || this.isMutedState) return;
    const now = this.ctx.currentTime;

    const freqs = [185.00, 261.63, 369.99]; // F#3, C4, F#4 (Tritone clash)
    freqs.forEach(freq => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      const filter = this.ctx!.createBiquadFilter();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq + (Math.random() * 6 - 3), now);
      osc.frequency.linearRampToValueAtTime(freq * 0.95, now + 1.2);

      filter.type = 'bandpass';
      filter.frequency.value = 800 + Math.random() * 400;
      filter.Q.value = 3.0;

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.08, now + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain!);

      osc.start(now);
      osc.stop(now + 1.6);
    });
  }

  public playSanityWhisper() {
    if (!this.ctx || !this.masterGain || this.isMutedState) return;
    const now = this.ctx.currentTime;
    const bufferSize = Math.floor(this.ctx.sampleRate * 1.5);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.sin((i / bufferSize) * Math.PI);
    }
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1200, now);
    filter.frequency.linearRampToValueAtTime(600, now + 1.4);
    filter.Q.value = 5.0;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.06, now + 0.3);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.4);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    source.start(now);
    source.stop(now + 1.5);
  }

  // --- GENERAL SFX ---
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