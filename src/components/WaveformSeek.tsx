import React, { useRef, useEffect, useCallback, useMemo } from 'react';

interface WaveformSeekProps {
  audioBuffer: AudioBuffer | null;
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
  width?: number;
  height?: number;
  className?: string;
}

export const WaveformSeek: React.FC<WaveformSeekProps> = ({
  audioBuffer,
  currentTime,
  duration,
  onSeek,
  width = 800,
  height = 120,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDraggingRef = useRef(false);
  const waveformDataRef = useRef<number[]>([]);

  // Generate waveform data from audio buffer
  const generateWaveformData = useCallback((buffer: AudioBuffer): number[] => {
    const channelData = buffer.getChannelData(0); // Use first channel
    const samplesPerPixel = Math.floor(channelData.length / width);
    const waveform: number[] = [];

    for (let i = 0; i < width; i++) {
      const start = i * samplesPerPixel;
      const end = Math.min(start + samplesPerPixel, channelData.length);
      let sum = 0;
      let count = 0;

      for (let j = start; j < end; j++) {
        sum += Math.abs(channelData[j]);
        count++;
      }

      waveform.push(count > 0 ? sum / count : 0);
    }

    return waveform;
  }, [width]);

  // Generate waveform data when audio buffer changes
  useEffect(() => {
    if (audioBuffer) {
      waveformDataRef.current = generateWaveformData(audioBuffer);
    }
  }, [audioBuffer, generateWaveformData]);

  // Draw waveform
  const drawWaveform = useCallback(() => {
    if (!canvasRef.current || !audioBuffer) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Create gradient background
    const bgGradient = ctx.createLinearGradient(0, 0, 0, height);
    bgGradient.addColorStop(0, 'hsl(220, 15%, 12%)');
    bgGradient.addColorStop(1, 'hsl(220, 10%, 8%)');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, height);

    if (waveformDataRef.current.length === 0) return;

    // Calculate current position
    const currentPosition = (currentTime / duration) * width;

    // Draw waveform
    const centerY = height / 2;
    const maxAmplitude = Math.max(...waveformDataRef.current);
    const scale = (height * 0.4) / (maxAmplitude || 1);

    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Draw waveform bars
    for (let i = 0; i < waveformDataRef.current.length; i++) {
      const amplitude = waveformDataRef.current[i] * scale;
      const x = i;
      const y1 = centerY - amplitude;
      const y2 = centerY + amplitude;

      // Color based on position relative to current time
      if (i < currentPosition) {
        // Played portion - gradient from blue to purple
        const progress = i / currentPosition;
        ctx.strokeStyle = `hsl(${220 + progress * 60}, 60%, ${50 + progress * 20}%)`;
      } else {
        // Unplayed portion - muted gray
        ctx.strokeStyle = 'hsl(220, 10%, 30%)';
      }

      ctx.beginPath();
      ctx.moveTo(x, y1);
      ctx.lineTo(x, y2);
      ctx.stroke();
    }

    // Draw playhead
    if (duration > 0) {
      ctx.strokeStyle = 'hsl(0, 60%, 70%)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(currentPosition, 0);
      ctx.lineTo(currentPosition, height);
      ctx.stroke();

      // Playhead glow
      ctx.shadowColor = 'hsl(0, 60%, 70%)';
      ctx.shadowBlur = 8;
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // Draw center line
    ctx.strokeStyle = 'hsl(220, 20%, 20%)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, centerY);
    ctx.lineTo(width, centerY);
    ctx.stroke();
  }, [audioBuffer, currentTime, duration, width, height]);

  // Handle mouse/touch events for seeking
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    isDraggingRef.current = true;
    handlePointerMove(e);
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDraggingRef.current || !canvasRef.current || !duration) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, x / width));
    const newTime = percentage * duration;
    
    onSeek(newTime);
  }, [duration, width, onSeek]);

  const handlePointerUp = useCallback(() => {
    isDraggingRef.current = false;
  }, []);

  // Draw waveform when data changes
  useEffect(() => {
    drawWaveform();
  }, [drawWaveform]);

  // Add global pointer event listeners
  useEffect(() => {
    const handleGlobalPointerMove = (e: PointerEvent) => {
      if (isDraggingRef.current && canvasRef.current && duration) {
        const rect = canvasRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const percentage = Math.max(0, Math.min(1, x / width));
        const newTime = percentage * duration;
        onSeek(newTime);
      }
    };

    const handleGlobalPointerUp = () => {
      isDraggingRef.current = false;
    };

    document.addEventListener('pointermove', handleGlobalPointerMove);
    document.addEventListener('pointerup', handleGlobalPointerUp);

    return () => {
      document.removeEventListener('pointermove', handleGlobalPointerMove);
      document.removeEventListener('pointerup', handleGlobalPointerUp);
    };
  }, [duration, width, onSeek]);

  if (!audioBuffer) {
    return (
      <div className={`h-32 flex items-center justify-center bg-gradient-panel rounded-sm border border-border ${className}`}>
        <div className="text-center text-muted-foreground">
          <p>Import an audio file to see waveform</p>
        </div>
      </div>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className={`rounded-sm border border-border cursor-pointer ${className}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      style={{ touchAction: 'none' }}
    />
  );
};
