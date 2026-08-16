import { useEffect, useState } from "react";
import { Plus, ShieldCheck, Sparkles, Check, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { useStaffProfile } from "@/contexts/StaffProfileContext";
import { getTeamMembers, createTeamMember } from "@/lib/firestore";
import type { TeamMember, TeamRole } from "@/lib/types";
import AvatarGraphic from "@/components/admin/AvatarGraphic";
import { AVATAR_CATALOG, getAvatarById } from "@/lib/avatars";

interface StaffProfileSelectorModalProps {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  canDismiss?: boolean;
}

export default function StaffProfileSelectorModal({
  open,
  onOpenChange,
  canDismiss = true,
}: StaffProfileSelectorModalProps) {
  const { activeProfile, setActiveProfile } = useStaffProfile();
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);

  // Quick Add Staff Form
  const [name, setName] = useState("");
  const [role, setRole] = useState<TeamRole>("backoffice");
  const [phone, setPhone] = useState("");
  const [selectedAvatarId, setSelectedAvatarId] = useState("penguin");
  const [saving, setSaving] = useState(false);

  const loadTeam = async () => {
    setLoading(true);
    try {
      const data = await getTeamMembers();
      setTeam(data.filter((m) => m.active !== false));
    } catch {
      toast.error("Failed to load staff profiles");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadTeam();
      setShowAddForm(false);
    }
  }, [open]);

  const handleSelect = (member: TeamMember) => {
    setActiveProfile(member);
    toast.success(`Welcome back, ${member.name}! Desk profile active for 10 hours.`);
    if (onOpenChange) onOpenChange(false);
  };

  const handleClose = () => {
    if (onOpenChange) onOpenChange(false);
  };

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Staff name is required");
      return;
    }
    setSaving(true);
    try {
      const newMember = await createTeamMember({
        name: name.trim(),
        role,
        phone: phone.trim() || "+91 98000 00000",
        avatar: selectedAvatarId,
        active: true,
      });

      toast.success(`Profile "${newMember.name}" created!`);
      setName("");
      setPhone("");
      setShowAddForm(false);
      await loadTeam();
      handleSelect(newMember);
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Failed to create profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden bg-[#0A0E17] text-white border-slate-800 shadow-2xl rounded-3xl">
        {/* Top-Right Close Button */}
        <button
          type="button"
          onClick={handleClose}
          className="absolute top-4 right-4 z-20 h-8 w-8 rounded-full bg-slate-900/80 hover:bg-slate-800 border border-slate-700/80 text-slate-400 hover:text-white flex items-center justify-center transition-colors shadow-md"
          title="Close"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Ambient Top Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -mt-20 h-64 w-96 rounded-full bg-blue-600/20 blur-3xl pointer-events-none" />

        <div className="relative z-10 p-6 md:p-10 space-y-8">
          {/* Header */}
          <div className="text-center space-y-2 max-w-lg mx-auto">
            <h1 className="text-3xl md:text-4xl font-extrabold font-display tracking-tight text-white">
              Who is working today?
            </h1>

            <p className="text-xs md:text-sm text-slate-400">
              Select your profile to automatically stamp tickets, service calls, and workshop actions without typing your name each time.
            </p>
          </div>

          {/* Profile Cards Grid or Quick Add Form */}
          {!showAddForm ? (
            <div className="space-y-8">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent mb-3" />
                  <p className="text-xs text-slate-400">Loading staff profiles...</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 md:gap-6 justify-center">
                  {team.map((member) => {
                    const isCurrent = activeProfile?.id === member.id;
                    const roleBadge = member.role === "proprietor"
                      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                      : member.role === "developer"
                      ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/30"
                      : member.role === "manager"
                      ? "bg-purple-500/20 text-purple-300 border-purple-500/30"
                      : member.role === "technician"
                      ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
                      : "bg-blue-500/20 text-blue-300 border-blue-500/30";

                    return (
                      <div
                        key={member.id}
                        onClick={() => handleSelect(member)}
                        className={`group relative flex flex-col items-center justify-between p-4 md:p-5 rounded-2xl cursor-pointer transition-all duration-300 border ${
                          isCurrent
                            ? "bg-blue-950/60 border-blue-500 ring-2 ring-blue-400 shadow-2xl shadow-blue-500/30 scale-105"
                            : "bg-slate-900/80 border-slate-800 hover:border-slate-600 hover:bg-slate-850 hover:scale-105 shadow-md"
                        }`}
                      >
                        {/* Selected Indicator Check */}
                        {isCurrent && (
                          <div className="absolute top-2.5 right-2.5 h-6 w-6 rounded-full bg-blue-500 text-white flex items-center justify-center shadow-lg ring-2 ring-white/40">
                            <Check className="h-3.5 w-3.5 stroke-[3]" />
                          </div>
                        )}

                        {/* Refined Avatar with hover bounce */}
                        <div className="transform transition-transform duration-300 group-hover:scale-110 my-2">
                          <AvatarGraphic
                            avatarId={member.avatar || "penguin"}
                            size="lg"
                            showGlow={isCurrent}
                          />
                        </div>

                        {/* High-Legibility Name & Role Plaque */}
                        <div className="w-full text-center mt-1 pt-2 border-t border-slate-800/80 space-y-1">
                          <h3 className="font-extrabold text-sm md:text-base text-white group-hover:text-blue-300 transition-colors tracking-tight line-clamp-1">
                            {member.name}
                          </h3>

                          <span className={`inline-flex items-center text-[10px] font-bold px-2.5 py-0.5 rounded-full border uppercase tracking-wider ${roleBadge}`}>
                            {member.role || "Staff"}
                          </span>
                        </div>
                      </div>
                    );
                  })}

                  {/* Add New Profile Card */}
                  <div
                    onClick={() => setShowAddForm(true)}
                    className="group flex flex-col items-center justify-between p-4 md:p-5 rounded-2xl cursor-pointer transition-all duration-300 border border-dashed border-slate-800 hover:border-blue-500 bg-slate-900/30 hover:bg-blue-950/20 hover:scale-105 text-slate-400 hover:text-white"
                  >
                    <div className="h-16 w-16 rounded-full border-2 border-dashed border-slate-700 group-hover:border-blue-400 flex items-center justify-center my-2 transition-colors bg-slate-900/50">
                      <Plus className="h-6 w-6 text-slate-500 group-hover:text-blue-400 transition-colors" />
                    </div>
                    <div className="w-full text-center mt-1 pt-2 border-t border-slate-800/80 space-y-0.5">
                      <p className="font-extrabold text-sm text-slate-300 group-hover:text-white">Add Profile</p>
                      <span className="text-[10px] text-slate-500">New Staff Member</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Quick Add Profile Sub-form */
            <form onSubmit={handleQuickAdd} className="max-w-xl mx-auto space-y-5 bg-slate-900/80 p-6 rounded-2xl border border-slate-800">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-blue-400" /> Create New Staff Profile
                </h2>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAddForm(false)}
                  className="h-7 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </Button>
              </div>

              <div className="space-y-3.5">
                <div>
                  <Label className="text-xs font-bold text-slate-300">Staff Member Full Name *</Label>
                  <Input
                    placeholder="e.g. Priya Sharma"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="mt-1 bg-slate-950 border-slate-800 text-white h-9 rounded-xl text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs font-bold text-slate-300">Role / Department</Label>
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value as TeamRole)}
                      className="w-full mt-1 bg-slate-950 border border-slate-800 text-white h-9 rounded-xl text-xs px-3 focus:outline-none focus:border-blue-500"
                    >
                      <option value="proprietor">Proprietor (Owner / Principal)</option>
                      <option value="developer">Developer (Tech / ERP)</option>
                      <option value="backoffice">Backoffice Desk</option>
                      <option value="technician">Workshop Technician</option>
                      <option value="manager">Store / Operations Manager</option>
                    </select>
                  </div>

                  <div>
                    <Label className="text-xs font-bold text-slate-300">Contact Number</Label>
                    <Input
                      placeholder="+91 98765 43210"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="mt-1 bg-slate-950 border-slate-800 text-white h-9 rounded-xl text-xs font-mono"
                    />
                  </div>
                </div>

                {/* Avatar Picker Section */}
                <div className="space-y-2 pt-2">
                  <Label className="text-xs font-bold text-slate-300">
                    Select Avatar Persona ({AVATAR_CATALOG.length} High-Fidelity Avatars)
                  </Label>
                  <div className="grid grid-cols-5 gap-3 p-3 rounded-xl bg-slate-950 border border-slate-800">
                    {AVATAR_CATALOG.map((av) => (
                      <div
                        key={av.id}
                        onClick={() => setSelectedAvatarId(av.id)}
                        className={`cursor-pointer rounded-xl p-2 flex flex-col items-center justify-center transition-all ${
                          selectedAvatarId === av.id
                            ? "bg-blue-600/40 ring-2 ring-blue-400 scale-105"
                            : "hover:bg-slate-800"
                        }`}
                        title={av.name}
                      >
                        <AvatarGraphic avatarId={av.id} size="md" />
                        <span className="text-[10px] text-slate-300 font-medium mt-1.5 truncate max-w-full text-center">
                          {av.name}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddForm(false)}
                  className="bg-transparent border-slate-700 text-slate-300 hover:bg-slate-800 h-9 rounded-xl text-xs"
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={saving}
                  className="bg-[#2563EB] hover:bg-blue-600 text-white font-bold h-9 rounded-xl text-xs"
                >
                  {saving ? "Creating Profile..." : "Save & Activate Profile"}
                </Button>
              </div>
            </form>
          )}

          {/* Terms & Attribution Policy Footer */}
          {!showAddForm && (
            <div className="text-center text-[11px] text-slate-400 border-t border-slate-800/80 pt-4 flex flex-col sm:flex-row items-center justify-center gap-1.5 leading-relaxed">
              <span className="flex items-center gap-1.5 text-amber-400 font-semibold">
                <ShieldCheck className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                Terms & Responsibility:
              </span>
              <span>
                All actions, service calls, and ticket updates are attributed to you. Please ensure correct profile selection.
              </span>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
