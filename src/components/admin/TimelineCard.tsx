import { useState } from "react";
import {
  History,
  Plus,
  Truck,
  User,
  Calendar,
  MessageSquare,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { TimelineEvent, StaffMember } from "@/lib/types";
import AddTimelineEventModal from "./AddTimelineEventModal";

interface TimelineCardProps {
  timeline: TimelineEvent[];
  staffList?: StaffMember[];
  currentStaffId?: string;
  onAddTimelineEvent: (event: Omit<TimelineEvent, "id" | "timestamp">) => void;
  onTriggerQuickEvent?: (stage: TimelineEvent["stage"]) => void;
}

export default function TimelineCard({
  timeline = [],
  staffList = [],
  currentStaffId,
  onAddTimelineEvent,
}: TimelineCardProps) {
  const [showModal, setShowModal] = useState(false);
  const [modalStage, setModalStage] = useState<TimelineEvent["stage"]>("replacement_sent_service_center");
  const [showEvents, setShowEvents] = useState(false);

  const openStageModal = (stage: TimelineEvent["stage"]) => {
    setModalStage(stage);
    setShowModal(true);
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 border-l-4 border-l-violet-500 p-4 md:p-5 shadow-xs space-y-3.5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-50 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400">
            <History className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                Ticket Audit & Lifecycle Timeline
              </h3>
              <Badge variant="outline" className="bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-800 text-[10px] px-1.5 py-0 font-bold">
                {timeline.length} {timeline.length === 1 ? "Event" : "Events"}
              </Badge>
            </div>
            <p className="text-[11px] text-slate-400">
              Track staff actions, milestone hotkeys (F5, F6, F8, F9), and internal notes
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-1.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => openStageModal("comment_added")}
            className="h-7 px-2.5 text-[11px] font-bold rounded-lg border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 gap-1.5"
            title="Add Internal Note / Comment"
          >
            <MessageSquare className="h-3 w-3 text-slate-500" />
            <span>+ Add Note</span>
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={() => openStageModal("status_change")}
            className="h-7 px-2.5 text-[11px] font-bold rounded-lg bg-[#2563EB] hover:bg-blue-700 text-white gap-1"
          >
            <Plus className="h-3 w-3" /> Add Event
          </Button>

          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setShowEvents(!showEvents)}
            className="h-7 px-2.5 text-[11px] font-bold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 gap-1 ml-0.5"
          >
            {showEvents ? (
              <>
                <ChevronUp className="h-3.5 w-3.5 text-slate-500" />
                <span>Hide Events</span>
              </>
            ) : (
              <>
                <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
                <span>Show Events ({timeline.length})</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Collapsible Timeline Stream */}
      {showEvents && (
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 animate-in fade-in duration-200">
          <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
            {timeline.length > 0 ? (
              timeline.map((evt, idx) => {
                const dateStr = new Date(evt.timestamp).toLocaleString("en-IN", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                });

                return (
                  <div key={evt.id || idx} className="relative group">
                    {/* Node indicator */}
                    <div className="absolute -left-6 top-1.5 flex h-3 w-3 items-center justify-center rounded-full bg-[#2563EB] ring-4 ring-blue-100 dark:ring-blue-950" />

                    <div className="bg-slate-50 dark:bg-slate-950/60 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-1.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900 dark:text-white">
                            {evt.title || "Milestone Event"}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                          <Calendar className="h-3 w-3" /> {dateStr}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 dark:text-slate-300 font-medium">
                        <span className="flex items-center gap-1.5 text-[#2563EB] font-bold">
                          <User className="h-3.5 w-3.5" /> {evt.staffName}
                        </span>
                        {(evt.courierName || evt.courierDocketNumber) && (
                          <span className="flex items-center gap-1.5 text-amber-700 dark:text-amber-300 font-semibold">
                            <Truck className="h-3.5 w-3.5" /> {evt.courierName} {evt.courierDocketNumber ? `(${evt.courierDocketNumber})` : ""}
                          </span>
                        )}
                      </div>

                      {evt.comments && (
                        <p className="text-xs text-slate-600 dark:text-slate-300 font-medium pt-0.5">
                          <span className="text-slate-400 font-semibold">Description / Notes: &gt;&gt; </span>
                          {evt.comments}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-xs text-slate-400 py-3 italic">
                No timeline events recorded yet. Click "+ Add Note" or "+ Add Event" to log actions.
              </div>
            )}
          </div>
        </div>
      )}

      <AddTimelineEventModal
        open={showModal}
        onOpenChange={setShowModal}
        staffList={staffList}
        currentStaffId={currentStaffId}
        defaultStage={modalStage}
        onAddEvent={onAddTimelineEvent}
      />
    </div>
  );
}
