import { useEffect, useState } from "react";
import { Plus, ShieldCheck, Sparkles, Check, X, Lock, KeyRound, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { useStaffProfile } from "@/contexts/StaffProfileContext";
import { getTeamMembers, createTeamMember, updateTeamMember } from "@/lib/firestore";
import type { TeamMember, TeamRole } from "@/lib/types";
import AvatarGraphic from "@/components/admin/AvatarGraphic";
import { AVATAR_CATALOG } from "@/lib/avatars";
import LoadingScreen from "@/components/common/LoadingScreen";

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

  // PIN Verification / Setup State
  const [selectedMemberForPin, setSelectedMemberForPin] = useState<TeamMember | null>(null);
  const [pinMode, setPinMode] = useState<"verify" | "setup" | null>(null);
  const [enteredPin, setEnteredPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [savingPin, setSavingPin] = useState(false);

  // Quick Add Staff Form
  const [name, setName] = useState("");
  const [role, setRole] = useState<TeamRole>("backoffice");
  const [phone, setPhone] = useState("");
  const [initialPin, setInitialPin] = useState("");
  const [initialConfirmPin, setInitialConfirmPin] = useState("");
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
      setSelectedMemberForPin(null);
      setPinMode(null);
      setEnteredPin("");
      setConfirmPin("");
      setPinError("");
    }
  }, [open]);

  const handleProfileClick = (member: TeamMember) => {
    setPinError("");
    setEnteredPin("");
    setConfirmPin("");
    setSelectedMemberForPin(member);

    if (!member.pin || member.pin.trim().length === 0) {
      setPinMode("setup");
    } else {
      setPinMode("verify");
    }
  };

  const handleVerifyPinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMemberForPin) return;

    if (enteredPin.trim() !== (selectedMemberForPin.pin || "").trim()) {
      setPinError("Incorrect PIN. Please try again.");
      setEnteredPin("");
      toast.error("Incorrect PIN. Access denied.");
      return;
    }

    setActiveProfile(selectedMemberForPin);
    toast.success(`Welcome back, ${selectedMemberForPin.name}! Desk profile active.`);
    if (onOpenChange) onOpenChange(false);
  };

  const handleSetupPinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMemberForPin) return;

    if (!/^\d{5}$/.test(enteredPin)) {
      setPinError("PIN must be exactly 5 numeric digits.");
      return;
    }

    if (enteredPin !== confirmPin) {
      setPinError("PINs do not match. Please enter the same 5-digit PIN twice.");
      return;
    }

    setSavingPin(true);
    try {
      await updateTeamMember(selectedMemberForPin.id, { pin: enteredPin.trim() });
      const updatedMember = { ...selectedMemberForPin, pin: enteredPin.trim() };
      setTeam((prev) => prev.map((m) => (m.id === updatedMember.id ? updatedMember : m)));
      setActiveProfile(updatedMember);
      toast.success(`5-Digit PIN set successfully! Welcome, ${updatedMember.name}.`);
      if (onOpenChange) onOpenChange(false);
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Failed to set PIN");
    } finally {
      setSavingPin(false);
    }
  };

  const handleBackToProfiles = () => {
    setSelectedMemberForPin(null);
    setPinMode(null);
    setEnteredPin("");
    setConfirmPin("");
    setPinError("");
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
    if (!/^\d{5}$/.test(initialPin)) {
      toast.error("A 5-digit numeric PIN is required for new staff profile");
      return;
    }
    if (initialPin !== initialConfirmPin) {
      toast.error("Confirmation PIN does not match");
      return;
    }

    // Role check: Only current owners can create owner/proprietor role
    if (role === "proprietor" && activeProfile?.role !== "proprietor") {
      toast.error("Only existing Owner profiles can create new Owner profiles.");
      return;
    }

    setSaving(true);
    try {
      const newMember = await createTeamMember({
        name: name.trim(),
        role,
        phone: phone.trim() || "+91 98000 00000",
        avatar: selectedAvatarId,
        pin: initialPin.trim(),
        active: true,
      });

      toast.success(`Profile "${newMember.name}" created with secure PIN!`);
      setName("");
      setPhone("");
      setInitialPin("");
      setInitialConfirmPin("");
      setShowAddForm(false);
      await loadTeam();
      setActiveProfile(newMember);
      if (onOpenChange) onOpenChange(false);
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
        {canDismiss && (
          <button
            type="button"
            onClick={handleClose}
            className="absolute top-4 right-4 z-20 h-8 w-8 rounded-full bg-slate-900/80 hover:bg-slate-800 border border-slate-700/80 text-slate-400 hover:text-white flex items-center justify-center transition-colors shadow-md cursor-pointer"
            title="Close"
          >
            <X className="h-4 w-4" />
          </button>
        )}

        {/* Ambient Top Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -mt-20 h-64 w-96 rounded-full bg-blue-600/20 blur-3xl pointer-events-none" />

        <div className="relative z-10 p-6 md:p-10 space-y-8">
          {/* Header */}
          <div className="text-center space-y-2 max-w-lg mx-auto">
            <h1 className="text-3xl md:text-4xl font-extrabold font-display tracking-tight text-white">
              {pinMode === "setup"
                ? "Setup Your 5-Digit PIN"
                : pinMode === "verify"
                ? "Enter Security PIN"
                : "Who is working today?"}
            </h1>

            <p className="text-xs md:text-sm text-slate-400">
              {pinMode === "setup"
                ? `Create a 5-digit PIN for ${selectedMemberForPin?.name}. You will use this PIN to access this profile.`
                : pinMode === "verify"
                ? `Enter the 5-digit PIN for ${selectedMemberForPin?.name} to unlock the desk profile.`
                : "Select your profile to automatically stamp tickets, service calls, and workshop actions."}
            </p>
          </div>

          {/* VIEW 1: PIN Verification / Setup */}
          {selectedMemberForPin && pinMode ? (
            <div className="max-w-md mx-auto space-y-6 bg-slate-900/90 p-6 md:p-8 rounded-2xl border border-slate-800 shadow-xl">
              <div className="flex items-center gap-3.5 pb-4 border-b border-slate-800">
                <AvatarGraphic
                  avatarId={selectedMemberForPin.avatar || "penguin"}
                  size="md"
                />
                <div>
                  <h3 className="font-extrabold text-base text-white">{selectedMemberForPin.name}</h3>
                  <p className="text-xs text-slate-400 capitalize font-medium">{selectedMemberForPin.role}</p>
                </div>
              </div>

              {pinMode === "verify" ? (
                <form onSubmit={handleVerifyPinSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                      <Lock className="h-3.5 w-3.5 text-blue-400" />
                      <span>Enter 5-Digit PIN</span>
                    </Label>
                    <Input
                      type="password"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={5}
                      autoFocus
                      placeholder="•••••"
                      value={enteredPin}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, "").slice(0, 5);
                        setEnteredPin(val);
                        setPinError("");
                      }}
                      className="text-center font-mono text-2xl tracking-[0.4em] h-12 bg-slate-950 border-slate-700 text-white rounded-xl focus:border-blue-500"
                    />
                    {pinError && <p className="text-xs text-rose-400 font-semibold">{pinError}</p>}
                  </div>

                  <div className="flex gap-2.5 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleBackToProfiles}
                      className="flex-1 h-10 text-xs rounded-xl border-slate-700 text-slate-300 hover:bg-slate-800 gap-1.5 cursor-pointer"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" /> Back
                    </Button>
                    <Button
                      type="submit"
                      disabled={enteredPin.length !== 5}
                      className="flex-1 h-10 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-500 text-white gap-1.5 cursor-pointer"
                    >
                      <KeyRound className="h-3.5 w-3.5" /> Unlock Profile
                    </Button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleSetupPinSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                      <Lock className="h-3.5 w-3.5 text-amber-400" />
                      <span>Create 5-Digit PIN</span>
                    </Label>
                    <Input
                      type="password"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={5}
                      autoFocus
                      placeholder="Enter 5 Digits"
                      value={enteredPin}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, "").slice(0, 5);
                        setEnteredPin(val);
                        setPinError("");
                      }}
                      className="text-center font-mono text-xl tracking-[0.3em] h-11 bg-slate-950 border-slate-700 text-white rounded-xl focus:border-amber-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                      <ShieldCheck className="h-3.5 w-3.5 text-amber-400" />
                      <span>Confirm 5-Digit PIN</span>
                    </Label>
                    <Input
                      type="password"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={5}
                      placeholder="Re-enter 5 Digits"
                      value={confirmPin}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, "").slice(0, 5);
                        setConfirmPin(val);
                        setPinError("");
                      }}
                      className="text-center font-mono text-xl tracking-[0.3em] h-11 bg-slate-950 border-slate-700 text-white rounded-xl focus:border-amber-500"
                    />
                    {pinError && <p className="text-xs text-rose-400 font-semibold">{pinError}</p>}
                  </div>

                  <div className="flex gap-2.5 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleBackToProfiles}
                      className="flex-1 h-10 text-xs rounded-xl border-slate-700 text-slate-300 hover:bg-slate-800 gap-1.5 cursor-pointer"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" /> Back
                    </Button>
                    <Button
                      type="submit"
                      disabled={enteredPin.length !== 5 || confirmPin.length !== 5 || savingPin}
                      className="flex-1 h-10 text-xs font-bold rounded-xl bg-amber-600 hover:bg-amber-500 text-white gap-1.5 cursor-pointer"
                    >
                      {savingPin ? "Saving..." : "Set PIN & Log In"}
                    </Button>
                  </div>
                </form>
              )}
            </div>
          ) : !showAddForm ? (
            /* VIEW 2: Staff Profiles Grid */
            <div className="space-y-8">
              {loading ? (
                <LoadingScreen fullScreen={false} title="Staff Identity" subtitle="Loading desk profiles..." />
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
                        onClick={() => handleProfileClick(member)}
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

                        {/* PIN Protection indicator */}
                        <div className="absolute top-2.5 left-2.5">
                          {member.pin ? (
                            <span className="p-1 rounded-md bg-slate-800/80 text-blue-400 border border-slate-700/60 inline-flex" title="PIN Protected">
                              <Lock className="h-3 w-3" />
                            </span>
                          ) : (
                            <span className="p-1 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40 inline-flex" title="PIN Setup Required">
                              <KeyRound className="h-3 w-3" />
                            </span>
                          )}
                        </div>

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
                          <div className="flex justify-center">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${roleBadge}`}>
                              {member.role}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Add New Profile Card */}
                  <div
                    onClick={() => setShowAddForm(true)}
                    className="flex flex-col items-center justify-center p-4 md:p-5 rounded-2xl cursor-pointer border-2 border-dashed border-slate-800 hover:border-blue-500 hover:bg-blue-950/20 transition-all duration-300 text-slate-500 hover:text-blue-400 group min-h-[190px]"
                  >
                    <div className="h-12 w-12 rounded-2xl bg-slate-900 border border-slate-800 group-hover:border-blue-500/60 group-hover:bg-blue-600/20 flex items-center justify-center mb-3 transition-colors">
                      <Plus className="h-6 w-6" />
                    </div>
                    <span className="font-bold text-xs">Add Profile</span>
                    <span className="text-[10px] text-slate-600 group-hover:text-slate-400 mt-0.5">Quick setup</span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* VIEW 3: Quick Add Staff Form */
            <form onSubmit={handleQuickAdd} className="space-y-6 max-w-lg mx-auto bg-slate-900/60 p-6 rounded-2xl border border-slate-800">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h2 className="font-bold text-base text-white flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-blue-400" />
                  <span>Create Team Profile</span>
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

              {/* Avatar Selector */}
              <div className="space-y-2">
                <Label className="text-xs text-slate-400">Choose Graphic Avatar</Label>
                <div className="flex flex-wrap gap-2 justify-center bg-slate-950 p-3 rounded-xl border border-slate-800">
                  {AVATAR_CATALOG.slice(0, 10).map((av) => (
                    <button
                      key={av.id}
                      type="button"
                      onClick={() => setSelectedAvatarId(av.id)}
                      className={`p-1.5 rounded-xl transition-all cursor-pointer ${
                        selectedAvatarId === av.id
                          ? "bg-blue-600 ring-2 ring-blue-400 scale-110 shadow-lg"
                          : "bg-slate-900 hover:bg-slate-800 opacity-70 hover:opacity-100"
                      }`}
                    >
                      <AvatarGraphic avatarId={av.id} size="sm" />
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-300">Staff Full Name</Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Swami Prem Sagar"
                    className="bg-slate-950 border-slate-800 text-xs rounded-xl"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-300">Role</Label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as TeamRole)}
                    className="w-full h-9 rounded-xl bg-slate-950 border border-slate-800 px-3 text-xs text-white"
                  >
                    <option value="backoffice">Backoffice / Desk Support</option>
                    <option value="technician">Hardware Technician</option>
                    <option value="manager">Service Manager</option>
                    {activeProfile?.role === "proprietor" && (
                      <option value="proprietor">Proprietor / Owner</option>
                    )}
                    <option value="developer">Developer</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-slate-300">Phone Number</Label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. +91 99935 99730"
                  className="bg-slate-950 border-slate-800 text-xs rounded-xl"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-300 flex items-center gap-1">
                    <Lock className="h-3 w-3 text-blue-400" />
                    <span>5-Digit Security PIN</span>
                  </Label>
                  <Input
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={5}
                    placeholder="5 Digits"
                    value={initialPin}
                    onChange={(e) => setInitialPin(e.target.value.replace(/\D/g, "").slice(0, 5))}
                    className="bg-slate-950 border-slate-800 text-xs rounded-xl text-center tracking-widest font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-300 flex items-center gap-1">
                    <ShieldCheck className="h-3 w-3 text-blue-400" />
                    <span>Confirm PIN</span>
                  </Label>
                  <Input
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={5}
                    placeholder="Confirm 5 Digits"
                    value={initialConfirmPin}
                    onChange={(e) => setInitialConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 5))}
                    className="bg-slate-950 border-slate-800 text-xs rounded-xl text-center tracking-widest font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddForm(false)}
                  className="text-xs rounded-xl border-slate-800"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={saving || !name.trim() || initialPin.length !== 5 || initialPin !== initialConfirmPin}
                  className="text-xs font-bold bg-blue-600 hover:bg-blue-500 rounded-xl"
                >
                  {saving ? "Creating..." : "Create & Activate Profile"}
                </Button>
              </div>
            </form>
          )}

          {/* Footer Information */}
          <div className="flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-800/80 pt-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
              <span>5-digit PIN protected • Audit stamps automatically logged</span>
            </div>
            <span>Zorba Infotech Desk Manager</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
