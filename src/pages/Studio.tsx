import React, { useState, useCallback, useEffect, useRef } from 'react';
import { StudioControls } from '@/components/StudioControls';
import { AudioVisualizer } from '@/components/AudioVisualizer';
import { useAudioProcessor, AudioEffects, AdvancedAudioEffects } from '@/components/AudioProcessor';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/hooks/use-toast';
import { Link } from 'react-router-dom';
import { Zap, Settings, Mic } from 'lucide-react';
import lamejs from '@breezystack/lamejs';

const Studio = () => {
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [originalFileName, setOriginalFileName] = useState<string>('');
  const [showTitle, setShowTitle] = useState<boolean>(true);
  const [effects, setEffects] = useState<AudioEffects>({
    // Base effects
    reverb: 0.3,
    bassBoost: 0.2,
    tempo: 0.8,
    volume: 0.7,
  });
  const [analyserNode, setAnalyserNode] = useState<AnalyserNode | null>(null);
  const [processedAudioBuffer, setProcessedAudioBuffer] = useState<AudioBuffer | null>(null);

  // Performance optimization: Debounced effect updates
  const effectUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const debouncedSetEffects = useCallback((newEffects: AudioEffects) => {
    // Clear any existing timeout
    if (effectUpdateTimeoutRef.current) {
      clearTimeout(effectUpdateTimeoutRef.current);
    }
    
    // Set a new timeout for the update
    effectUpdateTimeoutRef.current = setTimeout(() => {
      setEffects(newEffects);
    }, 100); // 100ms debounce for smooth slider interaction
  }, []);

  const { play, pause, stop, seek, isPlaying, currentTime, duration, audioContext } = useAudioProcessor({
    audioFile,
    effects,
    onProcessedAudio: setProcessedAudioBuffer,
    onVisualizationData: setAnalyserNode,
  });

  // Hide title after 30 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowTitle(false);
    }, 30000); // 30 seconds

    return () => clearTimeout(timer);
  }, []);

  // Cleanup effect update timeout on unmount
  useEffect(() => {
    return () => {
      if (effectUpdateTimeoutRef.current) {
        clearTimeout(effectUpdateTimeoutRef.current);
      }
    };
  }, []);

  const handleFileImport = useCallback((file: File) => {
    setAudioFile(file);
    setOriginalFileName(file.name);
    toast({
      title: "Audio imported",
      description: `Successfully loaded ${file.name}`,
    });
  }, []);

  const handleExport = useCallback(async () => {
    if (!processedAudioBuffer) {
      toast({
        title: "Export failed",
        description: "No processed audio available",
        variant: "destructive",
      });
      return;
    }

    try {
      // Convert to MP3 blob at 320 kbps using the already processed buffer
      const mp3Blob = audioBufferToMp3(processedAudioBuffer);
      
      // Generate filename with (processed) suffix
      const fileNameWithoutExt = originalFileName.replace(/\.[^/.]+$/, ''); // Remove extension
      const processedFileName = `${fileNameWithoutExt} (processed).mp3`;
      
      // Download file
      const url = URL.createObjectURL(mp3Blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = processedFileName;
      a.click();
      URL.revokeObjectURL(url);

      toast({
        title: "Export successful",
        description: "Audio exported as MP3 (320 kbps)",
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export failed",
        description: "Failed to export audio file",
        variant: "destructive",
      });
    }
  }, [processedAudioBuffer, originalFileName]);

  // Debounced effects change handler
  const handleEffectsChange = useCallback((newEffects: AudioEffects) => {
    debouncedSetEffects(newEffects);
  }, [debouncedSetEffects]);

  return (
    <div className="min-h-screen animated-bg p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className={`mb-8 text-center transition-opacity duration-1000 ${showTitle ? 'opacity-100' : 'opacity-0'}`}>
          <h1 className="text-4xl font-bold text-foreground mb-2 bg-gradient-highlight bg-clip-text text-transparent">
            EZ Audio Studio
          </h1>
        </div>

        {/* Navigation - Always Visible */}
        <div className="mb-6 text-center">
          <Link to="/advanced">
            <Button variant="outline" size="sm" className="rounded-sm">
              <Zap className="h-4 w-4 mr-2" />
              Advanced Studio
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Controls Panel */}
          <div className="lg:col-span-1 space-y-6">
            <StudioControls
              effects={effects}
              onEffectsChange={handleEffectsChange}
              onFileImport={handleFileImport}
              onExport={handleExport}
              onPlay={play}
              onPause={pause}
              onStop={stop}
              onSeek={seek}
              isPlaying={isPlaying}
              hasAudio={!!audioFile}
              currentTime={currentTime}
              duration={duration}
            />
          </div>

          {/* Visualization Panel */}
          <div className="lg:col-span-2">
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-2">Enhanced Audio Visualization</h3>
                <p className="text-sm text-muted-foreground mb-4">Real-time frequency and waveform analysis with optimized performance</p>
                {audioFile ? (
                  <AudioVisualizer
                    analyserNode={analyserNode}
                    width={800}
                    height={400}
                    className="w-full"
                  />
                ) : (
                  <div className="h-64 flex items-center justify-center bg-gradient-panel rounded-sm border border-border">
                    <div className="text-center text-muted-foreground">
                      <Zap className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Import an audio file to see enhanced visualization</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Audio File Info */}
              {audioFile && (
                <div className="pt-4">
                  <div className="text-sm text-muted-foreground">
                    <p><strong>File:</strong> {audioFile.name}</p>
                    <p><strong>Size:</strong> {(audioFile.size / 1024 / 1024).toFixed(2)} MB</p>
                    <p><strong>Duration:</strong> {duration ? `${Math.floor(duration / 60)}:${(duration % 60).toFixed(0).padStart(2, '0')}` : '--:--'}</p>
                    <p><strong>Current Time:</strong> {currentTime ? `${Math.floor(currentTime / 60)}:${(currentTime % 60).toFixed(0).padStart(2, '0')}` : '--:--'}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Footer */}
      <div className="mt-8 text-center">
        <a 
          href="https://guns.lol/copiuum" 
          target="_blank" 
          rel="noopener noreferrer"
          className="footer-glow inline-block px-6 py-3 text-muted-foreground hover:text-foreground transition-colors rounded-sm"
        >
          project by copiuum - contact me
        </a>
      </div>
    </div>
  );
};

// Utility function to convert AudioBuffer to MP3 blob at 320 kbps
function audioBufferToMp3(buffer: AudioBuffer): Blob {
  const samples = new Int16Array(buffer.length * buffer.numberOfChannels);
  let sampleIndex = 0;

  // Convert float32 to int16 and interleave channels
  for (let i = 0; i < buffer.length; i++) {
    for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
      const sample = Math.max(-1, Math.min(1, buffer.getChannelData(channel)[i]));
      samples[sampleIndex++] = sample * 0x7FFF;
    }
  }

  // Configure MP3 encoder for 320 kbps with proper initialization
  const mp3encoder = new lamejs.Mp3Encoder(buffer.numberOfChannels, buffer.sampleRate, 320);
  const mp3Data = [];

  const blockSize = 1152; // Standard MP3 frame size
  for (let i = 0; i < samples.length; i += blockSize * buffer.numberOfChannels) {
    const sampleChunk = samples.subarray(i, i + blockSize * buffer.numberOfChannels);
    
    if (buffer.numberOfChannels === 2) {
      // Stereo: separate left and right channels
      const left = new Int16Array(blockSize);
      const right = new Int16Array(blockSize);
      
      for (let j = 0; j < blockSize && (i + j * 2 + 1) < samples.length; j++) {
        left[j] = sampleChunk[j * 2] || 0;
        right[j] = sampleChunk[j * 2 + 1] || 0;
      }
      
      const mp3buf = mp3encoder.encodeBuffer(left, right);
      if (mp3buf.length > 0) {
        mp3Data.push(mp3buf);
      }
    } else {
      // Mono
      const mono = new Int16Array(blockSize);
      for (let j = 0; j < blockSize && (i + j) < samples.length; j++) {
        mono[j] = sampleChunk[j] || 0;
      }
      
      const mp3buf = mp3encoder.encodeBuffer(mono);
      if (mp3buf.length > 0) {
        mp3Data.push(mp3buf);
      }
    }
  }

  // Flush remaining data
  const mp3buf = mp3encoder.flush();
  if (mp3buf.length > 0) {
    mp3Data.push(mp3buf);
  }

  return new Blob(mp3Data, { type: 'audio/mp3' });
}

export default Studio;