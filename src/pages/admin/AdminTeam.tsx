import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Users, Plus, Trash2, Search, Phone, Mail, Pencil, RefreshCw, ShieldCheck, Wrench, Briefcase, CheckCircle2, XCircle, Crown, Code, ChevronRight, Lock, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  ConfirmDeleteDialog,
  EmptyState,
  FirebaseErrorState,
  LoadingScreen,
} from "@/components/common";
import { getTeamMembers, createTeamMember, updateTeamMember, deleteTeamMember } from "@/lib/firestore";
import type { TeamMember, TeamRole } from "@/lib/types";
import AvatarGraphic from "@/components/admin/AvatarGraphic";
import { AVATAR_CATALOG, getAvatarById } from "@/lib/avatars";
import TechnicianCommissionModal from "@/components/admin/TechnicianCommissionModal";
import { useStaffProfile } from "@/contexts/StaffProfileContext";
import { useStaffDutyPresence } from "@/lib/realtimeSync";

export default function AdminTeam() {
  const navigate = useNavigate();
  const { activeProfile } = useStaffProfile();
  const { isStaffOnline, onlineCount } = useStaffDutyPresence(activeProfile);
  const isOwner = activeProfile?.role === "proprietor";

  const [team, setTeam] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [showModal, setShowModal] = useState(false);

  // Technician Task & Commission Modal State
  const [selectedTechForModal, setSelectedTechForModal] = useState<TeamMember | null>(null);
  const [showCommissionModal, setShowCommissionModal] = useState(false);

  // Reset PIN Modal State (Owner only)
  const [resetPinMember, setResetPinMember] = useState<TeamMember | null>(null);
  const [newPinInput, setNewPinInput] = useState("");
  const [confirmNewPinInput, setConfirmNewPinInput] = useState("");
  const [savingResetPin, setSavingResetPin] = useState(false);

  // Form State
  const [formName, setFormName] = useState("");
  const [formRole, setFormRole] = useState<TeamRole>("backoffice");
  const [formPhone, setFormPhone] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPin, setFormPin] = useState("");
  const [formConfirmPin, setFormConfirmPin] = useState("");
  const [formSpecialization, setFormSpecialization] = useState("");
  const [formCommission, setFormCommission] = useState<string>("50");
  const [formAvatar, setFormAvatar] = useState("penguin");
  const [formActive, setFormActive] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getTeamMembers();
      setTeam(data);
    } catch (err: any) {
      console.error("Firebase error in AdminTeam:", err);
      setError(err?.message || "Unable to load team directory from Firebase.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Universal Alt+C shortcut to open create modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.key.toLowerCase() === "c") {
        e.preventDefault();
        openCreateModal();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const openCreateModal = () => {
    setEditingMember(null);
    setFormName("");
    setFormRole("technician");
    setFormPhone("");
    setFormEmail("");
    setFormPin("");
    setFormConfirmPin("");
    setFormSpecialization("");
    setFormCommission("50");
    setFormAvatar("penguin");
    setFormActive(true);
    setShowModal(true);
  };

  const openEditModal = (member: TeamMember) => {
    setEditingMember(member);
    setFormName(member.name);
    setFormRole(member.role);
    setFormPhone(member.phone || "");
    setFormEmail(member.email || "");
    setFormPin(member.pin || "");
    setFormConfirmPin(member.pin || "");
    setFormSpecialization(member.specialization || "");
    setFormCommission(String(member.commissionPercentage ?? 50));
    setFormAvatar(member.avatar || "penguin");
    setFormActive(member.active !== false);
    setShowModal(true);
  };

  const openResetPinModal = (member: TeamMember) => {
    setResetPinMember(member);
    setNewPinInput("");
    setConfirmNewPinInput("");
  };

  const handleResetPinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPinMember) return;

    if (!/^\d{5}$/.test(newPinInput)) {
      toast.error("PIN must be exactly 5 numeric digits");
      return;
    }
    if (newPinInput !== confirmNewPinInput) {
      toast.error("Confirmation PIN does not match");
      return;
    }

    setSavingResetPin(true);
    try {
      await updateTeamMember(resetPinMember.id, { pin: newPinInput.trim() });
      toast.success(`PIN updated for ${resetPinMember.name}`);
      setResetPinMember(null);
      loadData();
    } catch (err: any) {
      toast.error(err?.message || "Failed to update PIN");
    } finally {
      setSavingResetPin(false);
    }
  };

  const handleClearPin = async () => {
    if (!resetPinMember) return;
    setSavingResetPin(true);
    try {
      await updateTeamMember(resetPinMember.id, { pin: "" });
      toast.success(`PIN cleared for ${resetPinMember.name}. They will be prompted to set a new PIN on next login.`);
      setResetPinMember(null);
      loadData();
    } catch (err: any) {
      toast.error(err?.message || "Failed to clear PIN");
    } finally {
      setSavingResetPin(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      toast.error("Name is required");
      return;
    }
    if (!formPhone.trim()) {
      toast.error("Phone number is required");
      return;
    }

    // Role check: Only existing owners can assign/create proprietor role
    if (formRole === "proprietor" && !isOwner) {
      toast.error("Only current Owners can create or assign the Proprietor / Owner role.");
      return;
    }

    // Mandatory PIN when creating new member
    if (!editingMember) {
      if (!/^\d{5}$/.test(formPin)) {
        toast.error("A 5-digit numeric PIN is required for new team members.");
        return;
      }
      if (formPin !== formConfirmPin) {
        toast.error("Confirmation PIN does not match.");
        return;
      }
    }

    const commissionNum = formRole === "technician" ? (parseFloat(formCommission) || 50) : undefined;

    setSaving(true);
    try {
      if (editingMember) {
        const updatePayload: any = {
          name: formName.trim(),
          role: formRole,
          phone: formPhone.trim(),
          email: formEmail.trim(),
          specialization: formSpecialization.trim(),
          commissionPercentage: commissionNum,
          avatar: formAvatar,
          active: formActive,
        };
        if (formPin && /^\d{5}$/.test(formPin)) {
          updatePayload.pin = formPin.trim();
        }
        await updateTeamMember(editingMember.id, updatePayload);
        toast.success("Team member profile updated");
      } else {
        await createTeamMember({
          name: formName.trim(),
          role: formRole,
          phone: formPhone.trim(),
          email: formEmail.trim() || undefined,
          pin: formPin.trim(),
          specialization: formSpecialization.trim() || undefined,
          commissionPercentage: commissionNum,
          avatar: formAvatar,
          active: formActive,
        });
        toast.success("Team member added successfully");
      }
      setShowModal(false);
      loadData();
    } catch (err: any) {
      toast.error(err?.message || "Failed to save team member");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteTeamMember(deleteId);
      toast.success("Team member deleted");
      setDeleteId(null);
      loadData();
    } catch {
      toast.error("Failed to delete team member");
    }
  };

  const getRoleBadge = (role: TeamRole) => {
    switch (role) {
      case "proprietor":
        return (
          <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50 text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
            <Crown className="h-3 w-3" /> Proprietor
          </Badge>
        );
      case "developer":
        return (
          <Badge className="bg-cyan-50 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800/50 text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
            <Code className="h-3 w-3" /> Developer
          </Badge>
        );
      case "manager":
        return (
          <Badge className="bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200 dark:border-purple-800/50 text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
            <Briefcase className="h-3 w-3" /> Manager
          </Badge>
        );
      case "technician":
        return (
          <Badge className="bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50 text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
            <Wrench className="h-3 w-3" /> Technician
          </Badge>
        );
      case "backoffice":
      default:
        return (
          <Badge className="bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800/50 text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
            <ShieldCheck className="h-3 w-3" /> Back Office
          </Badge>
        );
    }
  };

  const filtered = team.filter((m) => {
    const matchesRole = roleFilter === "all" || m.role === roleFilter;
    const q = search.toLowerCase().trim();
    const matchesSearch =
      !q ||
      m.name.toLowerCase().includes(q) ||
      (m.phone && m.phone.toLowerCase().includes(q)) ||
      (m.email && m.email.toLowerCase().includes(q)) ||
      (m.specialization && m.specialization.toLowerCase().includes(q)) ||
      m.role.toLowerCase().includes(q);

    return matchesRole && matchesSearch;
  });

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-6xl mx-auto text-xs">
      {/* Top Header Card */}
      <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-4 text-white shadow-md">
        <div className="absolute right-0 top-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-blue-500/20 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="space-y-1">
            <h1 className="text-xl md:text-2xl font-extrabold font-display tracking-tight text-white leading-tight">
              Team & Personnel Directory
            </h1>
            <p className="text-xs text-slate-300">
              Manage backoffice coordinators, field technicians, managers, and service ticket assignees
            </p>
          </div>

          <Button
            onClick={openCreateModal}
            size="sm"
            className="gap-1.5 font-bold bg-[#2563EB] hover:bg-blue-700 text-white shrink-0 rounded-xl h-9 text-xs shadow-sm cursor-pointer"
          >
            <Plus className="h-4 w-4" /> Add Team Member (Alt+C)
          </Button>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1 w-full max-w-md">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search by name, phone, specialization..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-9 text-xs rounded-xl"
            />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="h-9 w-full sm:w-[150px] text-xs rounded-xl shrink-0">
              <SelectValue placeholder="Role Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="proprietor">Proprietor</SelectItem>
              <SelectItem value="manager">Manager</SelectItem>
              <SelectItem value="technician">Technician</SelectItem>
              <SelectItem value="backoffice">Back Office</SelectItem>
              <SelectItem value="developer">Developer</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            className="gap-1.5 text-xs h-9 rounded-xl shrink-0"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Team Table / Empty States */}
      {loading ? (
        <div className="bg-card rounded-2xl border p-6">
          <LoadingScreen fullScreen={false} title="Team Directory" subtitle="Loading staff profiles..." />
        </div>
      ) : error ? (
        <FirebaseErrorState
          error={error}
          onRetry={loadData}
          title="Team Directory Error"
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No team members found"
          description="No profiles match your search criteria. Add your technicians and staff coordinators to assign tickets."
          actionLabel="Add Team Member"
          actionIcon={Plus}
          onAction={openCreateModal}
        />
      ) : (
        <div className="rounded-2xl border bg-card overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="border-b bg-slate-50 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 font-extrabold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-4 py-3">Member Name</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Phone & Contact</th>
                  <th className="px-4 py-3">Specialization / Scope</th>
                  <th className="px-4 py-3">Security PIN</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.map((member) => (
                  <tr
                    key={member.id}
                    onClick={() => navigate(`/admin/team/${member.id}`)}
                    className="hover:bg-blue-50/50 dark:hover:bg-blue-950/40 transition-colors cursor-pointer group"
                  >
                    {/* Name with Avatar */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <AvatarGraphic avatarId={member.avatar || "penguin"} size="sm" />
                        <div>
                          <div className="font-bold text-slate-900 dark:text-white text-xs group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors flex items-center gap-1">
                            <span>{member.name}</span>
                          </div>
                          {member.email && (
                            <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                              <Mail className="h-3 w-3" /> {member.email}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Role */}
                    <td className="px-4 py-3">
                      {getRoleBadge(member.role)}
                    </td>

                    {/* Phone */}
                    <td className="px-4 py-3 font-mono font-semibold text-slate-900 dark:text-white">
                      <div className="flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5 text-slate-400" /> {member.phone}
                      </div>
                    </td>

                    {/* Specialization */}
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                      {member.specialization || (member.role === "manager" ? "Operations Oversight" : member.role === "backoffice" ? "Intake & Logistics" : "Hardware Repair")}
                    </td>

                    {/* Security PIN Status */}
                    <td className="px-4 py-3">
                      {member.pin ? (
                        <Badge variant="outline" className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 gap-1 text-[10px]">
                          <Lock className="h-3 w-3" /> 5-Digit PIN Active
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-300 gap-1 text-[10px]">
                          <KeyRound className="h-3 w-3" /> Setup Needed
                        </Badge>
                      )}
                    </td>

                    {/* Live Online Status */}
                    <td className="px-4 py-3">
                      {member.role === "developer" ? (
                        <span className="text-[11px] text-slate-400 font-medium">—</span>
                      ) : isStaffOnline(member.id) ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-300 shadow-2xs">
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                          </span>
                          Online
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 font-medium">
                          <span className="h-1.5 w-1.5 rounded-full bg-slate-300 dark:bg-slate-700" />
                          Offline
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                        {/* Owner Reset PIN Action */}
                        {isOwner && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/50"
                            title="Reset 5-Digit PIN"
                            onClick={(e) => {
                              e.stopPropagation();
                              openResetPinModal(member);
                            }}
                          >
                            <KeyRound className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          title="Edit Team Member"
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditModal(member);
                          }}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          title="Delete Team Member"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteId(member.id);
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                        <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-blue-600 transition-colors ml-1" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add / Edit Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-md p-6">
          <DialogHeader className="border-b pb-3">
            <DialogTitle className="flex items-center gap-2 font-display text-base text-slate-900 dark:text-white">
              <Users className="h-5 w-5 text-[#2563EB]" />
              {editingMember ? "Edit Team Member" : "Add New Team Member"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4 pt-2 text-xs">
            <div>
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Full Name <span className="text-red-500">*</span>
              </Label>
              <Input
                placeholder="e.g. Rajesh Sharma"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                required
                className="mt-1 h-9 text-xs rounded-xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Role <span className="text-red-500">*</span>
                </Label>
                <Select value={formRole} onValueChange={(v) => setFormRole(v as TeamRole)}>
                  <SelectTrigger className="mt-1 h-9 text-xs rounded-xl">
                    <SelectValue placeholder="Select Role" />
                  </SelectTrigger>
                  <SelectContent>
                    {isOwner && (
                      <SelectItem value="proprietor">Proprietor (Owner)</SelectItem>
                    )}
                    <SelectItem value="developer">Developer (Tech / ERP)</SelectItem>
                    <SelectItem value="manager">Manager (Store Operations)</SelectItem>
                    <SelectItem value="backoffice">Back Office (Frontdesk / Intake)</SelectItem>
                    <SelectItem value="technician">Technician (Hardware Repair)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Phone Number <span className="text-red-500">*</span>
                </Label>
                <Input
                  placeholder="e.g. 98230 11223"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  required
                  className="mt-1 h-9 text-xs rounded-xl font-mono"
                />
              </div>
            </div>

            {/* Mandatory 5-digit PIN for new members */}
            {!editingMember && (
              <div className="grid grid-cols-2 gap-3 p-3 rounded-2xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60">
                <div>
                  <Label className="text-xs font-bold text-blue-950 dark:text-blue-200 flex items-center gap-1">
                    <Lock className="h-3.5 w-3.5 text-blue-600" />
                    <span>5-Digit PIN <span className="text-red-500">*</span></span>
                  </Label>
                  <Input
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={5}
                    placeholder="5 Digits"
                    value={formPin}
                    onChange={(e) => setFormPin(e.target.value.replace(/\D/g, "").slice(0, 5))}
                    required
                    className="mt-1 h-9 text-xs rounded-xl font-mono text-center tracking-widest bg-white dark:bg-slate-900"
                  />
                </div>
                <div>
                  <Label className="text-xs font-bold text-blue-950 dark:text-blue-200 flex items-center gap-1">
                    <ShieldCheck className="h-3.5 w-3.5 text-blue-600" />
                    <span>Confirm PIN <span className="text-red-500">*</span></span>
                  </Label>
                  <Input
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={5}
                    placeholder="Re-enter PIN"
                    value={formConfirmPin}
                    onChange={(e) => setFormConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 5))}
                    required
                    className="mt-1 h-9 text-xs rounded-xl font-mono text-center tracking-widest bg-white dark:bg-slate-900"
                  />
                </div>
              </div>
            )}

            <div>
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Email Address (Optional)
              </Label>
              <Input
                type="email"
                placeholder="e.g. rajesh@zorba.in"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                className="mt-1 h-9 text-xs rounded-xl"
              />
            </div>

            {/* Technician Commission Input */}
            {formRole === "technician" && (
              <div className="space-y-1.5 p-3 rounded-2xl bg-purple-50/70 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-900/60 animate-in fade-in duration-150">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-purple-900 dark:text-purple-200 flex items-center gap-1.5">
                    <Wrench className="h-3.5 w-3.5 text-purple-600" />
                    <span>Technician Commission Rate (%)</span>
                  </Label>
                  <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 bg-white dark:bg-slate-900 px-2 py-0.5 rounded-full border border-purple-200 dark:border-purple-800">
                    Monthly Settlement
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    placeholder="50"
                    value={formCommission}
                    onChange={(e) => setFormCommission(e.target.value)}
                    className="h-9 text-xs font-mono font-bold rounded-xl bg-white dark:bg-slate-900"
                    required
                  />
                  <span className="text-xs font-extrabold text-purple-700 dark:text-purple-300">%</span>
                </div>
              </div>
            )}

            <div>
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Specialization / Area of Work
              </Label>
              <Input
                placeholder="e.g. CCTV & Surveillance, Printers, Laptops, Frontdesk"
                value={formSpecialization}
                onChange={(e) => setFormSpecialization(e.target.value)}
                className="mt-1 h-9 text-xs rounded-xl"
              />
            </div>

            {/* Avatar Persona Selection */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Avatar Persona ({AVATAR_CATALOG.length} High-Fidelity Avatars)
                </Label>
                <div className="flex items-center gap-1.5">
                  <AvatarGraphic avatarId={formAvatar} size="xs" />
                  <span className="text-[11px] font-semibold text-[#2563EB]">
                    {getAvatarById(formAvatar).name}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-5 gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                {AVATAR_CATALOG.map((av) => (
                  <div
                    key={av.id}
                    onClick={() => setFormAvatar(av.id)}
                    className={`cursor-pointer rounded-xl p-1.5 flex flex-col items-center justify-center transition-all ${
                      formAvatar === av.id
                        ? "bg-blue-500/20 ring-2 ring-blue-500 scale-105"
                        : "hover:bg-slate-200 dark:hover:bg-slate-800"
                    }`}
                    title={`${av.name} - ${av.description}`}
                  >
                    <AvatarGraphic avatarId={av.id} size="md" />
                    <span className="text-[10px] text-slate-700 dark:text-slate-300 font-medium mt-1 truncate max-w-full text-center">
                      {av.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border">
              <div>
                <p className="font-bold text-slate-900 dark:text-white">Active Status</p>
                <p className="text-[11px] text-slate-400">Enable to show in ticket intake assignee dropdowns</p>
              </div>
              <Switch checked={formActive} onCheckedChange={setFormActive} />
            </div>

            <DialogFooter className="border-t pt-3 gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowModal(false)}
                className="h-9 text-xs rounded-xl"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={saving}
                size="sm"
                className="h-9 text-xs rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white font-bold"
              >
                {saving ? "Saving..." : editingMember ? "Update Profile" : "Save Team Member"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Owner Reset PIN Modal */}
      <Dialog open={Boolean(resetPinMember)} onOpenChange={(open) => !open && setResetPinMember(null)}>
        <DialogContent className="sm:max-w-sm p-6">
          <DialogHeader className="border-b pb-3">
            <DialogTitle className="flex items-center gap-2 font-display text-base text-slate-900 dark:text-white">
              <KeyRound className="h-5 w-5 text-amber-500" />
              <span>Reset 5-Digit PIN</span>
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleResetPinSubmit} className="space-y-4 pt-2 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border text-xs">
              <span className="font-bold text-slate-900 dark:text-white">{resetPinMember?.name}</span>
              <p className="text-slate-500 capitalize">{resetPinMember?.role} • {resetPinMember?.phone}</p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                New 5-Digit PIN
              </Label>
              <Input
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={5}
                autoFocus
                placeholder="Enter 5 Digits"
                value={newPinInput}
                onChange={(e) => setNewPinInput(e.target.value.replace(/\D/g, "").slice(0, 5))}
                required
                className="h-10 text-center font-mono text-lg tracking-widest rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Confirm New PIN
              </Label>
              <Input
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={5}
                placeholder="Re-enter 5 Digits"
                value={confirmNewPinInput}
                onChange={(e) => setConfirmNewPinInput(e.target.value.replace(/\D/g, "").slice(0, 5))}
                required
                className="h-10 text-center font-mono text-lg tracking-widest rounded-xl"
              />
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <Button
                type="submit"
                disabled={savingResetPin || newPinInput.length !== 5 || newPinInput !== confirmNewPinInput}
                className="w-full h-9 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-xl"
              >
                {savingResetPin ? "Updating..." : "Set New PIN"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleClearPin}
                disabled={savingResetPin}
                className="w-full h-8 text-xs text-rose-600 border-rose-200 hover:bg-rose-50 rounded-xl"
              >
                Clear PIN (Force User Setup on Login)
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Alert */}
      <ConfirmDeleteDialog
        open={Boolean(deleteId)}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Delete Team Member?"
        description="This will remove the team member profile from the directory. Past service tickets will maintain historical logs."
        confirmLabel="Delete Member"
        onConfirm={handleDelete}
      />

      {/* Technician Monthly Tasks & Commission Payroll Modal */}
      <TechnicianCommissionModal
        open={showCommissionModal}
        onOpenChange={setShowCommissionModal}
        technician={selectedTechForModal}
      />
    </div>
  );
}
