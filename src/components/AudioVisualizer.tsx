import React, { useRef, useEffect, useCallback, useMemo } from 'react';

interface AudioVisualizerProps {
  analyserNode: AnalyserNode | null;
  width?: number;
  height?: number;
  className?: string;
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  analyserNode,
  width = 600,
  height = 200,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationIdRef = useRef<number>();
  const lastFrameTimeRef = useRef<number>(0);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const timeDataArrayRef = useRef<Uint8Array | null>(null);

  // Memoize canvas dimensions for better performance
  const canvasDimensions = useMemo(() => ({
    width,
    height,
    barWidth: (width / 256) * 2.5, // Optimized for 256 frequency bins
    sliceWidth: width / 256,
  }), [width, height]);

  // Pre-create gradients for better performance
  const gradients = useMemo(() => {
    if (!canvasRef.current) return null;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const freqGradient = ctx.createLinearGradient(0, height, 0, 0);
    freqGradient.addColorStop(0, 'hsl(220, 60%, 40%)');   // Blue
    freqGradient.addColorStop(0.3, 'hsl(280, 60%, 50%)'); // Purple
    freqGradient.addColorStop(0.6, 'hsl(320, 60%, 60%)'); // Pink
    freqGradient.addColorStop(1, 'hsl(0, 60%, 70%)');     // Red

    const waveformGradient = ctx.createLinearGradient(0, 0, width, 0);
    waveformGradient.addColorStop(0, 'hsl(220, 80%, 60%)');
    waveformGradient.addColorStop(0.5, 'hsl(280, 80%, 70%)');
    waveformGradient.addColorStop(1, 'hsl(320, 80%, 60%)');

    return { freqGradient, waveformGradient };
  }, [width, height]);

  const draw = useCallback((currentTime?: number) => {
    if (!analyserNode || !canvasRef.current || !gradients) return;

    // Optimized frame rate limiting (60fps max, 30fps min)
    if (currentTime && currentTime - lastFrameTimeRef.current < 16.67) {
      animationIdRef.current = requestAnimationFrame(draw);
      return;
    }
    lastFrameTimeRef.current = currentTime || performance.now();

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Initialize data arrays only once
    if (!dataArrayRef.current) {
      dataArrayRef.current = new Uint8Array(analyserNode.frequencyBinCount);
    }
    if (!timeDataArrayRef.current) {
      timeDataArrayRef.current = new Uint8Array(analyserNode.frequencyBinCount);
    }

    const dataArray = dataArrayRef.current;
    const timeDataArray = timeDataArrayRef.current;
    
    // Get frequency data
    analyserNode.getByteFrequencyData(dataArray);
    analyserNode.getByteTimeDomainData(timeDataArray);

    // Clear canvas with gradient background
    const bgGradient = ctx.createLinearGradient(0, 0, 0, height);
    bgGradient.addColorStop(0, 'hsl(220, 15%, 10%)');
    bgGradient.addColorStop(1, 'hsl(220, 15%, 5%)');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, height);

    // Draw frequency spectrum with enhanced visualization
    const { barWidth } = canvasDimensions;
    let x = 0;

    // Draw frequency bars with glow effect
    for (let i = 0; i < dataArray.length; i += 2) { // Skip every other bin for performance
      const barHeight = (dataArray[i] / 255) * height * 0.7;
      
      if (barHeight > 2) { // Only draw visible bars
        // Draw glow
        ctx.shadowColor = `hsl(${280 + (i / dataArray.length) * 40}, 60%, 60%)`;
        ctx.shadowBlur = 8;
        ctx.fillStyle = gradients.freqGradient;
        ctx.fillRect(x, height - barHeight, barWidth, barHeight);
        
        // Reset shadow
        ctx.shadowBlur = 0;
      }

      x += barWidth + 1;
    }

    // Draw waveform with enhanced styling
    ctx.lineWidth = 3;
    ctx.strokeStyle = gradients.waveformGradient;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();

    const { sliceWidth } = canvasDimensions;
    x = 0;

    for (let i = 0; i < timeDataArray.length; i += 2) { // Skip every other sample for performance
      const v = timeDataArray[i] / 128.0;
      const y = (v * height * 0.3) / 2 + height / 2;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }

      x += sliceWidth;
    }

    ctx.stroke();

    // Draw center line
    ctx.strokeStyle = 'hsl(220, 20%, 30%)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();

    animationIdRef.current = requestAnimationFrame(draw);
  }, [analyserNode, canvasDimensions, gradients]);

  useEffect(() => {
    if (analyserNode) {
      draw();
    }

    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
    };
  }, [analyserNode, draw]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className={`rounded-sm border border-border bg-gradient-panel shadow-lg ${className}`}
    />
  );
};