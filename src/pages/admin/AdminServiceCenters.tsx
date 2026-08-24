import { useEffect, useState } from "react";
import { Building2, Plus, Trash2, Search, MapPin, Pencil, RefreshCw, MessageCircle, User } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ConfirmDeleteDialog,
  EmptyState,
  FirebaseErrorState,
  SearchFilterBar,
  LoadingScreen,
} from "@/components/common";
import { getServiceCenters, deleteServiceCenter } from "@/lib/firestore";
import type { ServiceCenter } from "@/lib/types";
import { useTallyShortcuts } from "@/hooks/useTallyShortcuts";
import CreateServiceCenterModal from "@/components/admin/CreateServiceCenterModal";
import EditServiceCenterModal from "@/components/admin/EditServiceCenterModal";

export default function AdminServiceCenters() {
  const [centers, setCenters] = useState<ServiceCenter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editCenter, setEditCenter] = useState<ServiceCenter | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getServiceCenters();
      setCenters(data);
    } catch (err: any) {
      console.error("Firebase error in AdminServiceCenters:", err);
      setError(err?.message || "Unable to load service centers list.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useTallyShortcuts({
    onAltC: () => setShowCreateModal(true),
    onAltA: () => setShowCreateModal(true),
  });

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteServiceCenter(deleteId);
      toast.success("Service Center removed");
      setDeleteId(null);
      loadData();
    } catch {
      toast.error("Failed to delete service center");
    }
  };

  const filtered = centers.filter((c) => {
    const q = search.toLowerCase().trim();
    return (
      !q ||
      c.name.toLowerCase().includes(q) ||
      (c.phone && c.phone.toLowerCase().includes(q)) ||
      (c.whatsappPhone && c.whatsappPhone.toLowerCase().includes(q)) ||
      c.addresses.some((a) => a.city?.toLowerCase().includes(q) || a.address.toLowerCase().includes(q))
    );
  });

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-6xl mx-auto text-xs">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-4 text-white shadow-md">
        <div className="absolute right-0 top-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-blue-500/20 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="space-y-1">
            <h1 className="text-xl md:text-2xl font-extrabold font-display tracking-tight text-white leading-tight">
              Authorized Service Centers Directory
            </h1>
            <p className="text-xs text-slate-300">
              Manage OEM service hubs, multiple dispatch addresses, point of contacts (POCs), and WhatsApp follow-up numbers
            </p>
          </div>

          <Button
            onClick={() => setShowCreateModal(true)}
            size="sm"
            className="gap-1.5 font-bold bg-[#2563EB] hover:bg-blue-700 text-white shrink-0 rounded-xl cursor-pointer"
          >
            <Plus className="h-4 w-4" /> Add Service Center (Alt+C)
          </Button>
        </div>
      </div>

      {/* Filter / Search bar */}
      <SearchFilterBar
        value={search}
        onChange={setSearch}
        placeholder="Search by center name, city, address, phone…"
        count={filtered.length}
        countLabel="Total Centers"
      />

      {/* Main Grid / Table */}
      {loading ? (
        <div className="bg-card rounded-2xl border p-6">
          <LoadingScreen fullScreen={false} title="Authorized Service Centers" subtitle="Loading service center directories..." />
        </div>
      ) : error ? (
        <FirebaseErrorState
          error={error}
          onRetry={() => loadData()}
          title="Error Loading Service Centers"
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No Service Centers Found"
          description={
            search
              ? `No service centers match "${search}".`
              : "Add your first authorized service center to route repair jobs."
          }
          actionLabel="Add Service Center"
          actionIcon={Plus}
          onAction={() => setShowCreateModal(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((sc) => (
            <div
              key={sc.id}
              className="rounded-2xl border bg-card p-5 shadow-xs space-y-3.5 hover:border-blue-300 dark:hover:border-blue-700 transition-all"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-[#2563EB]" /> {sc.name}
                  </h3>
                  {sc.email && <p className="text-[11px] text-slate-400 mt-0.5">{sc.email}</p>}
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-foreground"
                    onClick={() => setEditCenter(sc)}
                    title="Edit Service Center"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => setDeleteId(sc.id)}
                    title="Delete Service Center"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              {/* WhatsApp Follow-up phone */}
              {sc.whatsappPhone && (
                <div className="flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-950/40 p-2 rounded-xl border border-emerald-200 dark:border-emerald-800/40">
                  <MessageCircle className="h-3.5 w-3.5" /> Follow-up WhatsApp: {sc.whatsappPhone}
                </div>
              )}

              {/* Addresses List */}
              <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                  Hub / Dispatch Addresses ({sc.addresses?.length || 0})
                </p>
                {sc.addresses?.map((addr, idx) => (
                  <div key={addr.id || idx} className="flex items-start gap-1.5 bg-slate-50 dark:bg-slate-900/60 p-2 rounded-lg text-[11px]">
                    <MapPin className="h-3 w-3 text-slate-400 shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-slate-800 dark:text-slate-200">{addr.city || "Hub"}:</strong> {addr.address}
                    </span>
                  </div>
                ))}
              </div>

              {/* POCs List */}
              {sc.pocs && sc.pocs.length > 0 && (
                <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300 border-t pt-2.5">
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                    Contacts / POCs ({sc.pocs.length})
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {sc.pocs.map((poc, idx) => (
                      <span key={poc.id || idx} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-200 text-[11px] font-medium border border-blue-100 dark:border-blue-900/50">
                        <User className="h-3 w-3 text-blue-500" />
                        {poc.name} {poc.designation ? `(${poc.designation})` : ""}: {poc.phone}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create & Edit Modals */}
      <CreateServiceCenterModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        onCreated={() => loadData()}
      />
      <EditServiceCenterModal
        center={editCenter}
        open={Boolean(editCenter)}
        onOpenChange={(open) => !open && setEditCenter(null)}
        onUpdated={() => loadData()}
      />

      {/* Delete Confirmation Alert */}
      <ConfirmDeleteDialog
        open={Boolean(deleteId)}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Delete Service Center?"
        description="Are you sure you want to remove this service center? Past service call logs will retain the historical name."
        confirmLabel="Delete Center"
        onConfirm={handleDelete}
      />
    </div>
  );
}
