import React, { useState } from "react";
import { getAvatarById, type AvatarDefinition } from "@/lib/avatars";

interface AvatarGraphicProps {
  avatarId?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
  className?: string;
  showGlow?: boolean;
  interactive?: boolean;
  selected?: boolean;
}

const sizeConfig = {
  xs: { box: "h-6 w-6 rounded-full text-xs", glow: "blur-xs" },
  sm: { box: "h-8 w-8 rounded-full text-sm", glow: "blur-sm" },
  md: { box: "h-11 w-11 rounded-full text-xl", glow: "blur-md" },
  lg: { box: "h-16 w-16 rounded-full text-3xl", glow: "blur-lg" },
  xl: { box: "h-24 w-24 rounded-full text-5xl", glow: "blur-xl" },
  "2xl": { box: "h-32 w-32 rounded-full text-6xl", glow: "blur-2xl" },
};

export default function AvatarGraphic({
  avatarId,
  size = "md",
  className = "",
  showGlow = false,
  interactive = false,
  selected = false,
}: AvatarGraphicProps) {
  const avatar: AvatarDefinition = getAvatarById(avatarId);
  const cfg = sizeConfig[size];
  const [imgError, setImgError] = useState(false);

  // If specific image exists, use it; otherwise fallback to /avatars/${avatar.id}.png or penguin.png
  const imageSrc = avatar.imageUrl || `/avatars/${avatar.id}.png` || "/avatars/penguin.png";

  return (
    <div className={`relative inline-flex items-center justify-center shrink-0 select-none ${className}`}>
      {/* Background Ambient Glow */}
      {showGlow && (
        <div
          className={`absolute inset-0 rounded-full bg-blue-500/30 opacity-70 ${cfg.glow} pointer-events-none transition-all duration-300`}
        />
      )}

      {/* Main Circular Avatar Capsule */}
      <div
        className={`relative z-10 flex items-center justify-center overflow-hidden rounded-full ${
          cfg.box
        } ${
          selected
            ? "ring-4 ring-blue-500 shadow-xl shadow-blue-500/50 scale-105"
            : "ring-2 ring-white/15 hover:ring-white/60 hover:shadow-lg"
        } transition-all duration-300 ${
          interactive
            ? "cursor-pointer hover:scale-110 active:scale-95 hover:shadow-xl"
            : ""
        }`}
      >
        {imageSrc && !imgError ? (
          <img
            src={imageSrc}
            alt={avatar.name}
            onError={() => setImgError(true)}
            className="w-full h-full object-cover rounded-full pointer-events-none"
          />
        ) : (
          <img
            src="/avatars/penguin.png"
            alt={avatar.name}
            className="w-full h-full object-cover rounded-full pointer-events-none"
          />
        )}
      </div>
    </div>
  );
}
