import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Settings, Info } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';


interface SettingsButtonProps {
  onShowWarning: () => void;
}

export const SettingsButton: React.FC<SettingsButtonProps> = ({ onShowWarning }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="fixed top-4 right-4 h-10 w-10 p-0 rounded-full bg-background/80 backdrop-blur-sm border border-border/50 hover:bg-background/90"
          aria-label="Open settings"
        >
          <Settings className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Configure your EZ Audio Studio preferences
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">


          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              <Info className="h-5 w-5 text-muted-foreground" />
              <div>
                <h4 className="font-medium">About this app</h4>
                <p className="text-sm text-muted-foreground">
                  View AI disclosure and privacy information
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                onShowWarning();
                setIsOpen(false);
              }}
            >
              Show
            </Button>
          </div>
          
          <div className="text-xs text-muted-foreground space-y-2">
            <p><strong>Supported formats:</strong> MP3, WAV, OGG, M4A, AAC, FLAC</p>
            <p><strong>File size limit:</strong> 50MB maximum</p>
            <p><strong>Export quality:</strong> MP3 at 320 kbps</p>

          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

