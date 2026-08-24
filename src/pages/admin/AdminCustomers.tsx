import { useEffect, useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { UserPlus, Users, Trash2, Search, Phone, Mail, MapPin, Building, RefreshCw, FileSpreadsheet, Pencil, Activity, ChevronRight, ChevronLeft } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { getCustomersPaginated, searchCustomers, deleteCustomer } from "@/lib/firestore";
import type { Customer } from "@/lib/types";
import { useTallyShortcuts } from "@/hooks/useTallyShortcuts";
import CreateCustomerModal from "@/components/admin/CreateCustomerModal";
import EditCustomerModal from "@/components/admin/EditCustomerModal";
import ImportCustomersModal from "@/components/admin/ImportCustomersModal";
import LoadingScreen from "@/components/common/LoadingScreen";

export default function AdminCustomers() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState<number>(25);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [hasMore, setHasMore] = useState(false);
  const [docHistory, setDocHistory] = useState<any[]>([]); // stack of lastDocs for pagination
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  const searchTimerRef = useRef<any>(null);

  const loadData = async (targetPage = 1, lastDocRef?: any) => {
    setLoading(true);
    setError(null);
    try {
      if (search.trim()) {
        const results = await searchCustomers(search.trim(), 50);
        setCustomers(results);
        setHasMore(false);
      } else {
        const res = await getCustomersPaginated({
          pageSize,
          lastDoc: lastDocRef,
        });
        setCustomers(res.items);
        setHasMore(res.hasMore);
      }
    } catch (err: any) {
      console.error("Firebase error in AdminCustomers:", err);
      setError(err?.message || "Unable to connect to Firebase to load customer directory.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPageNumber(1);
    setDocHistory([]);
    loadData(1, undefined);
  }, [pageSize]);

  // Debounced search handling
  const handleSearchChange = (val: string) => {
    setSearch(val);
    setPageNumber(1);
    setDocHistory([]);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        if (!val.trim()) {
          const res = await getCustomersPaginated({ pageSize });
          setCustomers(res.items);
          setHasMore(res.hasMore);
        } else {
          const results = await searchCustomers(val.trim(), 50);
          setCustomers(results);
          setHasMore(false);
        }
      } catch (err: any) {
        setError(err?.message || "Search error");
      } finally {
        setLoading(false);
      }
    }, 250);
  };

  const handleNextPage = async () => {
    if (!hasMore || loading) return;
    const lastDoc = customers.length > 0 ? (customers[customers.length - 1] as any) : undefined;
    const nextDocHistory = [...docHistory, lastDoc];
    setDocHistory(nextDocHistory);
    setPageNumber((prev) => prev + 1);
    loadData(pageNumber + 1, lastDoc);
  };

  const handlePrevPage = async () => {
    if (pageNumber <= 1 || loading) return;
    const prevHistory = [...docHistory];
    prevHistory.pop(); // remove current
    const prevDoc = prevHistory.length > 0 ? prevHistory[prevHistory.length - 1] : undefined;
    setDocHistory(prevHistory);
    setPageNumber((prev) => prev - 1);
    loadData(pageNumber - 1, prevDoc);
  };

  useTallyShortcuts({
    onAltC: () => setShowCreateModal(true),
    onAltA: () => setShowCreateModal(true),
  });

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteCustomer(deleteId);
      toast.success("Customer profile deleted");
      setDeleteId(null);
      loadData(pageNumber, docHistory.length > 0 ? docHistory[docHistory.length - 1] : undefined);
    } catch {
      toast.error("Failed to delete customer");
    }
  };


  return (
    <div className="p-4 md:p-6 space-y-4 max-w-6xl mx-auto text-xs">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-4 text-white shadow-md">
        <div className="absolute right-0 top-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-blue-500/20 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="space-y-1">
            <h1 className="text-xl md:text-2xl font-extrabold font-display tracking-tight text-white leading-tight">
              Customer Directory
            </h1>
            <p className="text-xs text-slate-300">
              Manage registered clients, multiple phone numbers, and addresses for instant intake auto-fill
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <Button
              onClick={() => setShowImportModal(true)}
              variant="outline"
              size="sm"
              className="h-9 text-xs rounded-xl bg-white/10 border-white/20 text-white hover:bg-white/20 font-bold gap-1.5 cursor-pointer"
            >
              <FileSpreadsheet className="h-4 w-4 text-emerald-400" /> Import CSV
            </Button>
            <Button
              onClick={() => setShowCreateModal(true)}
              size="sm"
              className="gap-1.5 font-bold bg-[#2563EB] hover:bg-blue-700 text-white rounded-xl h-9 text-xs shadow-sm shrink-0 cursor-pointer"
            >
              <UserPlus className="h-4 w-4" /> Add Customer (Alt+C)
            </Button>
          </div>
        </div>
      </div>

      {/* Filter / Search bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search by name, phone, company…"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-9 h-9 text-xs rounded-xl w-full"
          />
        </div>

        <div className="text-xs text-muted-foreground font-semibold">
          Current Page Items: <span className="text-foreground font-extrabold">{customers.length}</span>
        </div>
      </div>

      {/* Main Directory Table */}
      {loading ? (
        <div className="bg-card rounded-2xl border p-6">
          <LoadingScreen fullScreen={false} title="Customer Directory" subtitle="Loading customer accounts..." />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border bg-destructive/5 border-destructive/20 py-16 text-center px-4">
          <p className="font-bold text-destructive text-base">Firebase Connection Error</p>
          <p className="text-sm text-muted-foreground mt-1 max-w-md">{error}</p>
          <Button onClick={() => loadData(pageNumber)} className="mt-4 gap-2 text-xs" variant="outline" size="sm">
            <RefreshCw className="h-3.5 w-3.5" /> Retry Connection
          </Button>
        </div>
      ) : customers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 bg-card rounded-2xl border text-center p-6 space-y-3">
          <Users className="h-10 w-10 text-muted-foreground/40" />
          <p className="font-bold text-foreground text-sm font-display">No Customers Found</p>
          <p className="text-xs text-muted-foreground max-w-sm">
            {search ? `No customers match "${search}".` : "Click Add Customer to create your first client profile."}
          </p>
          <Button onClick={() => setShowCreateModal(true)} size="sm" className="gap-1 text-xs font-bold bg-[#2563EB] hover:bg-blue-700 text-white rounded-xl">
            <UserPlus className="h-3.5 w-3.5" /> Add Customer
          </Button>
        </div>
      ) : (
        <div className="rounded-2xl border bg-card overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="border-b bg-slate-50 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 font-extrabold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-4 py-3">Customer Name</th>
                  <th className="px-4 py-3">Phone Number</th>
                  <th className="px-4 py-3">Email Address</th>
                  <th className="px-4 py-3">Address / Location</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {customers.map((cust) => (
                  <tr
                    key={cust.id}
                    onClick={(e) => {
                      const target = e.target as HTMLElement;
                      if (
                        target.closest("button") ||
                        target.closest("a") ||
                        target.closest("[role='menuitem']")
                      ) {
                        return;
                      }
                      navigate(`/admin/customers/${cust.id}`);
                    }}
                    className="hover:bg-blue-50/40 dark:hover:bg-slate-900/50 transition-colors group cursor-pointer"
                  >
                    {/* Name & Company */}
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-900 dark:text-white text-xs group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors flex items-center gap-1.5">
                        <span>{cust.name}</span>
                        <ChevronRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-blue-500" />
                      </div>
                      {cust.companyName && (
                        <div className="text-[11px] text-[#2563EB] font-semibold flex items-center gap-1 mt-0.5">
                          <Building className="h-3 w-3" /> {cust.companyName}
                        </div>
                      )}
                    </td>

                    {/* Phone */}
                    <td className="px-4 py-3 font-mono font-semibold text-slate-900 dark:text-white">
                      <div className="flex flex-col gap-0.5">
                        <span className="flex items-center gap-1.5">
                          <Phone className="h-3.5 w-3.5 text-slate-400" /> {cust.phone}
                        </span>
                        {cust.additionalPhones && cust.additionalPhones.length > 0 && (
                          <div className="text-[10px] text-slate-400 font-sans pl-5">
                            + {cust.additionalPhones.length} extra phone{cust.additionalPhones.length > 1 ? "s" : ""}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Email */}
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                      {cust.email ? (
                        <span className="flex items-center gap-1.5">
                          <Mail className="h-3.5 w-3.5 text-slate-400" /> {cust.email}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">—</span>
                      )}
                    </td>

                    {/* Address */}
                    <td className="px-4 py-3 max-w-xs truncate text-slate-600 dark:text-slate-300" title={cust.address}>
                      {cust.address ? (
                        <span className="flex items-center gap-1.5 truncate">
                          <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{cust.address}</span>
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">—</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        <Link to={`/admin/customers/${cust.id}`}>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7.5 px-2.5 text-[11px] font-semibold text-blue-700 dark:text-blue-300 hover:text-blue-800 bg-blue-50/70 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800/80 rounded-lg gap-1.5 cursor-pointer shadow-2xs"
                            title="View Service Calls & History"
                          >
                            <Activity className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                            <span>Service Calls</span>
                          </Button>
                        </Link>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7.5 w-7.5 text-muted-foreground hover:text-foreground cursor-pointer"
                          title="Edit Customer"
                          onClick={() => setEditCustomer(cust)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7.5 w-7.5 text-muted-foreground hover:text-destructive cursor-pointer"
                          title="Delete Customer"
                          onClick={() => setDeleteId(cust.id)}
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

      {/* Pagination Footer */}
      {!loading && !error && customers.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1 text-xs text-muted-foreground font-medium">
          <div className="flex items-center gap-2">
            <span>Rows per page:</span>
            <Select
              value={String(pageSize)}
              onValueChange={(val) => setPageSize(Number(val))}
            >
              <SelectTrigger className="h-8 w-18 text-xs rounded-xl bg-card">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="15">15</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
            <span className="pl-2">
              Showing {customers.length} records {search ? `matching "${search}"` : `(Page ${pageNumber})`}
            </span>
          </div>

          {!search && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrevPage}
                disabled={pageNumber <= 1 || loading}
                className="h-8 text-xs rounded-xl gap-1 cursor-pointer"
              >
                <ChevronLeft className="h-3.5 w-3.5" /> Previous
              </Button>
              <span className="px-2 font-bold text-foreground">
                Page {pageNumber}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleNextPage}
                disabled={!hasMore || loading}
                className="h-8 text-xs rounded-xl gap-1 cursor-pointer"
              >
                Next <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Inline Modals */}
      <CreateCustomerModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        onCreated={() => loadData(1, undefined)}
      />
      <EditCustomerModal
        customer={editCustomer}
        open={!!editCustomer}
        onOpenChange={(open) => !open && setEditCustomer(null)}
        onUpdated={() => loadData(pageNumber, docHistory.length > 0 ? docHistory[docHistory.length - 1] : undefined)}
      />
      <ImportCustomersModal
        open={showImportModal}
        onOpenChange={setShowImportModal}
        onImportComplete={() => loadData(1, undefined)}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Customer Profile?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this customer profile? Past service calls will retain their historical customer records.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Customer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
