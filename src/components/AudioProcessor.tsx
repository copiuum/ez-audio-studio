import React, { useRef, useCallback, useEffect, useMemo } from 'react';
import { toast } from '@/hooks/use-toast';

// Types
export interface AudioEffects {
  reverb: number;
  bassBoost: number;
  tempo: number;
  volume: number;
}

export interface AdvancedAudioEffects extends AudioEffects {
  eqLow?: number;
  eqLowMid?: number;
  eqMid?: number;
  eqHighMid?: number;
  eqHigh?: number;
  limiter?: boolean;
  limiterThreshold?: number;
  limiterRelease?: number;
  attenuator?: boolean;
  attenuatorGain?: number;
  audioProcessingEnabled?: boolean;
}

interface AudioProcessorOptions {
  audioFile: File | null;
  effects: AudioEffects | AdvancedAudioEffects;
  onProcessedAudio?: (buffer: AudioBuffer) => void;
  onVisualizationData?: (analyser: AnalyserNode) => void;
}

// Simple audio processor
export const useAudioProcessor = (options: AudioProcessorOptions) => {
  const {
    audioFile,
    effects,
    onProcessedAudio,
    onVisualizationData
  } = options;

  // Refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const analyserNodeRef = useRef<AnalyserNode | null>(null);
  const bassBoostFilterRef = useRef<BiquadFilterNode | null>(null);
  const reverbNodeRef = useRef<ConvolverNode | null>(null);
  const reverbPreFilterRef = useRef<BiquadFilterNode | null>(null);
  const reverbPostFilterRef = useRef<BiquadFilterNode | null>(null);
  const reverbWetGainRef = useRef<GainNode | null>(null);
  const reverbDryGainRef = useRef<GainNode | null>(null);
  const isPlayingRef = useRef(false);
  const currentTimeRef = useRef(0);
  const pausedAtRef = useRef(0);
  const effectUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastEffectsRef = useRef<AudioEffects | AdvancedAudioEffects>(effects);

  // State
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [currentTime, setCurrentTime] = React.useState(0);
  const [duration, setDuration] = React.useState(0);

  // Memoized effects
  const memoizedEffects = useMemo(() => effects, [JSON.stringify(effects)]);

  // Create audio context with user interaction requirement
  const createAudioContext = useCallback(async () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Ensure audio context is resumed (requires user interaction)
      if (audioContextRef.current.state === 'suspended') {
        try {
          await audioContextRef.current.resume();
        } catch (error) {
          console.warn('Failed to resume audio context:', error);
          // Show user-friendly message
          toast({
            title: "Audio not ready",
            description: "Click anywhere to enable audio playback",
            variant: "destructive",
          });
        }
      }
    }
    return audioContextRef.current;
  }, []);

  // Create enhanced reverb impulse
  const createReverbImpulse = useCallback((audioContext: AudioContext, reverbAmount: number) => {
    const length = Math.floor(audioContext.sampleRate * (2.5 + reverbAmount * 2));
    const impulse = audioContext.createBuffer(2, length, audioContext.sampleRate);
    
    for (let channel = 0; channel < 2; channel++) {
      const channelData = impulse.getChannelData(channel);
      
      // Create multiple decay layers for more complex reverb
      for (let i = 0; i < length; i++) {
        const time = i / length;
        
        // Primary decay
        const primaryDecay = Math.pow(1 - time, 0.8 + reverbAmount * 0.5);
        
        // Secondary decay (slower)
        const secondaryDecay = Math.pow(1 - time * 0.7, 1.5 + reverbAmount);
        
        // Early reflections
        const earlyReflections = Math.sin(time * 50) * Math.exp(-time * 10) * 0.3;
        
        // Late reflections
        const lateReflections = Math.sin(time * 15) * Math.exp(-time * 3) * 0.2;
        
        // Combine all elements
        const combined = (
          (Math.random() * 2 - 1) * primaryDecay * 0.6 +
          (Math.random() * 2 - 1) * secondaryDecay * 0.4 +
          earlyReflections +
          lateReflections
        );
        
        channelData[i] = combined * (0.7 + reverbAmount * 0.3);
      }
    }
    
    return impulse;
  }, []);

  // Setup audio graph
  const setupAudioGraph = useCallback(async (audioBuffer: AudioBuffer) => {
    const audioContext = await createAudioContext();
    
    audioBufferRef.current = audioBuffer;
    setDuration(audioBuffer.duration);
    setCurrentTime(0);
    pausedAtRef.current = 0;

    // Create nodes
    gainNodeRef.current = audioContext.createGain();
    bassBoostFilterRef.current = audioContext.createBiquadFilter();
    reverbNodeRef.current = audioContext.createConvolver();
    reverbPreFilterRef.current = audioContext.createBiquadFilter();
    reverbPostFilterRef.current = audioContext.createBiquadFilter();
    reverbWetGainRef.current = audioContext.createGain();
    reverbDryGainRef.current = audioContext.createGain();
    analyserNodeRef.current = audioContext.createAnalyser();

    // Configure nodes
    bassBoostFilterRef.current.type = 'lowshelf';
    bassBoostFilterRef.current.frequency.setValueAtTime(120, audioContext.currentTime);
    bassBoostFilterRef.current.Q.setValueAtTime(0.7, audioContext.currentTime);

    // Configure reverb filters
    reverbPreFilterRef.current.type = 'highpass';
    reverbPreFilterRef.current.frequency.setValueAtTime(80, audioContext.currentTime);
    reverbPreFilterRef.current.Q.setValueAtTime(1.0, audioContext.currentTime);

    reverbPostFilterRef.current.type = 'peaking';
    reverbPostFilterRef.current.frequency.setValueAtTime(8000, audioContext.currentTime);
    reverbPostFilterRef.current.Q.setValueAtTime(1.2, audioContext.currentTime);
    reverbPostFilterRef.current.gain.setValueAtTime(effects.reverb * 3, audioContext.currentTime);

    analyserNodeRef.current.fftSize = 512;
    analyserNodeRef.current.smoothingTimeConstant = 0.8;

    // Create reverb impulse
    const reverbImpulse = createReverbImpulse(audioContext, effects.reverb);
    reverbNodeRef.current.buffer = reverbImpulse;

    // Connect analyser to destination
    analyserNodeRef.current.connect(audioContext.destination);

    // Pass analyser to parent
    if (onVisualizationData) {
      onVisualizationData(analyserNodeRef.current);
    }

    // Update effects
    updateEffects(audioContext);

  }, [createAudioContext, createReverbImpulse, effects.reverb, onVisualizationData]);

  // Update effects
  const updateEffects = useCallback((audioContext: AudioContext) => {
    if (!gainNodeRef.current || !bassBoostFilterRef.current || !reverbWetGainRef.current || 
        !reverbDryGainRef.current || !reverbPostFilterRef.current) return;

    const currentTime = audioContext.currentTime;

    // Volume
    const volumeGain = effects.volume === 0 ? 0 : 
      effects.volume <= 0.5 ? 
        Math.pow(10, (effects.volume * 2 - 1) * 3) / 10 :
        Math.pow(10, (effects.volume - 0.5) * 2.4) / 10;
    gainNodeRef.current.gain.setValueAtTime(Math.max(0, Math.min(2, volumeGain)), currentTime);

    // Bass boost
    const bassGain = effects.bassBoost <= 0.5 ? 
      effects.bassBoost * 12 : 
      6 + (effects.bassBoost - 0.5) * 18;
    bassBoostFilterRef.current.gain.setValueAtTime(Math.pow(10, bassGain / 20), currentTime);

    // Enhanced reverb controls
    const reverbAmount = effects.reverb;
    
    // Dry/wet mix
    reverbDryGainRef.current.gain.setValueAtTime(1 - reverbAmount, currentTime);
    reverbWetGainRef.current.gain.setValueAtTime(reverbAmount * 1.5, currentTime);
    
    // Post-filter gain for more pronounced reverb
    reverbPostFilterRef.current.gain.setValueAtTime(reverbAmount * 4, currentTime);
  }, [effects]);

  // Debounced effect updates
  useEffect(() => {
    if (effectUpdateTimeoutRef.current) {
      clearTimeout(effectUpdateTimeoutRef.current);
    }

    const effectsChanged = JSON.stringify(memoizedEffects) !== JSON.stringify(lastEffectsRef.current);
    
    if (effectsChanged && audioContextRef.current) {
      effectUpdateTimeoutRef.current = setTimeout(() => {
        updateEffects(audioContextRef.current!);
        lastEffectsRef.current = { ...memoizedEffects };
      }, 100);
    }

    return () => {
      if (effectUpdateTimeoutRef.current) {
        clearTimeout(effectUpdateTimeoutRef.current);
      }
    };
  }, [memoizedEffects, updateEffects]);

  // Create source node
  const createSourceNode = useCallback(() => {
    if (!audioContextRef.current || !audioBufferRef.current) return null;

    const audioContext = audioContextRef.current;
    const sourceNode = audioContext.createBufferSource();
    sourceNode.buffer = audioBufferRef.current;
    sourceNode.playbackRate.setValueAtTime(effects.tempo, audioContext.currentTime);

    // Connect enhanced effect chain with dry/wet reverb mixing
    if (gainNodeRef.current && bassBoostFilterRef.current && reverbNodeRef.current && 
        reverbPreFilterRef.current && reverbPostFilterRef.current && reverbWetGainRef.current && 
        reverbDryGainRef.current && analyserNodeRef.current) {
      
      // Main signal path
      sourceNode.connect(gainNodeRef.current);
      gainNodeRef.current.connect(bassBoostFilterRef.current);
      
      // Dry signal (no reverb)
      bassBoostFilterRef.current.connect(reverbDryGainRef.current);
      reverbDryGainRef.current.connect(analyserNodeRef.current);
      
      // Wet signal (with reverb)
      bassBoostFilterRef.current.connect(reverbPreFilterRef.current);
      reverbPreFilterRef.current.connect(reverbNodeRef.current);
      reverbNodeRef.current.connect(reverbPostFilterRef.current);
      reverbPostFilterRef.current.connect(reverbWetGainRef.current);
      reverbWetGainRef.current.connect(analyserNodeRef.current);
    }

    // Handle audio end
    sourceNode.onended = () => {
      setIsPlaying(false);
      isPlayingRef.current = false;
      if (sourceNodeRef.current) {
        sourceNodeRef.current.disconnect();
        sourceNodeRef.current = null;
      }
      setCurrentTime(0);
      pausedAtRef.current = 0;
    };

    return sourceNode;
  }, [effects.tempo]);

  // Playback controls
  const play = useCallback(async () => {
    if (!audioContextRef.current || isPlayingRef.current) return;

    try {
      const audioContext = audioContextRef.current;
      
      // Ensure audio context is resumed
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }
      
      const sourceNode = createSourceNode();
      
      if (sourceNode) {
        sourceNodeRef.current = sourceNode;
        
        if (pausedAtRef.current > 0) {
          sourceNode.start(0, pausedAtRef.current);
          currentTimeRef.current = pausedAtRef.current;
        } else {
          sourceNode.start(0);
          currentTimeRef.current = 0;
        }
        
        isPlayingRef.current = true;
        setIsPlaying(true);
      }
    } catch (error) {
      console.error('Playback error:', error);
      toast({
        title: "Playback failed",
        description: "Unable to start audio playback. Please try again.",
        variant: "destructive",
      });
    }
  }, [createSourceNode]);

  const pause = useCallback(() => {
    if (sourceNodeRef.current && isPlayingRef.current) {
      sourceNodeRef.current.stop();
      sourceNodeRef.current.disconnect();
      sourceNodeRef.current = null;
      isPlayingRef.current = false;
      setIsPlaying(false);
      // Keep the current time as is, don't update pausedAtRef
    }
  }, []);

  const stop = useCallback(() => {
    if (sourceNodeRef.current) {
      sourceNodeRef.current.stop();
      sourceNodeRef.current.disconnect();
      sourceNodeRef.current = null;
    }
    isPlayingRef.current = false;
    setIsPlaying(false);
    setCurrentTime(0);
    pausedAtRef.current = 0;
  }, []);

  const seek = useCallback((time: number) => {
    if (!audioContextRef.current || !audioBufferRef.current) return;

    const clampedTime = Math.max(0, Math.min(duration, time));
    setCurrentTime(clampedTime);
    currentTimeRef.current = clampedTime;

    if (isPlayingRef.current) {
      // Create new source node before stopping the old one to avoid gaps
      const audioContext = audioContextRef.current;
      const newSourceNode = audioContext.createBufferSource();
      newSourceNode.buffer = audioBufferRef.current;
      newSourceNode.playbackRate.setValueAtTime(effects.tempo, audioContext.currentTime);
      
      // Connect enhanced effect chain with dry/wet reverb mixing
      if (gainNodeRef.current && bassBoostFilterRef.current && reverbNodeRef.current && 
          reverbPreFilterRef.current && reverbPostFilterRef.current && reverbWetGainRef.current && 
          reverbDryGainRef.current && analyserNodeRef.current) {
        
        // Main signal path
        newSourceNode.connect(gainNodeRef.current);
        gainNodeRef.current.connect(bassBoostFilterRef.current);
        
        // Dry signal (no reverb)
        bassBoostFilterRef.current.connect(reverbDryGainRef.current);
        reverbDryGainRef.current.connect(analyserNodeRef.current);
        
        // Wet signal (with reverb)
        bassBoostFilterRef.current.connect(reverbPreFilterRef.current);
        reverbPreFilterRef.current.connect(reverbNodeRef.current);
        reverbNodeRef.current.connect(reverbPostFilterRef.current);
        reverbPostFilterRef.current.connect(reverbWetGainRef.current);
        reverbWetGainRef.current.connect(analyserNodeRef.current);
      }
      
      // Handle audio end
      newSourceNode.onended = () => {
        setIsPlaying(false);
        isPlayingRef.current = false;
        if (sourceNodeRef.current) {
          sourceNodeRef.current.disconnect();
          sourceNodeRef.current = null;
        }
        setCurrentTime(0);
        pausedAtRef.current = 0;
      };
      
      // Start the new source node immediately
      newSourceNode.start(0, clampedTime);
      
      // Now stop and disconnect the old source node
      if (sourceNodeRef.current) {
        sourceNodeRef.current.stop();
        sourceNodeRef.current.disconnect();
      }
      
      // Update the reference to the new source node
      sourceNodeRef.current = newSourceNode;
    } else {
      // Just update the paused position
      pausedAtRef.current = clampedTime;
    }
  }, [duration, effects.tempo]);

  // Time update loop
  useEffect(() => {
    if (!isPlayingRef.current) return;

    const startTime = audioContextRef.current?.currentTime || 0;
    const startOffset = currentTimeRef.current;

    const interval = setInterval(() => {
      if (audioContextRef.current && sourceNodeRef.current) {
        const elapsed = (audioContextRef.current.currentTime - startTime) * effects.tempo;
        const newTime = startOffset + elapsed;
        
        if (newTime <= duration) {
          currentTimeRef.current = newTime;
          setCurrentTime(newTime);
        } else {
          stop();
        }
      }
    }, 500); // Update every 500ms

    return () => clearInterval(interval);
  }, [duration, stop, effects.tempo]);

  // Create processed audio buffer with effects
  const createProcessedBuffer = useCallback(async (): Promise<AudioBuffer | null> => {
    if (!audioBufferRef.current || !audioContextRef.current) return null;

    const audioContext = audioContextRef.current;
    const originalBuffer = audioBufferRef.current;
    
    // Create offline context for processing
    const offlineContext = new OfflineAudioContext(
      originalBuffer.numberOfChannels,
      originalBuffer.length,
      originalBuffer.sampleRate
    );

    // Create source node
    const source = offlineContext.createBufferSource();
    source.buffer = originalBuffer;
    source.playbackRate.setValueAtTime(effects.tempo, offlineContext.currentTime);

    // Create effect nodes
    const gainNode = offlineContext.createGain();
    const bassBoostFilter = offlineContext.createBiquadFilter();
    const bassBoostHighShelf = offlineContext.createBiquadFilter();
    const reverbNode = offlineContext.createConvolver();
    const reverbPreFilter = offlineContext.createBiquadFilter();
    const reverbPostFilter = offlineContext.createBiquadFilter();
    const reverbWetGain = offlineContext.createGain();
    const reverbDryGain = offlineContext.createGain();

    // Configure bass boost
    bassBoostFilter.type = 'lowshelf';
    bassBoostFilter.frequency.setValueAtTime(120, offlineContext.currentTime);
    bassBoostFilter.Q.setValueAtTime(0.7, offlineContext.currentTime);
    
    const bassGain = Math.min(20, effects.bassBoost * 30);
    bassBoostFilter.gain.setValueAtTime(Math.pow(10, bassGain / 20), offlineContext.currentTime);

    // Configure high shelf
    bassBoostHighShelf.type = 'highshelf';
    bassBoostHighShelf.frequency.setValueAtTime(8000, offlineContext.currentTime);
    bassBoostHighShelf.Q.setValueAtTime(0.5, offlineContext.currentTime);
    
    const highShelfGain = Math.min(10, effects.bassBoost * 5);
    bassBoostHighShelf.gain.setValueAtTime(Math.pow(10, highShelfGain / 20), offlineContext.currentTime);

    // Configure reverb
    const reverbImpulse = createReverbImpulse(audioContext, effects.reverb);
    reverbNode.buffer = reverbImpulse;

    // Configure reverb filters
    reverbPreFilter.type = 'highpass';
    reverbPreFilter.frequency.setValueAtTime(80, offlineContext.currentTime);
    reverbPreFilter.Q.setValueAtTime(1.0, offlineContext.currentTime);

    reverbPostFilter.type = 'peaking';
    reverbPostFilter.frequency.setValueAtTime(8000, offlineContext.currentTime);
    reverbPostFilter.Q.setValueAtTime(1.2, offlineContext.currentTime);
    reverbPostFilter.gain.setValueAtTime(effects.reverb * 4, offlineContext.currentTime);

    // Configure volume
    const volumeGain = Math.max(-60, Math.min(6, 20 * Math.log10(effects.volume)));
    const linearVolume = Math.pow(10, volumeGain / 20);
    gainNode.gain.setValueAtTime(linearVolume, offlineContext.currentTime);

    // Configure dry/wet mix
    reverbDryGain.gain.setValueAtTime(1 - effects.reverb, offlineContext.currentTime);
    reverbWetGain.gain.setValueAtTime(effects.reverb * 1.5, offlineContext.currentTime);

    // Connect nodes
    source.connect(gainNode);
    gainNode.connect(bassBoostFilter);
    bassBoostFilter.connect(bassBoostHighShelf);
    
    // Dry signal
    bassBoostHighShelf.connect(reverbDryGain);
    reverbDryGain.connect(offlineContext.destination);
    
    // Wet signal
    bassBoostHighShelf.connect(reverbPreFilter);
    reverbPreFilter.connect(reverbNode);
    reverbNode.connect(reverbPostFilter);
    reverbPostFilter.connect(reverbWetGain);
    reverbWetGain.connect(offlineContext.destination);

    // Start processing
    source.start(0);
    const processedBuffer = await offlineContext.startRendering();
    
    return processedBuffer;
  }, [effects, createReverbImpulse]);

  // File processing
  const processAudioFile = useCallback(async (file: File): Promise<AudioBuffer> => {
    const audioContext = await createAudioContext();
    const arrayBuffer = await file.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    
    audioBufferRef.current = audioBuffer;
    await setupAudioGraph(audioBuffer);
    
    // Create and set processed buffer
    const processedBuffer = await createProcessedBuffer();
    if (processedBuffer && onProcessedAudio) {
      onProcessedAudio(processedBuffer);
    }
    
    return audioBuffer;
  }, [createAudioContext, setupAudioGraph, createProcessedBuffer, onProcessedAudio]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (effectUpdateTimeoutRef.current) {
        clearTimeout(effectUpdateTimeoutRef.current);
      }
      
      // Clean up audio nodes
      if (sourceNodeRef.current) {
        sourceNodeRef.current.stop();
        sourceNodeRef.current.disconnect();
        sourceNodeRef.current = null;
      }
      
      if (gainNodeRef.current) {
        gainNodeRef.current.disconnect();
      }
      if (bassBoostFilterRef.current) {
        bassBoostFilterRef.current.disconnect();
      }
      if (reverbNodeRef.current) {
        reverbNodeRef.current.disconnect();
      }
      if (reverbPreFilterRef.current) {
        reverbPreFilterRef.current.disconnect();
      }
      if (reverbPostFilterRef.current) {
        reverbPostFilterRef.current.disconnect();
      }
      if (reverbWetGainRef.current) {
        reverbWetGainRef.current.disconnect();
      }
      if (reverbDryGainRef.current) {
        reverbDryGainRef.current.disconnect();
      }
      if (analyserNodeRef.current) {
        analyserNodeRef.current.disconnect();
      }
      
      // Close audio context
      if (audioContextRef.current) {
        audioContextRef.current.close();
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
    processAudioFile,
    createProcessedBuffer
  };
};