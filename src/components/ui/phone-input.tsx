import * as React from "react";
import { cn, formatTenDigitPhone55 } from "@/lib/utils";

export interface PhoneInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> {
  value?: string | null;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onValueChange?: (formatted55: string) => void;
  containerClassName?: string;
}

/**
 * PhoneInput renders a static "+91" badge followed by a space and the 10-digit
 * mobile number formatted as 5 + 5 ("98765 43210").
 * Even if the parent passes "919876543210" from Firestore, it automatically strips
 * the leading "91" and displays "98765 43210" next to the static "+91" badge.
 */
const PhoneInput = React.forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ className, containerClassName, value, onChange, onValueChange, placeholder = "98765 43210", ...props }, ref) => {
    const displayValue = formatTenDigitPhone55(value);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const formatted = formatTenDigitPhone55(e.target.value);
      if (onValueChange) {
        onValueChange(formatted);
      }
      if (onChange) {
        const syntheticEvent = {
          ...e,
          target: {
            ...e.target,
            name: e.target.name,
            id: e.target.id,
            value: formatted,
          },
          currentTarget: {
            ...e.currentTarget,
            name: e.currentTarget.name,
            id: e.currentTarget.id,
            value: formatted,
          },
        } as React.ChangeEvent<HTMLInputElement>;
        onChange(syntheticEvent);
      }
    };

    return (
      <div
        className={cn(
          "flex items-center w-full rounded-md border border-input bg-background ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-1 overflow-hidden",
          containerClassName,
          className
        )}
      >
        <span className="inline-flex items-center justify-center px-2.5 h-full font-mono text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100/90 dark:bg-slate-800/90 border-r border-slate-200 dark:border-slate-700 select-none shrink-0">
          +91
        </span>
        <input
          ref={ref}
          type="tel"
          inputMode="numeric"
          value={displayValue}
          onChange={handleChange}
          placeholder={placeholder}
          maxLength={11}
          className="flex-1 w-full h-full bg-transparent px-2.5 py-1 text-xs font-mono text-foreground placeholder:text-muted-foreground focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
          {...props}
        />
      </div>
    );
  }
);
PhoneInput.displayName = "PhoneInput";

export { PhoneInput };
