import { AlertTriangle, Users } from "lucide-react";
import type { ActiveEditor } from "@/lib/realtimeSync";

interface ResourceCollisionAlertProps {
  activeEditors: ActiveEditor[];
  resourceLabel?: string;
}

export default function ResourceCollisionAlert({
  activeEditors,
  resourceLabel = "document",
}: ResourceCollisionAlertProps) {
  if (!activeEditors || activeEditors.length === 0) return null;

  const names = activeEditors.map((e) => e.staffName).filter(Boolean);
  const namesDisplay =
    names.length === 1
      ? names[0]
      : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;

  return (
    <div className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-amber-900 dark:text-amber-200 shadow-2xs animate-in fade-in duration-200 text-xs">
      <div className="flex items-center gap-2.5">
        <div className="p-1.5 rounded-xl bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300">
          <AlertTriangle className="h-4 w-4 shrink-0" />
        </div>
        <div>
          <p className="font-bold">
            Concurrent Editing Warning: <span className="underline">{namesDisplay}</span> {names.length > 1 ? "are" : "is"} also viewing this {resourceLabel}.
          </p>
          <p className="text-[11px] text-amber-700/80 dark:text-amber-400/80">
            Coordinate with them to prevent overwriting notes, billing, or status changes.
          </p>
        </div>
      </div>
      <div className="hidden sm:flex items-center gap-1.5 font-mono text-[10px] bg-amber-100/80 dark:bg-amber-900/80 px-2.5 py-1 rounded-full font-bold">
        <Users className="h-3.5 w-3.5" />
        <span>Live Presence</span>
      </div>
    </div>
  );
}
