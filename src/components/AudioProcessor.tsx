import React, { useRef, useState, useCallback, useMemo } from 'react';

export interface AudioEffects {
  reverb: number;
  bassBoost: number;
  tempo: number;
  volume: number;
}

// Extended interface for advanced effects
export interface AdvancedAudioEffects extends AudioEffects {
  // EQ Bands
  eqLow?: number;
  eqLowMid?: number;
  eqMid?: number;
  eqHighMid?: number;
  eqHigh?: number;
  
  // Nightcore
  nightcore?: number;
  pitchShift?: number;
  
  // Pitcher
  pitcher?: number;
  formantShift?: number;
  
  // Vocal Extractor
  vocalExtractor?: boolean;
  vocalSensitivity?: number;
  instrumentalSeparation?: number;
  
  // New Audio Processing Features
  limiter?: boolean;
  limiterThreshold?: number;
  limiterRelease?: number;
  attenuator?: boolean;
  attenuatorGain?: number;
  audioProcessingEnabled?: boolean;
}

interface AudioProcessorProps {
  audioFile: File | null;
  effects: AudioEffects | AdvancedAudioEffects;
  onProcessedAudio?: (audioBuffer: AudioBuffer) => void;
  onVisualizationData?: (analyserNode: AnalyserNode) => void;
}

