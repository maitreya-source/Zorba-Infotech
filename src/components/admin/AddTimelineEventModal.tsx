import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  History,
  Send,
  Truck,
  Package,
  Inbox,
  Activity,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
import AvatarGraphic from "@/components/admin/AvatarGraphic";
import { useStaffProfile } from "@/contexts/StaffProfileContext";
import type { TimelineEvent, StaffMember, ServiceCallStatus } from "@/lib/types";

interface AddTimelineEventModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staffList?: StaffMember[];
  currentStaffId?: string;
  defaultStage?: TimelineEvent["stage"];
  defaultCourierName?: string;
  defaultDocketNumber?: string;
  onAddEvent: (event: Omit<TimelineEvent, "id" | "timestamp">) => void;
}

const STAGE_OPTIONS: {
  stage: TimelineEvent["stage"];
  title: string;
  defaultStatus: ServiceCallStatus;
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
}[] = [
  {
    stage: "replacement_received_customer",
    title: "Received from Customer (F5)",
    defaultStatus: "received",
    icon: Inbox,
    iconColor: "text-blue-500",
  },
  {
    stage: "replacement_sent_service_center",
    title: "Replacement Sent to Service Center (F6)",
    defaultStatus: "sent_to_service_center",
    icon: Truck,
    iconColor: "text-amber-500",
  },
  {
    stage: "replacement_received_service_center",
    title: "Replacement Received from Service Center (F8)",
    defaultStatus: "received",
    icon: Package,
    iconColor: "text-purple-500",
  },
  {
    stage: "replacement_given_customer",
    title: "Replacement Product Given to Customer (F9)",
    defaultStatus: "delivered",
    icon: Send,
    iconColor: "text-emerald-500",
  },
  {
    stage: "status_change",
    title: "General Status / Milestone Update",
    defaultStatus: "in_progress",
    icon: Activity,
    iconColor: "text-indigo-500",
  },
  {
    stage: "comment_added",
    title: "Internal Audit Log / Comment",
    defaultStatus: "in_progress",
    icon: FileText,
    iconColor: "text-slate-500",
  },
];

export default function AddTimelineEventModal({
  open,
  onOpenChange,
  currentStaffId,
  defaultStage = "replacement_sent_service_center",
  defaultCourierName,
  defaultDocketNumber,
  onAddEvent,
}: AddTimelineEventModalProps) {
  const { activeProfile } = useStaffProfile();
  const [stage, setStage] = useState<TimelineEvent["stage"]>(defaultStage);
  const [comments, setComments] = useState("");

  useEffect(() => {
    if (defaultStage) setStage(defaultStage);
  }, [defaultStage, open]);

  const selectedStageOption = STAGE_OPTIONS.find((s) => s.stage === stage) || STAGE_OPTIONS[0];
  const isSentToServiceCenterMilestone = stage === "replacement_sent_service_center";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const staffId = activeProfile?.id || currentStaffId || "staff-desk";
    const staffName = activeProfile?.name || "Staff Member";

    onAddEvent({
      stage,
      title: selectedStageOption.title.split(" (")[0],
      staffId,
      staffName,
      status: selectedStageOption.defaultStatus,
      courierName: isSentToServiceCenterMilestone ? (defaultCourierName || undefined) : undefined,
      courierDocketNumber: isSentToServiceCenterMilestone ? (defaultDocketNumber || undefined) : undefined,
      comments: comments.trim() || undefined,
    });

    toast.success(`Milestone recorded: ${selectedStageOption.title.split(" (")[0]}`);
    onOpenChange(false);
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
          {/* Active Operator Banner */}
          <div className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200/80 dark:border-slate-800 text-xs">
            <span className="text-slate-500 font-medium">Logged By Profile:</span>
            <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
              <AvatarGraphic avatarId={activeProfile?.avatar || "penguin"} size="sm" />
              <span>{activeProfile?.name || "Desk Operator"}</span>
            </div>
          </div>

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
                {STAGE_OPTIONS.map((opt) => {
                  const Icon = opt.icon;
                  return (
                    <SelectItem key={opt.stage} value={opt.stage} className="text-xs py-2">
                      <div className="flex items-center gap-2">
                        <Icon className={`h-4 w-4 ${opt.iconColor}`} />
                        <span>{opt.title}</span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Service Center Courier Info Indicator (Only attached when sending to SC) */}
          {isSentToServiceCenterMilestone && (defaultCourierName || defaultDocketNumber) && (
            <div className="flex items-center gap-2 p-2.5 bg-amber-50/70 dark:bg-amber-950/30 rounded-xl border border-amber-200/80 dark:border-amber-900/50 text-xs text-amber-900 dark:text-amber-200">
              <Truck className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <div className="flex-1 truncate">
                <span className="font-semibold text-slate-700 dark:text-slate-300">Dispatch Courier: </span>
                <span className="font-medium">{defaultCourierName}</span>
                {defaultDocketNumber && (
                  <span className="font-mono ml-1 text-slate-500 dark:text-slate-400">({defaultDocketNumber})</span>
                )}
              </div>
            </div>
          )}

          {/* Comments / Audit Notes */}
          <div>
            <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Comments / Audit Notes
            </Label>
            <Textarea
              placeholder="e.g. Dispatched to Bangalore SC / Checked physical condition..."
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              rows={3}
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
