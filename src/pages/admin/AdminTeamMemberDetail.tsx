import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import {
  ArrowLeft,
  Wrench,
  Calendar,
  DollarSign,
  TrendingUp,
  CreditCard,
  Plus,
  Trash2,
  CheckCircle2,
  Clock,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Receipt,
  Wallet,
  Phone,
  Mail,
  Pencil,
  ShieldCheck,
  Briefcase,
  Layers,
  Crown,
  Code,
  Tag,
  Lock,
  KeyRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  getTeamMember,
  updateTeamMember,
  getServiceCallsForTechnician,
  getTechnicianPayouts,
  recordTechnicianPayout,
  deleteTechnicianPayout,
} from "@/lib/firestore";
import type {
  TeamMember,
  TeamRole,
  ServiceCall,
  TechnicianPayout,
  PaymentMode,
} from "@/lib/types";
import AvatarGraphic from "@/components/admin/AvatarGraphic";
import { AVATAR_CATALOG } from "@/lib/avatars";
import { useStaffProfile } from "@/contexts/StaffProfileContext";
import { formatIndianPhoneNumber } from "@/lib/utils";

export default function AdminTeamMemberDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { activeProfile } = useStaffProfile();

  const [member, setMember] = useState<TeamMember | null>(null);
  const [loading, setLoading] = useState(true);
  const [calls, setCalls] = useState<ServiceCall[]>([]);
  const [payouts, setPayouts] = useState<TechnicianPayout[]>([]);

  // Current Month Key (e.g. "2026-08")
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    return new Date().toISOString().slice(0, 7);
  });

  const [tab, setTab] = useState<"completed" | "payment_due" | "pending" | "all" | "payouts">("completed");

  // Edit Personnel Dialog State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState<TeamRole>("technician");
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editSpecialization, setEditSpecialization] = useState("");
  const [editCommission, setEditCommission] = useState("50");
  const [editAvatar, setEditAvatar] = useState("penguin");
  const [editActive, setEditActive] = useState(true);
  const [savingEdit, setSavingEdit] = useState(false);

  // Record Payout Modal State
  const [showRecordPayoutModal, setShowRecordPayoutModal] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState("");
  const [payoutDate, setPayoutDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [payoutMode, setPayoutMode] = useState<PaymentMode>("upi");
  const [payoutRef, setPayoutRef] = useState("");
  const [payoutNotes, setPayoutNotes] = useState("");
  const [savingPayout, setSavingPayout] = useState(false);

  const loadData = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const tm = await getTeamMember(id);
      if (!tm) {
        toast.error("Team member not found");
        navigate("/admin/team");
        return;
      }
      setMember(tm);

      const [allCalls, allPayouts] = await Promise.all([
        getServiceCallsForTechnician(tm.id, tm.name),
        getTechnicianPayouts(tm.id, selectedMonth),
      ]);
      setCalls(allCalls);
      setPayouts(allPayouts);
    } catch (err: any) {
      console.error("Error loading team member details:", err);
      toast.error("Failed to load profile details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id, selectedMonth]);

  const commissionRate = member?.commissionPercentage ?? 50;

  // Month navigation
  const handlePrevMonth = () => {
    const [y, m] = selectedMonth.split("-").map(Number);
    const prev = new Date(y, m - 2, 1);
    const newMonth = prev.toISOString().slice(0, 7);
    setSelectedMonth(newMonth);
  };

  const handleNextMonth = () => {
    const [y, m] = selectedMonth.split("-").map(Number);
    const next = new Date(y, m, 1);
    const newMonth = next.toISOString().slice(0, 7);
    setSelectedMonth(newMonth);
  };

  const monthLabel = useMemo(() => {
    const [y, m] = selectedMonth.split("-").map(Number);
    const d = new Date(y, m - 1, 1);
    return d.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
  }, [selectedMonth]);

  // Filter calls for this month
  const monthCalls = useMemo(() => {
    return calls.filter((c) => {
      const callDate = c.dateTime || "";
      return callDate.startsWith(selectedMonth);
    });
  }, [calls, selectedMonth]);

  // Helper: check if payment was received from customer
  const isCallPaymentReceived = (c: ServiceCall): boolean => {
    if (!c.grandTotal || c.grandTotal === 0) return true;
    return c.paymentStatus === "paid";
  };

  // Completed / Delivered calls in month
  const allCompletedCalls = useMemo(() => {
    return monthCalls.filter(
      (c) => c.status === "completed" || c.status === "delivered"
    );
  }, [monthCalls]);

  // Completed & customer payment RECEIVED (Commission payable now)
  const completedPaidCalls = useMemo(() => {
    return allCompletedCalls.filter((c) => isCallPaymentReceived(c));
  }, [allCompletedCalls]);

  // Completed but customer payment DUE (Commission withheld until collected)
  const completedPaymentDueCalls = useMemo(() => {
    return allCompletedCalls.filter((c) => !isCallPaymentReceived(c));
  }, [allCompletedCalls]);

  // Pending / Active calls
  const pendingCalls = useMemo(() => {
    return calls.filter(
      (c) => c.status !== "completed" && c.status !== "delivered" && c.status !== "cancelled"
    );
  }, [calls]);

  // Financial Calculations
  const paidServiceCharges = useMemo(() => {
    return completedPaidCalls.reduce((sum, c) => sum + (Number(c.serviceCharges) || 0), 0);
  }, [completedPaidCalls]);

  const withheldServiceCharges = useMemo(() => {
    return completedPaymentDueCalls.reduce((sum, c) => sum + (Number(c.serviceCharges) || 0), 0);
  }, [completedPaymentDueCalls]);

  const totalServiceCharges = paidServiceCharges + withheldServiceCharges;

  // Payable Commission (Calculated strictly on received customer payments)
  const commissionEarned = useMemo(() => {
    return Math.round((paidServiceCharges * commissionRate) / 100);
  }, [paidServiceCharges, commissionRate]);

  // Withheld Commission (Pending customer payment)
  const commissionWithheld = useMemo(() => {
    return Math.round((withheldServiceCharges * commissionRate) / 100);
  }, [withheldServiceCharges, commissionRate]);

  const totalPaid = useMemo(() => {
    return payouts.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  }, [payouts]);

  const balanceDue = useMemo(() => {
    return commissionEarned - totalPaid;
  }, [commissionEarned, totalPaid]);

  // Open Edit Modal
  const handleOpenEditModal = () => {
    if (!member) return;
    setEditName(member.name);
    setEditRole(member.role);
    setEditPhone(member.phone || "");
    setEditEmail(member.email || "");
    setEditSpecialization(member.specialization || "");
    setEditCommission(String(member.commissionPercentage ?? 50));
    setEditAvatar(member.avatar || "penguin");
    setEditActive(member.active !== false);
    setShowEditModal(true);
  };

  const handleSaveMemberProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!member) return;
    if (!editName.trim() || !editPhone.trim()) {
      toast.error("Name and Phone number are required");
      return;
    }

    setSavingEdit(true);
    try {
      const commNum = editRole === "technician" ? (parseFloat(editCommission) || 50) : undefined;
      const cleanEmail = editEmail.trim();
      const cleanSpec = editSpecialization.trim();
      const payload: Partial<TeamMember> = {
        name: editName.trim(),
        role: editRole,
        phone: editPhone.trim(),
        email: cleanEmail,
        specialization: cleanSpec,
        commissionPercentage: commNum,
        avatar: editAvatar,
        active: editActive,
      };

      await updateTeamMember(member.id, payload);
      setMember((prev) =>
        prev
          ? {
              ...prev,
              ...payload,
              email: cleanEmail || undefined,
              specialization: cleanSpec || undefined,
            }
          : null
      );
      toast.success("Team member profile updated!");
      setShowEditModal(false);
    } catch (err: any) {
      toast.error(err?.message || "Failed to update profile");
    } finally {
      setSavingEdit(false);
    }
  };

  // Open Record Payout Modal
  const handleOpenPayoutDialog = () => {
    setPayoutAmount(balanceDue > 0 ? String(balanceDue) : "");
    setPayoutDate(new Date().toISOString().split("T")[0]);
    setPayoutMode("upi");
    setPayoutRef("");
    setPayoutNotes("");
    setShowRecordPayoutModal(true);
  };

  const handleSavePayout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!member) return;
    const amountNum = parseFloat(payoutAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error("Please enter a valid payout amount");
      return;
    }

    setSavingPayout(true);
    try {
      await recordTechnicianPayout({
        technicianId: member.id,
        technicianName: member.name,
        monthKey: selectedMonth,
        amount: amountNum,
        date: payoutDate,
        paymentMode: payoutMode,
        referenceNumber: payoutRef.trim() || undefined,
        notes: payoutNotes.trim() || undefined,
        createdByStaffId: activeProfile?.id,
        createdByStaffName: activeProfile?.name,
      });

      toast.success(`Recorded payment of ₹${amountNum.toLocaleString("en-IN")} to ${member.name}`);
      setShowRecordPayoutModal(false);
      loadData();
    } catch (err: any) {
      toast.error(err?.message || "Failed to record payment");
    } finally {
      setSavingPayout(false);
    }
  };

  const handleDeletePayout = async (payoutId: string) => {
    if (!confirm("Are you sure you want to remove this payout record?")) return;
    try {
      await deleteTechnicianPayout(payoutId);
      toast.success("Payout record deleted");
      loadData();
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete payout");
    }
  };

  const isOwner = activeProfile?.role === "proprietor";

  // Reset PIN State
  const [showResetPinModal, setShowResetPinModal] = useState(false);
  const [newPinInput, setNewPinInput] = useState("");
  const [confirmNewPinInput, setConfirmNewPinInput] = useState("");
  const [savingResetPin, setSavingResetPin] = useState(false);

  const handleResetPinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!member) return;

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
      await updateTeamMember(member.id, { pin: newPinInput.trim() });
      toast.success(`PIN updated for ${member.name}`);
      setMember((prev) => (prev ? { ...prev, pin: newPinInput.trim() } : null));
      setShowResetPinModal(false);
    } catch (err: any) {
      toast.error(err?.message || "Failed to update PIN");
    } finally {
      setSavingResetPin(false);
    }
  };

  const handleClearPin = async () => {
    if (!member) return;
    setSavingResetPin(true);
    try {
      await updateTeamMember(member.id, { pin: "" });
      toast.success(`PIN cleared for ${member.name}. User will be prompted to setup on next login.`);
      setMember((prev) => (prev ? { ...prev, pin: undefined } : null));
      setShowResetPinModal(false);
    } catch (err: any) {
      toast.error(err?.message || "Failed to clear PIN");
    } finally {
      setSavingResetPin(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-slate-500">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mb-2" />
        <p className="text-xs">Loading personnel profile...</p>
      </div>
    );
  }

  if (!member) return null;

  const isTechnician = member.role === "technician";

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto text-slate-900 dark:text-slate-100 text-xs">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/admin/team")}
            className="h-8 w-8 rounded-xl text-slate-500 hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-extrabold font-display tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                <span>{member.name}</span>
              </h1>
              <Badge
                className={
                  member.role === "proprietor"
                    ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 font-bold border-amber-200"
                    : member.role === "technician"
                    ? "bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 font-bold border-purple-200"
                    : member.role === "manager"
                    ? "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 font-bold border-blue-200"
                    : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 font-bold"
                }
              >
                {member.role === "technician"
                  ? `Technician • ${commissionRate}% Cut`
                  : member.role.toUpperCase()}
              </Badge>
              {member.active ? (
                <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-200 text-[10px]">
                  Active Staff
                </Badge>
              ) : (
                <Badge variant="outline" className="text-slate-400 text-[10px]">
                  Inactive
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Personnel Profile, Service Call Assignments & Commission Payroll Ledger
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isOwner && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setNewPinInput("");
                setConfirmNewPinInput("");
                setShowResetPinModal(true);
              }}
              className="h-8 text-xs font-bold rounded-xl gap-1.5 cursor-pointer shadow-2xs text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800 hover:bg-amber-50 dark:hover:bg-amber-950/40"
            >
              <KeyRound className="h-3.5 w-3.5" />
              <span>Reset 5-Digit PIN</span>
            </Button>
          )}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleOpenEditModal}
            className="h-8 text-xs font-bold rounded-xl gap-1.5 cursor-pointer shadow-2xs"
          >
            <Pencil className="h-3.5 w-3.5" />
            <span>Edit Profile</span>
          </Button>

          {isTechnician && (
            <Button
              type="button"
              size="sm"
              onClick={handleOpenPayoutDialog}
              className="h-8 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 cursor-pointer shadow-xs"
            >
              <Receipt className="h-3.5 w-3.5" />
              <span>Record Payout</span>
            </Button>
          )}
        </div>
      </div>

      {/* Personnel Overview Card */}
      <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <AvatarGraphic avatarId={member.avatar || "penguin"} size="lg" />
            <div className="space-y-1">
              <div className="text-base font-extrabold text-slate-900 dark:text-white">
                {member.name}
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1 font-mono font-semibold text-slate-800 dark:text-slate-200">
                  <Phone className="h-3.5 w-3.5 text-blue-500" />
                  {formatIndianPhoneNumber(member.phone)}
                </span>
                {member.email && (
                  <span className="flex items-center gap-1">
                    <Mail className="h-3.5 w-3.5 text-blue-500" />
                    {member.email}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Briefcase className="h-3.5 w-3.5 text-purple-500" />
                  {member.specialization || "Hardware Service"}
                </span>
              </div>
            </div>
          </div>

          {/* Month Navigator for Technicians */}
          {isTechnician && (
            <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800/80 p-1.5 rounded-2xl self-start md:self-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={handlePrevMonth}
                className="h-7 w-7 p-0 rounded-xl cursor-pointer"
                title="Previous Month"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="font-extrabold text-xs px-2 text-center text-slate-900 dark:text-white min-w-[120px]">
                {monthLabel}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleNextMonth}
                className="h-7 w-7 p-0 rounded-xl cursor-pointer"
                title="Next Month"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Technician Commission Financial KPI Summary Cards */}
      {isTechnician && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {/* Completed Jobs */}
          <div className="p-3.5 rounded-2xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-900/60">
            <span className="text-[11px] font-semibold text-blue-700 dark:text-blue-300">
              Completed Jobs ({monthLabel.split(" ")[0]})
            </span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-blue-900 dark:text-blue-100 font-mono">
                {allCompletedCalls.length}
              </span>
              <span className="text-[10px] text-blue-600 dark:text-blue-400">tickets</span>
            </div>
            <div className="text-[10px] text-blue-600 dark:text-blue-400 mt-0.5 font-semibold">
              {completedPaidCalls.length} Paid • {completedPaymentDueCalls.length} Due
            </div>
          </div>

          {/* Paid Service Charges */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
              Paid Service Charges
            </span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-slate-900 dark:text-white font-mono">
                ₹{paidServiceCharges.toLocaleString("en-IN")}
              </span>
            </div>
            <div className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5">
              Collected from customers
            </div>
          </div>

          {/* Payable Commission */}
          <div className="p-3.5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-900/60">
            <span className="text-[11px] font-semibold text-indigo-700 dark:text-indigo-300">
              Payable Comm. ({commissionRate}%)
            </span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-indigo-900 dark:text-indigo-100 font-mono">
                ₹{commissionEarned.toLocaleString("en-IN")}
              </span>
            </div>
            <div className="text-[10px] text-indigo-600 dark:text-indigo-400 mt-0.5">
              On collected charges
            </div>
          </div>

          {/* Withheld Commission (Pending customer payment) */}
          <div className="p-3.5 rounded-2xl bg-rose-50/70 dark:bg-rose-950/40 border border-rose-200/80 dark:border-rose-900/60">
            <span className="text-[11px] font-semibold text-rose-700 dark:text-rose-300">
              Commission Withheld
            </span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-rose-900 dark:text-rose-100 font-mono">
                ₹{commissionWithheld.toLocaleString("en-IN")}
              </span>
            </div>
            <div className="text-[10px] text-rose-600 dark:text-rose-400 mt-0.5 font-bold">
              {completedPaymentDueCalls.length} unpaid by customer
            </div>
          </div>

          {/* Net Balance Due */}
          <div className={`p-3.5 rounded-2xl border ${
            balanceDue > 0
              ? "bg-amber-50/70 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800"
              : "bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800"
          }`}>
            <div className="flex items-center justify-between">
              <span className={`text-[11px] font-bold ${
                balanceDue > 0 ? "text-amber-800 dark:text-amber-300" : "text-emerald-800 dark:text-emerald-300"
              }`}>
                {balanceDue > 0 ? "Net Payable to Tech" : "Settled / Fully Paid"}
              </span>
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className={`text-2xl font-extrabold font-mono ${
                balanceDue > 0 ? "text-amber-950 dark:text-amber-100" : "text-emerald-950 dark:text-emerald-100"
              }`}>
                ₹{Math.abs(balanceDue).toLocaleString("en-IN")}
              </span>
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              After ₹{totalPaid.toLocaleString("en-IN")} paid
            </div>
          </div>
        </div>
      )}

      {/* Tabs & Service Calls Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2 border-b border-slate-200 dark:border-slate-800">
          <div className="overflow-x-auto max-w-full pb-1">
            <div className="inline-flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl shrink-0">
              <button
                type="button"
                onClick={() => setTab("completed")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  tab === "completed"
                    ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                Completed & Paid ({completedPaidCalls.length})
              </button>
              <button
                type="button"
                onClick={() => setTab("payment_due")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  tab === "payment_due"
                    ? "bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                Cust Payment Due ({completedPaymentDueCalls.length})
              </button>
              <button
                type="button"
                onClick={() => setTab("pending")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  tab === "pending"
                    ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                In Progress ({pendingCalls.length})
              </button>
              <button
                type="button"
                onClick={() => setTab("all")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  tab === "all"
                    ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                All Month Calls ({monthCalls.length})
              </button>
              {isTechnician && (
                <button
                  type="button"
                  onClick={() => setTab("payouts")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    tab === "payouts"
                      ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                  }`}
                >
                  Monthly Payouts ({payouts.length})
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Tab Content */}
        {tab !== "payouts" ? (
          (() => {
            const displayCalls =
              tab === "completed"
                ? completedPaidCalls
                : tab === "payment_due"
                ? completedPaymentDueCalls
                : tab === "pending"
                ? pendingCalls
                : monthCalls;

            if (displayCalls.length === 0) {
              return (
                <div className="p-8 text-center bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-400">
                  No service calls found for this filter in {monthLabel}.
                </div>
              );
            }

            return (
              <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-2xs">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-500">
                      <th className="py-2.5 px-3">Ticket #</th>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Customer</th>
                      <th className="py-2.5 px-3">Device / Issue</th>
                      <th className="py-2.5 px-3">Job Status</th>
                      <th className="py-2.5 px-3">Customer Payment</th>
                      <th className="py-2.5 px-3 text-right">Service Charge</th>
                      {isTechnician && (
                        <th className="py-2.5 px-3 text-right">Tech Cut ({commissionRate}%)</th>
                      )}
                      <th className="py-2.5 px-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                    {displayCalls.map((c) => {
                      const scNum = Number(c.serviceCharges) || 0;
                      const cut = Math.round((scNum * commissionRate) / 100);
                      const isCompleted = c.status === "completed" || c.status === "delivered";
                      const isPaidByCustomer = isCallPaymentReceived(c);

                      return (
                        <tr key={c.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-900/40">
                          <td className="py-2.5 px-3 font-mono font-bold text-blue-600 dark:text-blue-400">
                            #{c.ticketNo}
                          </td>
                          <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">
                            {c.dateTime || "-"}
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">
                            {c.customerName || "-"}
                          </td>
                          <td className="py-2.5 px-3 max-w-[200px] truncate text-slate-600 dark:text-slate-400">
                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                              {c.deviceCategory}:
                            </span>{" "}
                            {c.issueDescription}
                          </td>
                          <td className="py-2.5 px-3">
                            <Badge
                              variant="outline"
                              className={`text-[10px] uppercase font-bold ${
                                isCompleted
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                                  : "bg-amber-50 text-amber-700 border-amber-300"
                              }`}
                            >
                              {c.status.replace(/_/g, " ")}
                            </Badge>
                          </td>
                          <td className="py-2.5 px-3">
                            {isPaidByCustomer ? (
                              <Badge
                                variant="outline"
                                className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-200 text-[10px] font-bold gap-1"
                              >
                                <CheckCircle2 className="h-3 w-3" />
                                <span>PAID</span>
                              </Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className="bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border-rose-200 text-[10px] font-bold gap-1"
                              >
                                <AlertCircle className="h-3 w-3" />
                                <span>DUE (₹{c.grandTotal || 0})</span>
                              </Badge>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                            ₹{scNum.toLocaleString("en-IN")}
                          </td>
                          {isTechnician && (
                            <td className="py-2.5 px-3 text-right font-mono font-bold">
                              {isCompleted ? (
                                isPaidByCustomer ? (
                                  <div className="text-indigo-600 dark:text-indigo-400">
                                    <span>₹{cut.toLocaleString("en-IN")}</span>
                                    <div className="text-[9px] text-emerald-600 dark:text-emerald-400 font-sans font-semibold">
                                      ✓ Ready to pay
                                    </div>
                                  </div>
                                ) : (
                                  <div className="text-amber-600 dark:text-amber-400">
                                    <span className="line-through text-slate-400">₹{cut.toLocaleString("en-IN")}</span>
                                    <div className="text-[9px] text-rose-600 dark:text-rose-400 font-sans font-bold">
                                      ⚠ Withheld (Cust Due)
                                    </div>
                                  </div>
                                )
                              ) : (
                                <span className="text-slate-400 text-[11px] font-sans">Pending Repair</span>
                              )}
                            </td>
                          )}
                          <td className="py-2.5 px-3 text-center">
                            <Link
                              to={`/admin/service-calls/${c.id}/edit`}
                              target="_blank"
                              className="text-blue-600 hover:text-blue-800 p-1 inline-flex items-center gap-1 font-semibold"
                            >
                              <span>Open</span>
                              <ExternalLink className="h-3 w-3" />
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          })()
        ) : (
          /* Monthly Payouts Ledger */
          <div className="space-y-3">
            {payouts.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-400">
                No payout transactions recorded for {monthLabel}. Click Record Monthly Payout to log a payment.
              </div>
            ) : (
              <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-2xs">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-500">
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Payment Mode</th>
                      <th className="py-2.5 px-3">Reference #</th>
                      <th className="py-2.5 px-3">Remarks / Notes</th>
                      <th className="py-2.5 px-3">Recorded By</th>
                      <th className="py-2.5 px-3 text-right">Amount (₹)</th>
                      <th className="py-2.5 px-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                    {payouts.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-900/40">
                        <td className="py-2.5 px-3 font-semibold">{p.date}</td>
                        <td className="py-2.5 px-3">
                          <Badge variant="outline" className="uppercase text-[10px] font-bold font-mono">
                            {p.paymentMode}
                          </Badge>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-slate-400">
                          {p.referenceNumber || "—"}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">
                          {p.notes || "—"}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500">
                          {p.createdByStaffName || "Admin"}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-extrabold text-emerald-600 dark:text-emerald-400">
                          ₹{p.amount.toLocaleString("en-IN")}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                            onClick={() => handleDeletePayout(p.id)}
                            title="Delete Payout"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Edit Personnel Profile Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6 border-slate-200 dark:border-slate-800 text-xs">
          <DialogHeader className="p-0 mb-4 pb-3 border-b border-slate-200 dark:border-slate-800">
            <DialogTitle className="text-base font-bold text-slate-900 dark:text-white">
              Edit Team Member Profile
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveMemberProfile} className="space-y-3.5">
            <div>
              <Label className="text-xs font-semibold">Full Name *</Label>
              <Input
                required
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="h-9 text-xs rounded-xl mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <Label className="text-xs font-semibold">Role</Label>
                <Select value={editRole} onValueChange={(v) => setEditRole(v as TeamRole)}>
                  <SelectTrigger className="h-9 text-xs rounded-xl mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="technician">Technician</SelectItem>
                    <SelectItem value="backoffice">Back Office</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="developer">Developer</SelectItem>
                    <SelectItem value="proprietor">Proprietor</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {editRole === "technician" ? (
                <div>
                  <Label className="text-xs font-semibold">Commission %</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={editCommission}
                    onChange={(e) => setEditCommission(e.target.value)}
                    className="h-9 text-xs font-mono rounded-xl mt-1 font-bold"
                  />
                </div>
              ) : (
                <div>
                  <Label className="text-xs font-semibold">Specialization</Label>
                  <Input
                    value={editSpecialization}
                    onChange={(e) => setEditSpecialization(e.target.value)}
                    placeholder="e.g. Intake"
                    className="h-9 text-xs rounded-xl mt-1"
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <Label className="text-xs font-semibold">Phone Number *</Label>
                <Input
                  required
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="h-9 text-xs font-mono rounded-xl mt-1"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold">Email Address</Label>
                <Input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="h-9 text-xs rounded-xl mt-1"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold mb-1.5 block">Avatar Graphic</Label>
              <div className="flex items-center gap-2 overflow-x-auto p-1.5 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
                {AVATAR_CATALOG.map((av) => (
                  <button
                    key={av.id}
                    type="button"
                    onClick={() => setEditAvatar(av.id)}
                    className={`p-1.5 rounded-xl transition-all cursor-pointer ${
                      editAvatar === av.id
                        ? "bg-blue-100 ring-2 ring-blue-600 scale-105 shadow-xs"
                        : "hover:bg-slate-200/60 dark:hover:bg-slate-800"
                    }`}
                  >
                    <AvatarGraphic avatarId={av.id} size="sm" />
                  </button>
                ))}
              </div>
            </div>

            <DialogFooter className="p-0 pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowEditModal(false)}
                className="h-8 text-xs rounded-xl"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={savingEdit}
                className="h-8 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white"
              >
                {savingEdit ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Record Payout Dialog */}
      <Dialog open={showRecordPayoutModal} onOpenChange={setShowRecordPayoutModal}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6 border-slate-200 dark:border-slate-800 text-xs">
          <DialogHeader className="p-0 mb-4 pb-3 border-b border-slate-200 dark:border-slate-800">
            <DialogTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Wallet className="h-4 w-4 text-emerald-600" />
              <span>Record Monthly Payout for {monthLabel}</span>
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSavePayout} className="space-y-3.5">
            <div>
              <Label className="text-xs font-semibold">
                Payout Amount (₹) <span className="text-rose-500">*</span>
              </Label>
              <Input
                type="number"
                step="any"
                required
                value={payoutAmount}
                onChange={(e) => setPayoutAmount(e.target.value)}
                placeholder="e.g. 5000"
                className="h-9 text-xs font-mono font-bold rounded-xl mt-1"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Current Net Balance: ₹{balanceDue.toLocaleString("en-IN")}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <Label className="text-xs font-semibold">Payment Date</Label>
                <Input
                  type="date"
                  required
                  value={payoutDate}
                  onChange={(e) => setPayoutDate(e.target.value)}
                  className="h-9 text-xs rounded-xl mt-1"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold">Payment Mode</Label>
                <Select value={payoutMode} onValueChange={(v) => setPayoutMode(v as PaymentMode)}>
                  <SelectTrigger className="h-9 text-xs rounded-xl mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="upi">UPI / GPay / PhonePe</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer (NEFT/IMPS)</SelectItem>
                    <SelectItem value="cheque">Cheque</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold">Transaction / Reference # (Optional)</Label>
              <Input
                value={payoutRef}
                onChange={(e) => setPayoutRef(e.target.value)}
                placeholder="e.g. UPI Ref / Cheque No"
                className="h-9 text-xs font-mono rounded-xl mt-1"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold">Remarks / Notes</Label>
              <Input
                value={payoutNotes}
                onChange={(e) => setPayoutNotes(e.target.value)}
                placeholder="e.g. Monthly Commission advance"
                className="h-9 text-xs rounded-xl mt-1"
              />
            </div>

            <DialogFooter className="p-0 pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowRecordPayoutModal(false)}
                className="h-8 text-xs rounded-xl"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={savingPayout}
                className="h-8 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {savingPayout ? "Recording..." : "Save Payout"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Owner Reset PIN Modal */}
      <Dialog open={showResetPinModal} onOpenChange={setShowResetPinModal}>
        <DialogContent className="sm:max-w-sm p-6">
          <DialogHeader className="border-b pb-3">
            <DialogTitle className="flex items-center gap-2 font-display text-base text-slate-900 dark:text-white">
              <KeyRound className="h-5 w-5 text-amber-500" />
              <span>Reset 5-Digit PIN</span>
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleResetPinSubmit} className="space-y-4 pt-2 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border text-xs">
              <span className="font-bold text-slate-900 dark:text-white">{member?.name}</span>
              <p className="text-slate-500 capitalize">{member?.role} • {member?.phone}</p>
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
    </div>
  );
}
