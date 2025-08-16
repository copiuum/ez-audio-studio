import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

const AdvancedStudio = () => {

  return (
    <div className="min-h-screen animated-bg p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-foreground mb-2 bg-gradient-highlight bg-clip-text text-transparent">
            Advanced Studio
          </h1>
          <p className="text-sm text-muted-foreground opacity-50">
            Coming Soon
          </p>
        </div>

        {/* Navigation */}
        <div className="mb-6 text-center">
          <Link to="/">
            <Button variant="outline" size="sm" className="rounded-sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Studio
            </Button>
          </Link>
        </div>

        {/* Centered Content */}
        <div className="flex justify-center">
          <div className="max-w-md w-full text-center">
            <div className="bg-gradient-panel rounded-sm border border-border p-8">
              <h2 className="text-2xl font-semibold mb-4">Advanced Features</h2>
              <p className="text-muted-foreground mb-6">
                Advanced audio processing features are currently under development.
              </p>
              <p className="text-sm text-muted-foreground">
                Check back soon for professional EQ, limiter, and advanced effects.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center">
          <a 
            href="https://guns.lol/copiuum" 
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

export default AdvancedStudio;
