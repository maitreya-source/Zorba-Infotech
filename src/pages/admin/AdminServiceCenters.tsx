import { useEffect, useState, useMemo } from "react";
import {
  Building2,
  Plus,
  Trash2,
  MapPin,
  Pencil,
  MessageSquare,
  LayoutGrid,
  List,
  Mail,
  Phone,
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
import WhatsAppPreviewModal from "@/components/admin/WhatsAppPreviewModal";

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

  // WhatsApp API Modal State
  const [whatsappTarget, setWhatsAppTarget] = useState<{
    name: string;
    phone: string;
  } | null>(null);

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

  // KPI Metrics
  const stats = useMemo(() => {
    const totalAddresses = centers.reduce(
      (sum, sc) => sum + (sc.addresses?.length || 0),
      0
    );
    const withDirectContact = centers.filter(
      (sc) =>
        Boolean(sc.phone) ||
        Boolean(sc.whatsappPhone) ||
        Boolean(sc.pocs && sc.pocs.length > 0)
    ).length;

    return {
      total: centers.length,
      cities: availableCities.length,
      addresses: totalAddresses,
      connected: withDirectContact,
    };
  }, [centers, availableCities]);

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

  const getPhoneNumbers = (sc: ServiceCenter) => {
    const callPhone = sc.phone || sc.whatsappPhone || sc.pocs?.[0]?.phone;
    const waPhone =
      sc.whatsappPhone ||
      sc.phone ||
      sc.pocs?.find((p) => p.isWhatsApp)?.phone ||
      sc.pocs?.[0]?.phone;

    return { callPhone, waPhone };
  };

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-7xl mx-auto text-xs">
      {/* 1. Header Banner */}
      <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-4 text-white shadow-md">
        <div className="absolute right-0 top-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-blue-500/20 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="space-y-1">
            <h1 className="text-xl md:text-2xl font-extrabold font-display tracking-tight text-white leading-tight">
              Authorized Service Centers Directory
            </h1>
            <p className="text-xs text-slate-300">
              Manage OEM repair hubs, dispatch addresses, POCs, and instant WhatsApp API &amp; Call actions
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

      {/* 2. KPI Summary Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="bg-card border rounded-2xl p-4 shadow-xs">
          <div className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
            Total Service Centers
          </div>
          <div className="text-xl md:text-2xl font-extrabold text-foreground font-display mt-1">
            {stats.total}
          </div>
        </div>

        <div className="bg-card border rounded-2xl p-4 shadow-xs">
          <div className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
            Hub Cities Covered
          </div>
          <div className="text-xl md:text-2xl font-extrabold text-blue-600 dark:text-blue-400 font-display mt-1">
            {stats.cities}
          </div>
        </div>

        <div className="bg-card border rounded-2xl p-4 shadow-xs">
          <div className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
            Dispatch Hub Locations
          </div>
          <div className="text-xl md:text-2xl font-extrabold text-amber-600 dark:text-amber-400 font-display mt-1">
            {stats.addresses}
          </div>
        </div>

        <div className="bg-card border rounded-2xl p-4 shadow-xs">
          <div className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
            Direct Line Connected
          </div>
          <div className="text-xl md:text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 font-display mt-1">
            {stats.connected}
          </div>
        </div>
      </div>

      {/* 3. Search & Filter Bar */}
      <SearchFilterBar
        value={search}
        onChange={setSearch}
        placeholder="Search by center name, city, address, phone…"
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

      {/* 4. Main Directory Content */}
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
        /* Standard Admin Directory Table (Whole line clickable, contacts column removed to make room, red delete, call & whatsapp in actions) */
        <div className="rounded-2xl border bg-card overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="border-b bg-slate-50 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 font-extrabold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-4 py-3 min-w-[260px]">Service Center / Brand</th>
                  <th className="px-4 py-3">Dispatch &amp; Hub Addresses</th>
                  <th className="px-4 py-3 text-right min-w-[160px]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.map((sc) => {
                  const { callPhone, waPhone } = getPhoneNumbers(sc);

                  return (
                    <tr
                      key={sc.id}
                      onClick={(e) => {
                        const target = e.target as HTMLElement;
                        if (
                          target.closest("button") ||
                          target.closest("a") ||
                          target.closest("[role='menuitem']")
                        ) {
                          return;
                        }
                        setEditCenter(sc);
                      }}
                      className="hover:bg-blue-50/40 dark:hover:bg-slate-900/50 transition-colors group cursor-pointer"
                      title="Click anywhere on this row to edit service center"
                    >
                      {/* Service Center Name & Email */}
                      <td className="px-4 py-3.5 align-middle">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-[#2563EB] dark:bg-blue-950/60 dark:text-blue-400 font-bold border border-blue-200 dark:border-blue-800/80 group-hover:scale-105 transition-transform">
                            <Building2 className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-slate-900 dark:text-white text-xs group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors flex items-center gap-1.5">
                              <span>{sc.name}</span>
                              <ChevronRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-blue-500" />
                            </div>
                            {sc.email ? (
                              <a
                                href={`mailto:${sc.email}`}
                                onClick={(e) => e.stopPropagation()}
                                className="text-[11px] text-slate-500 hover:text-primary flex items-center gap-1 mt-0.5"
                              >
                                <Mail className="h-3 w-3 text-slate-400 shrink-0" />
                                <span className="truncate">{sc.email}</span>
                              </a>
                            ) : (
                              <span className="text-[10px] text-slate-400 block mt-0.5">
                                Authorized OEM Hub
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Addresses */}
                      <td className="px-4 py-3.5 align-middle">
                        <div className="space-y-1.5">
                          {sc.addresses && sc.addresses.length > 0 ? (
                            sc.addresses.map((addr, idx) => (
                              <div
                                key={addr.id || idx}
                                className="flex items-start gap-2 text-[11px] leading-relaxed"
                              >
                                <Badge
                                  variant="outline"
                                  className="h-5 px-1.5 text-[10px] font-bold uppercase shrink-0 bg-blue-50/80 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 dark:border-blue-800/60"
                                >
                                  {addr.city || "Hub"}
                                </Badge>
                                <span className="text-slate-600 dark:text-slate-300">
                                  {addr.address}
                                </span>
                              </div>
                            ))
                          ) : (
                            <span className="text-slate-400 italic">No address registered</span>
                          )}
                        </div>
                      </td>

                      {/* Actions Column with Call, WhatsApp API, Edit, and Red Delete */}
                      <td className="px-4 py-3.5 text-right align-middle" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          {callPhone && (
                            <a
                              href={`tel:${callPhone.replace(/\D/g, "")}`}
                              className="inline-flex items-center justify-center h-8 w-8 rounded-lg text-blue-600 dark:text-blue-400 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/60 border border-transparent hover:border-blue-200 dark:hover:border-blue-800 transition-colors"
                              title={`Call ${sc.name} (${callPhone})`}
                            >
                              <Phone className="h-3.5 w-3.5" />
                            </a>
                          )}

                          {waPhone && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 border border-transparent hover:border-emerald-200 dark:hover:border-emerald-800 rounded-lg cursor-pointer transition-colors"
                              title={`Send WhatsApp API message to ${sc.name} (${waPhone})`}
                              onClick={() => {
                                setWhatsAppTarget({
                                  name: sc.name,
                                  phone: waPhone,
                                });
                              }}
                            >
                              <MessageSquare className="h-3.5 w-3.5" />
                            </Button>
                          )}

                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground cursor-pointer rounded-lg border border-transparent hover:border-slate-200 dark:hover:border-slate-800 transition-colors"
                            title="Edit Service Center"
                            onClick={() => setEditCenter(sc)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-600 dark:text-red-400 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/60 rounded-lg cursor-pointer border border-transparent hover:border-red-200 dark:hover:border-red-800 transition-colors"
                            title="Delete Service Center"
                            onClick={() => setDeleteId(sc.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Card Grid View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((sc) => {
            const { callPhone, waPhone } = getPhoneNumbers(sc);

            return (
              <div
                key={sc.id}
                onClick={(e) => {
                  const target = e.target as HTMLElement;
                  if (
                    target.closest("button") ||
                    target.closest("a") ||
                    target.closest("[role='menuitem']")
                  ) {
                    return;
                  }
                  setEditCenter(sc);
                }}
                className="rounded-2xl border bg-card p-5 shadow-xs space-y-4 hover:border-blue-300 dark:hover:border-blue-700 transition-all flex flex-col justify-between cursor-pointer group"
                title="Click to edit service center details"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-[#2563EB] dark:bg-blue-950/60 dark:text-blue-400 font-bold border border-blue-200 dark:border-blue-800/80 group-hover:scale-105 transition-transform">
                        <Building2 className="h-4 w-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {sc.name}
                        </h3>
                        {sc.email && (
                          <p className="text-[11px] text-slate-400 mt-0.5">{sc.email}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
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
                        className="h-7 w-7 text-red-600 dark:text-red-400 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-lg cursor-pointer"
                        onClick={() => setDeleteId(sc.id)}
                        title="Delete Service Center"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
                      </Button>
                    </div>
                  </div>

                  {/* Actions: Call & WhatsApp API */}
                  <div className="flex items-center gap-2 pt-1" onClick={(e) => e.stopPropagation()}>
                    {callPhone && (
                      <a
                        href={`tel:${callPhone.replace(/\D/g, "")}`}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-xl text-xs font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 transition-colors"
                      >
                        <Phone className="h-3.5 w-3.5 text-blue-600" />
                        <span>Call</span>
                      </a>
                    )}
                    {waPhone && (
                      <button
                        type="button"
                        onClick={() => {
                          setWhatsAppTarget({
                            name: sc.name,
                            phone: waPhone,
                          });
                        }}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-xl text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 transition-colors cursor-pointer"
                      >
                        <MessageSquare className="h-3.5 w-3.5 text-emerald-600" />
                        <span>WhatsApp API</span>
                      </button>
                    )}
                  </div>

                  {/* Addresses List */}
                  <div className="space-y-1.5 text-xs">
                    <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                      Hub / Dispatch Addresses ({sc.addresses?.length || 0})
                    </p>
                    {sc.addresses?.map((addr, idx) => (
                      <div
                        key={addr.id || idx}
                        className="flex items-start gap-2 bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-800/80 text-[11px]"
                      >
                        <Badge
                          variant="outline"
                          className="h-5 px-1.5 text-[10px] font-bold uppercase shrink-0 bg-blue-50/80 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 dark:border-blue-800/60"
                        >
                          {addr.city || "Hub"}
                        </Badge>
                        <span className="text-slate-600 dark:text-slate-400">
                          {addr.address}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
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

      {/* WhatsApp Official Meta API Modal */}
      {whatsappTarget && (
        <WhatsAppPreviewModal
          open={Boolean(whatsappTarget)}
          onOpenChange={(open) => !open && setWhatsAppTarget(null)}
          title={`Send WhatsApp API Notice – ${whatsappTarget.name}`}
          recipientName={whatsappTarget.name}
          recipientRole="Authorized Service Center"
          defaultPhone={whatsappTarget.phone}
          defaultMessage={`Hi ${whatsappTarget.name} Support Team, this is Zorba Infotech Neemuch following up on our service dispatch / RMA status.`}
          onSent={() => {
            toast.success("WhatsApp message sent successfully via API");
            setWhatsAppTarget(null);
          }}
        />
      )}

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
