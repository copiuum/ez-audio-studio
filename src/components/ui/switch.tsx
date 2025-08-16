import * as React from "react"
import * as SwitchPrimitives from "@radix-ui/react-switch"

import { cn } from "@/lib/utils"

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitives.Root
    className={cn(
      "peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-sm border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=unchecked]:bg-input",
      // Browser-specific optimizations
      "will-change-transform", // Optimize for Chrome/Firefox animations
      "transform-gpu", // Force hardware acceleration
      "backface-visibility-hidden", // Prevent flickering in Chrome
      "perspective-1000", // Improve 3D rendering performance
      // Firefox-specific optimizations
      "moz-user-select-none", // Prevent text selection in Firefox
      "moz-appearance-none", // Remove default Firefox styling
      // Chrome-specific optimizations  
      "webkit-user-select-none", // Prevent text selection in Chrome
      "webkit-appearance-none", // Remove default Chrome styling
      // Enhanced accessibility
      "aria-label-toggle", // Better screen reader support
      "touch-manipulation", // Optimize touch interactions
      className
    )}
    {...props}
    ref={ref}
  >
    <SwitchPrimitives.Thumb
      className={cn(
        "pointer-events-none block h-5 w-5 rounded-sm bg-background shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0",
        // Browser-specific thumb optimizations
        "will-change-transform", // Optimize transform animations
        "transform-gpu", // Force hardware acceleration for thumb
        "backface-visibility-hidden", // Prevent flickering
        // Firefox-specific thumb optimizations
        "moz-user-select-none",
        "moz-appearance-none",
        // Chrome-specific thumb optimizations
        "webkit-user-select-none", 
        "webkit-appearance-none",
        // Enhanced shadow and visual effects
        "shadow-[0_2px_4px_rgba(0,0,0,0.1)]", // Consistent shadow across browsers
        "hover:shadow-[0_4px_8px_rgba(0,0,0,0.15)]", // Enhanced hover effect
        // Smooth animation with browser-specific prefixes
        "transition-all duration-200 ease-out"
      )}
    />
  </SwitchPrimitives.Root>
))
Switch.displayName = SwitchPrimitives.Root.displayName

export { Switch }
