import { useEffect, useState } from "react";
import { UserCheck, Plus, Trash2, Search, Phone, Wrench, Pencil, RefreshCw, CheckCircle2, XCircle } from "lucide-react";
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
import { getTechnicians, deleteTechnician } from "@/lib/firestore";
import type { Technician } from "@/lib/types";
import CreateTechnicianModal from "@/components/admin/CreateTechnicianModal";
import EditTechnicianModal from "@/components/admin/EditTechnicianModal";

export default function AdminTechnicians() {
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editTech, setEditTech] = useState<Technician | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getTechnicians();
      setTechnicians(data);
    } catch (err: any) {
      console.error("Firebase error in AdminTechnicians:", err);
      setError(err?.message || "Unable to connect to Firebase to load technicians.");
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
      await deleteTechnician(deleteId);
      toast.success("Technician deleted");
      setDeleteId(null);
      loadData();
    } catch {
      toast.error("Failed to delete technician");
    }
  };

  const filtered = technicians.filter((t) => {
    const q = search.toLowerCase().trim();
    return (
      !q ||
      t.name.toLowerCase().includes(q) ||
      (t.phone && t.phone.toLowerCase().includes(q)) ||
      (t.specialization && t.specialization.toLowerCase().includes(q))
    );
  });

  const totalStaff = technicians.length;
  const activeStaff = technicians.filter((t) => t.active !== false).length;
  const specCount = new Set(technicians.map((t) => t.specialization).filter(Boolean)).size;

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-6xl mx-auto text-xs">
      {/* Integrated Dark Hero Header */}
      <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-4 text-white shadow-md">
        <div className="absolute right-0 top-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-blue-500/20 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="space-y-1">
            <h1 className="text-xl md:text-2xl font-extrabold font-display tracking-tight text-white leading-tight">
              Technicians Directory
            </h1>
            <p className="text-xs text-slate-300">
              Manage technical assignees for service calls, on-site visits, and in-house repairs
            </p>
          </div>

          <Button
            onClick={() => setShowCreateModal(true)}
            size="sm"
            className="gap-1.5 shadow-glow-sm font-bold bg-primary hover:bg-primary/90 text-white shrink-0"
          >
            <Plus className="h-4 w-4" /> Add Technician
          </Button>
        </div>
      </div>

      {/* Filter / Search bar */}
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search by name, phone, specialization…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-xs rounded-xl"
          />
        </div>

        <div className="text-xs text-muted-foreground font-semibold">
          Total Technicians: <span className="text-foreground font-extrabold">{filtered.length}</span>
        </div>
      </div>

      {/* Main Table */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-card rounded-2xl border">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mb-2" />
          <p className="text-xs text-muted-foreground">Loading technicians list...</p>
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
        <div className="flex flex-col items-center justify-center rounded-2xl border bg-card py-20 text-center">
          <UserCheck className="h-12 w-12 text-muted-foreground/20 mb-3" />
          <p className="font-bold text-base font-display">No Technicians Found</p>
          <p className="text-xs text-muted-foreground mt-1">
            {technicians.length === 0 ? 'Click "Add Technician" to register your first staff member.' : 'No technicians match your search criteria.'}
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border bg-card overflow-hidden shadow-xs">
          <table className="w-full text-xs">
            <thead className="border-b bg-muted/40 font-bold uppercase tracking-wider text-muted-foreground/80">
              <tr>
                <th className="px-4 py-3 text-left">Technician Name</th>
                <th className="px-4 py-3 text-left">Contact Phone</th>
                <th className="px-4 py-3 text-left">Specialization / Role</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.map((tech) => (
                <tr key={tech.id} className="hover:bg-muted/30 transition-colors group">
                  {/* Name */}
                  <td className="px-4 py-2.5">
                    <div className="font-bold text-foreground text-xs flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-500/10 text-blue-600 font-bold text-xs">
                        {tech.name.slice(0, 2).toUpperCase()}
                      </div>
                      <span>{tech.name}</span>
                    </div>
                  </td>

                  {/* Phone */}
                  <td className="px-4 py-2.5 font-mono font-semibold text-foreground">
                    {tech.phone ? (
                      <span className="flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5 text-muted-foreground" /> {tech.phone}
                      </span>
                    ) : (
                      <span className="text-muted-foreground/50 italic">—</span>
                    )}
                  </td>

                  {/* Specialization */}
                  <td className="px-4 py-2.5 text-muted-foreground">
                    {tech.specialization ? (
                      <span className="flex items-center gap-1.5 text-foreground font-medium">
                        <Wrench className="h-3.5 w-3.5 text-blue-500 shrink-0" /> {tech.specialization}
                      </span>
                    ) : (
                      <span className="text-muted-foreground/50 italic">General Repairs</span>
                    )}
                  </td>

                  {/* Status */}
                  <td className="px-4 py-2.5 text-center">
                    {tech.active !== false ? (
                      <Badge variant="secondary" className="bg-emerald-500/15 text-emerald-600 border border-emerald-500/30 gap-1 text-[10px]">
                        <CheckCircle2 className="h-3 w-3" /> Active
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-slate-500/15 text-slate-500 border border-slate-500/30 gap-1 text-[10px]">
                        <XCircle className="h-3 w-3" /> Inactive
                      </Badge>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-2.5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-foreground hover:bg-muted"
                        title="Edit Technician"
                        onClick={() => setEditTech(tech)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                        title="Delete Technician"
                        onClick={() => setDeleteId(tech.id)}
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
      )}

      {/* Inline Modals */}
      <CreateTechnicianModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        onCreated={loadData}
      />
      <EditTechnicianModal
        technician={editTech}
        open={!!editTech}
        onOpenChange={(open) => !open && setEditTech(null)}
        onUpdated={loadData}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Technician Profile?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this technician? Assigned past tickets will retain historical record.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Technician
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
