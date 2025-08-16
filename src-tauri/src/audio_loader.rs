use std::path::Path;
use hound::{WavReader, WavWriter, WavSpec};
use symphonia::core::audio::{AudioBufferRef, Signal};
use symphonia::core::codecs::{DecoderOptions, CODEC_TYPE_NULL};
use symphonia::core::errors::Error as SymphoniaError;
use symphonia::core::formats::FormatOptions;
use symphonia::core::io::MediaSourceStream;
use symphonia::core::meta::MetadataOptions;
use symphonia::core::probe::Hint;
use std::fs::File;
use std::io::BufReader;

use crate::audio_types::AudioBuffer;

pub struct AudioLoader;

impl AudioLoader {
    /// Load an audio file and convert it to our internal format
    pub fn load_audio_file(file_path: &str) -> Result<AudioBuffer, Box<dyn std::error::Error>> {
        let path = Path::new(file_path);
        let extension = path.extension()
            .and_then(|ext| ext.to_str())
            .unwrap_or("")
            .to_lowercase();

        match extension.as_str() {
            "wav" => Self::load_wav(file_path),
            "mp3" | "m4a" | "aac" | "ogg" | "flac" => Self::load_with_symphonia(file_path),
            _ => Err("Unsupported audio format".into()),
        }
    }

    /// Load WAV files directly using hound
    fn load_wav(file_path: &str) -> Result<AudioBuffer, Box<dyn std::error::Error>> {
        let mut reader = WavReader::open(file_path)?;
        let spec = reader.spec();
        
        let samples: Vec<f32> = match spec.sample_format {
            hound::SampleFormat::Float => {
                reader.samples::<f32>().collect::<Result<Vec<_>, _>>()?
            }
            hound::SampleFormat::Int => {
                let samples: Vec<i32> = reader.samples::<i32>().collect::<Result<Vec<_>, _>>()?;
                samples.into_iter().map(|s| s as f32 / i32::MAX as f32).collect()
            }
        };

        let channels = Self::deinterleave_samples(samples, spec.channels as usize);
        let duration = samples.len() as f32 / (spec.sample_rate * spec.channels as u32) as f32;

        Ok(AudioBuffer {
            channels,
            sample_rate: spec.sample_rate,
            duration,
        })
    }

