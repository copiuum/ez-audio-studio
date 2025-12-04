import React, { useRef, useEffect, useCallback, useMemo } from 'react';
import { optimizeCanvasForOpenGL } from '@/lib/opengl-optimizations';

export interface AudioSelection {
  startTime: number;
  endTime: number;
}

interface WaveformSeekProps {
  audioBuffer: AudioBuffer | null;
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
  selection?: AudioSelection | null;
  onSelectionChange?: (selection: AudioSelection | null) => void;
  width?: number;
  height?: number;
  className?: string;
}

export const WaveformSeek: React.FC<WaveformSeekProps> = ({
  audioBuffer,
  currentTime,
  duration,
  onSeek,
  selection,
  onSelectionChange,
  width = 800,
  height = 120,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDraggingRef = useRef(false);
  const isSelectingRef = useRef(false);
  const selectionStartRef = useRef<number>(0);
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

    // Calculate current position and selection bounds
    const currentPosition = (currentTime / duration) * width;
    const selectionStart = selection ? (selection.startTime / duration) * width : -1;
    const selectionEnd = selection ? (selection.endTime / duration) * width : -1;

    // Draw selection background first (behind waveform)
    if (selection && selectionStart >= 0 && selectionEnd >= 0) {
      const selStart = Math.min(selectionStart, selectionEnd);
      const selEnd = Math.max(selectionStart, selectionEnd);
      
      // Selection background
      ctx.fillStyle = 'hsla(45, 80%, 60%, 0.2)'; // Semi-transparent yellow
      ctx.fillRect(selStart, 0, selEnd - selStart, height);
      
      // Selection border
      ctx.strokeStyle = 'hsl(45, 80%, 60%)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 2]);
      ctx.strokeRect(selStart, 0, selEnd - selStart, height);
      ctx.setLineDash([]); // Reset line dash
    }

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

      // Determine color based on selection and playback state
      let strokeStyle = 'hsl(220, 10%, 30%)'; // Default unplayed color
      
      if (selection && i >= Math.min(selectionStart, selectionEnd) && i <= Math.max(selectionStart, selectionEnd)) {
        // Selected portion - bright yellow/orange
        strokeStyle = 'hsl(45, 80%, 70%)';
      } else if (i < currentPosition) {
        // Played portion - gradient from blue to purple
        const progress = i / currentPosition;
        strokeStyle = `hsl(${220 + progress * 60}, 60%, ${50 + progress * 20}%)`;
      }
      
      ctx.strokeStyle = strokeStyle;
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
  }, [audioBuffer, currentTime, duration, selection, width, height]);

  // Utility function to convert mouse position to time
  const getTimeFromPosition = useCallback((clientX: number): number => {
    if (!canvasRef.current || !duration) return 0;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const canvasX = clientX - rect.left;
    const scaleX = width / rect.width;
    const actualX = canvasX * scaleX;
    const clampedX = Math.max(0, Math.min(width, actualX));
    const percentage = clampedX / width;
    return percentage * duration;
  }, [duration, width]);

  // Handle mouse/touch events for seeking and selection
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (!canvasRef.current || !duration) return;
    
    const time = getTimeFromPosition(e.clientX);
    
    // Check if Shift key is held for selection
    if (e.shiftKey && onSelectionChange) {
      // Start selection mode
      isSelectingRef.current = true;
      selectionStartRef.current = time;
      
      // If there's an existing selection, extend it
      if (selection) {
        const distToStart = Math.abs(time - selection.startTime);
        const distToEnd = Math.abs(time - selection.endTime);
        
        if (distToStart < distToEnd) {
          // Closer to start, extend from end
          selectionStartRef.current = selection.endTime;
        } else {
          // Closer to end, extend from start
          selectionStartRef.current = selection.startTime;
        }
      }
    } else {
      // Normal seeking mode
      isDraggingRef.current = true;
      onSeek(time);
    }
  }, [duration, getTimeFromPosition, onSeek, onSelectionChange, selection]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!canvasRef.current || !duration) return;
    
    const time = getTimeFromPosition(e.clientX);
    
    if (isSelectingRef.current && onSelectionChange) {
      // Update selection
      const startTime = Math.min(selectionStartRef.current, time);
      const endTime = Math.max(selectionStartRef.current, time);
      onSelectionChange({ startTime, endTime });
    } else if (isDraggingRef.current) {
      // Update seek position
      onSeek(time);
    }
  }, [duration, getTimeFromPosition, onSeek, onSelectionChange]);

  const handlePointerUp = useCallback(() => {
    isDraggingRef.current = false;
    isSelectingRef.current = false;
  }, []);

  // Handle click for immediate seeking (only if not dragging)
  const handleClick = useCallback((e: React.MouseEvent) => {
    // Click is handled by pointer events, this is just for accessibility
  }, []);

  // Handle double-click to select all
  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    if (!duration || !onSelectionChange) return;
    
    e.preventDefault();
    onSelectionChange({ startTime: 0, endTime: duration });
  }, [duration, onSelectionChange]);

  // Handle keyboard navigation and selection
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!duration) return;

    const step = duration / 100; // 1% of duration

    // Selection shortcuts
    if (e.ctrlKey || e.metaKey) {
      switch (e.key.toLowerCase()) {
        case 'a':
          e.preventDefault();
          if (onSelectionChange) {
            onSelectionChange({ startTime: 0, endTime: duration });
          }
          return;
        default:
          break;
      }
    }

    // Clear selection on Escape
    if (e.key === 'Escape') {
      e.preventDefault();
      if (onSelectionChange) {
        onSelectionChange(null);
      }
      return;
    }

    // Navigation shortcuts
    let newTime = currentTime;
    switch (e.key) {
      case 'ArrowLeft':
        e.preventDefault();
        newTime = Math.max(0, currentTime - step);
        break;
      case 'ArrowRight':
        e.preventDefault();
        newTime = Math.min(duration, currentTime + step);
        break;
      case 'Home':
        e.preventDefault();
        newTime = 0;
        break;
      case 'End':
        e.preventDefault();
        newTime = duration;
        break;
      case 'PageUp':
        e.preventDefault();
        newTime = Math.max(0, currentTime - step * 10);
        break;
      case 'PageDown':
        e.preventDefault();
        newTime = Math.min(duration, currentTime + step * 10);
        break;
      default:
        return;
    }

    onSeek(newTime);
  }, [currentTime, duration, onSeek, onSelectionChange]);

  // Draw waveform when data changes
  useEffect(() => {
    drawWaveform();
  }, [drawWaveform]);

  // Optimize canvas for OpenGL when component mounts
  useEffect(() => {
    if (canvasRef.current) {
      optimizeCanvasForOpenGL(canvasRef.current);
    }
  }, []);

  // Add global pointer event listeners for dragging outside canvas
  useEffect(() => {
    const handleGlobalPointerMove = (e: PointerEvent) => {
      if (!canvasRef.current || !duration) return;
      
      const time = getTimeFromPosition(e.clientX);
      
      if (isSelectingRef.current && onSelectionChange) {
        // Update selection
        const startTime = Math.min(selectionStartRef.current, time);
        const endTime = Math.max(selectionStartRef.current, time);
        onSelectionChange({ startTime, endTime });
      } else if (isDraggingRef.current) {
        // Update seek position
        onSeek(time);
      }
    };

    const handleGlobalPointerUp = () => {
      isDraggingRef.current = false;
      isSelectingRef.current = false;
    };

    document.addEventListener('pointermove', handleGlobalPointerMove);
    document.addEventListener('pointerup', handleGlobalPointerUp);

    return () => {
      document.removeEventListener('pointermove', handleGlobalPointerMove);
      document.removeEventListener('pointerup', handleGlobalPointerUp);
    };
  }, [duration, width, onSeek, onSelectionChange, getTimeFromPosition]);

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
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onKeyDown={handleKeyDown}
      style={{ touchAction: 'none' }}
      role="slider"
      aria-label="Audio seek and selection control"
      aria-valuemin={0}
      aria-valuemax={duration}
      aria-valuenow={currentTime}
      tabIndex={0}
    />
  );
};
