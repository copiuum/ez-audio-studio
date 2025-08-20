import React from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Card } from '@/components/ui/card';
import { Play, Pause, Square, Upload, Download, Volume2, Music, Zap } from 'lucide-react';
import { AudioEffects, AdvancedAudioEffects } from './AudioProcessor';
import { WaveformSeek } from './WaveformSeek';
import { toast } from '@/hooks/use-toast';

interface StudioControlsProps {
  effects: AudioEffects | AdvancedAudioEffects;
  onEffectsChange: (effects: AudioEffects | AdvancedAudioEffects) => void;
  onFileImport: (file: File) => void;
  onExport: () => void;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  onSeek: (time: number) => void;
  isPlaying: boolean;
  hasAudio: boolean;
  currentTime: number;
  duration: number;
  audioBuffer?: AudioBuffer | null;
  isProcessing?: boolean;
}

export const StudioControls: React.FC<StudioControlsProps> = ({
  effects,
  onEffectsChange,
  onFileImport,
  onExport,
  onPlay,
  onPause,
  onStop,
  onSeek,
  isPlaying,
  hasAudio,
  currentTime,
  duration,
  audioBuffer,
  isProcessing = false,
}) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file size (50MB limit)
      const maxSize = 50 * 1024 * 1024; // 50MB
      if (file.size > maxSize) {
        toast({
          title: "File too large",
          description: "Please select a file smaller than 50MB. Supported formats: MP3, WAV, OGG, M4A, AAC, FLAC",
          variant: "destructive",
        });
        return;
      }

      // Validate file type
      const validTypes = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/aac', 'audio/flac'];
      if (!validTypes.includes(file.type) && !file.name.match(/\.(mp3|wav|ogg|m4a|aac|flac)$/i)) {
        toast({
          title: "Unsupported file type",
          description: "Please select an audio file. Supported formats: MP3, WAV, OGG, M4A, AAC, FLAC",
          variant: "destructive",
        });
        return;
      }

      onFileImport(file);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const updateEffect = (key: keyof AudioEffects | keyof AdvancedAudioEffects, value: number) => {
    onEffectsChange({
      ...effects,
      [key]: value,
    });
  };



  return (
    <div className="space-y-6">
      {/* File Controls */}
      <div className="flex justify-center">
        <div className="flex gap-3 w-full max-w-xs">
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            onChange={handleFileChange}
            className="hidden"
            aria-label="Select audio file to import"
          />
          <Button 
            variant="studio" 
            onClick={handleImportClick}
            disabled={isProcessing}
            className="flex-1 cursor-pointer"
            size="sm"
            aria-label={isProcessing ? "Processing audio file" : "Import audio file"}
            title="Import audio file (MP3, WAV, OGG, M4A, AAC, FLAC)"
          >
            {isProcessing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" role="status" aria-label="Processing audio file"></div>
                Processing...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Import
              </>
            )}
          </Button>
          <Button 
            variant="studio" 
            onClick={onExport}
            disabled={!hasAudio}
            className="flex-1"
            size="sm"
            aria-label="Export processed audio as MP3"
            title="Export audio (E)"
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Playback Controls */}
      <div className="flex flex-col items-center mb-4">
        <div className="flex gap-2 w-full max-w-xs justify-center">
          <Button
            variant="play"
            onClick={onPlay}
            disabled={!hasAudio || isPlaying}
            size="sm"
            className="flex-1 max-w-[90px]"
            aria-label="Play audio"
            title="Play (Space)"
          >
            <Play className="w-4 h-4 mr-2" />
            Play
          </Button>
          <Button
            variant="control"
            onClick={onPause}
            disabled={!hasAudio || !isPlaying}
            size="sm"
            className="flex-1 max-w-[90px]"
            aria-label="Pause audio"
            title="Pause (Space)"
          >
            <Pause className="w-4 h-4 mr-2" />
            Pause
          </Button>
          <Button
            variant="outline"
            onClick={onStop}
            disabled={!hasAudio}
            size="sm"
            className="flex-1 max-w-[90px]"
            aria-label="Stop audio"
            title="Stop (S)"
          >
            <Square className="w-4 h-4 mr-2" />
            Stop
          </Button>
        </div>
      </div>
      
      {/* Waveform Seek Control */}
      {hasAudio && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">Waveform</span>
            <span className="text-sm text-muted-foreground" aria-live="polite">
              {Math.floor(currentTime / 60)}:{(currentTime % 60).toFixed(0).padStart(2, '0')} / {Math.floor(duration / 60)}:{(duration % 60).toFixed(0).padStart(2, '0')}
            </span>
          </div>
          <WaveformSeek
            audioBuffer={audioBuffer}
            currentTime={currentTime}
            duration={duration}
            onSeek={onSeek}
            width={300}
            height={80}
            className="w-full"
            aria-label="Audio waveform seek control"
            aria-describedby="waveform-time"
          />
          <span id="waveform-time" className="sr-only">
            Current position: {Math.floor(currentTime / 60)}:{(currentTime % 60).toFixed(0).padStart(2, '0')} of {Math.floor(duration / 60)}:{(duration % 60).toFixed(0).padStart(2, '0')}
          </span>
        </div>
      )}

      {/* Audio Effects */}
      <div className="space-y-5">
          {/* Reverb Control */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Music className="w-4 h-4 text-muted-foreground" />
                <label className="text-sm font-medium text-foreground" id="reverb-label">Reverb</label>
              </div>
              <span className="text-sm text-muted-foreground" aria-live="polite">{Math.round(effects.reverb * 100)}%</span>
            </div>
            <Slider
              key={`reverb-${effects.reverb}`}
              value={[effects.reverb]}
              onValueChange={([value]) => updateEffect('reverb', value)}
              max={1}
              min={0}
              step={0.01}
              className="w-full"
              aria-labelledby="reverb-label"
              aria-describedby="reverb-value"
            />
            <span id="reverb-value" className="sr-only">Reverb effect level: {Math.round(effects.reverb * 100)}%</span>
          </div>

          {/* Bass Boost Control */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-muted-foreground" />
                <label className="text-sm font-medium text-foreground" id="bass-boost-label">Bass Boost</label>
              </div>
              <span className="text-sm text-muted-foreground" aria-live="polite">{Math.round(effects.bassBoost * 100)}%</span>
            </div>
            <Slider
              key={`bassBoost-${effects.bassBoost}`}
              value={[effects.bassBoost]}
              onValueChange={([value]) => updateEffect('bassBoost', value)}
              max={1}
              min={0}
              step={0.01}
              className="w-full"
              aria-labelledby="bass-boost-label"
              aria-describedby="bass-boost-value"
            />
            <span id="bass-boost-value" className="sr-only">Bass boost level: {Math.round(effects.bassBoost * 100)}%</span>
          </div>

          {/* Tempo Control */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Music className="w-4 h-4 text-muted-foreground" />
                <label className="text-sm font-medium text-foreground" id="tempo-label">Tempo</label>
              </div>
              <span className="text-sm text-muted-foreground" aria-live="polite">{Math.round(effects.tempo * 100)}%</span>
            </div>
            <Slider
              key={`tempo-${effects.tempo}`}
              value={[effects.tempo]}
              onValueChange={([value]) => updateEffect('tempo', value)}
              max={2}
              min={0.25}
              step={0.01}
              className="w-full"
              aria-labelledby="tempo-label"
              aria-describedby="tempo-value"
            />
            <span id="tempo-value" className="sr-only">Tempo speed: {Math.round(effects.tempo * 100)}%</span>
          </div>

          {/* Volume Control */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-muted-foreground" />
                <label className="text-sm font-medium text-foreground" id="volume-label">Volume</label>
              </div>
              <span className="text-sm text-muted-foreground" aria-live="polite">{Math.round(effects.volume * 100)}%</span>
            </div>
            <Slider
              key={`volume-${effects.volume}`}
              value={[effects.volume]}
              onValueChange={([value]) => updateEffect('volume', value)}
              max={1}
              min={0}
              step={0.01}
              className="w-full"
              aria-labelledby="volume-label"
              aria-describedby="volume-value"
            />
            <span id="volume-value" className="sr-only">Volume level: {Math.round(effects.volume * 100)}%</span>
          </div>
        </div>
    </div>
  );
};