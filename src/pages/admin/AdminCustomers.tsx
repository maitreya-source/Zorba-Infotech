import { useEffect, useState, useRef, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { UserPlus, Users, Trash2, Search, Phone, Mail, MapPin, Building, RefreshCw, FileSpreadsheet, Pencil, Activity, ChevronRight, ChevronLeft, ArrowUpDown, Filter, X } from "lucide-react";
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
  ConfirmDeleteDialog,
  EmptyState,
  FirebaseErrorState,
  TablePagination,
  SearchFilterBar,
  LoadingScreen,
} from "@/components/common";
import {
  getCustomers,
  subscribeCustomers,
  deleteCustomer,
  deduplicateCustomers,
} from "@/lib/firestore";
import { subscribeSyncSignal } from "@/lib/realtimeSync";
import type { Customer } from "@/lib/types";
import { useTallyListNavigation } from "@/hooks/useTallyKeyboard";
import { cn } from "@/lib/utils";
import CreateCustomerModal from "@/components/admin/CreateCustomerModal";
import EditCustomerModal from "@/components/admin/EditCustomerModal";
import ImportCustomersModal from "@/components/admin/ImportCustomersModal";

export type CustomerSortOption = "name-asc" | "name-desc" | "company-asc" | "date-desc" | "phone-asc";

