// Tauri API wrapper that uses Rust backend for audio processing
import { getTauriAPI } from './tauri-api';

export interface AudioEffects {
  reverb: number;
  bassBoost: number;
  tempo: number;
  volume: number;
}

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

export interface RustAudioBuffer {
  channels: number[][];
  sample_rate: number;
  duration: number;
}

export class RustAudioProcessor {
  private static tauriAPI = getTauriAPI();

  static async loadAudioFile(filePath: string): Promise<RustAudioBuffer> {
    try {
      return await this.tauriAPI.invoke('load_audio_file', { filePath });
    } catch (error) {
      console.error('Failed to load audio file:', error);
      throw error;
    }
  }

  static async processAudioWithEffects(
    audioBuffer: RustAudioBuffer,
    effects: AdvancedAudioEffects
  ): Promise<RustAudioBuffer> {
    try {
      // Convert TypeScript interface to Rust struct format
      const rustEffects = {
        reverb: effects.reverb,
        bass_boost: effects.bassBoost,
        tempo: effects.tempo,
        volume: effects.volume,
        eq_low: effects.eqLow,
        eq_low_mid: effects.eqLowMid,
        eq_mid: effects.eqMid,
        eq_high_mid: effects.eqHighMid,
        eq_high: effects.eqHigh,
        nightcore: effects.nightcore,
        pitch_shift: effects.pitchShift,
        pitcher: effects.pitcher,
        formant_shift: effects.formantShift,
        vocal_extractor: effects.vocalExtractor,
        vocal_sensitivity: effects.vocalSensitivity,
        instrumental_separation: effects.instrumentalSeparation,
        limiter: effects.limiter,
        limiter_threshold: effects.limiterThreshold,
        limiter_release: effects.limiterRelease,
        attenuator: effects.attenuator,
        attenuator_gain: effects.attenuatorGain,
        audio_processing_enabled: effects.audioProcessingEnabled,
      };

      return await this.tauriAPI.invoke('process_audio_with_effects', {
        audioBuffer,
        effects: rustEffects,
      });
    } catch (error) {
      console.error('Failed to process audio:', error);
      throw error;
    }
  }

  static async saveAudioFile(
    audioBuffer: RustAudioBuffer,
    outputPath: string
  ): Promise<void> {
    try {
      await this.tauriAPI.invoke('save_audio_file', {
        audioBuffer,
        outputPath,
      });
    } catch (error) {
      console.error('Failed to save audio file:', error);
      throw error;
    }
  }

  static async getAudioAnalysis(audioBuffer: RustAudioBuffer): Promise<any> {
    try {
      return await this.tauriAPI.invoke('get_audio_analysis', { audioBuffer });
    } catch (error) {
      console.error('Failed to analyze audio:', error);
      throw error;
    }
  }

  // Convert Web Audio API AudioBuffer to Rust format
  static webAudioToRust(webAudioBuffer: AudioBuffer): RustAudioBuffer {
    const channels = [];
    
    for (let i = 0; i < webAudioBuffer.numberOfChannels; i++) {
      const channelData = webAudioBuffer.getChannelData(i);
      channels.push(Array.from(channelData));
    }

    return {
      channels,
      sample_rate: webAudioBuffer.sampleRate,
      duration: webAudioBuffer.duration,
    };
  }

  // Convert Rust format to Web Audio API AudioBuffer
  static async rustToWebAudio(
    rustBuffer: RustAudioBuffer,
    audioContext: AudioContext
  ): Promise<AudioBuffer> {
    const audioBuffer = audioContext.createBuffer(
      rustBuffer.channels.length,
      rustBuffer.channels[0].length,
      rustBuffer.sample_rate
    );

    for (let i = 0; i < rustBuffer.channels.length; i++) {
      const channelData = audioBuffer.getChannelData(i);
      for (let j = 0; j < rustBuffer.channels[i].length; j++) {
        channelData[j] = rustBuffer.channels[i][j];
      }
    }

    return audioBuffer;
  }
}