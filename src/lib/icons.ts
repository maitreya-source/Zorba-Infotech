import {
  Monitor, Cpu, Printer, Keyboard, Camera, Wifi, Shield,
  School, Wrench, Tv, Fingerprint, Package, HardDrive,
  Laptop, Server, Database, Lock, Zap, Box, type LucideProps,
} from "lucide-react";
import type { ForwardRefExoticComponent, RefAttributes } from "react";

type LucideIcon = ForwardRefExoticComponent<LucideProps & RefAttributes<SVGSVGElement>>;

export const ICON_MAP: Record<string, LucideIcon> = {
  Monitor, Cpu, Printer, Keyboard, Camera, Wifi, Shield,
  School, Wrench, Tv, Fingerprint, Package, HardDrive,
  Laptop, Server, Database, Lock, Zap, Box,
};

export const ICON_NAMES = Object.keys(ICON_MAP);

export function getIcon(name: string): LucideIcon {
  return ICON_MAP[name] ?? Package;
}

export const COLOR_OPTIONS = [
  { label: "Blue", value: "from-blue-500/10 to-blue-600/5" },
  { label: "Purple", value: "from-purple-500/10 to-purple-600/5" },
  { label: "Red", value: "from-red-500/10 to-red-600/5" },
  { label: "Amber", value: "from-amber-500/10 to-amber-600/5" },
  { label: "Emerald", value: "from-emerald-500/10 to-emerald-600/5" },
  { label: "Cyan", value: "from-cyan-500/10 to-cyan-600/5" },
  { label: "Indigo", value: "from-indigo-500/10 to-indigo-600/5" },
  { label: "Teal", value: "from-teal-500/10 to-teal-600/5" },
  { label: "Orange", value: "from-orange-500/10 to-orange-600/5" },
  { label: "Slate", value: "from-slate-500/10 to-slate-600/5" },
  { label: "Green", value: "from-green-500/10 to-green-600/5" },
  { label: "Pink", value: "from-pink-500/10 to-pink-600/5" },
];
