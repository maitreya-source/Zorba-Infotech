import { useState } from "react";
import { History, Plus, Truck, User, Calendar, MessageSquare, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { TimelineEvent, StaffMember } from "@/lib/types";
import AddTimelineEventModal from "./AddTimelineEventModal";

interface TimelineCardProps {
  timeline: TimelineEvent[];
  staffList: StaffMember[];
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

  const openStageModal = (stage: TimelineEvent["stage"]) => {
    setModalStage(stage);
    setShowModal(true);
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-xs space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950/60 text-[#2563EB]">
            <History className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold font-display text-slate-900 dark:text-white">
              Ticket Audit & Lifecycle Timeline
            </h3>
            <p className="text-[11px] text-slate-400">
              Track which staff handled what, courier dispatches, and status updates
            </p>
          </div>
        </div>

        {/* Hotkey Quick Milestone Buttons */}
        <div className="flex flex-wrap items-center gap-1.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => openStageModal("replacement_sent_service_center")}
            className="h-7 px-2 text-[11px] font-bold rounded-lg border-amber-300 text-amber-800 dark:text-amber-300 bg-amber-50/60 hover:bg-amber-100"
            title="F5: Replacement Sent to Service Center"
          >
            F5: Sent to SC
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => openStageModal("replacement_received_service_center")}
            className="h-7 px-2 text-[11px] font-bold rounded-lg border-purple-300 text-purple-800 dark:text-purple-300 bg-purple-50/60 hover:bg-purple-100"
            title="F6: Replacement Received from Service Center"
          >
            F6: Recv from SC
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => openStageModal("replacement_given_customer")}
            className="h-7 px-2 text-[11px] font-bold rounded-lg border-emerald-300 text-emerald-800 dark:text-emerald-300 bg-emerald-50/60 hover:bg-emerald-100"
            title="F8: Given to Customer"
          >
            F8: Given to Cust
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => openStageModal("replacement_received_customer")}
            className="h-7 px-2 text-[11px] font-bold rounded-lg border-blue-300 text-blue-800 dark:text-blue-300 bg-blue-50/60 hover:bg-blue-100"
            title="F9: Received from Customer"
          >
            F9: Recv from Cust
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={() => openStageModal("status_change")}
            className="h-7 px-2.5 text-[11px] font-bold rounded-lg bg-[#2563EB] hover:bg-blue-700 text-white gap-1"
          >
            <Plus className="h-3 w-3" /> Add Event
          </Button>
        </div>
      </div>

      {/* Timeline Stream */}
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
                      <Badge variant="outline" className="text-[10px] px-2 py-0.5 rounded-full capitalize font-semibold border-slate-300 dark:border-slate-700">
                        {evt.status.replace(/_/g, " ")}
                      </Badge>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                      <Calendar className="h-3 w-3" /> {dateStr}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 dark:text-slate-300 font-medium">
                    <span className="flex items-center gap-1.5 text-[#2563EB] font-bold">
                      <User className="h-3.5 w-3.5" /> Staff: {evt.staffName}
                    </span>
                    {(evt.courierName || evt.courierDocketNumber) && (
                      <span className="flex items-center gap-1.5 text-amber-700 dark:text-amber-300 font-semibold">
                        <Truck className="h-3.5 w-3.5" /> {evt.courierName} {evt.courierDocketNumber ? `(${evt.courierDocketNumber})` : ""}
                      </span>
                    )}
                  </div>

                  {evt.comments && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-100 dark:border-slate-800/60 mt-1 italic">
                      "{evt.comments}"
                    </p>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-xs text-slate-400 py-3 italic">
            No timeline events recorded yet. Timeline will record creation upon saving.
          </div>
        )}
      </div>

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
