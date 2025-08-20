import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Settings, Info, Shield, Wifi, WifiOff } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { getNetworkSecurityStatus } from '@/lib/network-security';

interface SettingsButtonProps {
  onShowWarning: () => void;
}

export const SettingsButton: React.FC<SettingsButtonProps> = ({ onShowWarning }) => {
  const [isOpen, setIsOpen] = useState(false);
  const networkStatus = getNetworkSecurityStatus();

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="fixed top-4 right-4 h-10 w-10 p-0 rounded-full bg-background/80 backdrop-blur-sm border border-border/50 hover:bg-background/90 button-glass"
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
          {/* Network Security Status */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-green-500" />
              <div>
                <h4 className="font-medium">Network Security</h4>
                <p className="text-sm text-muted-foreground">
                  {networkStatus.isOfflineMode ? 'Offline mode active' : 'External connections blocked'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {networkStatus.isOfflineMode ? (
                <WifiOff className="h-4 w-4 text-green-500" />
              ) : (
                <Wifi className="h-4 w-4 text-amber-500" />
              )}
            </div>
          </div>

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
            <p><strong>Security:</strong> External connections blocked</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

