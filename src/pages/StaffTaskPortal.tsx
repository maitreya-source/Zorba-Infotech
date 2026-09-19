import { useEffect, useState, useCallback } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import {
  getStaffTaskById,
  getTeamMemberById,
  getStaffTasksByEmployee,
  setupStaffPinFromTaskPortal,
  updateTaskStatusFromStaffPortal,
} from "@/lib/firestore";
import type { StaffTask, TaskPriority, TaskStatus, TeamMember } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  ShieldAlert,
  Lock,
  KeyRound,
  CheckCircle2,
  Clock,
  Wrench,
  AlertOctagon,
  Calendar,
  UserCheck,
  RefreshCw,
  LogOut,
  FileText,
} from "lucide-react";
import { toast } from "sonner";

const PRIORITY_META: Record<
  TaskPriority,
  { label: string; badgeClass: string }
> = {
  p0: {
    label: "P0 • Critical",
    badgeClass:
      "bg-red-100 text-red-900 border-red-300 dark:bg-red-950/80 dark:text-red-200 dark:border-red-800",
  },
  p1: {
    label: "P1 • High",
    badgeClass:
      "bg-orange-100 text-orange-900 border-orange-300 dark:bg-orange-950/80 dark:text-orange-200 dark:border-orange-800",
  },
  p2: {
    label: "P2 • Normal",
    badgeClass:
      "bg-blue-100 text-blue-900 border-blue-300 dark:bg-blue-950/80 dark:text-blue-200 dark:border-blue-800",
  },
  p3: {
    label: "P3 • Low",
    badgeClass:
      "bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700",
  },
  p4: {
    label: "P4 • Backlog",
    badgeClass:
      "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800",
  },
};

const STATUS_META: Record<
  TaskStatus,
  { label: string; emoji: string; activeClass: string; badgeClass: string }
> = {
  pending: {
    label: "Pending",
    emoji: "⏳",
    activeClass: "bg-amber-600 text-white border-amber-600 shadow-sm",
    badgeClass: "bg-amber-100 text-amber-900 border-amber-300",
  },
  in_progress: {
    label: "Working On It",
    emoji: "🔧",
    activeClass: "bg-blue-600 text-white border-blue-600 shadow-sm",
    badgeClass: "bg-blue-100 text-blue-900 border-blue-300",
  },
  completed: {
    label: "Completed",
    emoji: "✅",
    activeClass: "bg-emerald-600 text-white border-emerald-600 shadow-sm",
    badgeClass: "bg-emerald-100 text-emerald-900 border-emerald-300",
  },
  blocked: {
    label: "Blocked / Need Help",
    emoji: "🔴",
    activeClass: "bg-rose-600 text-white border-rose-600 shadow-sm",
    badgeClass: "bg-rose-100 text-rose-900 border-rose-300",
  },
};

