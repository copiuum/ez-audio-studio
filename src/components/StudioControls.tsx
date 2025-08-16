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
          description: "Please select a file smaller than 50MB",
          variant: "destructive",
        });
        return;
      }

      // Validate file type
      const validTypes = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/aac', 'audio/flac'];
      if (!validTypes.includes(file.type) && !file.name.match(/\.(mp3|wav|ogg|m4a|aac|flac)$/i)) {
        toast({
          title: "Unsupported file type",
          description: "Please select an audio file (MP3, WAV, OGG, M4A, AAC, FLAC)",
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
          />
          <Button 
            variant="studio" 
            onClick={handleImportClick}
            disabled={isProcessing}
            className="flex-1 cursor-pointer"
            size="sm"
          >
            {isProcessing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
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
            <span className="text-sm text-muted-foreground">
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
          />
        </div>
      )}

      {/* Audio Effects */}
      <div className="space-y-5">
          {/* Reverb Control */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Music className="w-4 h-4 text-muted-foreground" />
                <label className="text-sm font-medium text-foreground">Reverb</label>
              </div>
              <span className="text-sm text-muted-foreground">{Math.round(effects.reverb * 100)}%</span>
            </div>
            <Slider
              key={`reverb-${effects.reverb}`}
              value={[effects.reverb]}
              onValueChange={([value]) => updateEffect('reverb', value)}
              max={1}
              min={0}
              step={0.01}
              className="w-full"
            />
          </div>

          {/* Bass Boost Control */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-muted-foreground" />
                <label className="text-sm font-medium text-foreground">Bass Boost</label>
              </div>
              <span className="text-sm text-muted-foreground">{Math.round(effects.bassBoost * 100)}%</span>
            </div>
            <Slider
              key={`bassBoost-${effects.bassBoost}`}
              value={[effects.bassBoost]}
              onValueChange={([value]) => updateEffect('bassBoost', value)}
              max={1}
              min={0}
              step={0.01}
              className="w-full"
            />
          </div>

          {/* Tempo Control */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Music className="w-4 h-4 text-muted-foreground" />
                <label className="text-sm font-medium text-foreground">Tempo</label>
              </div>
              <span className="text-sm text-muted-foreground">{Math.round(effects.tempo * 100)}%</span>
            </div>
            <Slider
              key={`tempo-${effects.tempo}`}
              value={[effects.tempo]}
              onValueChange={([value]) => updateEffect('tempo', value)}
              max={2}
              min={0.25}
              step={0.01}
              className="w-full"
            />
          </div>

          {/* Volume Control */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-muted-foreground" />
                <label className="text-sm font-medium text-foreground">Volume</label>
              </div>
              <span className="text-sm text-muted-foreground">{Math.round(effects.volume * 100)}%</span>
            </div>
            <Slider
              key={`volume-${effects.volume}`}
              value={[effects.volume]}
              onValueChange={([value]) => updateEffect('volume', value)}
              max={1}
              min={0}
              step={0.01}
              className="w-full"
            />
          </div>
        </div>
    </div>
  );
};