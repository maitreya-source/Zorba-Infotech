import { useEffect, useState } from "react";
import {
  Truck,
  Plus,
  Trash2,
  Search,
  Phone,
  Pencil,
  RefreshCw,
  MessageCircle,
  User,
  CheckCircle2,
  XCircle,
} from "lucide-react";
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
import { getCouriers, deleteCourier } from "@/lib/firestore";
import type { Courier } from "@/lib/types";
import { formatPhoneForDisplay, generateCourierFollowUpMessage } from "@/lib/utils";
import CreateCourierModal from "@/components/admin/CreateCourierModal";
import EditCourierModal from "@/components/admin/EditCourierModal";

export default function AdminCouriers() {
  const [couriers, setCouriers] = useState<Courier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editCourier, setEditCourier] = useState<Courier | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getCouriers();
      setCouriers(data);
    } catch (err: any) {
      console.error("Firebase error in AdminCouriers:", err);
      setError(err?.message || "Unable to load couriers list.");
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
      await deleteCourier(deleteId);
      toast.success("Courier partner removed");
      setDeleteId(null);
      loadData();
    } catch {
      toast.error("Failed to delete courier");
    }
  };

  const handleWhatsAppFollowUp = (c: Courier) => {
    if (!c.phone) {
      toast.error("No phone number saved for this courier");
      return;
    }
    const cleanPhone = c.phone.replace(/\D/g, "");
    const waPhone = cleanPhone.startsWith("91") ? cleanPhone : `91${cleanPhone}`;
    const text = encodeURIComponent(
      generateCourierFollowUpMessage({
        courierName: c.name,
        courierDocketNumber: "PENDING-DOCKET",
        ticketNo: "SC-LOGISTICS",
      })
    );
    window.open(`https://wa.me/${waPhone}?text=${text}`, "_blank", "noopener,noreferrer");
  };

  const filtered = couriers.filter((c) => {
    const q = search.toLowerCase().trim();
    return (
      !q ||
      c.name.toLowerCase().includes(q) ||
      (c.phone && c.phone.toLowerCase().includes(q)) ||
      (c.contactPerson && c.contactPerson.toLowerCase().includes(q))
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
              Couriers & Logistics Directory
            </h1>
            <p className="text-xs text-slate-300">
              Manage shipment partners, booking contacts, tracking templates, and 1-click WhatsApp follow-ups
            </p>
          </div>

          <Button
            onClick={() => setShowCreateModal(true)}
            size="sm"
            className="gap-1.5 font-bold bg-[#2563EB] hover:bg-blue-700 text-white shrink-0 rounded-xl"
          >
            <Plus className="h-4 w-4" /> Add Courier Partner
          </Button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search by courier name, phone, contact person…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-xs rounded-xl w-full"
          />
        </div>

        <div className="text-xs text-muted-foreground font-semibold">
          Total Partners: <span className="text-foreground font-extrabold">{filtered.length}</span>
        </div>
      </div>

      {/* Couriers Cards Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-card rounded-2xl border">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mb-2" />
          <p className="text-xs text-muted-foreground">Loading courier partners...</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border bg-destructive/5 border-destructive/20 py-16 text-center px-4">
          <p className="font-bold text-destructive text-base">Error Loading Couriers</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-md">{error}</p>
          <Button onClick={() => loadData()} className="mt-4 gap-2 text-xs" variant="outline" size="sm">
            <RefreshCw className="h-3.5 w-3.5" /> Retry
          </Button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 bg-card rounded-2xl border text-center p-6 space-y-3">
          <Truck className="h-10 w-10 text-muted-foreground/50" />
          <p className="font-bold text-foreground text-sm">No Courier Partners Found</p>
          <Button onClick={() => setShowCreateModal(true)} size="sm" className="gap-1 text-xs">
            <Plus className="h-3.5 w-3.5" /> Add Courier Partner
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((c) => (
            <div
              key={c.id}
              className="rounded-2xl border bg-card p-5 shadow-xs space-y-3 hover:border-blue-300 dark:hover:border-blue-700 transition-all flex flex-col justify-between"
            >
              <div className="space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Truck className="h-4 w-4 text-[#2563EB]" /> {c.name}
                    </h3>
                    <div className="flex items-center gap-1.5 pt-0.5">
                      {c.active !== false ? (
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200 text-[10px] gap-1 px-1.5 py-0">
                          <CheckCircle2 className="h-2.5 w-2.5" /> Active Partner
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 text-[10px] gap-1 px-1.5 py-0">
                          <XCircle className="h-2.5 w-2.5" /> Inactive
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-foreground"
                      onClick={() => setEditCourier(c)}
                      title="Edit Courier"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => setDeleteId(c.id)}
                      title="Delete Courier"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Contact Person */}
                {c.contactPerson && (
                  <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                    <User className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span>Contact: <strong className="text-slate-800 dark:text-slate-200">{c.contactPerson}</strong></span>
                  </div>
                )}

                {/* Phone */}
                {c.phone && (
                  <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 font-mono">
                    <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span>{formatPhoneForDisplay(c.phone)}</span>
                  </div>
                )}

                {/* Tracking URL */}
                {c.trackingUrlTemplate && (
                  <div className="text-[11px] text-slate-500 bg-slate-50 dark:bg-slate-900/60 p-2 rounded-xl truncate">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Tracking: </span>
                    <span className="font-mono text-[10px]">{c.trackingUrlTemplate}</span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="pt-2 border-t flex items-center gap-2">
                {c.phone && (
                  <Button
                    onClick={() => handleWhatsAppFollowUp(c)}
                    size="sm"
                    variant="outline"
                    className="w-full gap-1.5 text-xs text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-xl"
                  >
                    <MessageCircle className="h-3.5 w-3.5" /> WhatsApp Follow-Up
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      <CreateCourierModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        onCreated={() => loadData()}
      />
      <EditCourierModal
        courier={editCourier}
        open={Boolean(editCourier)}
        onOpenChange={(open) => !open && setEditCourier(null)}
        onUpdated={() => loadData()}
      />

      {/* Delete Confirmation Alert */}
      <AlertDialog open={Boolean(deleteId)} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm">Delete Courier Partner?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              Are you sure you want to remove this courier partner? Historical service call records will retain the courier name.
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
