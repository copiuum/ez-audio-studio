use std::f32::consts::PI;
use realfft::RealFftPlanner;
use rustfft::{FftPlanner, num_complex::Complex32};
use apodize;

use crate::audio_types::{AudioBuffer, AdvancedAudioEffects};

pub struct AudioProcessor;

impl AudioProcessor {
    /// Apply all effects to the audio buffer
    pub fn process_audio(
        mut audio_buffer: AudioBuffer,
        effects: &AdvancedAudioEffects,
    ) -> Result<AudioBuffer, Box<dyn std::error::Error>> {
        // Apply volume
        Self::apply_volume(&mut audio_buffer, effects.volume);

        // Apply tempo change
        if (effects.tempo - 1.0).abs() > 0.001 {
            audio_buffer = Self::apply_tempo_change(audio_buffer, effects.tempo)?;
        }

        // Apply bass boost
        if effects.bass_boost > 0.001 {
            Self::apply_bass_boost(&mut audio_buffer, effects.bass_boost)?;
        }

        // Apply EQ if any EQ settings are present
        if effects.eq_low.is_some() || effects.eq_low_mid.is_some() || 
           effects.eq_mid.is_some() || effects.eq_high_mid.is_some() || 
           effects.eq_high.is_some() {
            Self::apply_equalizer(&mut audio_buffer, effects)?;
        }

        // Apply limiter if enabled
        if effects.limiter.unwrap_or(false) && effects.audio_processing_enabled.unwrap_or(true) {
            Self::apply_limiter(&mut audio_buffer, effects)?;
        }

        // Apply attenuator if enabled
        if effects.attenuator.unwrap_or(false) && effects.audio_processing_enabled.unwrap_or(true) {
            Self::apply_attenuator(&mut audio_buffer, effects)?;
        }

        // Apply reverb
        if effects.reverb > 0.001 {
            audio_buffer = Self::apply_reverb(audio_buffer, effects.reverb)?;
        }

        Ok(audio_buffer)
    }

    /// Apply volume change
    fn apply_volume(audio_buffer: &mut AudioBuffer, volume: f32) {
        for channel in &mut audio_buffer.channels {
            for sample in channel.iter_mut() {
                *sample *= volume;
            }
        }
    }

    /// Apply tempo change using simple resampling
    fn apply_tempo_change(
        audio_buffer: AudioBuffer,
        tempo: f32,
    ) -> Result<AudioBuffer, Box<dyn std::error::Error>> {
        let new_length = (audio_buffer.channels[0].len() as f32 / tempo) as usize;
        let mut new_channels = Vec::new();

        for channel in &audio_buffer.channels {
            let mut new_channel = Vec::with_capacity(new_length);
            
            for i in 0..new_length {
                let original_index = (i as f32 * tempo) as usize;
                if original_index < channel.len() {
                    // Linear interpolation for smoother result
                    let next_index = (original_index + 1).min(channel.len() - 1);
                    let fraction = (i as f32 * tempo) - original_index as f32;
                    
                    let sample = channel[original_index] * (1.0 - fraction) + 
                                channel[next_index] * fraction;
                    new_channel.push(sample);
                } else {
                    new_channel.push(0.0);
                }
            }
            new_channels.push(new_channel);
        }

        Ok(AudioBuffer {
            channels: new_channels,
            sample_rate: audio_buffer.sample_rate,
            duration: new_length as f32 / audio_buffer.sample_rate as f32,
        })
    }

    /// Apply bass boost using a simple low-shelf filter
    fn apply_bass_boost(
        audio_buffer: &mut AudioBuffer,
        boost: f32,
    ) -> Result<(), Box<dyn std::error::Error>> {
        let sample_rate = audio_buffer.sample_rate as f32;
        let cutoff_freq = 200.0; // Bass frequency cutoff
        let gain_db = boost * 20.0; // Convert to dB
        let gain_linear = 10.0_f32.powf(gain_db / 20.0);

        // Simple one-pole low-pass filter coefficients
        let omega = 2.0 * PI * cutoff_freq / sample_rate;
        let alpha = omega / (1.0 + omega);

        for channel in &mut audio_buffer.channels {
            let mut y_prev = 0.0;
            
            for sample in channel.iter_mut() {
                // Low-pass filter
                y_prev = alpha * *sample + (1.0 - alpha) * y_prev;
                
                // Apply boost to low frequencies and mix with original
                let boosted_bass = y_prev * gain_linear;
                let high_freq = *sample - y_prev;
                *sample = boosted_bass + high_freq;
                
                // Prevent clipping
                *sample = sample.clamp(-1.0, 1.0);
            }
        }

        Ok(())
    }

