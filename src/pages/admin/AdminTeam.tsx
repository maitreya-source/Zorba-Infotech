import { useEffect, useState } from "react";
import { Users, Plus, Trash2, Search, Phone, Mail, Pencil, RefreshCw, ShieldCheck, Wrench, Briefcase, CheckCircle2, XCircle, Crown, Code } from "lucide-react";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { getTeamMembers, createTeamMember, updateTeamMember, deleteTeamMember } from "@/lib/firestore";
import type { TeamMember, TeamRole } from "@/lib/types";
import AvatarGraphic from "@/components/admin/AvatarGraphic";
import { AVATAR_CATALOG, getAvatarById } from "@/lib/avatars";

export default function AdminTeam() {
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [showModal, setShowModal] = useState(false);

  // Form State
  const [formName, setFormName] = useState("");
  const [formRole, setFormRole] = useState<TeamRole>("backoffice");
  const [formPhone, setFormPhone] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formSpecialization, setFormSpecialization] = useState("");
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

  const openCreateModal = () => {
    setEditingMember(null);
    setFormName("");
    setFormRole("backoffice");
    setFormPhone("");
    setFormEmail("");
    setFormSpecialization("");
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
    setFormSpecialization(member.specialization || "");
    setFormAvatar(member.avatar || "penguin");
    setFormActive(member.active !== false);
    setShowModal(true);
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

    setSaving(true);
    try {
      if (editingMember) {
        await updateTeamMember(editingMember.id, {
          name: formName.trim(),
          role: formRole,
          phone: formPhone.trim(),
          email: formEmail.trim() || undefined,
          specialization: formSpecialization.trim() || undefined,
          avatar: formAvatar,
          active: formActive,
        });
        toast.success("Team member profile updated");
      } else {
        await createTeamMember({
          name: formName.trim(),
          role: formRole,
          phone: formPhone.trim(),
          email: formEmail.trim() || undefined,
          specialization: formSpecialization.trim() || undefined,
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
            className="gap-1.5 font-bold bg-[#2563EB] hover:bg-blue-700 text-white shrink-0 rounded-xl h-9 text-xs shadow-sm"
          >
            <Plus className="h-4 w-4" /> Add Team Member
          </Button>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search by name, phone, specialization…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-xs rounded-xl"
            />
          </div>

          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-40 h-9 text-xs rounded-xl">
              <SelectValue placeholder="All Roles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="proprietor">Proprietor (Owner)</SelectItem>
              <SelectItem value="developer">Developer (Tech)</SelectItem>
              <SelectItem value="manager">Managers</SelectItem>
              <SelectItem value="backoffice">Back Office</SelectItem>
              <SelectItem value="technician">Technicians</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="text-xs text-muted-foreground font-semibold">
          Total Team Members: <span className="text-foreground font-extrabold">{filtered.length}</span>
        </div>
      </div>

      {/* Main Table */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-card rounded-2xl border">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mb-2" />
          <p className="text-xs text-muted-foreground">Loading team directory...</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border bg-destructive/5 border-destructive/20 py-16 text-center px-4">
          <p className="font-bold text-destructive text-base">Firebase Connection Error</p>
          <p className="text-sm text-muted-foreground mt-1 max-w-md">{error}</p>
          <Button onClick={loadData} className="mt-4 gap-2 text-xs" variant="outline" size="sm">
            <RefreshCw className="h-3.5 w-3.5" /> Retry Connection
          </Button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 bg-card rounded-2xl border text-center p-6 space-y-3">
          <Users className="h-10 w-10 text-muted-foreground/40" />
          <p className="font-bold text-foreground text-sm font-display">No Team Members Found</p>
          <p className="text-xs text-muted-foreground max-w-sm">
            {team.length === 0 ? "Click Add Team Member to create your first personnel profile." : "No team members match your filter criteria."}
          </p>
          <Button onClick={openCreateModal} size="sm" className="gap-1 text-xs font-bold bg-[#2563EB] hover:bg-blue-700 text-white rounded-xl">
            <Plus className="h-3.5 w-3.5" /> Add Team Member
          </Button>
        </div>
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
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.map((member) => (
                  <tr key={member.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-900/40 transition-colors">
                    {/* Name with Avatar */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <AvatarGraphic avatarId={member.avatar || "penguin"} size="sm" />
                        <div>
                          <div className="font-bold text-slate-900 dark:text-white text-xs">{member.name}</div>
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

                    {/* Status */}
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 text-[11px] font-semibold ${member.active !== false ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400"}`}>
                        {member.active !== false ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                        {member.active !== false ? "Active" : "Inactive"}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          title="Edit Team Member"
                          onClick={() => openEditModal(member)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          title="Delete Team Member"
                          onClick={() => setDeleteId(member.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
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
                    <SelectItem value="proprietor">Proprietor (Owner)</SelectItem>
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

      {/* Delete Confirmation Alert */}
      <AlertDialog open={Boolean(deleteId)} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm">Delete Team Member?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              This will remove the team member profile from the directory. Past service tickets will maintain historical logs.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-8 text-xs">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="h-8 text-xs bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Member
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
