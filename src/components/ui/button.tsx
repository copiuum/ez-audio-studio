import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-sm text-sm font-medium ring-offset-background transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 relative overflow-hidden button-glass button-shine",
  {
    variants: {
      variant: {
        default: "bg-primary/90 backdrop-blur-sm text-primary-foreground hover:bg-primary/95 hover:shadow-lg hover:shadow-primary/25 border border-primary/20",
        destructive:
          "bg-destructive/90 backdrop-blur-sm text-destructive-foreground hover:bg-destructive/95 hover:shadow-lg hover:shadow-destructive/25 border border-destructive/20",
        outline:
          "border border-input/50 bg-background/80 backdrop-blur-sm hover:bg-accent/90 hover:text-accent-foreground hover:shadow-lg hover:shadow-accent/25",
        secondary:
          "bg-secondary/90 backdrop-blur-sm text-secondary-foreground hover:bg-secondary/95 hover:shadow-lg hover:shadow-secondary/25 border border-secondary/20",
        ghost: "hover:bg-accent/80 backdrop-blur-sm hover:text-accent-foreground hover:shadow-lg hover:shadow-accent/25",
        link: "text-primary underline-offset-4 hover:underline",
        studio: "bg-gradient-control/90 backdrop-blur-sm text-foreground hover:bg-gradient-accent/95 shadow-control hover:shadow-lg hover:shadow-accent/25 transition-studio border border-border/50 studio-button-glow",
        play: "bg-gradient-highlight/90 backdrop-blur-sm text-primary-foreground hover:bg-gradient-highlight/95 hover:shadow-glow hover:shadow-lg hover:shadow-highlight/25 transition-studio border border-highlight/20",
        control: "bg-gradient-panel/90 backdrop-blur-sm text-foreground hover:bg-gradient-control/95 border border-border/50 shadow-panel hover:shadow-lg hover:shadow-control/25 transition-smooth",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-sm px-3",
        lg: "h-11 rounded-sm px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