    /// Apply 5-band equalizer
    fn apply_equalizer(
        audio_buffer: &mut AudioBuffer,
        effects: &AdvancedAudioEffects,
    ) -> Result<(), Box<dyn std::error::Error>> {
        let sample_rate = audio_buffer.sample_rate as f32;
        
        // EQ band frequencies
        let bands = [
            (60.0, effects.eq_low.unwrap_or(0.5)),      // Low
            (250.0, effects.eq_low_mid.unwrap_or(0.5)), // Low-Mid
            (1000.0, effects.eq_mid.unwrap_or(0.5)),    // Mid
            (4000.0, effects.eq_high_mid.unwrap_or(0.5)), // High-Mid
            (16000.0, effects.eq_high.unwrap_or(0.5)),  // High
        ];

        for channel in &mut audio_buffer.channels {
            let mut filtered_channel = channel.clone();

            for (freq, gain_normalized) in &bands {
                // Convert normalized gain (0-1) to dB (-20 to +20)
                let gain_db = (gain_normalized - 0.5) * 40.0;
                if gain_db.abs() < 0.1 {
                    continue; // Skip if gain is essentially zero
                }

                let gain_linear = 10.0_f32.powf(gain_db / 20.0);
                
                // Simple peaking filter implementation
                let omega = 2.0 * PI * freq / sample_rate;
                let alpha = omega.sin() / (2.0 * 0.7); // Q factor of 0.7
                let cos_w = omega.cos();
                let a = gain_linear.sqrt();

                // Filter coefficients
                let b0 = 1.0 + alpha * a;
                let b1 = -2.0 * cos_w;
                let b2 = 1.0 - alpha * a;
                let a0 = 1.0 + alpha / a;
                let a1 = -2.0 * cos_w;
                let a2 = 1.0 - alpha / a;

                // Apply biquad filter
                let mut x1 = 0.0;
                let mut x2 = 0.0;
                let mut y1 = 0.0;
                let mut y2 = 0.0;

                for (i, sample) in filtered_channel.iter_mut().enumerate() {
                    let x0 = channel[i];
                    let y0 = (b0 * x0 + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0;

                    *sample = y0.clamp(-1.0, 1.0);

                    x2 = x1;
                    x1 = x0;
                    y2 = y1;
                    y1 = y0;
                }
            }

            *channel = filtered_channel;
        }

        Ok(())
    }

    /// Apply simple limiter
    fn apply_limiter(
        audio_buffer: &mut AudioBuffer,
        effects: &AdvancedAudioEffects,
    ) -> Result<(), Box<dyn std::error::Error>> {
        let threshold = effects.limiter_threshold.unwrap_or(-1.0);
        let threshold_linear = 10.0_f32.powf(threshold / 20.0);
        let ratio = 20.0; // Hard limiting
        let attack_time = 0.001; // 1ms attack
        let release_time = effects.limiter_release.unwrap_or(0.1); // 100ms release

        let sample_rate = audio_buffer.sample_rate as f32;
        let attack_coeff = (-1.0 / (attack_time * sample_rate)).exp();
        let release_coeff = (-1.0 / (release_time * sample_rate)).exp();

        for channel in &mut audio_buffer.channels {
            let mut envelope = 0.0;

            for sample in channel.iter_mut() {
                let input_level = sample.abs();
                
                // Envelope follower
                if input_level > envelope {
                    envelope = attack_coeff * envelope + (1.0 - attack_coeff) * input_level;
                } else {
                    envelope = release_coeff * envelope + (1.0 - release_coeff) * input_level;
                }

                // Compression
                if envelope > threshold_linear {
                    let excess = envelope / threshold_linear;
                    let compressed_excess = excess.powf(1.0 / ratio);
                    let gain_reduction = compressed_excess / excess;
                    *sample *= gain_reduction;
                }

                // Hard limit at threshold
                *sample = sample.clamp(-threshold_linear, threshold_linear);
            }
        }

        Ok(())
    }

    /// Apply attenuator (gain)
    fn apply_attenuator(
        audio_buffer: &mut AudioBuffer,
        effects: &AdvancedAudioEffects,
    ) -> Result<(), Box<dyn std::error::Error>> {
        let gain_db = effects.attenuator_gain.unwrap_or(10.0);
        let gain_linear = 10.0_f32.powf(gain_db / 20.0);

        for channel in &mut audio_buffer.channels {
            for sample in channel.iter_mut() {
                *sample *= gain_linear;
                *sample = sample.clamp(-1.0, 1.0);
            }
        }

        Ok(())
    }

    /// Apply simple reverb using convolution
    fn apply_reverb(
        audio_buffer: AudioBuffer,
        reverb_amount: f32,
    ) -> Result<AudioBuffer, Box<dyn std::error::Error>> {
        let sample_rate = audio_buffer.sample_rate;
        let reverb_length = (sample_rate as f32 * 2.0) as usize; // 2 second reverb
        
        // Generate impulse response
        let mut impulse = vec![0.0; reverb_length];
        for i in 0..reverb_length {
            let decay = (-3.0 * i as f32 / reverb_length as f32).exp();
            impulse[i] = (rand::random::<f32>() * 2.0 - 1.0) * decay;
        }

        let mut processed_channels = Vec::new();

        for channel in &audio_buffer.channels {
            let mut processed_channel = vec![0.0; channel.len() + reverb_length];
            
            // Simple convolution
            for (i, &sample) in channel.iter().enumerate() {
                for (j, &impulse_sample) in impulse.iter().enumerate() {
                    if i + j < processed_channel.len() {
                        processed_channel[i + j] += sample * impulse_sample * reverb_amount;
                    }
                }
            }

            // Mix with dry signal
            for i in 0..channel.len() {
                processed_channel[i] = channel[i] * (1.0 - reverb_amount) + 
                                      processed_channel[i] * reverb_amount;
            }

            // Trim to original length
            processed_channel.truncate(channel.len());
            processed_channels.push(processed_channel);
        }

        Ok(AudioBuffer {
            channels: processed_channels,
            sample_rate: audio_buffer.sample_rate,
            duration: audio_buffer.duration,
        })
    }
}