import {
  History,
  User,
  Calendar,
  Truck,
  Plus,
  MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import type { TimelineEvent } from "@/lib/types";

interface TimelineEventsListModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  timeline: TimelineEvent[];
  onOpenAddEvent: (stage?: TimelineEvent["stage"]) => void;
}

export default function TimelineEventsListModal({
  open,
  onOpenChange,
  timeline = [],
  onOpenAddEvent,
}: TimelineEventsListModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[85vh] flex flex-col p-0 overflow-hidden rounded-2xl border-slate-200 dark:border-slate-800">
        <DialogHeader className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
          <div className="flex items-center justify-between pr-6">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950 text-[#2563EB]">
                <History className="h-4 w-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <DialogTitle className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Ticket Audit & Lifecycle Events
                  </DialogTitle>
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800 font-mono text-[10px] px-1.5 py-0 rounded-full font-bold">
                    {timeline.length} {timeline.length === 1 ? "Event" : "Events"}
                  </Badge>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">Chronological log of staff actions and milestones</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  onOpenChange(false);
                  onOpenAddEvent("comment_added");
                }}
                className="h-7 px-2 text-xs font-semibold rounded-lg gap-1 border-slate-300 dark:border-slate-700"
              >
                <MessageSquare className="h-3 w-3 text-slate-500" />
                <span>+ Note</span>
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  onOpenChange(false);
                  onOpenAddEvent("status_change");
                }}
                className="h-7 px-2 text-xs font-semibold rounded-lg bg-[#2563EB] hover:bg-blue-600 text-white gap-1"
              >
                <Plus className="h-3 w-3" />
                <span>+ Event</span>
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Timeline Events Scroll Area */}
        <div className="flex-1 overflow-y-auto p-5">
          {timeline.length > 0 ? (
            <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
              {timeline.map((evt, idx) => {
                const dateStr = new Date(evt.timestamp).toLocaleString("en-IN", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                });

                return (
                  <div key={evt.id || idx} className="relative group">
                    {/* Node Dot */}
                    <div className="absolute -left-6 top-1.5 flex h-3 w-3 items-center justify-center rounded-full bg-[#2563EB] ring-4 ring-blue-100 dark:ring-blue-950" />

                    <div className="bg-slate-50/80 dark:bg-slate-900/60 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          {evt.title || "Milestone Event"}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                          <Calendar className="h-3 w-3" /> {dateStr}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 dark:text-slate-300 font-medium">
                        <span className="flex items-center gap-1.5 text-[#2563EB] font-bold">
                          <User className="h-3.5 w-3.5" /> {evt.staffName || "Staff Member"}
                        </span>
                        {(evt.courierName || evt.courierDocketNumber) && (
                          <span className="flex items-center gap-1.5 text-amber-700 dark:text-amber-300 font-semibold">
                            <Truck className="h-3.5 w-3.5" /> {evt.courierName} {evt.courierDocketNumber ? `(${evt.courierDocketNumber})` : ""}
                          </span>
                        )}
                      </div>

                      {evt.comments && (
                        <p className="text-xs text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-950 p-2.5 rounded-lg border border-slate-200/60 dark:border-slate-800/80">
                          <span className="text-slate-400 font-semibold">Notes: </span>
                          {evt.comments}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-10 space-y-2">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400">
                <History className="h-5 w-5" />
              </div>
              <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
                No events recorded yet.
              </p>
              <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                Use the hotkeys (F5, F6, F8, F9) or click "+ Note" to log updates.
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="px-5 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-xs rounded-xl"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