    /// Load other formats using symphonia
    fn load_with_symphonia(file_path: &str) -> Result<AudioBuffer, Box<dyn std::error::Error>> {
        let file = File::open(file_path)?;
        let mss = MediaSourceStream::new(Box::new(BufReader::new(file)), Default::default());

        let mut hint = Hint::new();
        if let Some(extension) = Path::new(file_path).extension() {
            if let Some(ext_str) = extension.to_str() {
                hint.with_extension(ext_str);
            }
        }

        let meta_opts = MetadataOptions::default();
        let fmt_opts = FormatOptions::default();

        let probed = symphonia::default::get_probe().format(&hint, mss, &fmt_opts, &meta_opts)?;
        let mut format = probed.format;

        let track = format
            .tracks()
            .iter()
            .find(|t| t.codec_params.codec != CODEC_TYPE_NULL)
            .ok_or("No supported audio tracks found")?;

        let mut decoder = symphonia::default::get_codecs()
            .make(&track.codec_params, &DecoderOptions::default())?;

        let mut all_samples = Vec::new();
        let mut sample_rate = 44100;
        let mut channels = 2;

        loop {
            let packet = match format.next_packet() {
                Ok(packet) => packet,
                Err(SymphoniaError::ResetRequired) => {
                    // The track list has been changed. Re-examine it and create a new set of decoders,
                    // then restart the decode loop. This is an advanced feature and shouldn't occur
                    // in a typical file.
                    unimplemented!();
                }
                Err(SymphoniaError::IoError(err)) => {
                    // The decoder has reached the end of the file, or an IO error has occurred.
                    if err.kind() == std::io::ErrorKind::UnexpectedEof {
                        break;
                    } else {
                        return Err(Box::new(err));
                    }
                }
                Err(err) => return Err(Box::new(err)),
            };

            // If the packet does not belong to the selected track, skip over it.
            if packet.track_id() != track.id {
                continue;
            }

            // Decode the packet into audio samples.
            match decoder.decode(&packet)? {
                AudioBufferRef::F32(buf) => {
                    sample_rate = buf.spec().rate;
                    channels = buf.spec().channels.count();
                    
                    // Convert planar to interleaved
                    let frames = buf.frames();
                    for frame_idx in 0..frames {
                        for ch in 0..channels {
                            if let Some(channel_data) = buf.chan(ch) {
                                all_samples.push(channel_data[frame_idx]);
                            }
                        }
                    }
                }
                AudioBufferRef::U8(buf) => {
                    sample_rate = buf.spec().rate;
                    channels = buf.spec().channels.count();
                    
                    let frames = buf.frames();
                    for frame_idx in 0..frames {
                        for ch in 0..channels {
                            if let Some(channel_data) = buf.chan(ch) {
                                let sample = (channel_data[frame_idx] as f32 - 128.0) / 128.0;
                                all_samples.push(sample);
                            }
                        }
                    }
                }
                AudioBufferRef::U16(buf) => {
                    sample_rate = buf.spec().rate;
                    channels = buf.spec().channels.count();
                    
                    let frames = buf.frames();
                    for frame_idx in 0..frames {
                        for ch in 0..channels {
                            if let Some(channel_data) = buf.chan(ch) {
                                let sample = (channel_data[frame_idx] as f32 - 32768.0) / 32768.0;
                                all_samples.push(sample);
                            }
                        }
                    }
                }
                AudioBufferRef::U32(buf) => {
                    sample_rate = buf.spec().rate;
                    channels = buf.spec().channels.count();
                    
                    let frames = buf.frames();
                    for frame_idx in 0..frames {
                        for ch in 0..channels {
                            if let Some(channel_data) = buf.chan(ch) {
                                let sample = (channel_data[frame_idx] as f32 - 2147483648.0) / 2147483648.0;
                                all_samples.push(sample);
                            }
                        }
                    }
                }
                AudioBufferRef::S8(buf) => {
                    sample_rate = buf.spec().rate;
                    channels = buf.spec().channels.count();
                    
                    let frames = buf.frames();
                    for frame_idx in 0..frames {
                        for ch in 0..channels {
                            if let Some(channel_data) = buf.chan(ch) {
                                let sample = channel_data[frame_idx] as f32 / 128.0;
                                all_samples.push(sample);
                            }
                        }
                    }
                }
                AudioBufferRef::S16(buf) => {
                    sample_rate = buf.spec().rate;
                    channels = buf.spec().channels.count();
                    
                    let frames = buf.frames();
                    for frame_idx in 0..frames {
                        for ch in 0..channels {
                            if let Some(channel_data) = buf.chan(ch) {
                                let sample = channel_data[frame_idx] as f32 / 32768.0;
                                all_samples.push(sample);
                            }
                        }
                    }
                }
                AudioBufferRef::S32(buf) => {
                    sample_rate = buf.spec().rate;
                    channels = buf.spec().channels.count();
                    
                    let frames = buf.frames();
                    for frame_idx in 0..frames {
                        for ch in 0..channels {
                            if let Some(channel_data) = buf.chan(ch) {
                                let sample = channel_data[frame_idx] as f32 / 2147483648.0;
                                all_samples.push(sample);
                            }
                        }
                    }
                }
                AudioBufferRef::F64(buf) => {
                    sample_rate = buf.spec().rate;
                    channels = buf.spec().channels.count();
                    
                    let frames = buf.frames();
                    for frame_idx in 0..frames {
                        for ch in 0..channels {
                            if let Some(channel_data) = buf.chan(ch) {
                                all_samples.push(channel_data[frame_idx] as f32);
                            }
                        }
                    }
                }
            }
        }

        let channel_samples = Self::deinterleave_samples(all_samples, channels);
        let duration = channel_samples[0].len() as f32 / sample_rate as f32;

        Ok(AudioBuffer {
            channels: channel_samples,
            sample_rate,
            duration,
        })
    }

    /// Convert interleaved samples to separate channel vectors
    fn deinterleave_samples(interleaved: Vec<f32>, num_channels: usize) -> Vec<Vec<f32>> {
        if num_channels == 0 {
            return vec![];
        }

        let frames = interleaved.len() / num_channels;
        let mut channels = vec![Vec::with_capacity(frames); num_channels];

        for (i, sample) in interleaved.iter().enumerate() {
            let channel = i % num_channels;
            channels[channel].push(*sample);
        }

        channels
    }

    /// Save audio buffer as WAV file
    pub fn save_as_wav(
        audio_buffer: &AudioBuffer,
        output_path: &str,
    ) -> Result<(), Box<dyn std::error::Error>> {
        let spec = WavSpec {
            channels: audio_buffer.channels.len() as u16,
            sample_rate: audio_buffer.sample_rate,
            bits_per_sample: 32,
            sample_format: hound::SampleFormat::Float,
        };

        let mut writer = WavWriter::create(output_path, spec)?;

        // Interleave channels
        let frame_count = audio_buffer.channels[0].len();
        for frame in 0..frame_count {
            for channel in &audio_buffer.channels {
                if frame < channel.len() {
                    writer.write_sample(channel[frame])?;
                }
            }
        }

        writer.finalize()?;
        Ok(())
    }
}