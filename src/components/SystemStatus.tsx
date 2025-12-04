import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  ChevronDown, 
  Monitor, 
  Wifi, 
  Volume2,
  Settings,
  RefreshCw
} from 'lucide-react';
import { checkBrowserSupport, detectBrowser } from '@/lib/browser-compatibility';

interface SystemStatusProps {
  className?: string;
}

interface StatusItem {
  name: string;
  status: 'success' | 'warning' | 'error';
  message: string;
  icon: React.ReactNode;
  details?: string;
}

export const SystemStatus: React.FC<SystemStatusProps> = ({ className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [statusItems, setStatusItems] = useState<StatusItem[]>([]);
  const [overallStatus, setOverallStatus] = useState<'success' | 'warning' | 'error'>('success');
  const [lastChecked, setLastChecked] = useState<Date>(new Date());

  const checkSystemStatus = () => {
    const browser = detectBrowser();
    const support = checkBrowserSupport();
    const items: StatusItem[] = [];

    // Browser Compatibility
    if (support.supported) {
      items.push({
        name: 'Browser Compatibility',
        status: 'success',
        message: `${browser.name} ${browser.version} - Fully supported`,
        icon: <CheckCircle className="h-4 w-4" />,
        details: 'All required features are available in your browser'
      });
    } else {
      items.push({
        name: 'Browser Compatibility',
        status: 'error',
        message: `${browser.name} ${browser.version} - Compatibility issues`,
        icon: <XCircle className="h-4 w-4" />,
        details: support.issues.join('; ')
      });
    }

    // Service Worker Status
    const hasServiceWorker = typeof navigator !== 'undefined' && 'serviceWorker' in navigator;
    if (hasServiceWorker) {
      items.push({
        name: 'Offline Support',
        status: 'success',
        message: 'Service Worker available',
        icon: <Wifi className="h-4 w-4" />,
        details: 'App can work offline and cache audio files'
      });

      // Check Service Worker registration
      navigator.serviceWorker.getRegistrations().then(registrations => {
        if (registrations.length > 0) {
          setStatusItems(prev => prev.map(item => 
            item.name === 'Offline Support' 
              ? { ...item, message: 'Service Worker active', details: 'Offline functionality is ready' }
              : item
          ));
        }
      }).catch(() => {
        setStatusItems(prev => prev.map(item => 
          item.name === 'Offline Support' 
            ? { ...item, status: 'warning' as const, message: 'Service Worker registration pending', details: 'Offline features may not be available yet' }
            : item
        ));
      });
    } else {
      items.push({
        name: 'Offline Support',
        status: 'error',
        message: 'Service Worker not supported',
        icon: <XCircle className="h-4 w-4" />,
        details: 'Offline functionality and audio caching will not be available'
      });
    }

    // Web Audio API
    const hasWebAudio = typeof AudioContext !== 'undefined' || typeof (window as any).webkitAudioContext !== 'undefined';
    if (hasWebAudio) {
      items.push({
        name: 'Audio Processing',
        status: 'success',
        message: 'Web Audio API available',
        icon: <Volume2 className="h-4 w-4" />,
        details: 'Real-time audio processing and effects are supported'
      });
    } else {
      items.push({
        name: 'Audio Processing',
        status: 'error',
        message: 'Web Audio API not supported',
        icon: <XCircle className="h-4 w-4" />,
        details: 'Audio processing features will not work'
      });
    }

    // WebGL Support
    const hasWebGL = !!window.WebGLRenderingContext;
    if (hasWebGL) {
      items.push({
        name: 'Graphics Acceleration',
        status: 'success',
        message: 'WebGL available',
        icon: <Monitor className="h-4 w-4" />,
        details: 'Hardware-accelerated graphics for visualizations'
      });
    } else {
      items.push({
        name: 'Graphics Acceleration',
        status: 'warning',
        message: 'WebGL not available',
        icon: <AlertTriangle className="h-4 w-4" />,
        details: 'Visualizations may be slower without hardware acceleration'
      });
    }

    // Determine overall status
    const hasErrors = items.some(item => item.status === 'error');
    const hasWarnings = items.some(item => item.status === 'warning');
    
    let overall: 'success' | 'warning' | 'error' = 'success';
    if (hasErrors) overall = 'error';
    else if (hasWarnings) overall = 'warning';

    setStatusItems(items);
    setOverallStatus(overall);
    setLastChecked(new Date());
  };

  useEffect(() => {
    checkSystemStatus();
  }, []);

  const getStatusColor = (status: 'success' | 'warning' | 'error') => {
    switch (status) {
      case 'success': return 'text-green-600 bg-green-50 border-green-200';
      case 'warning': return 'text-amber-600 bg-amber-50 border-amber-200';
      case 'error': return 'text-red-600 bg-red-50 border-red-200';
    }
  };

  const getStatusBadgeVariant = (status: 'success' | 'warning' | 'error') => {
    switch (status) {
      case 'success': return 'default';
      case 'warning': return 'secondary';
      case 'error': return 'destructive';
    }
  };

  const getOverallStatusMessage = () => {
    switch (overallStatus) {
      case 'success': return 'All systems operational';
      case 'warning': return 'Some features may be limited';
      case 'error': return 'Compatibility issues detected';
    }
  };

  return (
    <div className={`fixed bottom-4 right-4 z-40 ${className}`}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={`shadow-lg ${getStatusColor(overallStatus)} hover:opacity-80 transition-all duration-200`}
          >
            <Settings className="h-4 w-4 mr-2" />
            System Status
            <ChevronDown className={`h-4 w-4 ml-2 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
          </Button>
        </CollapsibleTrigger>
        
        <CollapsibleContent className="mt-2">
          <Card className="w-80 shadow-xl border-2">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">System Status</CardTitle>
                  <CardDescription>
                    {getOverallStatusMessage()}
                  </CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={checkSystemStatus}
                  className="h-8 w-8 p-0"
                  title="Refresh status"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-3">
              {statusItems.map((item, index) => (
                <div key={index} className="flex items-start space-x-3 p-3 rounded-lg border bg-card">
                  <div className={`mt-0.5 ${
                    item.status === 'success' ? 'text-green-600' :
                    item.status === 'warning' ? 'text-amber-600' : 'text-red-600'
                  }`}>
                    {item.icon}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium text-foreground">
                        {item.name}
                      </p>
                      <Badge variant={getStatusBadgeVariant(item.status)} className="text-xs">
                        {item.status}
                      </Badge>
                    </div>
                    
                    <p className="text-sm text-muted-foreground mb-1">
                      {item.message}
                    </p>
                    
                    {item.details && (
                      <p className="text-xs text-muted-foreground">
                        {item.details}
                      </p>
                    )}
                  </div>
                </div>
              ))}
              
              <div className="pt-2 border-t">
                <p className="text-xs text-muted-foreground text-center">
                  Last checked: {lastChecked.toLocaleTimeString()}
                </p>
              </div>
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};
