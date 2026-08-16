import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs cursor-pointer",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-xs cursor-pointer",
        outline: "border border-input bg-background text-slate-800 dark:text-slate-200 hover:bg-slate-100 hover:text-slate-950 dark:hover:bg-slate-800 dark:hover:text-white transition-colors cursor-pointer",
        secondary: "bg-secondary text-secondary-foreground hover:bg-slate-200/90 dark:hover:bg-slate-700/90 transition-colors cursor-pointer",
        ghost: "text-slate-700 dark:text-slate-300 hover:bg-slate-100 hover:text-slate-950 dark:hover:bg-slate-800 dark:hover:text-white transition-colors cursor-pointer",
        link: "text-primary underline-offset-4 hover:underline cursor-pointer",
        hero: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-glow font-semibold text-base cursor-pointer",
        cta: "bg-zorba-green text-zorba-green-foreground hover:bg-zorba-green/90 font-semibold cursor-pointer",
        dealer: "bg-zorba-orange text-zorba-orange-foreground hover:bg-zorba-orange/90 font-semibold cursor-pointer",
        whatsapp: "bg-[hsl(142,70%,45%)] text-primary-foreground hover:bg-[hsl(142,70%,40%)] font-semibold cursor-pointer",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
