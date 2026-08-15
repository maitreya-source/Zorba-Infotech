import { useEffect, useState } from "react";
import { UserPlus, Users, Trash2, Search, Phone, Mail, MapPin, Building, RefreshCw, FileSpreadsheet, Pencil } from "lucide-react";
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
import { getCustomers, deleteCustomer } from "@/lib/firestore";
import type { Customer } from "@/lib/types";
import CreateCustomerModal from "@/components/admin/CreateCustomerModal";
import EditCustomerModal from "@/components/admin/EditCustomerModal";
import ImportCustomersModal from "@/components/admin/ImportCustomersModal";

export default function AdminCustomers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getCustomers();
      setCustomers(data);
    } catch (err: any) {
      console.error("Firebase error in AdminCustomers:", err);
      setError(err?.message || "Unable to connect to Firebase to load customer directory.");
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
      await deleteCustomer(deleteId);
      toast.success("Customer profile deleted");
      setDeleteId(null);
      loadData();
    } catch {
      toast.error("Failed to delete customer");
    }
  };

  const filtered = customers.filter((c) => {
    const q = search.toLowerCase().trim();
    return (
      !q ||
      c.name.toLowerCase().includes(q) ||
      c.phone.toLowerCase().includes(q) ||
      (c.email && c.email.toLowerCase().includes(q)) ||
      (c.companyName && c.companyName.toLowerCase().includes(q)) ||
      (c.address && c.address.toLowerCase().includes(q))
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
              Customer Directory
            </h1>
            <p className="text-xs text-slate-300">
              Manage registered clients, multiple phone numbers, and addresses for instant intake auto-fill
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              onClick={() => setShowImportModal(true)}
              variant="outline"
              size="sm"
              className="h-9 text-xs rounded-xl bg-white/10 border-white/20 text-white hover:bg-white/20 font-bold gap-1.5"
            >
              <FileSpreadsheet className="h-4 w-4 text-emerald-400" /> Import CSV
            </Button>
            <Button
              onClick={() => setShowCreateModal(true)}
              size="sm"
              className="gap-1.5 font-bold bg-[#2563EB] hover:bg-blue-700 text-white rounded-xl h-9 text-xs shadow-sm shrink-0"
            >
              <UserPlus className="h-4 w-4" /> Add Customer
            </Button>
          </div>
        </div>
      </div>

      {/* Filter / Search bar */}
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search by name (LastName FirstName), phone, company…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-xs rounded-xl"
          />
        </div>

        <div className="text-xs text-muted-foreground font-semibold">
          Total Customers: <span className="text-foreground font-extrabold">{filtered.length}</span>
        </div>
      </div>

      {/* Main Directory Table */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-card rounded-2xl border">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mb-2" />
          <p className="text-xs text-muted-foreground">Loading customer directory...</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border bg-destructive/5 border-destructive/20 py-16 text-center px-4">
          <p className="font-bold text-destructive text-base">Firebase Connection Error</p>
          <p className="text-sm text-muted-foreground mt-1 max-w-md">{error}</p>
          <Button onClick={() => loadData()} className="mt-4 gap-2 text-xs" variant="outline" size="sm">
            <RefreshCw className="h-3.5 w-3.5" /> Retry Connection
          </Button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 bg-card rounded-2xl border text-center p-6 space-y-3">
          <Users className="h-10 w-10 text-muted-foreground/40" />
          <p className="font-bold text-foreground text-sm font-display">No Customers Found</p>
          <p className="text-xs text-muted-foreground max-w-sm">
            {customers.length === 0 ? "Click Add Customer to create your first client profile." : "No customers match your search criteria."}
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
                {filtered.map((cust) => (
                  <tr key={cust.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-900/40 transition-colors group">
                    {/* Name & Company */}
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-900 dark:text-white text-xs">{cust.name}</div>
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
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          title="Edit Customer"
                          onClick={() => setEditCustomer(cust)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
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

      {/* Inline Modals */}
      <CreateCustomerModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        onCreated={loadData}
      />
      <EditCustomerModal
        customer={editCustomer}
        open={!!editCustomer}
        onOpenChange={(open) => !open && setEditCustomer(null)}
        onUpdated={loadData}
      />
      <ImportCustomersModal
        open={showImportModal}
        onOpenChange={setShowImportModal}
        onImportComplete={loadData}
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