export default function StaffTaskPortal() {
  const { taskId } = useParams<{ taskId: string }>();
  const [searchParams] = useSearchParams();
  const urlToken = searchParams.get("k") || "";

  const [loading, setLoading] = useState(true);
  const [task, setTask] = useState<StaffTask | null>(null);
  const [member, setMember] = useState<TeamMember | null>(null);
  const [employeeTasks, setEmployeeTasks] = useState<StaffTask[]>([]);
  const [activeTaskId, setActiveTaskId] = useState<string>("");

  // Revocation / Error states
  const [revokedReason, setRevokedReason] = useState<string | null>(null);
  const [invalidTokenError, setInvalidTokenError] = useState<string | null>(null);

  // PIN states
  const [unlockedPin, setUnlockedPin] = useState<string>("");
  const [pinInput, setPinInput] = useState("");
  const [confirmPinInput, setConfirmPinInput] = useState("");
  const [pinError, setPinError] = useState("");
  const [submittingPin, setSubmittingPin] = useState(false);

  // Status update states
  const [selectedStatus, setSelectedStatus] = useState<TaskStatus>("pending");
  const [remarksInput, setRemarksInput] = useState("");
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const loadPortalData = useCallback(async () => {
    if (!taskId) {
      setInvalidTokenError("Task ID is missing from the link.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setRevokedReason(null);
    setInvalidTokenError(null);

    try {
      const fetchedTask = await getStaffTaskById(taskId);
      if (!fetchedTask) {
        setInvalidTokenError("This task could not be found or has been deleted by Admin.");
        setLoading(false);
        return;
      }

      // Check if link was explicitly revoked due to inactive employee
      if (
        fetchedTask.assignedEmployeeActive === false ||
        String(fetchedTask.accessToken || "").startsWith("revoked_")
      ) {
        setRevokedReason(
          "This task link has been automatically invalidated because the assigned employee account is no longer active."
        );
        setLoading(false);
        return;
      }

      // Validate token from URL
      if (!urlToken || fetchedTask.accessToken !== urlToken) {
        setInvalidTokenError(
          "This task link has expired or is invalid. Please request a fresh WhatsApp task link from Zorba Admin."
        );
        setLoading(false);
        return;
      }

      const fetchedMember = await getTeamMemberById(fetchedTask.assignedToId);
      if (!fetchedMember || fetchedMember.active === false) {
        setRevokedReason(
          "Access Revoked: Your employee profile is currently marked as inactive in Zorba Infotech. Task links are disabled for inactive staff."
        );
        setLoading(false);
        return;
      }

      setTask(fetchedTask);
      setMember(fetchedMember);
      setActiveTaskId(fetchedTask.id);
      setSelectedStatus(fetchedTask.status || "pending");
      setRemarksInput(fetchedTask.staffRemarks || "");

      // Check if PIN was already verified in this browser session
      const cachedPin = sessionStorage.getItem(`zorba_staff_portal_pin_${fetchedMember.id}`);
      if (cachedPin && fetchedMember.pin && cachedPin === fetchedMember.pin) {
        setUnlockedPin(cachedPin);
        const allForMember = await getStaffTasksByEmployee(fetchedMember.id);
        setEmployeeTasks(allForMember);
      }
    } catch (err) {
      setInvalidTokenError(err instanceof Error ? err.message : "Failed to load task portal.");
    } finally {
      setLoading(false);
    }
  }, [taskId, urlToken]);

  useEffect(() => {
    loadPortalData();
  }, [loadPortalData]);

  const currentTask =
    employeeTasks.find((t) => t.id === activeTaskId) || task;

  useEffect(() => {
    if (currentTask) {
      setSelectedStatus(currentTask.status || "pending");
      setRemarksInput(currentTask.staffRemarks || "");
    }
  }, [currentTask]);

  const handleSetupPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!member) return;
    setPinError("");

    const cleanPin = pinInput.trim();
    if (!/^\d{4,6}$/.test(cleanPin)) {
      setPinError("Please enter a 4 to 6 digit numeric PIN.");
      return;
    }
    if (cleanPin !== confirmPinInput.trim()) {
      setPinError("Both PIN entries do not match. Please re-enter carefully.");
      return;
    }

    setSubmittingPin(true);
    try {
      const updatedMember = await setupStaffPinFromTaskPortal(member.id, cleanPin);
      setMember(updatedMember);
      setUnlockedPin(cleanPin);
      sessionStorage.setItem(`zorba_staff_portal_pin_${member.id}`, cleanPin);
      const allForMember = await getStaffTasksByEmployee(member.id);
      setEmployeeTasks(allForMember);
      toast.success("Your personal Staff PIN has been saved! Tasks unlocked.");
    } catch (err) {
      setPinError(err instanceof Error ? err.message : "Failed to save PIN.");
    } finally {
      setSubmittingPin(false);
    }
  };

  const handleVerifyPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!member) return;
    setPinError("");

    // Re-verify employee is still active in Firestore before unlocking
    setSubmittingPin(true);
    try {
      const freshMember = await getTeamMemberById(member.id);
      if (!freshMember || freshMember.active === false) {
        setRevokedReason(
          "Access Revoked: Your employee account is no longer active. This task link is disabled."
        );
        return;
      }
      if (!freshMember.pin || freshMember.pin.trim() !== pinInput.trim()) {
        setPinError("Incorrect PIN. Please enter your personal 4-6 digit Staff PIN.");
        return;
      }
      setMember(freshMember);
      setUnlockedPin(freshMember.pin.trim());
      sessionStorage.setItem(`zorba_staff_portal_pin_${freshMember.id}`, freshMember.pin.trim());
      const allForMember = await getStaffTasksByEmployee(freshMember.id);
      setEmployeeTasks(allForMember);
      toast.success(`Welcome, ${freshMember.name}!`);
    } catch (err) {
      setPinError(err instanceof Error ? err.message : "Could not verify PIN.");
    } finally {
      setSubmittingPin(false);
    }
  };

  const handleSaveStatusUpdate = async (statusOverride?: TaskStatus) => {
    if (!currentTask || !member || !unlockedPin) return;
    const nextStatus = statusOverride || selectedStatus;
    setUpdatingStatus(true);
    try {
      const updated = await updateTaskStatusFromStaffPortal({
        taskId: currentTask.id,
        accessToken: currentTask.id === task?.id ? urlToken : undefined,
        employeeId: member.id,
        pin: unlockedPin,
        status: nextStatus,
        remarks: remarksInput,
      });

      setSelectedStatus(nextStatus);
      if (task && updated.id === task.id) {
        setTask(updated);
      }
      setEmployeeTasks((prev) =>
        prev.map((item) => (item.id === updated.id ? updated : item))
      );
      toast.success(`Task marked as "${STATUS_META[nextStatus].label}"!`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to update task.";
      toast.error(msg);
      if (msg.toLowerCase().includes("inactive") || msg.toLowerCase().includes("revoked")) {
        setRevokedReason(msg);
      }
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleLockPortal = () => {
    if (member) {
      sessionStorage.removeItem(`zorba_staff_portal_pin_${member.id}`);
    }
    setUnlockedPin("");
    setPinInput("");
    setConfirmPinInput("");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-sm text-center space-y-3">
          <RefreshCw className="h-8 w-8 text-blue-600 animate-spin mx-auto" />
          <h1 className="text-lg font-extrabold text-slate-900 dark:text-white">
            Loading Zorba Staff Task Portal...
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Verifying task link & employee status...
          </p>
        </div>
      </div>
    );
  }

  // 1. Revoked / Inactive Employee Screen
  if (revokedReason) {
    return (
      <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-7 max-w-md w-full border-2 border-red-300 dark:border-red-800 shadow-md text-center space-y-4">
          <div className="h-14 w-14 rounded-2xl bg-red-100 dark:bg-red-950/80 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto">
            <ShieldAlert className="h-8 w-8" />
          </div>
          <h1 className="text-xl font-extrabold text-slate-900 dark:text-white">
            Task Link Invalidated
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            {revokedReason}
          </p>
          <div className="p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs font-semibold text-red-800 dark:text-red-300">
            If you believe this is a mistake, please contact the Zorba Infotech Admin Desk.
          </div>
        </div>
      </div>
    );
  }

  // 2. Invalid / Expired Token Screen
  if (invalidTokenError || !task || !member) {
    return (
      <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-7 max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-md text-center space-y-4">
          <div className="h-14 w-14 rounded-2xl bg-amber-100 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
            <AlertOctagon className="h-8 w-8" />
          </div>
          <h1 className="text-xl font-extrabold text-slate-900 dark:text-white">
            Invalid or Expired Task Link
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            {invalidTokenError || "This task link is no longer valid."}
          </p>
        </div>
      </div>
    );
  }

  // 3. Employee PIN Setup OR PIN Verification Gate
  if (!unlockedPin) {
    const needsPinSetup = !member.pin || member.pin.trim() === "";

    return (
      <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-lg space-y-6">
          <div className="text-center space-y-2">
            <div className="h-14 w-14 rounded-2xl bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto border border-blue-200 dark:border-blue-800">
              {needsPinSetup ? <KeyRound className="h-7 w-7" /> : <Lock className="h-7 w-7" />}
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300">
              <UserCheck className="h-3.5 w-3.5 text-emerald-600" />
              <span>Staff Member: {member.name}</span>
            </div>
            <h1 className="text-xl font-extrabold text-slate-900 dark:text-white pt-1">
              {needsPinSetup ? "Set Up Your Personal PIN" : "Enter Your Staff PIN"}
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              {needsPinSetup
                ? "Create a 4 to 6 digit numeric PIN for your account. You will use this PIN whenever you open task links on WhatsApp."
                : "Enter your 4 to 6 digit personal Staff PIN to view and update your assigned tasks."}
            </p>
          </div>

          {needsPinSetup ? (
            <form onSubmit={handleSetupPin} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="new-pin" className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Create 4–6 Digit Numeric PIN
                </Label>
                <Input
                  id="new-pin"
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ""))}
                  placeholder="e.g. 1234"
                  className="h-12 text-center text-xl font-mono font-extrabold tracking-widest rounded-2xl"
                  autoFocus
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirm-pin" className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Confirm Your PIN
                </Label>
                <Input
                  id="confirm-pin"
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={confirmPinInput}
                  onChange={(e) => setConfirmPinInput(e.target.value.replace(/\D/g, ""))}
                  placeholder="Re-enter PIN"
                  className="h-12 text-center text-xl font-mono font-extrabold tracking-widest rounded-2xl"
                  required
                />
              </div>

              {pinError && (
                <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 text-xs font-bold text-red-700 dark:text-red-300 text-center">
                  {pinError}
                </div>
              )}

              <Button
                type="submit"
                disabled={submittingPin}
                className="w-full h-12 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm shadow-sm cursor-pointer"
              >
                {submittingPin ? "Saving PIN..." : "Save My PIN & View Task"}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerifyPin} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="verify-pin" className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Your Personal Staff PIN
                </Label>
                <Input
                  id="verify-pin"
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ""))}
                  placeholder="••••"
                  className="h-12 text-center text-2xl font-mono font-extrabold tracking-widest rounded-2xl"
                  autoFocus
                  required
                />
              </div>

              {pinError && (
                <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 text-xs font-bold text-red-700 dark:text-red-300 text-center">
                  {pinError}
                </div>
              )}

              <Button
                type="submit"
                disabled={submittingPin}
                className="w-full h-12 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm shadow-sm cursor-pointer"
              >
                {submittingPin ? "Verifying..." : "Unlock My Tasks"}
              </Button>
            </form>
          )}
        </div>
      </div>
    );
  }

  // 4. Unlocked Staff Task View & 1-Tap Status Update Board
  const priorityInfo = PRIORITY_META[currentTask?.priority || "p2"] || PRIORITY_META.p2;
  const statusInfo = STATUS_META[currentTask?.status || "pending"] || STATUS_META.pending;

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 py-6 px-3.5 sm:px-6">
      <div className="max-w-xl mx-auto space-y-5">
        {/* Top Bar */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-2xs flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[11px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
              Zorba Infotech • Staff Task Portal
            </div>
            <div className="text-base font-extrabold text-slate-900 dark:text-white truncate">
              👋 {member.name}
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleLockPortal}
            className="h-9 px-3 rounded-xl text-xs font-bold gap-1.5 shrink-0 cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Lock</span>
          </Button>
        </div>

        {/* Main Active Task Card */}
        {currentTask && (
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span
                className={`inline-flex items-center px-2.5 py-1 rounded-xl text-xs font-extrabold border ${priorityInfo.badgeClass}`}
              >
                {priorityInfo.label}
              </span>
              <span
                className={`inline-flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-extrabold border ${statusInfo.badgeClass}`}
              >
                <span>{statusInfo.emoji}</span>
                <span>{statusInfo.label}</span>
              </span>
            </div>

            <div className="space-y-2">
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white leading-snug">
                {currentTask.title}
              </h1>
              {currentTask.description && (
                <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap bg-slate-50 dark:bg-slate-800/70 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 leading-relaxed">
                  {currentTask.description}
                </p>
              )}
            </div>

            {/* Metadata chips: Due date / Linked Ticket / Customer */}
            <div className="flex flex-wrap gap-2 text-xs">
              {currentTask.dueDate && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 font-bold text-slate-700 dark:text-slate-300">
                  <Calendar className="h-3.5 w-3.5 text-blue-600" />
                  <span>Due: {currentTask.dueDate}</span>
                </div>
              )}
              {currentTask.linkedTicketNo && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 font-mono font-bold text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  <Wrench className="h-3.5 w-3.5" />
                  <span>Ticket: {currentTask.linkedTicketNo}</span>
                </div>
              )}
              {currentTask.linkedCustomerName && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 font-bold text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  <FileText className="h-3.5 w-3.5" />
                  <span>Customer: {currentTask.linkedCustomerName}</span>
                </div>
              )}
            </div>

            {/* 1-Tap Status Buttons (Large 48px+ targets for easy phone tapping) */}
            <div className="space-y-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
              <Label className="text-xs font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                Tap to Update Task Status:
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {(["in_progress", "completed", "blocked", "pending"] as TaskStatus[]).map((st) => {
                  const meta = STATUS_META[st];
                  const isSelected = selectedStatus === st;
                  return (
                    <button
                      key={st}
                      type="button"
                      disabled={updatingStatus}
                      onClick={() => {
                        setSelectedStatus(st);
                        handleSaveStatusUpdate(st);
                      }}
                      className={`h-12 px-4 rounded-2xl font-extrabold text-sm flex items-center justify-center gap-2 border-2 transition-all cursor-pointer ${
                        isSelected
                          ? meta.activeClass
                          : "bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-blue-400"
                      }`}
                    >
                      <span className="text-base">{meta.emoji}</span>
                      <span>{meta.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Remarks / Notes input */}
            <div className="space-y-2 pt-1">
              <Label htmlFor="staff-remarks" className="text-xs font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                Your Update Note / Remarks (Optional):
              </Label>
              <Textarea
                id="staff-remarks"
                rows={3}
                value={remarksInput}
                onChange={(e) => setRemarksInput(e.target.value)}
                placeholder="Write any update, serial number, payment collected, or reason if blocked..."
                className="rounded-2xl text-sm bg-slate-50 dark:bg-slate-800/70"
              />
              <Button
                type="button"
                disabled={updatingStatus}
                onClick={() => handleSaveStatusUpdate()}
                className="w-full h-12 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm shadow-xs cursor-pointer gap-2"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>{updatingStatus ? "Saving Update..." : "Save Status & Remarks"}</span>
              </Button>
            </div>
          </div>
        )}

        {/* Other Active Tasks for this Employee */}
        {employeeTasks.length > 1 && (
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-blue-600" />
                <span>All Tasks Assigned to You ({employeeTasks.length})</span>
              </h2>
            </div>
            <div className="space-y-2">
              {employeeTasks.map((t) => {
                const isCurrent = t.id === currentTask?.id;
                const pMeta = PRIORITY_META[t.priority || "p2"] || PRIORITY_META.p2;
                const sMeta = STATUS_META[t.status || "pending"] || STATUS_META.pending;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setActiveTaskId(t.id)}
                    className={`w-full text-left p-3.5 rounded-2xl border transition-all flex items-start justify-between gap-3 cursor-pointer ${
                      isCurrent
                        ? "bg-blue-50/90 dark:bg-blue-950/50 border-blue-400 dark:border-blue-700"
                        : "bg-slate-50/70 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800 hover:border-blue-300"
                    }`}
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-extrabold border ${pMeta.badgeClass}`}>
                          {(t.priority || "p2").toUpperCase()}
                        </span>
                        <span className="font-bold text-sm text-slate-900 dark:text-white truncate">
                          {t.title}
                        </span>
                      </div>
                      {t.dueDate && (
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                          📅 Due: {t.dueDate}
                        </div>
                      )}
                    </div>
                    <span className={`shrink-0 px-2 py-0.5 rounded-lg text-[11px] font-bold border ${sMeta.badgeClass}`}>
                      {sMeta.emoji} {sMeta.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
