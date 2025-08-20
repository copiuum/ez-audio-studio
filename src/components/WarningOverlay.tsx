import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { X, Info } from 'lucide-react';

interface WarningOverlayProps {
  onDismiss?: () => void;
}

export const WarningOverlay: React.FC<WarningOverlayProps> = ({ onDismiss }) => {
  const [isVisible, setIsVisible] = useState(true);

  const handleDismiss = () => {
    setIsVisible(false);
    onDismiss?.();
  };

  // Handle ESC key dismissal
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handleDismiss();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Auto-dismiss after 15 seconds (increased from 10)
  useEffect(() => {
    const timer = setTimeout(() => {
      handleDismiss();
    }, 15000);

    return () => clearTimeout(timer);
  }, []);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop with light blur */}
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" />
      
      {/* Warning card */}
      <div className="relative bg-background/95 backdrop-blur-md border border-border/50 rounded-lg shadow-2xl max-w-md mx-4 p-6 animate-in fade-in-0 zoom-in-95 duration-300">
        {/* Close button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDismiss}
          className="absolute top-2 right-2 h-8 w-8 p-0 hover:bg-muted/50"
          aria-label="Close warning dialog"
          title="Close (ESC)"
        >
          <X className="h-4 w-4" />
        </Button>

        {/* Warning icon */}
        <div className="flex items-center justify-center mb-4">
          <div className="p-3 bg-amber-500/10 rounded-full">
            <Info className="h-6 w-6 text-amber-500" />
          </div>
        </div>

        {/* Warning content */}
        <div className="text-center space-y-4">
          <h3 className="text-lg font-semibold text-foreground">
            AI-Powered Audio Studio
          </h3>
          
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>
              This application has been built with{' '}
              <span className="font-medium text-foreground">Lovable</span> and{' '}
              <span className="font-medium text-foreground">Cursor AI</span>
            </p>
            
            <div className="bg-muted/50 rounded-md p-3">
              <p className="text-xs leading-relaxed">
                <strong className="text-foreground">Disclaimer:</strong> This app is designed for{' '}
                <span className="font-medium text-foreground">local audio processing only</span>. 
                All audio files are processed entirely within your browser and are not uploaded to any external servers.
              </p>
            </div>
          </div>

          {/* Dismiss button */}
          <Button
            onClick={handleDismiss}
            className="w-full mt-4"
            variant="outline"
            aria-label="Acknowledge warning and close dialog"
          >
            Got it
          </Button>
        </div>
      </div>
    </div>
  );
};