export default function AdminCustomers() {
  const navigate = useNavigate();
  const [allCustomers, setAllCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<CustomerSortOption>("name-asc");
  const [selectedGroup, setSelectedGroup] = useState<string>("ALL");
  const [pageSize, setPageSize] = useState<number>(25);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    getCustomers()
      .then((list) => {
        if (isMounted) {
          setAllCustomers(deduplicateCustomers(list));
          setLoading(false);
        }
      })
      .catch((err: any) => {
        if (isMounted) {
          setError(err?.message || "Failed to load customer directory");
          setLoading(false);
        }
      });

    // Real-time synchronization across all tabs and laptops
    const unsubSubscribers = subscribeCustomers((updatedList) => {
      if (isMounted) {
        setAllCustomers(deduplicateCustomers(updatedList));
        setLoading(false);
      }
    });

    const unsubSync = subscribeSyncSignal("customers", () => {
      getCustomers(true)
        .then((list) => {
          if (isMounted) setAllCustomers(deduplicateCustomers(list));
        })
        .catch(() => {});
    });

    return () => {
      isMounted = false;
      unsubSubscribers();
      unsubSync();
    };
  }, []);

  // Dynamically extract unique customer groups from loaded customers
  const availableGroups = useMemo(() => {
    const set = new Set<string>();
    for (const c of allCustomers) {
      if (c.group && c.group.trim()) set.add(c.group.trim());
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [allCustomers]);

  // Pure, instant in-memory filtering & deterministic alphabetical sorting
  const filteredCustomers = useMemo(() => {
    let list = allCustomers;

    // Group Filter
    if (selectedGroup && selectedGroup !== "ALL") {
      list = list.filter((c) => (c.group || "").trim().toLowerCase() === selectedGroup.trim().toLowerCase());
    }

    // Search Query Filter
    const clean = search.trim().toLowerCase();
    if (clean) {
      const qDigits = clean.replace(/\D/g, "");
      const tokens = clean.split(/\s+/).filter(Boolean);

      list = list.filter((c) => {
        const name = (c.name || "").toLowerCase();
        const phone = (c.phone || "").toLowerCase();
        const phoneDigits = phone.replace(/\D/g, "");
        const company = (c.companyName || "").toLowerCase();
        const email = (c.email || "").toLowerCase();
        const group = (c.group || "").toLowerCase();
        const city = (c.city || "").toLowerCase();
        const address = (c.address || "").toLowerCase();

        // Phone match
        if (qDigits && qDigits.length >= 3) {
          if (phoneDigits.includes(qDigits) || phone.includes(clean)) return true;
          if (c.additionalPhones?.some((p) => (p || "").replace(/\D/g, "").includes(qDigits))) return true;
        }

        // Exact substring match in primary fields (e.g. "Jain", "Ultratech")
        if (
          name.includes(clean) ||
          company.includes(clean) ||
          group.includes(clean) ||
          city.includes(clean) ||
          email.includes(clean) ||
          address.includes(clean)
        ) {
          return true;
        }

        // All token words match
        return tokens.every((tok) =>
          name.includes(tok) ||
          company.includes(tok) ||
          group.includes(tok) ||
          city.includes(tok) ||
          address.includes(tok) ||
          email.includes(tok)
        );
      });
    }

    // Default & Selected Sorting: Alphabetical (A-Z) by default
    const sorted = [...list];
    switch (sortBy) {
      case "name-desc":
        sorted.sort((a, b) => (b.name || "").localeCompare(a.name || "", undefined, { sensitivity: "base" }));
        break;
      case "company-asc":
        sorted.sort((a, b) => (a.companyName || a.name || "").localeCompare(b.companyName || b.name || "", undefined, { sensitivity: "base" }));
        break;
      case "date-desc":
        sorted.sort((a, b) => {
          const tA = typeof a.updatedAt === "number" ? a.updatedAt : (typeof a.createdAt === "number" ? a.createdAt : 0);
          const tB = typeof b.updatedAt === "number" ? b.updatedAt : (typeof b.createdAt === "number" ? b.createdAt : 0);
          return tB - tA;
        });
        break;
      case "phone-asc":
        sorted.sort((a, b) => (a.phone || "").localeCompare(b.phone || ""));
        break;
      case "name-asc":
      default:
        sorted.sort((a, b) => (a.name || "").localeCompare(b.name || "", undefined, { sensitivity: "base" }));
        break;
    }

    return sorted;
  }, [allCustomers, search, selectedGroup, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filteredCustomers.length / pageSize));

  const paginatedCustomers = useMemo(() => {
    const start = (pageNumber - 1) * pageSize;
    return filteredCustomers.slice(start, start + pageSize);
  }, [filteredCustomers, pageNumber, pageSize]);

  const handleSearchChange = (val: string) => {
    setSearch(val);
    setPageNumber(1);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    setPageNumber(newPage);
  };

  const customerSearchRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut listener for directory: Alt+S cycles sort, Alt+G cycles groups
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Alt + S -> Cycle Sort
      if (e.altKey && (e.key.toLowerCase() === "s" || e.code === "KeyS")) {
        e.preventDefault();
        const sortCycle: CustomerSortOption[] = ["name-asc", "name-desc", "company-asc", "date-desc", "phone-asc"];
        setSortBy((prev) => {
          const nextIdx = (sortCycle.indexOf(prev) + 1) % sortCycle.length;
          toast.info(`Sorted by: ${sortCycle[nextIdx]}`);
          return sortCycle[nextIdx];
        });
        return;
      }

      // Alt + G -> Cycle Group
      if (e.altKey && (e.key.toLowerCase() === "g" || e.code === "KeyG")) {
        if (availableGroups.length > 0) {
          e.preventDefault();
          setSelectedGroup((prev) => {
            const allOptions = ["ALL", ...availableGroups];
            const curIdx = allOptions.indexOf(prev);
            const nextGrp = allOptions[(curIdx + 1) % allOptions.length];
            setPageNumber(1);
            toast.info(`Group filter: ${nextGrp === "ALL" ? "All Groups" : nextGrp}`);
            return nextGrp;
          });
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [availableGroups]);

  // Tally Keyboard Navigation for Customer Directory
  const { selectedIndex, getRowProps } = useTallyListNavigation({
    items: paginatedCustomers,
    searchInputRef: customerSearchRef,
    onOpenItem: (cust) => navigate(`/admin/customers/${cust.id}`),
    onNewItem: () => setShowCreateModal(true),
    onDeleteItem: (cust) => setDeleteId(cust.id),
    onPrevPage: () => handlePageChange(pageNumber - 1),
    onNextPage: () => handlePageChange(pageNumber + 1),
  });

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteCustomer(deleteId);
      toast.success("Customer profile deleted");
      setDeleteId(null);
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

      {/* Filter / Search bar with Group and Sort selectors */}
      <SearchFilterBar
        inputRef={customerSearchRef}
        value={search}
        onChange={handleSearchChange}
        placeholder="Search by customer name, phone, company, email, group… (Press / to search)"
        count={filteredCustomers.length}
        countLabel={
          search.trim() || (selectedGroup && selectedGroup !== "ALL")
            ? "Filtered Results"
            : "Total Customers"
        }
      >
        <div className="flex items-center gap-2 flex-wrap">
          {/* Customer Group Filter */}
          <div className="flex items-center gap-1.5">
            <Filter className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <Select
              value={selectedGroup}
              onValueChange={(val) => {
                setSelectedGroup(val);
                setPageNumber(1);
              }}
            >
              <SelectTrigger
                className="h-8.5 text-xs bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl min-w-[130px] font-semibold text-slate-800 dark:text-slate-200 cursor-pointer"
                title="Filter by Customer Group (Alt+G)"
              >
                <SelectValue placeholder="All Groups" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Groups ({allCustomers.length})</SelectItem>
                {availableGroups.map((grp) => (
                  <SelectItem key={grp} value={grp}>
                    {grp}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Sort By Filter */}
          <div className="flex items-center gap-1.5">
            <ArrowUpDown className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <Select
              value={sortBy}
              onValueChange={(val: CustomerSortOption) => setSortBy(val)}
            >
              <SelectTrigger
                className="h-8.5 text-xs bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl min-w-[145px] font-semibold text-slate-800 dark:text-slate-200 cursor-pointer"
                title="Sort Customer Directory (Alt+S)"
              >
                <SelectValue placeholder="Sort..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name-asc">Alphabetical (A → Z)</SelectItem>
                <SelectItem value="name-desc">Alphabetical (Z → A)</SelectItem>
                <SelectItem value="company-asc">Company Name (A → Z)</SelectItem>
                <SelectItem value="date-desc">Recently Updated</SelectItem>
                <SelectItem value="phone-asc">Phone Number</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Reset Filters button if any active filter */}
          {(search.trim() || (selectedGroup && selectedGroup !== "ALL") || sortBy !== "name-asc") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearch("");
                setSelectedGroup("ALL");
                setSortBy("name-asc");
                setPageNumber(1);
              }}
              className="h-8.5 px-2 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 rounded-xl gap-1 cursor-pointer"
              title="Reset all search, group, and sort filters"
            >
              <X className="h-3 w-3" /> Reset
            </Button>
          )}
        </div>
      </SearchFilterBar>

      {/* Main Directory Table */}
      {loading ? (
        <div className="bg-card rounded-2xl border p-6">
          <LoadingScreen fullScreen={false} title="Customer Directory" subtitle="Loading customer accounts..." />
        </div>
      ) : error ? (
        <FirebaseErrorState
          error={error}
          onRetry={() => {
            setLoading(true);
            getCustomers(true)
              .then((list) => {
                setAllCustomers(list);
                setError(null);
              })
              .catch((err: any) => setError(err?.message || "Failed to load customers"))
              .finally(() => setLoading(false));
          }}
          title="Customer Sync Error"
        />
      ) : filteredCustomers.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No Customers Found"
          description={
            search
              ? `No customers match "${search}".`
              : "Click Add Customer to create your first client profile."
          }
          actionLabel="Add Customer"
          actionIcon={UserPlus}
          onAction={() => setShowCreateModal(true)}
        />
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
                {paginatedCustomers.map((cust, idx) => {
                  const rowProps = getRowProps(idx);
                  return (
                    <tr
                      key={cust.id}
                      {...rowProps}
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
                      className={cn(
                        "hover:bg-blue-50/40 dark:hover:bg-slate-900/50 transition-colors group cursor-pointer",
                        selectedIndex === idx && "bg-blue-500/10 dark:bg-blue-500/20 ring-1 ring-inset ring-blue-500/40"
                      )}
                    >
                      {/* Name & Company */}
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-900 dark:text-white text-xs group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors flex items-center gap-1.5">
                          {selectedIndex === idx && (
                            <span className="text-blue-500 font-bold text-xs">▶</span>
                          )}
                          <span>{cust.name}</span>
                          <ChevronRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-blue-500" />
                        </div>
                      <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                        {cust.companyName && cust.companyName !== cust.name && (
                          <span className="text-[11px] text-[#2563EB] font-semibold flex items-center gap-1">
                            <Building className="h-3 w-3" /> {cust.companyName}
                          </span>
                        )}
                        {cust.group && (
                          <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-medium bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                            {cust.group}
                          </span>
                        )}
                      </div>
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
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination Footer */}
      {!loading && !error && filteredCustomers.length > 0 && (
        <TablePagination
          pageNumber={pageNumber}
          totalPages={totalPages}
          currentItemsCount={paginatedCustomers.length}
          pageSize={pageSize}
          hasMore={pageNumber < totalPages}
          isLoading={loading}
          label="customers"
          onPageChange={handlePageChange}
        />
      )}

      {/* Inline Modals */}
      <CreateCustomerModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        onCreated={() => {
          setPageNumber(1);
          getCustomers(true).then((list) => setAllCustomers(list)).catch(() => {});
        }}
      />
      <EditCustomerModal
        customer={editCustomer}
        open={!!editCustomer}
        onOpenChange={(open) => !open && setEditCustomer(null)}
        onUpdated={() => {
          getCustomers(true).then((list) => setAllCustomers(list)).catch(() => {});
        }}
      />
      <ImportCustomersModal
        open={showImportModal}
        onOpenChange={setShowImportModal}
        onImportComplete={() => {
          setPageNumber(1);
          getCustomers(true).then((list) => setAllCustomers(list)).catch(() => {});
        }}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDeleteDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Delete Customer Profile?"
        description="Are you sure you want to remove this customer profile? Past service calls will retain their historical customer records."
        confirmLabel="Delete Customer"
        onConfirm={handleDelete}
      />
    </div>
  );
}
