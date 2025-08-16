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
import { Music, Mic, Zap, Settings, ArrowLeft } from 'lucide-react';

// Remove the local interface since we're importing it from AudioProcessor

const AdvancedStudio = () => {
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [originalFileName, setOriginalFileName] = useState<string>('');
  const [showTitle, setShowTitle] = useState<boolean>(true);
  const [effects, setEffects] = useState<AdvancedAudioEffects>({
    // Base effects
    reverb: 0.3,
    bassBoost: 0.2,
    tempo: 0.8,
    volume: 0.7,
    
    // EQ Bands
    eqLow: 0.5,
    eqLowMid: 0.5,
    eqMid: 0.5,
    eqHighMid: 0.5,
    eqHigh: 0.5,
    
    // Nightcore
    nightcore: 1.0, // Default to normal speed
    pitchShift: 0.0,
    
    // Pitcher
    pitcher: 0.0,
    formantShift: 0.0,
    
    // Vocal Extractor
    vocalExtractor: false,
    vocalSensitivity: 0.5,
    instrumentalSeparation: 0.5,
    
    // New Audio Processing Features
    limiter: false,
    limiterThreshold: -1,
    limiterRelease: 0.1,
    attenuator: false,
    attenuatorGain: 10,
    audioProcessingEnabled: true,
  });
  const [analyserNode, setAnalyserNode] = useState<AnalyserNode | null>(null);
  const [processedAudioBuffer, setProcessedAudioBuffer] = useState<AudioBuffer | null>(null);

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

  const updateEffect = useCallback((key: keyof AdvancedAudioEffects, value: number | boolean) => {
    setEffects(prev => ({ ...prev, [key]: value }));
  }, []);

  // Debounced effect update to prevent audio cracking during slider dragging
  const effectUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const debouncedUpdateEffect = useCallback((key: keyof AdvancedAudioEffects, value: number | boolean) => {
    // Clear any existing timeout
    if (effectUpdateTimeoutRef.current) {
      clearTimeout(effectUpdateTimeoutRef.current);
    }
    
    // Set a new timeout for the update
    effectUpdateTimeoutRef.current = setTimeout(() => {
      updateEffect(key, value);
    }, 100); // 100ms debounce for smooth slider interaction
  }, [updateEffect]);

  const handleEffectsChange = useCallback((newEffects: AudioEffects | AdvancedAudioEffects) => {
    setEffects(newEffects as AdvancedAudioEffects);
  }, []);

  return (
    <div className="min-h-screen animated-bg p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        {showTitle && (
          <div className="mb-8 text-center">
            <h1 className="text-4xl font-bold text-foreground mb-2 bg-gradient-highlight bg-clip-text text-transparent">
              Advanced Studio
            </h1>
            <p className="text-sm text-muted-foreground opacity-50">
              experimental, not stable
            </p>
          </div>
        )}

        {/* Navigation - Always Visible */}
        <div className="mb-6 text-center">
          <Link to="/">
            <Button variant="outline" size="sm" className="rounded-sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Basic Studio
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

            {/* Modern EQ */}
            <Card className="rounded-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Modern EQ
                </CardTitle>
                <CardDescription>5-band parametric equalizer with real-time processing</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <Label className="text-xs font-medium">Low (60Hz)</Label>
                      <span className="text-xs text-muted-foreground">
                        {((effects.eqLow || 0.5) - 0.5) * 40 > 0 ? '+' : ''}{((effects.eqLow || 0.5) - 0.5) * 40}dB
                      </span>
                    </div>
                    <Slider
                      value={[effects.eqLow || 0.5]}
                      onValueChange={([value]) => debouncedUpdateEffect('eqLow', value)}
                      max={1}
                      min={0}
                      step={0.01}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>-20dB</span>
                      <span>0dB</span>
                      <span>+20dB</span>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <Label className="text-xs font-medium">Low-Mid (250Hz)</Label>
                      <span className="text-xs text-muted-foreground">
                        {((effects.eqLowMid || 0.5) - 0.5) * 40 > 0 ? '+' : ''}{((effects.eqLowMid || 0.5) - 0.5) * 40}dB
                      </span>
                    </div>
                    <Slider
                      value={[effects.eqLowMid || 0.5]}
                      onValueChange={([value]) => debouncedUpdateEffect('eqLowMid', value)}
                      max={1}
                      min={0}
                      step={0.01}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>-20dB</span>
                      <span>0dB</span>
                      <span>+20dB</span>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <Label className="text-xs font-medium">Mid (1kHz)</Label>
                      <span className="text-xs text-muted-foreground">
                        {((effects.eqMid || 0.5) - 0.5) * 40 > 0 ? '+' : ''}{((effects.eqMid || 0.5) - 0.5) * 40}dB
                      </span>
                    </div>
                    <Slider
                      value={[effects.eqMid || 0.5]}
                      onValueChange={([value]) => debouncedUpdateEffect('eqMid', value)}
                      max={1}
                      min={0}
                      step={0.01}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>-20dB</span>
                      <span>0dB</span>
                      <span>+20dB</span>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <Label className="text-xs font-medium">High-Mid (4kHz)</Label>
                      <span className="text-xs text-muted-foreground">
                        {((effects.eqHighMid || 0.5) - 0.5) * 40 > 0 ? '+' : ''}{((effects.eqHighMid || 0.5) - 0.5) * 40}dB
                      </span>
                    </div>
                    <Slider
                      value={[effects.eqHighMid || 0.5]}
                      onValueChange={([value]) => debouncedUpdateEffect('eqHighMid', value)}
                      max={1}
                      min={0}
                      step={0.01}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>-20dB</span>
                      <span>0dB</span>
                      <span>+20dB</span>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <Label className="text-xs font-medium">High (16kHz)</Label>
                      <span className="text-xs text-muted-foreground">
                        {((effects.eqHigh || 0.5) - 0.5) * 40 > 0 ? '+' : ''}{((effects.eqHigh || 0.5) - 0.5) * 40}dB
                      </span>
                    </div>
                    <Slider
                      value={[effects.eqHigh || 0.5]}
                      onValueChange={([value]) => debouncedUpdateEffect('eqHigh', value)}
                      max={1}
                      min={0}
                      step={0.01}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>-20dB</span>
                      <span>0dB</span>
                      <span>+20dB</span>
                    </div>
                  </div>
                  
                  {/* EQ Reset Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      updateEffect('eqLow', 0.5);
                      updateEffect('eqLowMid', 0.5);
                      updateEffect('eqMid', 0.5);
                      updateEffect('eqHighMid', 0.5);
                      updateEffect('eqHigh', 0.5);
                    }}
                    className="w-full mt-2"
                  >
                    Reset EQ
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Nightcore */}
            <Card className="rounded-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  Nightcore
                </CardTitle>
                <CardDescription>Speed and pitch manipulation</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs">Speed Multiplier</Label>
                    <Slider
                      value={[effects.nightcore || 1.0]}
                      onValueChange={([value]) => debouncedUpdateEffect('nightcore', value)}
                      max={2}
                      min={0.5}
                      step={0.01}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Pitch Shift (semitones)</Label>
                    <Slider
                      value={[effects.pitchShift || 0]}
                      onValueChange={([value]) => debouncedUpdateEffect('pitchShift', value)}
                      max={12}
                      min={-12}
                      step={1}
                      className="w-full"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Pitcher */}
            <Card className="rounded-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mic className="h-4 w-4" />
                  Pitcher
                </CardTitle>
                <CardDescription>Advanced pitch and formant control</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs">Pitch Correction</Label>
                    <Slider
                      value={[effects.pitcher || 0]}
                      onValueChange={([value]) => debouncedUpdateEffect('pitcher', value)}
                      max={1}
                      min={0}
                      step={0.01}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Formant Shift</Label>
                    <Slider
                      value={[effects.formantShift || 0]}
                      onValueChange={([value]) => debouncedUpdateEffect('formantShift', value)}
                      max={1}
                      min={0}
                      step={0.01}
                      className="w-full"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Vocal Extractor */}
            <Card className="rounded-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mic className="h-4 w-4" />
                  Vocal Extractor
                </CardTitle>
                <CardDescription>Separate vocals from instrumental</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="vocal-extractor"
                    checked={effects.vocalExtractor || false}
                    onCheckedChange={(checked) => debouncedUpdateEffect('vocalExtractor', checked)}
                  />
                  <Label htmlFor="vocal-extractor">Enable Vocal Extraction</Label>
                </div>
                {effects.vocalExtractor && (
                  <div className="space-y-3">
                    <div>
                      <Label className="text-xs">Vocal Sensitivity</Label>
                      <Slider
                        value={[effects.vocalSensitivity || 0.5]}
                        onValueChange={([value]) => debouncedUpdateEffect('vocalSensitivity', value)}
                        max={1}
                        min={0}
                        step={0.01}
                        className="w-full"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Instrumental Separation</Label>
                      <Slider
                        value={[effects.instrumentalSeparation || 0.5]}
                        onValueChange={([value]) => debouncedUpdateEffect('instrumentalSeparation', value)}
                        max={1}
                        min={0}
                        step={0.01}
                        className="w-full"
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Audio Processing Controls */}
            <Card className="rounded-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Audio Processing
                </CardTitle>
                <CardDescription>Master controls for audio processing chain</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="audio-processing"
                    checked={effects.audioProcessingEnabled || true}
                    onCheckedChange={(checked) => debouncedUpdateEffect('audioProcessingEnabled', checked)}
                  />
                  <Label htmlFor="audio-processing">Enable Audio Processing</Label>
                </div>
                
                {effects.audioProcessingEnabled && (
                  <div className="space-y-4">
                    {/* Limiter */}
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="limiter"
                          checked={effects.limiter || false}
                          onCheckedChange={(checked) => debouncedUpdateEffect('limiter', checked)}
                        />
                        <Label htmlFor="limiter">Limiter</Label>
                      </div>
                      
                      {effects.limiter && (
                        <div className="space-y-3 pl-6">
                          <div>
                            <div className="flex justify-between items-center mb-2">
                              <Label className="text-xs font-medium">Threshold</Label>
                              <span className="text-xs text-muted-foreground">
                                {(effects.limiterThreshold || -1).toFixed(1)}dB
                              </span>
                            </div>
                            <Slider
                              value={[effects.limiterThreshold || -1]}
                              onValueChange={([value]) => debouncedUpdateEffect('limiterThreshold', value)}
                              max={0}
                              min={-60}
                              step={0.01}
                              className="w-full"
                            />
                            <div className="flex justify-between text-xs text-muted-foreground mt-1">
                              <span>-60dB</span>
                              <span>0dB</span>
                            </div>
                          </div>
                          
                          <div>
                            <div className="flex justify-between items-center mb-2">
                              <Label className="text-xs font-medium">Release</Label>
                              <span className="text-xs text-muted-foreground">
                                {((effects.limiterRelease || 0.1) * 1000).toFixed(1)}ms
                              </span>
                            </div>
                            <Slider
                              value={[effects.limiterRelease || 0.1]}
                              onValueChange={([value]) => debouncedUpdateEffect('limiterRelease', value)}
                              max={1}
                              min={0.01}
                              step={0.005}
                              className="w-full"
                            />
                            <div className="flex justify-between text-xs text-muted-foreground mt-1">
                              <span>10ms</span>
                              <span>1000ms</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Attenuator */}
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="attenuator"
                          checked={effects.attenuator || false}
                          onCheckedChange={(checked) => debouncedUpdateEffect('attenuator', checked)}
                        />
                        <Label htmlFor="attenuator">Attenuator</Label>
                      </div>
                      
                      {effects.attenuator && (
                        <div className="space-y-3 pl-6">
                          <div>
                            <div className="flex justify-between items-center mb-2">
                              <Label className="text-xs font-medium">Gain</Label>
                              <span className="text-xs text-muted-foreground">
                                {(effects.attenuatorGain || 10).toFixed(1)}dB
                              </span>
                            </div>
                            <Slider
                              value={[effects.attenuatorGain || 10]}
                              onValueChange={([value]) => debouncedUpdateEffect('attenuatorGain', value)}
                              max={20}
                              min={0}
                              step={0.01}
                              className="w-full"
                            />
                            <div className="flex justify-between text-xs text-muted-foreground mt-1">
                              <span>0dB</span>
                              <span>20dB</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Visualization Panel */}
          <div className="lg:col-span-2">
            <Card className="rounded-sm">
              <CardHeader>
                <CardTitle>Audio Visualization</CardTitle>
                <CardDescription>Real-time frequency and waveform analysis</CardDescription>
              </CardHeader>
              <CardContent>
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
                      <Music className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Import an audio file to see visualization</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Audio File Info */}
            {audioFile && (
              <Card className="rounded-sm mt-4">
                <CardContent className="pt-6">
                  <div className="text-sm text-muted-foreground">
                    <p><strong>File:</strong> {audioFile.name}</p>
                    <p><strong>Size:</strong> {(audioFile.size / 1024 / 1024).toFixed(2)} MB</p>
                    <p><strong>Duration:</strong> {duration ? `${Math.floor(duration / 60)}:${(duration % 60).toFixed(0).padStart(2, '0')}` : '--:--'}</p>
                    <p><strong>Current Time:</strong> {currentTime ? `${Math.floor(currentTime / 60)}:${(currentTime % 60).toFixed(0).padStart(2, '0')}` : '--:--'}</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center">
          <a 
            href="https://github.com/copiuum" 
            target="_blank" 
            rel="noopener noreferrer"
            className="footer-glow inline-block px-6 py-3 text-muted-foreground hover:text-foreground transition-colors rounded-sm"
          >
            project by copiuum - contact me
          </a>
        </div>
      </div>
    </div>
  );
};

// Helper function for MP3 conversion (placeholder)
const audioBufferToMp3 = (audioBuffer: AudioBuffer): Blob => {
  // This would need to be implemented with a proper MP3 encoder
  // For now, return a placeholder blob
  return new Blob(['placeholder'], { type: 'audio/mp3' });
};

export default AdvancedStudio;
