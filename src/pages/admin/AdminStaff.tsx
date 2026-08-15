import { useEffect, useState } from "react";
import { UserCheck, Plus, Trash2, Search, Phone, Pencil, RefreshCw, ShieldCheck, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { getStaffMembers, deleteStaffMember } from "@/lib/firestore";
import type { StaffMember } from "@/lib/types";
import CreateStaffModal from "@/components/admin/CreateStaffModal";
import EditStaffModal from "@/components/admin/EditStaffModal";

export default function AdminStaff() {
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editStaff, setEditStaff] = useState<StaffMember | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getStaffMembers();
      setStaffList(data);
    } catch (err: any) {
      console.error("Firebase error in AdminStaff:", err);
      setError(err?.message || "Unable to load staff directory from Firebase.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteStaffMember(deleteId);
      toast.success("Staff member removed");
      setDeleteId(null);
      loadData();
    } catch {
      toast.error("Failed to delete staff member");
    }
  };

  const filtered = staffList.filter((s) => {
    const q = search.toLowerCase().trim();
    return (
      !q ||
      s.name.toLowerCase().includes(q) ||
      (s.phone && s.phone.toLowerCase().includes(q)) ||
      (s.role && s.role.toLowerCase().includes(q))
    );
  });

  const totalStaff = staffList.length;
  const activeStaff = staffList.filter((s) => s.active !== false).length;

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-6xl mx-auto text-xs">
      {/* Top Header Card */}
      <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-4 text-white shadow-md">
        <div className="absolute right-0 top-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-blue-500/20 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] font-semibold backdrop-blur-md border border-white/10 text-blue-300">
                <ShieldCheck className="h-3.5 w-3.5 text-blue-400" /> Back Office Operations
              </div>

              {/* Stats Bar */}
              <div className="flex items-center gap-1.5 text-[11px] font-medium flex-wrap">
                <span className="rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2 py-0.5 font-bold">
                  Total Staff: {totalStaff}
                </span>
                <span className="rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 font-bold">
                  Active: {activeStaff}
                </span>
              </div>
            </div>

            <h1 className="text-xl md:text-2xl font-extrabold font-display tracking-tight text-white leading-tight">
              Back Office Staff Directory
            </h1>
            <p className="text-xs text-slate-300">
              Manage internal staff members assigned to ticket intake, courier dispatches, customer coordination, and audits
            </p>
          </div>

          <Button
            onClick={() => setShowCreateModal(true)}
            size="sm"
            className="gap-1.5 font-bold bg-[#2563EB] hover:bg-blue-700 text-white shrink-0 rounded-xl"
          >
            <Plus className="h-4 w-4" /> Add Staff Member
          </Button>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search by name, role, phone…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-xs rounded-xl"
          />
        </div>

        <div className="text-xs text-muted-foreground font-semibold">
          Showing: <span className="text-foreground font-extrabold">{filtered.length}</span> staff
        </div>
      </div>

      {/* Main Table */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-card rounded-2xl border">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mb-2" />
          <p className="text-xs text-muted-foreground">Loading backoffice staff list...</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border bg-destructive/5 border-destructive/20 py-16 text-center px-4">
          <p className="font-bold text-destructive text-base">Firebase Connection Error</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-md">{error}</p>
          <Button onClick={() => loadData()} className="mt-4 gap-2 text-xs" variant="outline" size="sm">
            <RefreshCw className="h-3.5 w-3.5" /> Retry Connection
          </Button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 bg-card rounded-2xl border text-center p-6 space-y-3">
          <UserCheck className="h-10 w-10 text-muted-foreground/50" />
          <div>
            <p className="font-bold text-foreground text-sm">No Back Office Staff Found</p>
            <p className="text-xs text-muted-foreground mt-1">
              {search ? "No staff members matched your search filter." : "Get started by adding your first backoffice staff member."}
            </p>
          </div>
          <Button onClick={() => setShowCreateModal(true)} size="sm" className="gap-1 text-xs">
            <Plus className="h-3.5 w-3.5" /> Add Staff Member
          </Button>
        </div>
      ) : (
        <div className="rounded-2xl border bg-card overflow-hidden shadow-xs">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b bg-muted/40 text-[11px] uppercase font-bold tracking-wider text-muted-foreground">
                <th className="py-3 px-4">Staff Member</th>
                <th className="py-3 px-4">Role / Assignment</th>
                <th className="py-3 px-4">Contact Phone</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y text-xs">
              {filtered.map((s) => {
                const isActive = s.active !== false;
                const initials = s.name
                  ? s.name
                      .split(" ")
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join("")
                      .toUpperCase()
                  : "ST";

                return (
                  <tr key={s.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-4 font-bold text-foreground">
                      <div className="flex items-center gap-2.5">
                        <div className="h-7 w-7 rounded-full bg-blue-100 dark:bg-blue-950 text-[#2563EB] flex items-center justify-center font-extrabold text-xs shrink-0">
                          {initials}
                        </div>
                        <span>{s.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-medium text-slate-700 dark:text-slate-300">
                        {s.role || "Backoffice Coordinator"}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-muted-foreground">
                      {s.phone ? (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3 text-muted-foreground" /> {s.phone}
                        </span>
                      ) : (
                        <span className="text-slate-300 dark:text-slate-600">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {isActive ? (
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/50 gap-1 text-[10px] px-2 py-0.5">
                          <CheckCircle2 className="h-2.5 w-2.5" /> Active
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 gap-1 text-[10px] px-2 py-0.5">
                          <XCircle className="h-2.5 w-2.5" /> Inactive
                        </Badge>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          onClick={() => setEditStaff(s)}
                          title="Edit Staff Member"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => setDeleteId(s.id)}
                          title="Delete Staff Member"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Create & Edit Modals */}
      <CreateStaffModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        onCreated={() => loadData()}
      />
      <EditStaffModal
        staff={editStaff}
        open={Boolean(editStaff)}
        onOpenChange={(open) => !open && setEditStaff(null)}
        onUpdated={() => loadData()}
      />

      {/* Delete Confirmation Alert */}
      <AlertDialog open={Boolean(deleteId)} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm">Delete Staff Member?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              Are you sure you want to remove this backoffice staff member? Past service call logs will retain their name.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-8 text-xs">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="h-8 text-xs bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
