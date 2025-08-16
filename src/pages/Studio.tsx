import React, { useState, useCallback, useEffect, useRef } from 'react';
import { StudioControls } from '@/components/StudioControls';
import { useAudioProcessor, AudioEffects, AdvancedAudioEffects } from '@/components/AudioProcessor';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/hooks/use-toast';
import { Settings, Mic } from 'lucide-react';
import lamejs from '@breezystack/lamejs';

const Studio = () => {
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [originalFileName, setOriginalFileName] = useState<string>('');
  const [showTitle, setShowTitle] = useState<boolean>(true);
  // Initialize effects with proper defaults
  const defaultEffects: AudioEffects = {
    reverb: 0.3,
    bassBoost: 0, // Start with no bass boost (explicit 0)
    tempo: 0.8, // 80% tempo
    volume: 0.7,
  };

  const [effects, setEffects] = useState<AudioEffects>(defaultEffects);
  const [analyserNode, setAnalyserNode] = useState<AnalyserNode | null>(null);
  const [processedAudioBuffer, setProcessedAudioBuffer] = useState<AudioBuffer | null>(null);
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

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

  const audioProcessor = useAudioProcessor({
    audioFile,
    effects,
    onProcessedAudio: setProcessedAudioBuffer,
    onVisualizationData: setAnalyserNode,
  });

  const { play, pause, stop, seek, isPlaying, currentTime, duration, audioContext } = audioProcessor;



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

  // Ensure bass boost starts at 0 on mount
  useEffect(() => {
    if (effects.bassBoost !== 0) {
      setEffects(prev => ({ ...prev, bassBoost: 0 }));
    }
  }, []);

  const handleFileImport = useCallback(async (file: File) => {
    setAudioFile(file);
    setOriginalFileName(file.name);
    setIsProcessing(true);
    
    // Performance warning for large files
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > 10) {
      toast({
        title: "Large file detected",
        description: `${fileSizeMB.toFixed(1)}MB file may take longer to process`,
        variant: "default",
      });
    }
    
    try {
      // Process audio file through the audio processor
      const audioBuffer = await audioProcessor.processAudioFile(file);
      setAudioBuffer(audioBuffer);
      
      toast({
        title: "Audio imported",
        description: `Successfully loaded ${file.name}`,
      });
    } catch (error) {
      console.error('Error processing audio file:', error);
      toast({
        title: "Import failed",
        description: "Failed to load audio file. Please try again.",
        variant: "destructive",
      });
      // Reset state on error
      setAudioFile(null);
      setOriginalFileName('');
      setAudioBuffer(null);
    } finally {
      setIsProcessing(false);
    }
  }, [audioProcessor]);

  const handleExport = useCallback(async () => {
    if (!audioBuffer) {
      toast({
        title: "Export failed",
        description: "No audio file imported",
        variant: "destructive",
      });
      return;
    }

    // Show export popup
    setIsExporting(true);

    try {
      // Create processed buffer with current effects if not available
      let bufferToExport = processedAudioBuffer;
      if (!bufferToExport) {
        bufferToExport = await audioProcessor.createProcessedBuffer();
        if (!bufferToExport) {
          throw new Error("Failed to create processed audio buffer");
        }
      }

      // Convert to MP3 blob at 320 kbps using the processed buffer
      const mp3Blob = audioBufferToMp3(bufferToExport);
      
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

      // Hide export popup
      setIsExporting(false);

      toast({
        title: "Export successful",
        description: "Audio exported as MP3 (320 kbps)",
      });
    } catch (error) {
      console.error('Export error:', error);
      
      // Hide export popup
      setIsExporting(false);
      
      toast({
        title: "Export failed",
        description: "Failed to export audio file",
        variant: "destructive",
      });
    }
  }, [audioBuffer, processedAudioBuffer, originalFileName, audioProcessor]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle shortcuts when not typing in input fields
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (event.code) {
        case 'Space':
          event.preventDefault();
          if (isPlaying) {
            pause();
          } else if (audioFile) {
            play();
          }
          break;
        case 'KeyS':
          event.preventDefault();
          if (audioFile) {
            stop();
          }
          break;
        case 'KeyE':
          event.preventDefault();
          if (audioFile && !isExporting) {
            handleExport();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, audioFile, play, pause, stop, handleExport, isExporting]);

  // Effects change handler with immediate updates
  const handleEffectsChange = useCallback((newEffects: AudioEffects) => {
    setEffects(newEffects);
  }, []);

  // Reset effects to defaults
  const resetEffects = useCallback(() => {
    setEffects(defaultEffects);
  }, [defaultEffects]);

  return (
    <div className="min-h-screen animated-bg p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className={`mb-8 text-center transition-opacity duration-1000 ${showTitle ? 'opacity-100' : 'opacity-0'}`}>
          <h1 className="text-4xl font-bold text-foreground mb-2 bg-gradient-highlight bg-clip-text text-transparent">
            EZ Audio Studio
          </h1>
        </div>

        <div className="flex justify-center">
          <div className="max-w-md w-full space-y-6">
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
              audioBuffer={audioBuffer}
              isProcessing={isProcessing}
            />

            {/* Export Popup */}
            {isExporting && (
              <Card className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                <CardContent className="p-8 text-center max-w-md mx-4">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                  <h3 className="text-xl font-semibold mb-2">Exporting audio...</h3>
                  <p className="text-muted-foreground text-sm">
                    Browser seems to be frozen? Try hard refresh (CTRL + F5)
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Audio File Info */}
            {audioFile && (
              <Card className="rounded-sm">
                <CardHeader>
                  <CardTitle className="text-lg">Audio File Info</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground space-y-2">
                    <p><strong>File:</strong> {audioFile.name}</p>
                    <p><strong>Size:</strong> {(audioFile.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                </CardContent>
              </Card>
            )}


          </div>
        </div>
      </div>
      

      
      {/* Footer at Very Bottom */}
      <div className="fixed bottom-0 left-0 right-0 text-center pb-2">
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