import { ZorbaLogoIcon } from "./ZorbaLogo";

interface LoadingScreenProps {
  fullScreen?: boolean;
  title?: string;
  subtitle?: string;
  className?: string;
}

/**
 * Standardized, unified dark-theme loading screen for Zorba Infotech.
 * Ensures consistent branding across all page loads, route transitions,
 * and data-fetching views without white background flashes.
 */
export default function LoadingScreen({
  fullScreen = true,
  title = "Zorba Infotech",
  subtitle = "Loading...",
  className = "",
}: LoadingScreenProps) {
  if (fullScreen) {
    return (
      <div
        role="status"
        aria-label={`${title} - ${subtitle}`}
        className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0b0f19] text-white select-none transition-opacity duration-200 ${className}`}
      >
        <div className="flex flex-col items-center justify-center text-center p-6 space-y-4">
          {/* Branded Pulse Ring & Logo */}
          <div className="relative flex items-center justify-center">
            {/* Ambient Brand Glow */}
            <div className="absolute h-20 w-20 rounded-full bg-blue-600/25 blur-xl animate-pulse pointer-events-none" />

            {/* High-craft Smooth Spinning Ring */}
            <div className="h-16 w-16 rounded-full border-2 border-slate-700/60 border-t-blue-500 animate-spin" />

            {/* Center Logo Icon */}
            <div className="absolute flex items-center justify-center h-8 w-8 pointer-events-none">
              <ZorbaLogoIcon className="h-7 w-7 drop-shadow-md" />
            </div>
          </div>

          {/* Branded Typography */}
          <div className="space-y-1">
            <h2 className="text-xs font-bold font-display tracking-widest text-white uppercase">
              {title}
            </h2>
            {subtitle && (
              <p className="text-xs font-medium text-slate-400">
                {subtitle}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      role="status"
      aria-label={`${title} - ${subtitle}`}
      className={`flex min-h-[260px] w-full flex-col items-center justify-center text-center py-10 select-none ${className}`}
    >
      {/* Pulse Ring & Logo */}
      <div className="relative flex items-center justify-center mb-4">
        <div className="absolute h-16 w-16 rounded-full bg-primary/20 blur-lg animate-pulse pointer-events-none" />
        <div className="h-12 w-12 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
        <div className="absolute flex items-center justify-center h-6 w-6 pointer-events-none">
          <ZorbaLogoIcon className="h-5 w-5" />
        </div>
      </div>

      <div className="space-y-0.5">
        <h2 className="text-xs font-bold font-display tracking-wider text-foreground uppercase">
          {title}
        </h2>
        {subtitle && (
          <p className="text-[11px] font-medium text-muted-foreground">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}
