import { ZorbaLogoIcon } from "./ZorbaLogo";

interface LoadingScreenProps {
  fullScreen?: boolean;
  title?: string;
  subtitle?: string;
  className?: string;
}

/**
 * Standardized, unified loading screen for Zorba Infotech.
 * Provides a consistent, premium branded loading animation across all public and admin pages.
 */
export default function LoadingScreen({
  fullScreen = true,
  title = "Zorba Infotech",
  subtitle = "Loading workspace...",
  className = "",
}: LoadingScreenProps) {
  const content = (
    <div className="flex flex-col items-center justify-center text-center p-6 select-none animate-in fade-in duration-300">
      {/* Branded Pulse Container */}
      <div className="relative flex items-center justify-center mb-5">
        {/* Glow Ring */}
        <div className="absolute h-20 w-20 rounded-full bg-blue-500/20 blur-xl animate-pulse pointer-events-none" />
        
        {/* Spinning Outer Ring */}
        <div className="absolute h-16 w-16 rounded-full border-2 border-blue-500/20 border-t-blue-500 animate-spin" />
        
        {/* Inner Counter-Spinning Accent */}
        <div className="absolute h-12 w-12 rounded-full border border-indigo-500/20 border-b-indigo-400 animate-spin [animation-direction:reverse] [animation-duration:1.5s]" />

        {/* Center Logo Icon */}
        <div className="relative z-10 flex items-center justify-center h-10 w-10">
          <ZorbaLogoIcon className="h-9 w-9 drop-shadow-md" />
        </div>
      </div>

      {/* Branded Typography */}
      <div className="space-y-1">
        <h2 className="text-sm font-extrabold font-display tracking-wider text-slate-900 dark:text-white uppercase">
          {title}
        </h2>
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
          {subtitle}
        </p>
      </div>

      {/* Progress Dots */}
      <div className="flex items-center gap-1.5 mt-4">
        <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-bounce [animation-delay:-0.3s]" />
        <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-bounce [animation-delay:-0.15s]" />
        <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-bounce" />
      </div>
    </div>
  );

  if (fullScreen) {
    return (
      <div
        className={`fixed inset-0 z-50 flex items-center justify-center bg-white/95 dark:bg-slate-950/95 backdrop-blur-sm ${className}`}
      >
        {content}
      </div>
    );
  }

  return (
    <div className={`flex min-h-[300px] w-full items-center justify-center py-12 ${className}`}>
      {content}
    </div>
  );
}