export const useAudioProcessor = ({
  audioFile,
  effects,
  onProcessedAudio,
  onVisualizationData,
}: AudioProcessorProps) => {
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const convolutionNodeRef = useRef<ConvolverNode | null>(null);
  const bassBoostFilterRef = useRef<BiquadFilterNode | null>(null);
  const bassBoostHighShelfRef = useRef<BiquadFilterNode | null>(null);
  
  // Heavenly reverb processing nodes
  const reverbPreFilterRef = useRef<BiquadFilterNode | null>(null);
  const reverbPostFilterRef = useRef<BiquadFilterNode | null>(null);
  const reverbModulationRef = useRef<OscillatorNode | null>(null);
  const reverbModulationGainRef = useRef<GainNode | null>(null);
  const analyserNodeRef = useRef<AnalyserNode | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  
  // EQ Filter Nodes - Performance optimized with memoization
  const eqFiltersRef = useRef<{
    low: BiquadFilterNode | null;
    lowMid: BiquadFilterNode | null;
    mid: BiquadFilterNode | null;
    highMid: BiquadFilterNode | null;
    high: BiquadFilterNode | null;
  }>({
    low: null,
    lowMid: null,
    mid: null,
    highMid: null,
    high: null,
  });
  
  // New Audio Processing Nodes
  const limiterNodeRef = useRef<DynamicsCompressorNode | null>(null);
  const attenuatorNodeRef = useRef<GainNode | null>(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const startTimeRef = useRef<number>(0);
  const pausedAtRef = useRef<number>(0);
  const effectUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastEffectsRef = useRef<AudioEffects>(effects);
  const isSeekingRef = useRef<boolean>(false);
  const timeUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Performance optimization: Memoize effect values to prevent unnecessary updates
  const memoizedEffects = useMemo(() => effects, [
    effects.reverb,
    effects.bassBoost,
    effects.tempo,
    effects.volume,
    (effects as AdvancedAudioEffects).eqLow,
    (effects as AdvancedAudioEffects).eqLowMid,
    (effects as AdvancedAudioEffects).eqMid,
    (effects as AdvancedAudioEffects).eqHighMid,
    (effects as AdvancedAudioEffects).eqHigh,
    (effects as AdvancedAudioEffects).nightcore,
    (effects as AdvancedAudioEffects).pitchShift,
    (effects as AdvancedAudioEffects).pitcher,
    (effects as AdvancedAudioEffects).formantShift,
    (effects as AdvancedAudioEffects).vocalExtractor,
    (effects as AdvancedAudioEffects).vocalSensitivity,
    (effects as AdvancedAudioEffects).instrumentalSeparation,
    (effects as AdvancedAudioEffects).limiter,
    (effects as AdvancedAudioEffects).limiterThreshold,
    (effects as AdvancedAudioEffects).limiterRelease,
    (effects as AdvancedAudioEffects).attenuator,
    (effects as AdvancedAudioEffects).attenuatorGain,
    (effects as AdvancedAudioEffects).audioProcessingEnabled,
  ]);

  // Simple reverb impulse response
  const createReverbImpulse = useCallback((audioContext: BaseAudioContext, seconds: number = 2, decay: number = 2) => {
    const length = audioContext.sampleRate * seconds;
    const impulse = audioContext.createBuffer(2, length, audioContext.sampleRate);
    
    for (let channel = 0; channel < 2; channel++) {
      const channelData = impulse.getChannelData(channel);
      
      // Simple exponential decay
      for (let i = 0; i < length; i++) {
        const time = i / length;
        const decayCurve = Math.pow(1 - time, decay);
        channelData[i] = (Math.random() * 2 - 1) * decayCurve;
      }
    }
    
    return impulse;
  }, []);

  // Create EQ filters with proper frequency bands
  const createEQFilters = useCallback((audioContext: BaseAudioContext) => {
    const filters = eqFiltersRef.current;
    
    // Low band (60Hz) - Lowshelf filter
    if (!filters.low) {
      filters.low = audioContext.createBiquadFilter();
      filters.low.type = 'lowshelf';
      filters.low.frequency.setValueAtTime(60, audioContext.currentTime);
      filters.low.Q.setValueAtTime(1, audioContext.currentTime);
    }
    
    // Low-Mid band (250Hz) - Peaking filter
    if (!filters.lowMid) {
      filters.lowMid = audioContext.createBiquadFilter();
      filters.lowMid.type = 'peaking';
      filters.lowMid.frequency.setValueAtTime(250, audioContext.currentTime);
      filters.lowMid.Q.setValueAtTime(1, audioContext.currentTime);
    }
    
    // Mid band (1kHz) - Peaking filter
    if (!filters.mid) {
      filters.mid = audioContext.createBiquadFilter();
      filters.mid.type = 'peaking';
      filters.mid.frequency.setValueAtTime(1000, audioContext.currentTime);
      filters.mid.Q.setValueAtTime(1, audioContext.currentTime);
    }
    
    // High-Mid band (4kHz) - Peaking filter
    if (!filters.highMid) {
      filters.highMid = audioContext.createBiquadFilter();
      filters.highMid.type = 'peaking';
      filters.highMid.frequency.setValueAtTime(4000, audioContext.currentTime);
      filters.highMid.Q.setValueAtTime(1, audioContext.currentTime);
    }
    
    // High band (16kHz) - Highshelf filter
    if (!filters.high) {
      filters.high = audioContext.createBiquadFilter();
      filters.high.type = 'highshelf';
      filters.high.frequency.setValueAtTime(16000, audioContext.currentTime);
      filters.high.Q.setValueAtTime(1, audioContext.currentTime);
    }
    
    return filters;
  }, []);

  // Create limiter node
  const createLimiter = useCallback((audioContext: BaseAudioContext, advancedEffects: AdvancedAudioEffects) => {
    if (!limiterNodeRef.current) {
      limiterNodeRef.current = audioContext.createDynamicsCompressor();
    }
    
    const limiter = limiterNodeRef.current;
    const currentTime = audioContext.currentTime;
    
    // Configure limiter settings
    limiter.threshold.setValueAtTime(advancedEffects.limiterThreshold || -1, currentTime);
    limiter.ratio.setValueAtTime(20, currentTime); // High ratio for limiting
    limiter.attack.setValueAtTime(0.001, currentTime); // Fast attack
    limiter.release.setValueAtTime(advancedEffects.limiterRelease || 0.1, currentTime);
    limiter.knee.setValueAtTime(0, currentTime); // Hard knee
    
    return limiter;
  }, []);

  // Create attenuator node
  const createAttenuator = useCallback((audioContext: BaseAudioContext, advancedEffects: AdvancedAudioEffects) => {
    if (!attenuatorNodeRef.current) {
      attenuatorNodeRef.current = audioContext.createGain();
    }
    
    const attenuator = attenuatorNodeRef.current;
    const currentTime = audioContext.currentTime;
    
    // Convert dB to linear gain (10dB = ~3.16x gain)
    const gainDb = advancedEffects.attenuatorGain || 10;
    const linearGain = Math.pow(10, gainDb / 20);
    
    attenuator.gain.setValueAtTime(linearGain, currentTime);
    
    return attenuator;
  }, []);

  // Simple reverb processor
  const createSimpleReverb = useCallback((audioContext: BaseAudioContext, reverbAmount: number) => {
    const currentTime = audioContext.currentTime;
    
    // Simple pre-filter
    if (!reverbPreFilterRef.current) {
      reverbPreFilterRef.current = audioContext.createBiquadFilter();
      reverbPreFilterRef.current.type = 'highpass';
      reverbPreFilterRef.current.frequency.setValueAtTime(100, currentTime);
      reverbPreFilterRef.current.Q.setValueAtTime(1.0, currentTime);
    }
    
    // Simple post-filter
    if (!reverbPostFilterRef.current) {
      reverbPostFilterRef.current = audioContext.createBiquadFilter();
      reverbPostFilterRef.current.type = 'peaking';
      reverbPostFilterRef.current.frequency.setValueAtTime(5000, currentTime);
      reverbPostFilterRef.current.Q.setValueAtTime(1.0, currentTime);
      reverbPostFilterRef.current.gain.setValueAtTime(reverbAmount * 2, currentTime);
    }
    
    return {
      preFilter: reverbPreFilterRef.current,
      postFilter: reverbPostFilterRef.current,
      modulation: null,
      modulationGain: null
    };
  }, []);

  // Update EQ filters with current values
  const updateEQFilters = useCallback((audioContext: BaseAudioContext, advancedEffects: AdvancedAudioEffects) => {
    const filters = eqFiltersRef.current;
    const currentTime = audioContext.currentTime;
    
    // Convert slider values (0-1) to dB values (-20 to +20)
    const sliderToDb = (value: number) => (value - 0.5) * 40; // 0.5 = 0dB, 0 = -20dB, 1 = +20dB
    
    if (filters.low) {
      filters.low.gain.setValueAtTime(sliderToDb(advancedEffects.eqLow || 0.5), currentTime);
    }
    if (filters.lowMid) {
      filters.lowMid.gain.setValueAtTime(sliderToDb(advancedEffects.eqLowMid || 0.5), currentTime);
    }
    if (filters.mid) {
      filters.mid.gain.setValueAtTime(sliderToDb(advancedEffects.eqMid || 0.5), currentTime);
    }
    if (filters.highMid) {
      filters.highMid.gain.setValueAtTime(sliderToDb(advancedEffects.eqHighMid || 0.5), currentTime);
    }
    if (filters.high) {
      filters.high.gain.setValueAtTime(sliderToDb(advancedEffects.eqHigh || 0.5), currentTime);
    }
  }, []);

  const setupAudioGraph = useCallback(async (audioBuffer: AudioBuffer) => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }

    const audioContext = audioContextRef.current;
    
    // Create nodes only once and reuse them
    if (!gainNodeRef.current) {
      gainNodeRef.current = audioContext.createGain();
    }
    if (!convolutionNodeRef.current) {
      convolutionNodeRef.current = audioContext.createConvolver();
    }
    if (!bassBoostFilterRef.current) {
      bassBoostFilterRef.current = audioContext.createBiquadFilter();
      bassBoostFilterRef.current.type = 'lowshelf';
      // Use a lower frequency for smoother bass boost
      bassBoostFilterRef.current.frequency.setValueAtTime(120, audioContext.currentTime);
      // Set Q to 0.7 for smoother response (less resonant)
      bassBoostFilterRef.current.Q.setValueAtTime(0.7, audioContext.currentTime);
    }
    if (!bassBoostHighShelfRef.current) {
      bassBoostHighShelfRef.current = audioContext.createBiquadFilter();
      bassBoostHighShelfRef.current.type = 'highshelf';
      // Subtle high-shelf to complement bass boost
      bassBoostHighShelfRef.current.frequency.setValueAtTime(8000, audioContext.currentTime);
      bassBoostHighShelfRef.current.Q.setValueAtTime(0.5, audioContext.currentTime);
    }
    if (!analyserNodeRef.current) {
      analyserNodeRef.current = audioContext.createAnalyser();
      analyserNodeRef.current.fftSize = 512; // Reduced for better performance
      analyserNodeRef.current.smoothingTimeConstant = 0.8;
      
      // Connect analyser to destination for visualization
      analyserNodeRef.current.connect(audioContext.destination);
      
      // Pass analyser to parent for visualization (only once)
      if (onVisualizationData) {
        onVisualizationData(analyserNodeRef.current);
      }
    }

    // Create EQ filters
    const eqFilters = createEQFilters(audioContext);
    
    // Update EQ filters with current values
    if ('eqLow' in effects) {
      updateEQFilters(audioContext, effects as AdvancedAudioEffects);
    }

    // Create simple reverb impulse
    const reverbDuration = 2 + effects.reverb * 2; // Standard reverb duration
    const reverbDecay = 1 + effects.reverb * 1.5; // Standard decay
    const reverbImpulse = createReverbImpulse(audioContext, reverbDuration, reverbDecay);
    convolutionNodeRef.current.buffer = reverbImpulse;
    
    // Create simple reverb processor
    const simpleReverb = createSimpleReverb(audioContext, effects.reverb);

    // Update current effects with improved volume scaling to prevent distortion
    // Convert 0-1 slider to -60dB to +6dB range for professional volume control
    let volumeGain: number;
    if (effects.volume === 0) {
      volumeGain = 0; // Mute
    } else if (effects.volume <= 0.5) {
      // 0-50%: -60dB to -6dB (quiet to normal)
      volumeGain = Math.pow(10, (effects.volume * 2 - 1) * 3) / 10;
    } else {
      // 50-100%: -6dB to +6dB (normal to boost)
      volumeGain = Math.pow(10, (effects.volume - 0.5) * 2.4) / 10;
    }
    
    // Clamp to prevent excessive gain
    volumeGain = Math.max(0, Math.min(2, volumeGain));
    gainNodeRef.current.gain.setValueAtTime(volumeGain, audioContext.currentTime);
    
    // Improved bass boost with smoother curve and reduced distortion
    const bassBoostValue = effects.bassBoost;
    let bassGain: number;
    
    if (bassBoostValue <= 0.5) {
      // Gentle boost for lower values (0-0.5): 0-6dB
      bassGain = bassBoostValue * 12;
    } else {
      // More aggressive but controlled boost for higher values (0.5-1): 6-15dB
      bassGain = 6 + (bassBoostValue - 0.5) * 18;
    }
    
    // Use exponentialRampToValueAtTime for smoother transitions
    const currentTime = audioContext.currentTime;
    bassBoostFilterRef.current.gain.exponentialRampToValueAtTime(
      Math.pow(10, bassGain / 20), // Convert dB to linear gain
      currentTime + 0.1 // 100ms ramp time
    );
    
    // Apply subtle high-shelf to complement bass boost and reduce muddiness
    const highShelfGain = bassBoostValue > 0.3 ? (bassBoostValue - 0.3) * 3 : 0; // 0-2.1dB
    bassBoostHighShelfRef.current.gain.exponentialRampToValueAtTime(
      Math.pow(10, highShelfGain / 20),
      currentTime + 0.1
    );

    return { 
      gainNode: gainNodeRef.current, 
      bassBoostFilter: bassBoostFilterRef.current, 
      convolutionNode: convolutionNodeRef.current,
      analyserNode: analyserNodeRef.current,
      eqFilters,
      simpleReverb
    };
  }, [effects.reverb, effects.volume, effects.bassBoost, createReverbImpulse, createSimpleReverb, createEQFilters, updateEQFilters, onVisualizationData]);

  const updateEffects = useCallback(() => {
    if (!audioContextRef.current || !gainNodeRef.current || !bassBoostFilterRef.current) return;

    const audioContext = audioContextRef.current;
    const currentTime = audioContext.currentTime;

    // Update volume with improved scaling to prevent distortion
    let volumeGain: number;
    if (effects.volume === 0) {
      volumeGain = 0; // Mute
    } else if (effects.volume <= 0.5) {
      // 0-50%: -60dB to -6dB (quiet to normal)
      volumeGain = Math.pow(10, (effects.volume * 2 - 1) * 3) / 10;
    } else {
      // 50-100%: -6dB to +6dB (normal to boost)
      volumeGain = Math.pow(10, (effects.volume - 0.5) * 2.4) / 10;
    }
    
    // Clamp to prevent excessive gain
    volumeGain = Math.max(0, Math.min(2, volumeGain));
    gainNodeRef.current.gain.setValueAtTime(volumeGain, currentTime);

    // Update bass boost with improved smoothing
    const bassBoostValue = effects.bassBoost;
    let bassGain: number;
    
    if (bassBoostValue <= 0.5) {
      // Gentle boost for lower values (0-0.5): 0-6dB
      bassGain = bassBoostValue * 12;
    } else {
      // More aggressive but controlled boost for higher values (0.5-1): 6-15dB
      bassGain = 6 + (bassBoostValue - 0.5) * 18;
    }
    
    // Use exponentialRampToValueAtTime for smoother transitions
    bassBoostFilterRef.current.gain.exponentialRampToValueAtTime(
      Math.pow(10, bassGain / 20), // Convert dB to linear gain
      currentTime + 0.05 // 50ms ramp time for real-time updates
    );
    
    // Apply subtle high-shelf to complement bass boost and reduce muddiness
    const highShelfGain = bassBoostValue > 0.3 ? (bassBoostValue - 0.3) * 3 : 0; // 0-2.1dB
    bassBoostHighShelfRef.current.gain.exponentialRampToValueAtTime(
      Math.pow(10, highShelfGain / 20),
      currentTime + 0.05
    );

    // Update EQ filters if advanced effects are present
    if ('eqLow' in effects) {
      updateEQFilters(audioContext, effects as AdvancedAudioEffects);
    }

    // Update tempo (requires restarting playback)
    if (sourceNodeRef.current) {
      sourceNodeRef.current.playbackRate.setValueAtTime(effects.tempo, currentTime);
    }
  }, [effects, updateEQFilters]);

  // Debounced effect updates to prevent excessive processing
  React.useEffect(() => {
    // Clear existing timeout
    if (effectUpdateTimeoutRef.current) {
      clearTimeout(effectUpdateTimeoutRef.current);
    }

    // Only update if effects actually changed
    const effectsChanged = JSON.stringify(memoizedEffects) !== JSON.stringify(lastEffectsRef.current);
    
    if (effectsChanged) {
      effectUpdateTimeoutRef.current = setTimeout(() => {
        updateEffects();
        lastEffectsRef.current = { ...memoizedEffects };
      }, 150); // Increased debounce time to prevent audio cracking
    }

    return () => {
      if (effectUpdateTimeoutRef.current) {
        clearTimeout(effectUpdateTimeoutRef.current);
      }
    };
  }, [memoizedEffects, updateEffects]);

  const createNewSourceNode = useCallback(() => {
    if (!audioContextRef.current || !audioBufferRef.current) return null;

    const audioContext = audioContextRef.current;
    const sourceNode = audioContext.createBufferSource();
    sourceNode.buffer = audioBufferRef.current;
    sourceNode.playbackRate.setValueAtTime(effects.tempo, audioContext.currentTime);
    
    // Connect to existing effect chain for consistent preview
    if (gainNodeRef.current && bassBoostFilterRef.current && bassBoostHighShelfRef.current && convolutionNodeRef.current && analyserNodeRef.current) {
      sourceNode.connect(gainNodeRef.current);
      gainNodeRef.current.connect(bassBoostFilterRef.current);
      bassBoostFilterRef.current.connect(bassBoostHighShelfRef.current);
      
      // Connect EQ filters in series if advanced effects are present
      let lastNode: AudioNode = bassBoostHighShelfRef.current;
      if ('eqLow' in effects) {
        const advancedEffects = effects as AdvancedAudioEffects;
        const eqFilters = eqFiltersRef.current;
        if (eqFilters.low && eqFilters.lowMid && eqFilters.mid && eqFilters.highMid && eqFilters.high) {
          lastNode.connect(eqFilters.low);
          eqFilters.low.connect(eqFilters.lowMid);
          eqFilters.lowMid.connect(eqFilters.mid);
          eqFilters.mid.connect(eqFilters.highMid);
          eqFilters.highMid.connect(eqFilters.high);
          lastNode = eqFilters.high;
        }
        
        // Add limiter if enabled
        if (advancedEffects.limiter && advancedEffects.audioProcessingEnabled !== false) {
          const limiter = createLimiter(audioContext, advancedEffects);
          lastNode.connect(limiter);
          lastNode = limiter;
        }
        
        // Add attenuator if enabled
        if (advancedEffects.attenuator && advancedEffects.audioProcessingEnabled !== false) {
          const attenuator = createAttenuator(audioContext, advancedEffects);
          lastNode.connect(attenuator);
          lastNode = attenuator;
        }
      }
      
      // Create simple reverb processing chain (same as export)
      const dryGain = audioContext.createGain();
      const wetGain = audioContext.createGain();
      const reverbPreGain = audioContext.createGain();
      const reverbPostGain = audioContext.createGain();
      
      // Use exponentialRampToValueAtTime for smoother transitions
      const currentTime = audioContext.currentTime;
      dryGain.gain.setValueAtTime(1 - effects.reverb, currentTime);
      wetGain.gain.setValueAtTime(effects.reverb, currentTime);
      
      // Simple reverb processing (same as export)
      if (reverbPreFilterRef.current && reverbPostFilterRef.current) {
        reverbPreGain.gain.setValueAtTime(effects.reverb * 0.8, currentTime);
        reverbPostGain.gain.setValueAtTime(effects.reverb * 1.0, currentTime);
        
        // Wet signal with simple processing
        lastNode.connect(reverbPreGain);
        reverbPreGain.connect(reverbPreFilterRef.current);
        reverbPreFilterRef.current.connect(convolutionNodeRef.current);
        convolutionNodeRef.current.connect(reverbPostFilterRef.current);
        reverbPostFilterRef.current.connect(reverbPostGain);
        reverbPostGain.connect(wetGain);
        wetGain.connect(analyserNodeRef.current);
      } else {
        // Fallback to simple reverb
        lastNode.connect(convolutionNodeRef.current);
        convolutionNodeRef.current.connect(wetGain);
        wetGain.connect(analyserNodeRef.current);
      }
      
      // Dry signal
      lastNode.connect(dryGain);
      dryGain.connect(analyserNodeRef.current);
    }

    // Handle when the audio naturally ends
    sourceNode.onended = () => {
      setIsPlaying(false);
      sourceNodeRef.current = null;
      setCurrentTime(0);
      pausedAtRef.current = 0;
    };

    return sourceNode;
  }, [effects.tempo, effects.reverb, createLimiter, createAttenuator]);

  const createProcessedBuffer = useCallback(async (originalBuffer: AudioBuffer): Promise<AudioBuffer> => {
    if (!audioContextRef.current) return originalBuffer;

    // Create offline context for rendering with effects
    const offlineContext = new OfflineAudioContext(
      originalBuffer.numberOfChannels,
      Math.floor(originalBuffer.length / effects.tempo), // Adjust length for tempo
      originalBuffer.sampleRate
    );

    // Create nodes for offline processing
    const source = offlineContext.createBufferSource();
    source.buffer = originalBuffer;
    source.playbackRate.setValueAtTime(effects.tempo, offlineContext.currentTime);
    
    const gainNode = offlineContext.createGain();
    const convolutionNode = offlineContext.createConvolver();
    const bassBoostFilter = offlineContext.createBiquadFilter();
    const bassBoostHighShelf = offlineContext.createBiquadFilter();

    // Create EQ filters for offline processing
    const eqFilters = {
      low: offlineContext.createBiquadFilter(),
      lowMid: offlineContext.createBiquadFilter(),
      mid: offlineContext.createBiquadFilter(),
      highMid: offlineContext.createBiquadFilter(),
      high: offlineContext.createBiquadFilter(),
    };

    // Configure EQ filters
    eqFilters.low.type = 'lowshelf';
    eqFilters.low.frequency.setValueAtTime(60, offlineContext.currentTime);
    eqFilters.low.Q.setValueAtTime(1, offlineContext.currentTime);
    
    eqFilters.lowMid.type = 'peaking';
    eqFilters.lowMid.frequency.setValueAtTime(250, offlineContext.currentTime);
    eqFilters.lowMid.Q.setValueAtTime(1, offlineContext.currentTime);
    
    eqFilters.mid.type = 'peaking';
    eqFilters.mid.frequency.setValueAtTime(1000, offlineContext.currentTime);
    eqFilters.mid.Q.setValueAtTime(1, offlineContext.currentTime);
    
    eqFilters.highMid.type = 'peaking';
    eqFilters.highMid.frequency.setValueAtTime(4000, offlineContext.currentTime);
    eqFilters.highMid.Q.setValueAtTime(1, offlineContext.currentTime);
    
    eqFilters.high.type = 'highshelf';
    eqFilters.high.frequency.setValueAtTime(16000, offlineContext.currentTime);
    eqFilters.high.Q.setValueAtTime(1, offlineContext.currentTime);

    // Set up source
    source.buffer = originalBuffer;
    source.playbackRate.setValueAtTime(effects.tempo, offlineContext.currentTime);

    // Configure nodes with improved volume scaling
    let volumeGain: number;
    if (effects.volume === 0) {
      volumeGain = 0; // Mute
    } else if (effects.volume <= 0.5) {
      // 0-50%: -60dB to -6dB (quiet to normal)
      volumeGain = Math.pow(10, (effects.volume * 2 - 1) * 3) / 10;
    } else {
      // 50-100%: -6dB to +6dB (normal to boost)
      volumeGain = Math.pow(10, (effects.volume - 0.5) * 2.4) / 10;
    }
    
    // Clamp to prevent excessive gain
    volumeGain = Math.max(0, Math.min(2, volumeGain));
    gainNode.gain.setValueAtTime(volumeGain, offlineContext.currentTime);
    
    bassBoostFilter.type = 'lowshelf';
    // Use same improved settings as real-time processing
    bassBoostFilter.frequency.setValueAtTime(120, offlineContext.currentTime);
    bassBoostFilter.Q.setValueAtTime(0.7, offlineContext.currentTime);
    
    // Apply same improved bass boost curve
    const bassBoostValue = effects.bassBoost;
    let bassGain: number;
    
    if (bassBoostValue <= 0.5) {
      // Gentle boost for lower values (0-0.5): 0-6dB
      bassGain = bassBoostValue * 12;
    } else {
      // More aggressive but controlled boost for higher values (0.5-1): 6-15dB
      bassGain = 6 + (bassBoostValue - 0.5) * 18;
    }
    
    bassBoostFilter.gain.setValueAtTime(Math.pow(10, bassGain / 20), offlineContext.currentTime);
    
    // Configure high-shelf filter for export
    bassBoostHighShelf.type = 'highshelf';
    bassBoostHighShelf.frequency.setValueAtTime(8000, offlineContext.currentTime);
    bassBoostHighShelf.Q.setValueAtTime(0.5, offlineContext.currentTime);
    
    // Apply subtle high-shelf to complement bass boost and reduce muddiness
    const highShelfGain = bassBoostValue > 0.3 ? (bassBoostValue - 0.3) * 3 : 0; // 0-2.1dB
    bassBoostHighShelf.gain.setValueAtTime(Math.pow(10, highShelfGain / 20), offlineContext.currentTime);

    // Update EQ filters with current values
    if ('eqLow' in effects) {
      const advancedEffects = effects as AdvancedAudioEffects;
      const sliderToDb = (value: number) => (value - 0.5) * 40;
      
      eqFilters.low.gain.setValueAtTime(sliderToDb(advancedEffects.eqLow || 0.5), offlineContext.currentTime);
      eqFilters.lowMid.gain.setValueAtTime(sliderToDb(advancedEffects.eqLowMid || 0.5), offlineContext.currentTime);
      eqFilters.mid.gain.setValueAtTime(sliderToDb(advancedEffects.eqMid || 0.5), offlineContext.currentTime);
      eqFilters.highMid.gain.setValueAtTime(sliderToDb(advancedEffects.eqHighMid || 0.5), offlineContext.currentTime);
      eqFilters.high.gain.setValueAtTime(sliderToDb(advancedEffects.eqHigh || 0.5), offlineContext.currentTime);
    }

    // Create simple reverb impulse for export
    const reverbDuration = 2 + effects.reverb * 2; // Standard reverb duration
    const reverbDecay = 1 + effects.reverb * 1.5; // Standard decay
    const reverbImpulse = createReverbImpulse(offlineContext, reverbDuration, reverbDecay);
    convolutionNode.buffer = reverbImpulse;
    
    // Create simple reverb processing nodes for export
    const reverbPreFilter = offlineContext.createBiquadFilter();
    const reverbPostFilter = offlineContext.createBiquadFilter();
    const reverbPreGain = offlineContext.createGain();
    const reverbPostGain = offlineContext.createGain();
    
    // Configure simple reverb filters
    reverbPreFilter.type = 'highpass';
    reverbPreFilter.frequency.setValueAtTime(100, offlineContext.currentTime);
    reverbPreFilter.Q.setValueAtTime(1.0, offlineContext.currentTime);
    
    reverbPostFilter.type = 'peaking';
    reverbPostFilter.frequency.setValueAtTime(5000, offlineContext.currentTime);
    reverbPostFilter.Q.setValueAtTime(1.0, offlineContext.currentTime);
    reverbPostFilter.gain.setValueAtTime(effects.reverb * 2, offlineContext.currentTime);
    
    // Configure gains
    reverbPreGain.gain.setValueAtTime(effects.reverb * 0.8, offlineContext.currentTime);
    reverbPostGain.gain.setValueAtTime(effects.reverb * 1.0, offlineContext.currentTime);

    // Connect the graph with EQ filters
    source.connect(gainNode);
    gainNode.connect(bassBoostFilter);
    bassBoostFilter.connect(bassBoostHighShelf);
    
    // Connect EQ filters in series if advanced effects are present
    let lastNode: AudioNode = bassBoostHighShelf;
    if ('eqLow' in effects) {
      const advancedEffects = effects as AdvancedAudioEffects;
      lastNode.connect(eqFilters.low);
      eqFilters.low.connect(eqFilters.lowMid);
      eqFilters.lowMid.connect(eqFilters.mid);
      eqFilters.mid.connect(eqFilters.highMid);
      eqFilters.highMid.connect(eqFilters.high);
      lastNode = eqFilters.high;
      
      // Add limiter if enabled
      if (advancedEffects.limiter && advancedEffects.audioProcessingEnabled !== false) {
        const limiter = offlineContext.createDynamicsCompressor();
        limiter.threshold.setValueAtTime(advancedEffects.limiterThreshold || -1, offlineContext.currentTime);
        limiter.ratio.setValueAtTime(20, offlineContext.currentTime);
        limiter.attack.setValueAtTime(0.001, offlineContext.currentTime);
        limiter.release.setValueAtTime(advancedEffects.limiterRelease || 0.1, offlineContext.currentTime);
        limiter.knee.setValueAtTime(0, offlineContext.currentTime);
        
        lastNode.connect(limiter);
        lastNode = limiter;
      }
      
      // Add attenuator if enabled
      if (advancedEffects.attenuator && advancedEffects.audioProcessingEnabled !== false) {
        const attenuator = offlineContext.createGain();
        const gainDb = advancedEffects.attenuatorGain || 10;
        const linearGain = Math.pow(10, gainDb / 20);
        attenuator.gain.setValueAtTime(linearGain, offlineContext.currentTime);
        
        lastNode.connect(attenuator);
        lastNode = attenuator;
      }
    }
    
    // Create heavenly reverb processing chain for export
    const dryGain = offlineContext.createGain();
    const wetGain = offlineContext.createGain();
    
    dryGain.gain.setValueAtTime(1 - effects.reverb, offlineContext.currentTime);
    wetGain.gain.setValueAtTime(effects.reverb, offlineContext.currentTime);
    
    // Connect dry signal directly to destination
    lastNode.connect(dryGain);
    dryGain.connect(offlineContext.destination);
    
    // Connect wet signal through simple reverb processing
    lastNode.connect(reverbPreGain);
    reverbPreGain.connect(reverbPreFilter);
    reverbPreFilter.connect(convolutionNode);
    convolutionNode.connect(reverbPostFilter);
    reverbPostFilter.connect(reverbPostGain);
    reverbPostGain.connect(wetGain);
    wetGain.connect(offlineContext.destination);

    // Start processing
    source.start();
    
    // Render and return processed buffer
    return await offlineContext.startRendering();
  }, [effects, createReverbImpulse]);

  const processAudioFile = useCallback(async (file: File): Promise<AudioBuffer> => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }

    const arrayBuffer = await file.arrayBuffer();
    const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);
    
    // Store the original audio buffer for playback
    audioBufferRef.current = audioBuffer;
    setDuration(audioBuffer.duration);
    setCurrentTime(0);
    pausedAtRef.current = 0;
    
    // Set up audio graph for playback (without effects)
    await setupAudioGraph(audioBuffer);
    
    // Create processed buffer with effects for export
    const processedBuffer = await createProcessedBuffer(audioBuffer);
    
    if (onProcessedAudio) {
      onProcessedAudio(processedBuffer);
    }

    return audioBuffer;
  }, [setupAudioGraph, onProcessedAudio, createProcessedBuffer]);

  // Re-process buffer when effects change (debounced)
  React.useEffect(() => {
    if (audioBufferRef.current && onProcessedAudio) {
      // Clear existing timeout
      if (effectUpdateTimeoutRef.current) {
        clearTimeout(effectUpdateTimeoutRef.current);
      }

      // Debounce processing to prevent excessive CPU usage
      effectUpdateTimeoutRef.current = setTimeout(() => {
        createProcessedBuffer(audioBufferRef.current!).then(onProcessedAudio);
      }, 500); // Increased debounce time for heavy processing
    }

    return () => {
      if (effectUpdateTimeoutRef.current) {
        clearTimeout(effectUpdateTimeoutRef.current);
      }
    };
  }, [memoizedEffects, createProcessedBuffer, onProcessedAudio]);

  React.useEffect(() => {
    if (audioFile) {
      processAudioFile(audioFile);
    }
  }, [audioFile, processAudioFile]);

  const play = useCallback(() => {
    if (isPlaying) return; // Prevent multiple play calls
    
    // Stop current playback if any
    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.stop();
        sourceNodeRef.current.disconnect();
      } catch (e) {
        // Ignore errors from stopping already stopped nodes
      }
      sourceNodeRef.current = null;
    }

    // Create new source node
    const newSourceNode = createNewSourceNode();
    if (newSourceNode && audioContextRef.current) {
      sourceNodeRef.current = newSourceNode;
      
      if (audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume();
      }
      
      const startOffset = pausedAtRef.current / effects.tempo;
      newSourceNode.start(0, startOffset);
      startTimeRef.current = audioContextRef.current.currentTime - pausedAtRef.current;
      setIsPlaying(true);
    }
  }, [isPlaying, createNewSourceNode, effects.tempo]);

  const pause = useCallback(() => {
    if (!isPlaying || !audioContextRef.current) return;
    
    if (sourceNodeRef.current) {
      try {
        const elapsed = (audioContextRef.current.currentTime - startTimeRef.current) * effects.tempo;
        pausedAtRef.current = Math.min(elapsed, duration);
        setCurrentTime(pausedAtRef.current);
        
        sourceNodeRef.current.stop();
        sourceNodeRef.current.disconnect();
      } catch (e) {
        // Ignore errors from stopping already stopped nodes
      }
      sourceNodeRef.current = null;
    }
    setIsPlaying(false);
  }, [isPlaying, effects.tempo, duration]);

  const seek = useCallback((time: number) => {
    const wasPlaying = isPlaying;
    
    // Set seeking flag to prevent time updates
    isSeekingRef.current = true;
    
    // Stop current playback
    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.stop();
        sourceNodeRef.current.disconnect();
      } catch (e) {
        // Ignore errors
      }
      sourceNodeRef.current = null;
    }
    
    pausedAtRef.current = Math.max(0, Math.min(time, duration));
    setCurrentTime(pausedAtRef.current);
    setIsPlaying(false);
    
    // Clear any pending time updates
    if (timeUpdateTimeoutRef.current) {
      clearTimeout(timeUpdateTimeoutRef.current);
    }
    
    // Resume playback if it was playing
    if (wasPlaying) {
      setTimeout(() => {
        play();
        // Allow time updates to resume after a short delay
        setTimeout(() => {
          isSeekingRef.current = false;
        }, 200);
      }, 10);
    } else {
      // Allow time updates to resume immediately if not playing
      setTimeout(() => {
        isSeekingRef.current = false;
      }, 100);
    }
  }, [isPlaying, duration, play]);

  const stop = useCallback(() => {
    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.stop();
        sourceNodeRef.current.disconnect();
      } catch (e) {
        // Ignore errors from stopping already stopped nodes
      }
      sourceNodeRef.current = null;
    }
    setIsPlaying(false);
    setCurrentTime(0);
    pausedAtRef.current = 0;
    
    // Also pause the audio context to ensure complete stop
    if (audioContextRef.current && audioContextRef.current.state === 'running') {
      audioContextRef.current.suspend();
    }
  }, []);

  // Update current time during playback - Performance optimized
  React.useEffect(() => {
    if (!isPlaying || !audioContextRef.current) return;
    
    const updateTime = () => {
      // Don't update if user is seeking
      if (isSeekingRef.current) return;
      
      if (audioContextRef.current && isPlaying) {
        const elapsed = (audioContextRef.current.currentTime - startTimeRef.current) * effects.tempo;
        const newTime = Math.min(elapsed, duration);
        setCurrentTime(newTime);
        
        if (newTime >= duration) {
          setIsPlaying(false);
          sourceNodeRef.current = null;
          setCurrentTime(0);
          pausedAtRef.current = 0;
        }
      }
    };
    
    const interval = setInterval(updateTime, 50); // Increased frequency for smoother updates
    return () => clearInterval(interval);
  }, [isPlaying, effects.tempo, duration]);

  // Cleanup function to prevent memory leaks
  React.useEffect(() => {
    return () => {
      // Clean up audio context and nodes
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      if (effectUpdateTimeoutRef.current) {
        clearTimeout(effectUpdateTimeoutRef.current);
      }
      if (timeUpdateTimeoutRef.current) {
        clearTimeout(timeUpdateTimeoutRef.current);
      }
    };
  }, []);

  return {
    play,
    pause,
    stop,
    seek,
    isPlaying,
    currentTime,
    duration,
    audioContext: audioContextRef.current,
  };
};