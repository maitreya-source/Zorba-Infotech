import { useEffect, useState, useMemo } from "react";
import {
  Building2,
  Plus,
  Trash2,
  MapPin,
  Pencil,
  MessageCircle,
  User,
  LayoutGrid,
  List,
  Mail,
  Phone,
  ExternalLink,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  const [cityFilter, setCityFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
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

  // Collect all unique cities across all service centers
  const availableCities = useMemo(() => {
    const citySet = new Set<string>();
    centers.forEach((sc) => {
      sc.addresses?.forEach((a) => {
        if (a.city?.trim()) citySet.add(a.city.trim());
      });
    });
    return Array.from(citySet).sort();
  }, [centers]);

  const filtered = useMemo(() => {
    return centers.filter((sc) => {
      const q = search.toLowerCase().trim();
      const matchesSearch =
        !q ||
        sc.name.toLowerCase().includes(q) ||
        (sc.email && sc.email.toLowerCase().includes(q)) ||
        (sc.phone && sc.phone.toLowerCase().includes(q)) ||
        (sc.whatsappPhone && sc.whatsappPhone.toLowerCase().includes(q)) ||
        sc.addresses?.some(
          (a) =>
            a.city?.toLowerCase().includes(q) ||
            a.address?.toLowerCase().includes(q)
        ) ||
        sc.pocs?.some(
          (p) =>
            p.name?.toLowerCase().includes(q) ||
            p.designation?.toLowerCase().includes(q) ||
            p.phone?.includes(q)
        );

      const matchesCity =
        cityFilter === "all" ||
        sc.addresses?.some(
          (a) => a.city?.toLowerCase() === cityFilter.toLowerCase()
        );

      return matchesSearch && matchesCity;
    });
  }, [centers, search, cityFilter]);

  const openWhatsApp = (phone: string, centerName: string) => {
    const cleanPhone = phone.replace(/\D/g, "");
    const waNumber = cleanPhone.startsWith("91") ? cleanPhone : `91${cleanPhone}`;
    const text = encodeURIComponent(
      `Hi ${centerName} Support Team, this is Zorba Infotech Neemuch regarding a service dispatch / RMA status follow-up.`
    );
    window.open(`https://wa.me/${waNumber}?text=${text}`, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-7xl mx-auto text-xs">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-4 text-white shadow-md">
        <div className="absolute right-0 top-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-blue-500/20 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="space-y-1">
            <h1 className="text-xl md:text-2xl font-extrabold font-display tracking-tight text-white leading-tight">
              Authorized Service Centers Directory
            </h1>
            <p className="text-xs text-slate-300">
              Manage OEM repair hubs, dispatch addresses, point of contacts (POCs), and WhatsApp follow-up numbers
            </p>
          </div>

          <Button
            onClick={() => setShowCreateModal(true)}
            size="sm"
            className="gap-1.5 font-bold bg-[#2563EB] hover:bg-blue-700 text-white rounded-xl h-9 text-xs shadow-sm shrink-0 cursor-pointer"
          >
            <Plus className="h-4 w-4" /> Add Service Center (Alt+C)
          </Button>
        </div>
      </div>

      {/* Filter / Search bar */}
      <SearchFilterBar
        value={search}
        onChange={setSearch}
        placeholder="Search by center name, city, address, POC, phone…"
        count={filtered.length}
        countLabel="Total Centers"
      >
        {/* City Filter */}
        <Select value={cityFilter} onValueChange={setCityFilter}>
          <SelectTrigger className="w-full sm:w-40 h-9 text-xs rounded-xl">
            <SelectValue placeholder="All Cities" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Hub Cities</SelectItem>
            {availableCities.map((city) => (
              <SelectItem key={city} value={city}>
                {city}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* View Mode Toggle */}
        <div className="flex items-center rounded-xl border bg-muted/40 p-0.5">
          <Button
            variant={viewMode === "table" ? "secondary" : "ghost"}
            size="icon"
            className="h-8 w-8 rounded-lg cursor-pointer"
            onClick={() => setViewMode("table")}
            title="Table View"
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "grid" ? "secondary" : "ghost"}
            size="icon"
            className="h-8 w-8 rounded-lg cursor-pointer"
            onClick={() => setViewMode("grid")}
            title="Grid View"
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
        </div>
      </SearchFilterBar>

      {/* Main Content: Table or Grid */}
      {loading ? (
        <div className="bg-card rounded-2xl border p-6">
          <LoadingScreen
            fullScreen={false}
            title="Authorized Service Centers"
            subtitle="Loading service center directories..."
          />
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
            search || cityFilter !== "all"
              ? "No service centers match your search or city filter."
              : "Add your first authorized service center to route repair jobs."
          }
          actionLabel="Add Service Center"
          actionIcon={Plus}
          onAction={() => setShowCreateModal(true)}
        />
      ) : viewMode === "table" ? (
        /* Modern Structured Table View */
        <div className="rounded-2xl border bg-card overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="border-b bg-slate-50 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 font-extrabold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-4 py-3">Service Center / Brand</th>
                  <th className="px-4 py-3">Hub &amp; Dispatch Addresses</th>
                  <th className="px-4 py-3">Contacts / POCs</th>
                  <th className="px-4 py-3">Follow-up WhatsApp</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.map((sc) => (
                  <tr
                    key={sc.id}
                    className="hover:bg-blue-50/40 dark:hover:bg-slate-900/50 transition-colors group"
                  >
                    {/* Service Center Name & Email */}
                    <td className="px-4 py-3.5 align-top min-w-[200px]">
                      <div className="flex items-start gap-2.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-[#2563EB] dark:bg-blue-950/60 dark:text-blue-400 font-bold border border-blue-200 dark:border-blue-800/80">
                          <Building2 className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-slate-900 dark:text-white text-xs">
                            {sc.name}
                          </div>
                          {sc.email ? (
                            <a
                              href={`mailto:${sc.email}`}
                              className="text-[11px] text-slate-500 hover:text-primary flex items-center gap-1 mt-0.5"
                            >
                              <Mail className="h-3 w-3 text-slate-400" />
                              <span className="truncate">{sc.email}</span>
                            </a>
                          ) : (
                            <span className="text-[10px] text-slate-400">OEM Service Hub</span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Addresses */}
                    <td className="px-4 py-3.5 align-top max-w-sm">
                      <div className="space-y-1.5">
                        {sc.addresses && sc.addresses.length > 0 ? (
                          sc.addresses.map((addr, idx) => (
                            <div
                              key={addr.id || idx}
                              className="flex items-start gap-1.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 p-2 border border-slate-200/60 dark:border-slate-800/80 text-[11px]"
                            >
                              <MapPin className="h-3.5 w-3.5 text-blue-500 shrink-0 mt-0.5" />
                              <div className="leading-snug">
                                <span className="font-bold text-slate-900 dark:text-white mr-1">
                                  {addr.city || "Hub"}:
                                </span>
                                <span className="text-slate-600 dark:text-slate-300">
                                  {addr.address}
                                </span>
                              </div>
                            </div>
                          ))
                        ) : (
                          <span className="text-slate-400 italic">No addresses added</span>
                        )}
                      </div>
                    </td>

                    {/* POCs */}
                    <td className="px-4 py-3.5 align-top max-w-xs">
                      {sc.pocs && sc.pocs.length > 0 ? (
                        <div className="space-y-1">
                          {sc.pocs.map((poc, idx) => (
                            <div
                              key={poc.id || idx}
                              className="inline-flex items-center gap-1.5 rounded-md bg-blue-50/70 dark:bg-blue-950/40 px-2 py-1 text-[11px] text-blue-800 dark:text-blue-200 border border-blue-100 dark:border-blue-900/60 mr-1 mb-1 font-medium"
                            >
                              <User className="h-3 w-3 text-blue-500" />
                              <span>{poc.name}</span>
                              {poc.designation && (
                                <span className="text-[10px] text-blue-600 dark:text-blue-400">
                                  ({poc.designation})
                                </span>
                              )}
                              {poc.phone && (
                                <span className="font-mono text-[10px] text-slate-600 dark:text-slate-400 pl-0.5">
                                  • {poc.phone}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">—</span>
                      )}
                    </td>

                    {/* WhatsApp Follow-up */}
                    <td className="px-4 py-3.5 align-top">
                      {sc.whatsappPhone ? (
                        <Button
                          onClick={() => openWhatsApp(sc.whatsappPhone!, sc.name)}
                          variant="outline"
                          size="sm"
                          className="h-7.5 px-2.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 hover:text-emerald-800 bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/80 rounded-lg gap-1.5 cursor-pointer shadow-2xs"
                          title="Open WhatsApp chat"
                        >
                          <MessageCircle className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span className="font-mono">{sc.whatsappPhone}</span>
                        </Button>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">—</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3.5 text-right align-top">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7.5 w-7.5 text-muted-foreground hover:text-foreground cursor-pointer"
                          title="Edit Service Center"
                          onClick={() => setEditCenter(sc)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7.5 w-7.5 text-muted-foreground hover:text-destructive cursor-pointer"
                          title="Delete Service Center"
                          onClick={() => setDeleteId(sc.id)}
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
      ) : (
        /* Card Grid View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((sc) => (
            <div
              key={sc.id}
              className="rounded-2xl border bg-card p-5 shadow-xs space-y-4 hover:border-blue-300 dark:hover:border-blue-700 transition-all flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-[#2563EB] dark:bg-blue-950/60 dark:text-blue-400 font-bold border border-blue-200 dark:border-blue-800/80">
                      <Building2 className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                        {sc.name}
                      </h3>
                      {sc.email && (
                        <p className="text-[11px] text-slate-400 mt-0.5">{sc.email}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-foreground cursor-pointer"
                      onClick={() => setEditCenter(sc)}
                      title="Edit Service Center"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive cursor-pointer"
                      onClick={() => setDeleteId(sc.id)}
                      title="Delete Service Center"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                {/* WhatsApp Follow-up */}
                {sc.whatsappPhone && (
                  <button
                    type="button"
                    onClick={() => openWhatsApp(sc.whatsappPhone!, sc.name)}
                    className="w-full flex items-center justify-between text-xs text-emerald-700 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-950/40 px-3 py-2 rounded-xl border border-emerald-200 dark:border-emerald-800/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors text-left cursor-pointer"
                  >
                    <span className="flex items-center gap-1.5">
                      <MessageCircle className="h-3.5 w-3.5" /> WhatsApp Follow-up:
                    </span>
                    <span className="font-mono">{sc.whatsappPhone}</span>
                  </button>
                )}

                {/* Addresses List */}
                <div className="space-y-1.5 text-xs">
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                    Hub / Dispatch Addresses ({sc.addresses?.length || 0})
                  </p>
                  {sc.addresses?.map((addr, idx) => (
                    <div
                      key={addr.id || idx}
                      className="flex items-start gap-1.5 bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-800/80 text-[11px]"
                    >
                      <MapPin className="h-3.5 w-3.5 text-blue-500 shrink-0 mt-0.5" />
                      <div className="leading-snug">
                        <strong className="text-slate-900 dark:text-slate-200 block">
                          {addr.city || "Dispatch Hub"}
                        </strong>
                        <span className="text-slate-600 dark:text-slate-400">
                          {addr.address}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* POCs List */}
                {sc.pocs && sc.pocs.length > 0 && (
                  <div className="space-y-1.5 text-xs border-t pt-3">
                    <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                      Contacts / POCs ({sc.pocs.length})
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {sc.pocs.map((poc, idx) => (
                        <span
                          key={poc.id || idx}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-200 text-[11px] font-medium border border-blue-100 dark:border-blue-900/50"
                        >
                          <User className="h-3 w-3 text-blue-500" />
                          {poc.name} {poc.designation ? `(${poc.designation})` : ""}: {poc.phone}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
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
