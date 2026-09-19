import { useState, useEffect, useMemo, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  getStaffTasks,
  createStaffTask,
  updateStaffTask,
  deleteStaffTask,
  rotateStaffTaskToken,
  getTeamMembers,
} from "@/lib/firestore";
import { subscribeSyncSignal } from "@/lib/realtimeSync";
import { useStaffProfile } from "@/contexts/StaffProfileContext";
import type { StaffTask, TaskPriority, TaskStatus, TeamMember } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import WhatsAppPreviewModal from "@/components/admin/WhatsAppPreviewModal";
import { LoadingScreen, EmptyState } from "@/components/common";
import {
  ClipboardCheck,
  Plus,
  Search,
  Send,
  Copy,
  Edit,
  Trash2,
  Calendar,
  User,
  ShieldAlert,
  KeyRound,
  RefreshCw,
  Wrench,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";

export const TASK_PRIORITY_CONFIG: Record<
  TaskPriority,
  { label: string; shortLabel: string; badgeClass: string; sortWeight: number }
> = {
  p0: {
    label: "P0 — Critical / Immediate",
    shortLabel: "P0 • Critical",
    badgeClass:
      "bg-red-100 text-red-900 border-red-300 dark:bg-red-950/80 dark:text-red-200 dark:border-red-800",
    sortWeight: 0,
  },
  p1: {
    label: "P1 — High Priority",
    shortLabel: "P1 • High",
    badgeClass:
      "bg-orange-100 text-orange-900 border-orange-300 dark:bg-orange-950/80 dark:text-orange-200 dark:border-orange-800",
    sortWeight: 1,
  },
  p2: {
    label: "P2 — Normal (Default)",
    shortLabel: "P2 • Normal",
    badgeClass:
      "bg-blue-100 text-blue-900 border-blue-300 dark:bg-blue-950/80 dark:text-blue-200 dark:border-blue-800",
    sortWeight: 2,
  },
  p3: {
    label: "P3 — Low Priority",
    shortLabel: "P3 • Low",
    badgeClass:
      "bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700",
    sortWeight: 3,
  },
  p4: {
    label: "P4 — Minor / Backlog",
    shortLabel: "P4 • Backlog",
    badgeClass:
      "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800",
    sortWeight: 4,
  },
};

export const TASK_STATUS_CONFIG: Record<
  TaskStatus,
  { label: string; emoji: string; badgeClass: string }
> = {
  pending: {
    label: "Pending",
    emoji: "⏳",
    badgeClass:
      "bg-amber-50 text-amber-900 border-amber-300 dark:bg-amber-950/70 dark:text-amber-200 dark:border-amber-800",
  },
  in_progress: {
    label: "In Progress",
    emoji: "🔧",
    badgeClass:
      "bg-blue-50 text-blue-900 border-blue-300 dark:bg-blue-950/70 dark:text-blue-200 dark:border-blue-800",
  },
  completed: {
    label: "Completed",
    emoji: "✅",
    badgeClass:
      "bg-emerald-50 text-emerald-900 border-emerald-300 dark:bg-emerald-950/70 dark:text-emerald-200 dark:border-emerald-800",
  },
  blocked: {
    label: "Blocked / Help Needed",
    emoji: "🔴",
    badgeClass:
      "bg-rose-50 text-rose-900 border-rose-300 dark:bg-rose-950/70 dark:text-rose-200 dark:border-rose-800",
  },
};

import { getPublicAppOrigin } from "@/lib/utils";

export function buildTaskPortalUrl(task: StaffTask, forExternalWhatsApp = false): string {
  const origin = forExternalWhatsApp
    ? getPublicAppOrigin()
    : typeof window !== "undefined"
    ? window.location.origin
    : getPublicAppOrigin();
  return `${origin}/t/${task.id}?k=${encodeURIComponent(task.accessToken)}`;
}

export function buildTaskWhatsAppMessage(task: StaffTask): string {
  const priorityLabel = TASK_PRIORITY_CONFIG[task.priority || "p2"]?.shortLabel || "P2 • Normal";
  const portalUrl = buildTaskPortalUrl(task, true);
  const lines = [
    `Hi *${task.assignedToName}*,`,
    ``,
    `📋 *New Task Assigned — Zorba Infotech*`,
    `⚡ *Priority:* ${priorityLabel}`,
    `📌 *Task:* ${task.title}`,
  ];
  if (task.dueDate) {
    lines.push(`📅 *Due Date:* ${task.dueDate}`);
  }
  if (task.linkedTicketNo) {
    lines.push(`🔧 *Ref Ticket:* ${task.linkedTicketNo}`);
  }
  if (task.linkedCustomerName) {
    lines.push(`🏢 *Customer:* ${task.linkedCustomerName}`);
  }
  if (task.description) {
    lines.push(`\n📝 *Details:*\n${task.description}`);
  }
  lines.push(
    `\n🔐 *Open link below to view & update task status:*\n${portalUrl}`
  );
  return lines.join("\n");
}

export default function AdminTasks() {
  const [searchParams] = useSearchParams();
  const initialEmployeeFilter = searchParams.get("employee") || "all";
  const { activeProfile: activeStaff } = useStaffProfile();

  const [tasks, setTasks] = useState<StaffTask[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [statusTab, setStatusTab] = useState<"active" | "completed" | "all">("active");
  const [employeeFilter, setEmployeeFilter] = useState<string>(initialEmployeeFilter);
  const [priorityFilter, setPriorityFilter] = useState<string>("all");

  // Create / Edit Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<StaffTask | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("p2");
  const [status, setStatus] = useState<TaskStatus>("pending");
  const [dueDate, setDueDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [assignedToId, setAssignedToId] = useState("");
  const [linkedTicketNo, setLinkedTicketNo] = useState("");
  const [linkedCustomerName, setLinkedCustomerName] = useState("");
  const [staffRemarks, setStaffRemarks] = useState("");
  const [sendWhatsAppOnCreate, setSendWhatsAppOnCreate] = useState(true);
  const [saving, setSaving] = useState(false);

  // WhatsApp Preview Modal
  const [waTask, setWaTask] = useState<StaffTask | null>(null);

  const loadData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [tasksRes, teamRes] = await Promise.allSettled([
        getStaffTasks(),
        getTeamMembers(),
      ]);
      if (tasksRes.status === "fulfilled") {
        setTasks(tasksRes.value);
      }
      if (teamRes.status === "fulfilled") {
        setTeam(teamRes.value);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load staff tasks.");
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const unsubTasks = subscribeSyncSignal("staff_tasks", () => loadData(true));
    const unsubTeam = subscribeSyncSignal("team", () => loadData(true));
    return () => {
      unsubTasks();
      unsubTeam();
    };
  }, [loadData]);

  const teamById = useMemo(() => {
    const map = new Map<string, TeamMember>();
    team.forEach((m) => map.set(m.id, m));
    return map;
  }, [team]);

  const activeTeamMembers = useMemo(
    () => team.filter((m) => m.active !== false),
    [team]
  );

  // Ensure assignedToId defaults to first active employee once team finishes loading
  useEffect(() => {
    if (!assignedToId && activeTeamMembers.length > 0 && !editingTask) {
      setAssignedToId(activeTeamMembers[0].id);
    }
  }, [assignedToId, activeTeamMembers, editingTask]);

  const isTaskEmployeeActive = useCallback(
    (task: StaffTask): boolean => {
      if (task.assignedEmployeeActive === false) return false;
      if (String(task.accessToken || "").startsWith("revoked_")) return false;
      const member = teamById.get(task.assignedToId);
      return member ? member.active !== false : true;
    },
    [teamById]
  );

  const openCreateModal = (preselectEmployeeId?: string) => {
    setEditingTask(null);
    setTitle("");
    setDescription("");
    setPriority("p2"); // Always default to P2
    setStatus("pending");
    setDueDate(new Date().toISOString().slice(0, 10));
    const defaultMemberId =
      preselectEmployeeId && preselectEmployeeId !== "all"
        ? preselectEmployeeId
        : activeTeamMembers[0]?.id || "";
    setAssignedToId(defaultMemberId);
    setLinkedTicketNo("");
    setLinkedCustomerName("");
    setStaffRemarks("");
    setSendWhatsAppOnCreate(true);
    setModalOpen(true);
  };

  const openEditModal = (task: StaffTask) => {
    setEditingTask(task);
    setTitle(task.title);
    setDescription(task.description || "");
    setPriority(task.priority || "p2");
    setStatus(task.status || "pending");
    setDueDate(task.dueDate || "");
    setAssignedToId(task.assignedToId);
    setLinkedTicketNo(task.linkedTicketNo || "");
    setLinkedCustomerName(task.linkedCustomerName || "");
    setStaffRemarks(task.staffRemarks || "");
    setModalOpen(true);
  };

  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Please enter a task title.");
      return;
    }
    const assignee = teamById.get(assignedToId);
    if (!assignee) {
      toast.error("Please select an employee to assign this task.");
      return;
    }
    if (!assignee.active) {
      toast.error("Cannot assign a task to an inactive employee. Please activate their profile first.");
      return;
    }

    setSaving(true);
    try {
      if (editingTask) {
        await updateStaffTask(
          editingTask.id,
          {
            title: title.trim(),
            description: description.trim(),
            priority: priority || "p2",
            status,
            dueDate: dueDate || undefined,
            assignedToId: assignee.id,
            assignedToName: assignee.name,
            assignedToPhone: assignee.phone,
            assignedEmployeeActive: assignee.active,
            linkedTicketNo: linkedTicketNo.trim() || undefined,
            linkedCustomerName: linkedCustomerName.trim() || undefined,
            staffRemarks: staffRemarks.trim() || undefined,
          },
          activeStaff?.name || "Admin"
        );
        toast.success("Task updated!");
        setModalOpen(false);
        await loadData(true);
      } else {
        const created = await createStaffTask({
          title: title.trim(),
          description: description.trim(),
          priority: priority || "p2",
          status: "pending",
          dueDate: dueDate || undefined,
          assignedToId: assignee.id,
          assignedToName: assignee.name,
          assignedToPhone: assignee.phone,
          assignedEmployeeActive: assignee.active,
          createdByStaffId: activeStaff?.id,
          createdByStaffName: activeStaff?.name || "Admin",
          linkedTicketNo: linkedTicketNo.trim() || undefined,
          linkedCustomerName: linkedCustomerName.trim() || undefined,
        });
        toast.success(`Task assigned to ${assignee.name}!`);
        setModalOpen(false);
        await loadData(true);
        if (sendWhatsAppOnCreate) {
          setWaTask(created);
        }
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save task.");
    } finally {
      setSaving(false);
    }
  };

  const handleQuickStatusChange = async (task: StaffTask, nextStatus: TaskStatus) => {
    try {
      await updateStaffTask(
        task.id,
        { status: nextStatus },
        activeStaff?.name || "Admin"
      );
      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, status: nextStatus } : t))
      );
      toast.success(`Task marked as ${TASK_STATUS_CONFIG[nextStatus].label}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update status.");
    }
  };

  const handleCopyPortalLink = async (task: StaffTask) => {
    if (!isTaskEmployeeActive(task)) {
      toast.error("Task link is invalidated because the assigned employee is inactive.");
      return;
    }
    const url = buildTaskPortalUrl(task);
    try {
      await navigator.clipboard.writeText(url);
      toast.success("PIN-protected Staff Task link copied to clipboard!");
    } catch {
      toast.error("Could not copy link.");
    }
  };

  const handleRotateLink = async (task: StaffTask) => {
    if (!isTaskEmployeeActive(task)) {
      toast.error("Cannot generate link for an inactive employee.");
      return;
    }
    try {
      const newToken = await rotateStaffTaskToken(task.id);
      const updated = { ...task, accessToken: newToken };
      setTasks((prev) => prev.map((t) => (t.id === task.id ? updated : t)));
      toast.success("Old task link invalidated & new secret link generated!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to rotate link.");
    }
  };

  const handleDelete = async (task: StaffTask) => {
    if (!window.confirm(`Delete task "${task.title}" assigned to ${task.assignedToName}?`)) {
      return;
    }
    try {
      await deleteStaffTask(task.id);
      setTasks((prev) => prev.filter((t) => t.id !== task.id));
      toast.success("Task deleted.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete task.");
    }
  };

  // Filtered & sorted tasks (sorted by P0 -> P4, then newest first)
  const filteredTasks = useMemo(() => {
    return tasks
      .filter((t) => {
        if (statusTab === "active" && t.status === "completed") return false;
        if (statusTab === "completed" && t.status !== "completed") return false;
        if (employeeFilter !== "all" && t.assignedToId !== employeeFilter) return false;
        if (priorityFilter !== "all" && (t.priority || "p2") !== priorityFilter) return false;
        if (search.trim()) {
          const q = search.toLowerCase();
          return (
            t.title.toLowerCase().includes(q) ||
            (t.description || "").toLowerCase().includes(q) ||
            t.assignedToName.toLowerCase().includes(q) ||
            (t.linkedTicketNo || "").toLowerCase().includes(q) ||
            (t.linkedCustomerName || "").toLowerCase().includes(q)
          );
        }
        return true;
      })
      .sort((a, b) => {
        const weightA = TASK_PRIORITY_CONFIG[a.priority || "p2"]?.sortWeight ?? 2;
        const weightB = TASK_PRIORITY_CONFIG[b.priority || "p2"]?.sortWeight ?? 2;
        if (weightA !== weightB) return weightA - weightB;
        return (b.createdAt || 0) - (a.createdAt || 0);
      });
  }, [tasks, statusTab, employeeFilter, priorityFilter, search]);

  const stats = useMemo(() => {
    const active = tasks.filter((t) => t.status !== "completed");
    return {
      activeCount: active.length,
      urgentCount: active.filter((t) => t.priority === "p0" || t.priority === "p1").length,
      inProgressCount: active.filter((t) => t.status === "in_progress").length,
      blockedCount: active.filter((t) => t.status === "blocked").length,
      completedCount: tasks.filter((t) => t.status === "completed").length,
    };
  }, [tasks]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <ClipboardCheck className="h-6 w-6 text-blue-600" />
            <span>Staff Tasks & WhatsApp Assignments</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-medium mt-0.5">
            Assign P0–P4 tasks to employees, send PIN-protected update links on WhatsApp, and track live status.
          </p>
        </div>
        <Button
          type="button"
          onClick={() => openCreateModal(employeeFilter)}
          className="h-10 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm gap-1.5 shadow-xs cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>Assign New Task</span>
        </Button>
      </div>

      {/* KPI Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-3.5 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="text-[11px] font-bold uppercase text-slate-500">Active Tasks</div>
          <div className="text-2xl font-extrabold text-slate-900 dark:text-white mt-0.5">
            {stats.activeCount}
          </div>
        </div>
        <div className="bg-red-50/70 dark:bg-red-950/30 rounded-2xl p-3.5 border border-red-200 dark:border-red-900/70 shadow-2xs">
          <div className="text-[11px] font-bold uppercase text-red-700 dark:text-red-300">P0 / P1 High</div>
          <div className="text-2xl font-extrabold text-red-700 dark:text-red-300 mt-0.5">
            {stats.urgentCount}
          </div>
        </div>
        <div className="bg-blue-50/70 dark:bg-blue-950/30 rounded-2xl p-3.5 border border-blue-200 dark:border-blue-900/70 shadow-2xs">
          <div className="text-[11px] font-bold uppercase text-blue-700 dark:text-blue-300">In Progress</div>
          <div className="text-2xl font-extrabold text-blue-700 dark:text-blue-300 mt-0.5">
            {stats.inProgressCount}
          </div>
        </div>
        <div className="bg-rose-50/70 dark:bg-rose-950/30 rounded-2xl p-3.5 border border-rose-200 dark:border-rose-900/70 shadow-2xs">
          <div className="text-[11px] font-bold uppercase text-rose-700 dark:text-rose-300">Blocked</div>
          <div className="text-2xl font-extrabold text-rose-700 dark:text-rose-300 mt-0.5">
            {stats.blockedCount}
          </div>
        </div>
        <div className="bg-emerald-50/70 dark:bg-emerald-950/30 rounded-2xl p-3.5 border border-emerald-200 dark:border-emerald-900/70 shadow-2xs col-span-2 sm:col-span-1">
          <div className="text-[11px] font-bold uppercase text-emerald-700 dark:text-emerald-300">Completed</div>
          <div className="text-2xl font-extrabold text-emerald-700 dark:text-emerald-300 mt-0.5">
            {stats.completedCount}
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-3.5 border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-fit">
          {(["active", "completed", "all"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setStatusTab(tab)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                statusTab === tab
                  ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-2xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              {tab === "active"
                ? `Active (${stats.activeCount})`
                : tab === "completed"
                ? `Completed (${stats.completedCount})`
                : `All (${tasks.length})`}
            </button>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1 lg:max-w-2xl">
          <div className="relative flex-1">
            <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search task title, employee, ticket #, customer..."
              className="pl-9 h-9 text-xs rounded-xl"
            />
          </div>

          <Select value={employeeFilter} onValueChange={setEmployeeFilter}>
            <SelectTrigger className="w-full sm:w-44 h-9 text-xs font-semibold rounded-xl">
              <SelectValue placeholder="All Employees" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Employees</SelectItem>
              {team.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.name} {!m.active ? "(Inactive)" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-full sm:w-36 h-9 text-xs font-semibold rounded-xl">
              <SelectValue placeholder="All Priorities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priorities</SelectItem>
              <SelectItem value="p0">P0 • Critical</SelectItem>
              <SelectItem value="p1">P1 • High</SelectItem>
              <SelectItem value="p2">P2 • Normal</SelectItem>
              <SelectItem value="p3">P3 • Low</SelectItem>
              <SelectItem value="p4">P4 • Backlog</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tasks List */}
      {loading ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
          <LoadingScreen fullScreen={false} title="Staff Tasks" subtitle="Loading employee assignments..." />
        </div>
      ) : filteredTasks.length === 0 ? (
        <EmptyState
          icon={ClipboardCheck}
          title="No Staff Tasks Found"
          description="Assign tasks to technicians or office staff and send them a PIN-protected WhatsApp update link."
          actionLabel="Assign First Task"
          actionIcon={Plus}
          onAction={() => openCreateModal(employeeFilter)}
        />
      ) : (
        <div className="grid grid-cols-1 gap-3.5">
          {filteredTasks.map((task) => {
            const pConfig = TASK_PRIORITY_CONFIG[task.priority || "p2"] || TASK_PRIORITY_CONFIG.p2;
            const sConfig = TASK_STATUS_CONFIG[task.status || "pending"] || TASK_STATUS_CONFIG.pending;
            const member = teamById.get(task.assignedToId);
            const employeeActive = isTaskEmployeeActive(task);
            const hasPinConfigured = Boolean(member?.pin && member.pin.trim() !== "");

            return (
              <div
                key={task.id}
                className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-2xs hover:border-blue-300 dark:hover:border-blue-800 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4"
              >
                <div className="space-y-2.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`px-2.5 py-0.5 rounded-lg text-xs font-extrabold border ${pConfig.badgeClass}`}>
                      {pConfig.shortLabel}
                    </span>

                    <Link
                      to={`/admin/team/${task.assignedToId}`}
                      className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200 hover:text-blue-600"
                    >
                      <User className="h-3.5 w-3.5 text-blue-600" />
                      <span>{task.assignedToName}</span>
                    </Link>

                    {!employeeActive ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-red-100 dark:bg-red-950/80 text-red-800 dark:text-red-200 border border-red-300 dark:border-red-800 text-[11px] font-extrabold">
                        <ShieldAlert className="h-3.5 w-3.5" />
                        <span>Link Invalidated (Staff Inactive)</span>
                      </span>
                    ) : (
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold ${
                          hasPinConfigured
                            ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                            : "bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                        }`}
                        title={
                          hasPinConfigured
                            ? "Employee has a personal PIN set up"
                            : "Employee will be prompted to set up their PIN when opening the link"
                        }
                      >
                        <KeyRound className="h-3 w-3" />
                        <span>{hasPinConfigured ? "PIN Active" : "PIN Setup on First Open"}</span>
                      </span>
                    )}

                    {task.dueDate && (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>Due: {task.dueDate}</span>
                      </span>
                    )}
                  </div>

                  <div>
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-white leading-snug">
                      {task.title}
                    </h3>
                    {task.description && (
                      <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1 whitespace-pre-wrap">
                        {task.description}
                      </p>
                    )}
                  </div>

                  {/* Linked Ticket / Customer / Staff Remarks */}
                  <div className="flex flex-wrap items-center gap-2 pt-0.5">
                    {task.linkedTicketNo && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-mono text-xs font-bold border border-blue-200 dark:border-blue-800">
                        <Wrench className="h-3 w-3" />
                        <span>Ticket: {task.linkedTicketNo}</span>
                      </span>
                    )}
                    {task.linkedCustomerName && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold">
                        <span>🏢 {task.linkedCustomerName}</span>
                      </span>
                    )}
                    {task.staffRemarks && (
                      <div className="w-full mt-1 p-2.5 rounded-xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/70 text-xs text-amber-950 dark:text-amber-200">
                        <strong className="font-extrabold">💬 Staff Update Note:</strong> {task.staffRemarks}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Controls: Status Select + WhatsApp Share + Copy Link + Edit/Delete */}
                <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100 dark:border-slate-800">
                  <Select
                    value={task.status}
                    onValueChange={(val: TaskStatus) => handleQuickStatusChange(task, val)}
                  >
                    <SelectTrigger className={`h-9 w-40 text-xs font-extrabold rounded-xl border ${sConfig.badgeClass}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">⏳ Pending</SelectItem>
                      <SelectItem value="in_progress">🔧 In Progress</SelectItem>
                      <SelectItem value="completed">✅ Completed</SelectItem>
                      <SelectItem value="blocked">🔴 Blocked</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button
                    type="button"
                    size="sm"
                    disabled={!employeeActive}
                    onClick={() => setWaTask(task)}
                    className="h-9 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5 cursor-pointer disabled:opacity-40"
                    title={
                      employeeActive
                        ? "Send PIN-protected Task Link to Employee on WhatsApp"
                        : "Disabled because employee is inactive"
                    }
                  >
                    <Send className="h-3.5 w-3.5" />
                    <span>WhatsApp Link</span>
                  </Button>

                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={!employeeActive}
                    onClick={() => handleCopyPortalLink(task)}
                    className="h-9 px-2.5 rounded-xl text-xs font-bold gap-1 cursor-pointer"
                    title="Copy PIN-protected Staff Task Portal URL"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    <span className="hidden xl:inline">Copy Link</span>
                  </Button>

                  {employeeActive && (
                    <a
                      href={buildTaskPortalUrl(task)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center h-9 w-9 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                      title="Preview Staff PIN Portal in new tab"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}

                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => handleRotateLink(task)}
                    disabled={!employeeActive}
                    className="h-9 w-9 p-0 rounded-xl text-slate-500 hover:text-amber-600 cursor-pointer"
                    title="Reset / Invalidate current link & generate new token"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                  </Button>

                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => openEditModal(task)}
                    className="h-9 w-9 p-0 rounded-xl text-slate-500 hover:text-blue-600 cursor-pointer"
                    title="Edit Task"
                  >
                    <Edit className="h-3.5 w-3.5" />
                  </Button>

                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDelete(task)}
                    className="h-9 w-9 p-0 rounded-xl text-slate-500 hover:text-red-600 cursor-pointer"
                    title="Delete Task"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Task Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-lg rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-extrabold">
              {editingTask ? "Edit Staff Task" : "Assign New Task to Employee"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Assign a task with priority P0–P4 (defaults to P2). The employee receives a PIN-protected WhatsApp link to view and update status.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveTask} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="task-title" className="text-xs font-bold">
                Task Title <span className="text-red-500">*</span>
              </Label>
              <Input
                id="task-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Pick up repaired motherboards from Nehru Place Service Center"
                className="h-10 rounded-xl text-sm font-semibold"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">
                  Assign To Employee <span className="text-red-500">*</span>
                </Label>
                <Select value={assignedToId} onValueChange={setAssignedToId}>
                  <SelectTrigger className="h-10 rounded-xl text-xs font-bold">
                    <SelectValue placeholder={activeTeamMembers.length === 0 ? "No active employees found" : "Select Employee"} />
                  </SelectTrigger>
                  <SelectContent className="z-[200] max-h-64">
                    {activeTeamMembers.length === 0 ? (
                      <div className="p-2.5 text-xs text-slate-500 text-center">
                        No active employees found in Team & Personnel.
                      </div>
                    ) : (
                      activeTeamMembers.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.name} ({m.role || "Staff"})
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">
                  Priority (Optional • Default P2)
                </Label>
                <Select
                  value={priority}
                  onValueChange={(val: TaskPriority) => setPriority(val)}
                >
                  <SelectTrigger className="h-10 rounded-xl text-xs font-bold">
                    <SelectValue placeholder="P2 — Normal (Default)" />
                  </SelectTrigger>
                  <SelectContent className="z-[200]">
                    <SelectItem value="p0">P0 — Critical / Immediate</SelectItem>
                    <SelectItem value="p1">P1 — High Priority</SelectItem>
                    <SelectItem value="p2">P2 — Normal (Default)</SelectItem>
                    <SelectItem value="p3">P3 — Low Priority</SelectItem>
                    <SelectItem value="p4">P4 — Minor / Backlog</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="task-due" className="text-xs font-bold">
                  Due Date (Optional)
                </Label>
                <Input
                  id="task-due"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="h-10 rounded-xl text-xs font-semibold"
                />
              </div>

              {editingTask && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Current Status</Label>
                  <Select
                    value={status}
                    onValueChange={(val: TaskStatus) => setStatus(val)}
                  >
                    <SelectTrigger className="h-10 rounded-xl text-xs font-bold">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">⏳ Pending</SelectItem>
                      <SelectItem value="in_progress">🔧 In Progress</SelectItem>
                      <SelectItem value="completed">✅ Completed</SelectItem>
                      <SelectItem value="blocked">🔴 Blocked</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="task-ticket" className="text-xs font-bold">
                  Ref Ticket No. (Optional)
                </Label>
                <Input
                  id="task-ticket"
                  value={linkedTicketNo}
                  onChange={(e) => setLinkedTicketNo(e.target.value)}
                  placeholder="e.g. Z-2508-012"
                  className="h-9 rounded-xl text-xs font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="task-customer" className="text-xs font-bold">
                  Customer / Vendor Name (Optional)
                </Label>
                <Input
                  id="task-customer"
                  value={linkedCustomerName}
                  onChange={(e) => setLinkedCustomerName(e.target.value)}
                  placeholder="e.g. Secureye Delhi"
                  className="h-9 rounded-xl text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="task-desc" className="text-xs font-bold">
                Instructions / Details (Optional)
              </Label>
              <Textarea
                id="task-desc"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add step-by-step instructions, address, or contact person details..."
                className="rounded-xl text-xs"
              />
            </div>

            {editingTask && (
              <div className="space-y-1.5">
                <Label htmlFor="task-remarks" className="text-xs font-bold">
                  Staff Update Remarks
                </Label>
                <Input
                  id="task-remarks"
                  value={staffRemarks}
                  onChange={(e) => setStaffRemarks(e.target.value)}
                  placeholder="Remarks from employee or admin..."
                  className="h-9 rounded-xl text-xs"
                />
              </div>
            )}

            {!editingTask && (
              <label className="flex items-center gap-2.5 p-3 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sendWhatsAppOnCreate}
                  onChange={(e) => setSendWhatsAppOnCreate(e.target.checked)}
                  className="h-4 w-4 rounded accent-emerald-600"
                />
                <span className="text-xs font-bold text-emerald-950 dark:text-emerald-200">
                  Immediately open WhatsApp to send the PIN-protected task link to employee
                </span>
              </label>
            )}

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalOpen(false)}
                className="rounded-xl text-xs font-bold"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold"
              >
                {saving
                  ? "Saving..."
                  : editingTask
                  ? "Save Changes"
                  : "Create Task"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* WhatsApp Share Modal for Task Link */}
      {waTask && (
        <WhatsAppPreviewModal
          open={!!waTask}
          onOpenChange={(open) => {
            if (!open) setWaTask(null);
          }}
          defaultPhone={waTask.assignedToPhone || teamById.get(waTask.assignedToId)?.phone || ""}
          recipientName={waTask.assignedToName}
          recipientRole="Staff Member"
          staffTask={waTask}
          targetModule="staff_tasks"
          defaultMessage={buildTaskWhatsAppMessage(waTask)}
          title={`Send Task Link to ${waTask.assignedToName}`}
        />
      )}
    </div>
  );
}
