use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AudioEffects {
    pub reverb: f32,
    pub bass_boost: f32,
    pub tempo: f32,
    pub volume: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AdvancedAudioEffects {
    pub reverb: f32,
    pub bass_boost: f32,
    pub tempo: f32,
    pub volume: f32,
    
    // EQ Bands
    pub eq_low: Option<f32>,
    pub eq_low_mid: Option<f32>,
    pub eq_mid: Option<f32>,
    pub eq_high_mid: Option<f32>,
    pub eq_high: Option<f32>,
    
    // Nightcore
    pub nightcore: Option<f32>,
    pub pitch_shift: Option<f32>,
    
    // Pitcher
    pub pitcher: Option<f32>,
    pub formant_shift: Option<f32>,
    
    // Vocal Extractor
    pub vocal_extractor: Option<bool>,
    pub vocal_sensitivity: Option<f32>,
    pub instrumental_separation: Option<f32>,
    
    // New Audio Processing Features
    pub limiter: Option<bool>,
    pub limiter_threshold: Option<f32>,
    pub limiter_release: Option<f32>,
    pub attenuator: Option<bool>,
    pub attenuator_gain: Option<f32>,
    pub audio_processing_enabled: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AudioBuffer {
    pub channels: Vec<Vec<f32>>,
    pub sample_rate: u32,
    pub duration: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProcessingProgress {
    pub percentage: f32,
    pub stage: String,
}