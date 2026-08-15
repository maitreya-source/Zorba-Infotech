import { useState, useEffect } from "react";
import { toast } from "sonner";
import { History, Send, Truck, UserCheck, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { TimelineEvent, StaffMember, ServiceCallStatus } from "@/lib/types";

interface AddTimelineEventModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staffList: StaffMember[];
  currentStaffId?: string;
  defaultStage?: TimelineEvent["stage"];
  onAddEvent: (event: Omit<TimelineEvent, "id" | "timestamp">) => void;
}

const STAGE_OPTIONS: { stage: TimelineEvent["stage"]; title: string; defaultStatus: ServiceCallStatus; icon: string }[] = [
  { stage: "replacement_sent_service_center", title: "Replacement Sent to Service Center (F5)", defaultStatus: "sent_to_service_center", icon: "🚚" },
  { stage: "replacement_received_service_center", title: "Replacement Received from Service Center (F6)", defaultStatus: "received", icon: "📦" },
  { stage: "replacement_given_customer", title: "Replacement Product Given to Customer (F8)", defaultStatus: "delivered", icon: "🤝" },
  { stage: "replacement_received_customer", title: "Replacement Product Received from Customer (F9)", defaultStatus: "in_progress", icon: "📥" },
  { stage: "status_change", title: "General Status / Milestone Update", defaultStatus: "in_progress", icon: "⚡" },
  { stage: "comment_added", title: "Internal Audit Log / Comment", defaultStatus: "in_progress", icon: "📝" },
];

const COURIER_PRESETS = [
  "Reliance Logistics",
  "Trackon Courier",
  "Blue Dart Express",
  "DTDC Express",
  "Speed Post (India Post)",
  "Delhivery",
  "Self / Hand Delivered",
];

export default function AddTimelineEventModal({
  open,
  onOpenChange,
  staffList,
  currentStaffId,
  defaultStage = "replacement_sent_service_center",
  onAddEvent,
}: AddTimelineEventModalProps) {
  const [stage, setStage] = useState<TimelineEvent["stage"]>(defaultStage);
  const [selectedStaffId, setSelectedStaffId] = useState<string>(currentStaffId || "");
  const [courierName, setCourierName] = useState("");
  const [courierDocketNumber, setCourierDocketNumber] = useState("");
  const [comments, setComments] = useState("");

  useEffect(() => {
    if (defaultStage) setStage(defaultStage);
    if (currentStaffId && !selectedStaffId) setSelectedStaffId(currentStaffId);
  }, [defaultStage, currentStaffId, open]);

  const selectedStageOption = STAGE_OPTIONS.find((s) => s.stage === stage) || STAGE_OPTIONS[0];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaffId) {
      toast.error("Please select the Backoffice Staff Member handling this update");
      return;
    }

    const foundStaff = staffList.find((s) => s.id === selectedStaffId);
    const staffName = foundStaff ? foundStaff.name : "Staff Member";

    onAddEvent({
      stage,
      title: selectedStageOption.title.split(" (")[0],
      staffId: selectedStaffId,
      staffName,
      status: selectedStageOption.defaultStatus,
      courierName: courierName.trim() || undefined,
      courierDocketNumber: courierDocketNumber.trim() || undefined,
      comments: comments.trim() || undefined,
    });

    toast.success(`Milestone recorded: ${selectedStageOption.title.split(" (")[0]}`);
    onOpenChange(false);
    setCourierName("");
    setCourierDocketNumber("");
    setComments("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-6">
        <DialogHeader className="border-b pb-3">
          <DialogTitle className="flex items-center gap-2 font-display text-base text-slate-900 dark:text-white">
            <History className="h-5 w-5 text-[#2563EB]" />
            Record Timeline Lifecycle Milestone
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Milestone Action Selection */}
          <div>
            <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Lifecycle Milestone / Action
            </Label>
            <Select value={stage} onValueChange={(val: any) => setStage(val)}>
              <SelectTrigger className="mt-1.5 h-10 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 font-semibold">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STAGE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.stage} value={opt.stage}>
                    {opt.icon} {opt.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Mandatory Back-Office Staff */}
          <div>
            <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
              Handled By / Staff Member <span className="text-red-500">*</span>
            </Label>
            <Select value={selectedStaffId} onValueChange={setSelectedStaffId} required>
              <SelectTrigger className="mt-1.5 h-10 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 font-medium">
                <SelectValue placeholder="Select Staff Member..." />
              </SelectTrigger>
              <SelectContent>
                {staffList.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name} {s.role ? `(${s.role})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Courier Details (for service center / customer dispatch) */}
          {(stage === "replacement_sent_service_center" ||
            stage === "replacement_received_service_center" ||
            stage === "replacement_given_customer") && (
            <div className="space-y-3 p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200/80 dark:border-slate-800">
              <p className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Truck className="h-3.5 w-3.5 text-[#2563EB]" /> Courier & Logistics Details
              </p>

              <div>
                <Label className="text-[11px] text-slate-500 font-medium">Courier Service</Label>
                <div className="flex gap-1.5 flex-wrap mt-1">
                  {COURIER_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setCourierName(preset)}
                      className={`text-[10px] px-2 py-0.5 rounded-md border font-medium transition-colors ${
                        courierName === preset
                          ? "bg-blue-50 border-blue-500 text-blue-700 font-bold"
                          : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100"
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
                <Input
                  placeholder="Or type courier name..."
                  value={courierName}
                  onChange={(e) => setCourierName(e.target.value)}
                  className="mt-1.5 h-8 text-xs rounded-lg bg-white dark:bg-slate-950"
                />
              </div>

              <div>
                <Label className="text-[11px] text-slate-500 font-medium">Docket / Tracking Number</Label>
                <Input
                  placeholder="e.g. TRK-987654321 / REL-2026-X"
                  value={courierDocketNumber}
                  onChange={(e) => setCourierDocketNumber(e.target.value)}
                  className="mt-1 h-8 text-xs rounded-lg bg-white dark:bg-slate-950 font-mono"
                />
              </div>
            </div>
          )}

          {/* Comments / Audit Notes */}
          <div>
            <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Comments / Audit Notes
            </Label>
            <Textarea
              placeholder="e.g. Sent via Trackon. Awaiting RMA inspection report..."
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              rows={2}
              className="mt-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800"
            />
          </div>

          <DialogFooter className="border-t pt-3 gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="h-9 text-xs rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              className="h-9 text-xs rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white font-bold"
            >
              Record Milestone
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
