import { useState, useEffect } from "react";
import { collection, query, orderBy, limit, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Eye,
  ArrowUpDown,
  PlusCircle,
  Users,
  Layers,
  Terminal,
  ShieldCheck,
  Zap,
  Clock,
  Search,
  Package,
  Sliders,
  Save,
  Plus,
  Trash2,
  Check,
} from "lucide-react";
import {
  TallySyncRules,
  DEFAULT_TALLY_RULES,
  fetchTallySyncRules,
  saveTallySyncRules,
} from "@/lib/tallyRules";

function formatSyncDate(timestamp?: number): string {
  if (!timestamp) return "—";
  return new Date(timestamp).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}

export interface TallySyncRunDoc {
  id: string;
  timestamp: number;
  dateFormatted?: string;
  mode: "live" | "dry_run";
  syncScope?: "all" | "stock" | "customers" | string;
  status: "success" | "warning" | "failed";
  source?: string;
  company?: string;
  sourceIP?: string;
  totalItemsScanned?: number;
  changedItemsCount?: number;
  createdProductsCount?: number;
  updatedProductsCount?: number;
  createdCustomersCount?: number;
  scrapItemsIgnoredCount?: number;
  createdProducts?: Array<{
    guid: string;
    name: string;
    brand?: string;
    category: string;
    categoryId: string;
    stock: number;
    rate: number;
    uom: string;
    isScrap?: boolean;
  }>;
  updatedProducts?: Array<{
    guid: string;
    name: string;
    brand?: string;
    oldStock?: number;
    newStock: number;
    oldPrice?: number;
    newPrice?: number;
    uom: string;
    category?: string;
  }>;
  createdCustomers?: Array<{
    guid: string;
    name: string;
    parent: string;
    gstin?: string;
    closingBalance?: number;
  }>;
  scrapItems?: Array<{
    name: string;
    parent: string;
    reason: string;
  }>;
  errorMessage?: string;
}

export default function AdminTallySync() {
  const [mainView, setMainView] = useState<"logs" | "rules">("logs");
  const [runs, setRuns] = useState<TallySyncRunDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRun, setSelectedRun] = useState<TallySyncRunDoc | null>(null);
  const [filterMode, setFilterMode] = useState<"all" | "live" | "dry_run">("all");
  const [filterScope, setFilterScope] = useState<"all" | "stock" | "customers">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [modalSearch, setModalSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"updated" | "created" | "customers" | "scrap">("updated");

  // Gateway health check state
  const [gatewayStatus, setGatewayStatus] = useState<"checking" | "online" | "offline">("checking");
  const [gatewayLatency, setGatewayLatency] = useState<number | null>(null);

  // Dynamic Rules state
  const [rules, setRules] = useState<TallySyncRules>(DEFAULT_TALLY_RULES);
  const [savingRules, setSavingRules] = useState(false);
  const [rulesSavedSuccess, setRulesSavedSuccess] = useState(false);
  const [newScrapKeyword, setNewScrapKeyword] = useState("");
  const [newBrandName, setNewBrandName] = useState("");
  const [newBrandPattern, setNewBrandPattern] = useState("");
  const [newTallyGroup, setNewTallyGroup] = useState("");
  const [newTallyTargetCat, setNewTallyTargetCat] = useState("printer");

  useEffect(() => {
    // Check Cloud Gateway health
    const checkGateway = async () => {
      const start = Date.now();
      try {
        const res = await fetch("https://zorba-tally-gateway-703650129045.asia-south1.run.app/health");
        if (res.ok) {
          setGatewayStatus("online");
          setGatewayLatency(Date.now() - start);
        } else {
          setGatewayStatus("offline");
        }
      } catch {
        setGatewayStatus("offline");
      }
    };
    checkGateway();

    // Load dynamic rules from Firestore
    fetchTallySyncRules().then((r) => {
      if (r) setRules(r);
    });
  }, []);

  useEffect(() => {
    const q = query(
      collection(db, "tally_sync_runs"),
      orderBy("timestamp", "desc"),
      limit(50)
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const list: TallySyncRunDoc[] = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as TallySyncRunDoc[];
        setRuns(list);
        setLoading(false);
      },
      (err) => {
        console.error("Error reading tally_sync_runs:", err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, []);

  const handleSaveRules = async () => {
    setSavingRules(true);
    try {
      await saveTallySyncRules(rules);
      setRulesSavedSuccess(true);
      setTimeout(() => setRulesSavedSuccess(false), 3000);
    } catch (err: any) {
      alert("Failed to save rules: " + err?.message);
    } finally {
      setSavingRules(false);
    }
  };

  const handleAddScrapKeyword = () => {
    if (!newScrapKeyword.trim()) return;
    const kw = newScrapKeyword.trim().toLowerCase();
    if (!rules.scrapKeywords.includes(kw)) {
      setRules({
        ...rules,
        scrapKeywords: [...rules.scrapKeywords, kw],
      });
    }
    setNewScrapKeyword("");
  };

  const handleRemoveScrapKeyword = (kw: string) => {
    setRules({
      ...rules,
      scrapKeywords: rules.scrapKeywords.filter((k) => k !== kw),
    });
  };

  const handleAddBrand = () => {
    if (!newBrandName.trim() || !newBrandPattern.trim()) return;
    const canonical = newBrandName.trim();
    const patterns = newBrandPattern
      .split(",")
      .map((p) => p.trim().toLowerCase())
      .filter(Boolean);

    setRules({
      ...rules,
      brandRules: [{ canonical, patterns }, ...rules.brandRules],
    });
    setNewBrandName("");
    setNewBrandPattern("");
  };

  const handleRemoveBrand = (index: number) => {
    setRules({
      ...rules,
      brandRules: rules.brandRules.filter((_, i) => i !== index),
    });
  };

  const handleAddTallyGroupMapping = () => {
    if (!newTallyGroup.trim()) return;
    const groupKey = newTallyGroup.trim().toLowerCase();
    setRules({
      ...rules,
      tallyGroupMappings: {
        ...rules.tallyGroupMappings,
        [groupKey]: newTallyTargetCat,
      },
    });
    setNewTallyGroup("");
  };

  const handleRemoveTallyGroupMapping = (groupKey: string) => {
    const updated = { ...rules.tallyGroupMappings };
    delete updated[groupKey];
    setRules({
      ...rules,
      tallyGroupMappings: updated,
    });
  };

  const filteredRuns = runs.filter((r) => {
    if (filterMode !== "all" && r.mode !== filterMode) return false;
    if (filterScope !== "all") {
      const scope = r.syncScope || "all";
      if (scope !== filterScope && scope !== "all") return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchId = r.id.toLowerCase().includes(q);
      const matchComp = (r.company || "").toLowerCase().includes(q);
      return matchId || matchComp;
    }
    return true;
  });

  const latestRun = runs[0] || null;
  const totalLiveRuns = runs.filter((r) => r.mode === "live").length;
  const totalDryRuns = runs.filter((r) => r.mode === "dry_run").length;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <RefreshCw className="h-6 w-6 text-primary" />
            Tally Smart Sync Center
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Real-time audit logs of Windows Tally sync runs and offline dynamic catalog classification rules.
          </p>
        </div>

        {/* View Switcher */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg border border-slate-200 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setMainView("logs")}
            className={`px-3.5 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all ${
              mainView === "logs"
                ? "bg-slate-900 text-white shadow-xs"
                : "text-slate-700 hover:text-slate-900 hover:bg-slate-200/70"
            }`}
          >
            <Clock className="h-3.5 w-3.5" />
            Sync Audit Logs
          </button>
          <button
            type="button"
            onClick={() => setMainView("rules")}
            className={`px-3.5 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all ${
              mainView === "rules"
                ? "bg-slate-900 text-white shadow-xs"
                : "text-slate-700 hover:text-slate-900 hover:bg-slate-200/70"
            }`}
          >
            <Sliders className="h-3.5 w-3.5" />
            Classification Rules
          </button>
        </div>
      </div>

      {/* VIEW 1: SYNC AUDIT LOGS */}
      {mainView === "logs" && (
        <div className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center justify-between">
                <span>Cloud Gateway</span>
                <ShieldCheck className="h-4 w-4 text-slate-400" />
              </div>
              <div className="mt-2 flex items-center gap-2">
                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    gatewayStatus === "online"
                      ? "bg-emerald-600 animate-pulse"
                      : gatewayStatus === "checking"
                      ? "bg-amber-500"
                      : "bg-red-500"
                  }`}
                />
                <span className="font-semibold text-slate-900 text-sm">
                  {gatewayStatus === "online"
                    ? "Live & Scaled to 0 (Free)"
                    : gatewayStatus === "checking"
                    ? "Checking Status..."
                    : "Offline"}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {gatewayLatency ? `Response latency: ${gatewayLatency}ms` : "asia-south1 (Mumbai)"}
              </p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center justify-between">
                <span>Last Sync Run</span>
                <Clock className="h-4 w-4 text-slate-400" />
              </div>
              <div className="mt-2 font-semibold text-slate-900 truncate text-sm">
                {latestRun ? (
                  <span>{formatSyncDate(latestRun.timestamp)}</span>
                ) : (
                  "No sync runs yet"
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {latestRun ? (
                  <span className="capitalize">{latestRun.mode.replace("_", " ")} mode</span>
                ) : (
                  "Run script on Windows to sync"
                )}
              </p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center justify-between">
                <span>Live Updates</span>
                <Zap className="h-4 w-4 text-emerald-600" />
              </div>
              <div className="mt-1 text-2xl font-bold text-emerald-800">{totalLiveRuns}</div>
              <p className="text-xs text-slate-500 mt-1">Direct database syncs recorded</p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center justify-between">
                <span>Dry-Run Simulations</span>
                <Eye className="h-4 w-4 text-blue-600" />
              </div>
              <div className="mt-1 text-2xl font-bold text-blue-800">{totalDryRuns}</div>
              <p className="text-xs text-slate-500 mt-1">0-write simulations performed</p>
            </div>
          </div>

          {/* Windows Quick Action Banner */}
          <div className="bg-gradient-to-r from-slate-50 via-white to-indigo-50/40 p-4 sm:p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Terminal className="h-4 w-4 text-slate-700" />
                <span className="font-bold text-slate-900 text-sm">Windows Quick Launch Scripts:</span>
              </div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-medium self-start sm:self-auto">
                <span className="h-2 w-2 rounded-full bg-emerald-600"></span>
                Delta Hash Filtering Active
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 text-xs">
              <div className="p-2.5 bg-white rounded-lg border border-slate-200 shadow-2xs">
                <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                  <Package className="h-3.5 w-3.5 text-indigo-600" />
                  Stock Inventory
                </div>
                <div className="mt-1 font-mono text-[11px] text-slate-600">
                  Live: <code className="text-indigo-700 font-semibold">Sync_Stock_Live.bat</code>
                </div>
                <div className="font-mono text-[11px] text-slate-600">
                  Dry-run: <code className="text-blue-700 font-semibold">DryRun_Stock.bat</code>
                </div>
              </div>

              <div className="p-2.5 bg-white rounded-lg border border-slate-200 shadow-2xs">
                <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-purple-600" />
                  Customers & Debtors
                </div>
                <div className="mt-1 font-mono text-[11px] text-slate-600">
                  Live: <code className="text-purple-700 font-semibold">Sync_Customers_Live.bat</code>
                </div>
                <div className="font-mono text-[11px] text-slate-600">
                  Dry-run: <code className="text-blue-700 font-semibold">DryRun_Customers.bat</code>
                </div>
              </div>

              <div className="p-2.5 bg-white rounded-lg border border-slate-200 shadow-2xs">
                <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5 text-emerald-600" />
                  Full Sync & Auto-Startup
                </div>
                <div className="mt-1 font-mono text-[11px] text-slate-600">
                  Auto: <code className="text-emerald-700 font-semibold">2_EnableAutoStartup.bat</code>
                </div>
                <div className="font-mono text-[11px] text-slate-600">
                  Setup: <code className="text-slate-700 font-semibold">1_FixDefender_Unblock.bat</code>
                </div>
              </div>
            </div>
          </div>

          {/* Filters and Search Bar */}
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center rounded-lg bg-slate-100 p-1 border border-slate-200 text-xs">
                <button
                  type="button"
                  onClick={() => setFilterMode("all")}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                    filterMode === "all"
                      ? "bg-slate-900 text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
                  }`}
                >
                  All Runs ({runs.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterMode("live")}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                    filterMode === "live"
                      ? "bg-emerald-700 text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
                  }`}
                >
                  Live Syncs ({totalLiveRuns})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterMode("dry_run")}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                    filterMode === "dry_run"
                      ? "bg-blue-700 text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
                  }`}
                >
                  Dry-Runs ({totalDryRuns})
                </button>
              </div>

              <div className="flex items-center rounded-lg bg-slate-100 p-1 border border-slate-200 text-xs">
                <button
                  type="button"
                  onClick={() => setFilterScope("all")}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                    filterScope === "all"
                      ? "bg-slate-800 text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
                  }`}
                >
                  All Targets
                </button>
                <button
                  type="button"
                  onClick={() => setFilterScope("stock")}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                    filterScope === "stock"
                      ? "bg-indigo-700 text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
                  }`}
                >
                  Stock
                </button>
                <button
                  type="button"
                  onClick={() => setFilterScope("customers")}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                    filterScope === "customers"
                      ? "bg-purple-700 text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
                  }`}
                >
                  Customers
                </button>
              </div>
            </div>

            <div className="relative w-full lg:w-64">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <Input
                type="text"
                placeholder="Search run ID or company..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 text-xs h-8 border-slate-300"
              />
            </div>
          </div>

          {/* Sync Runs Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  Sync Run History
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Click any row to inspect created products, stock delta updates, new customers, and scrap items.
                </p>
              </div>
            </div>

            <div>
              {loading ? (
                <div className="p-8 text-center text-sm text-slate-500">
                  <RefreshCw className="h-6 w-6 animate-spin mx-auto text-primary mb-2" />
                  Loading sync history...
                </div>
              ) : filteredRuns.length === 0 ? (
                <div className="p-12 text-center text-sm text-slate-500">
                  <Layers className="h-8 w-8 mx-auto text-slate-300 mb-2" />
                  No sync runs found matching your filter.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="p-3 pl-4">Timestamp</th>
                        <th className="p-3">Run Mode</th>
                        <th className="p-3">Target Scope</th>
                        <th className="p-3">Products Updated</th>
                        <th className="p-3">New Products</th>
                        <th className="p-3">New Customers</th>
                        <th className="p-3">Scrap Filtered</th>
                        <th className="p-3">Status</th>
                        <th className="p-3 pr-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {filteredRuns.map((run) => (
                        <tr
                          key={run.id}
                          onClick={() => {
                            setSelectedRun(run);
                            setModalSearch("");
                            setActiveTab(run.syncScope === "customers" ? "customers" : "updated");
                          }}
                          className="hover:bg-slate-50/90 cursor-pointer transition-colors"
                        >
                          <td className="p-3 pl-4 font-mono font-medium text-slate-900">
                            {formatSyncDate(run.timestamp)}
                          </td>
                          <td className="p-3">
                            {run.mode === "dry_run" ? (
                              <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300 font-semibold">
                                Dry-Run Simulation
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-emerald-100 text-emerald-800 border-emerald-300 font-semibold">
                                Live Sync
                              </Badge>
                            )}
                          </td>
                          <td className="p-3">
                            <span className="capitalize font-medium text-slate-800">
                              {run.syncScope || "All"}
                            </span>
                          </td>
                          <td className="p-3">
                            <span className="font-semibold text-slate-900">
                              {run.updatedProductsCount ?? run.updatedProducts?.length ?? 0}
                            </span>{" "}
                            items
                          </td>
                          <td className="p-3">
                            <span className="font-semibold text-indigo-700">
                              {run.createdProductsCount ?? run.createdProducts?.length ?? 0}
                            </span>{" "}
                            items
                          </td>
                          <td className="p-3">
                            <span className="font-semibold text-purple-700">
                              {run.createdCustomersCount ?? run.createdCustomers?.length ?? 0}
                            </span>{" "}
                            parties
                          </td>
                          <td className="p-3 text-slate-500">
                            {run.scrapItemsIgnoredCount ?? run.scrapItems?.length ?? 0} items
                          </td>
                          <td className="p-3">
                            {run.status === "success" ? (
                              <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                                <CheckCircle2 className="h-3.5 w-3.5" /> Success
                              </span>
                            ) : run.status === "warning" ? (
                              <span className="inline-flex items-center gap-1 text-amber-700 font-semibold">
                                <AlertTriangle className="h-3.5 w-3.5" /> Warning
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-red-700 font-semibold">
                                <XCircle className="h-3.5 w-3.5" /> Failed
                              </span>
                            )}
                          </td>
                          <td className="p-3 pr-4 text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs font-medium text-slate-700 border-slate-300 hover:bg-slate-100"
                            >
                              Inspect Details →
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: DYNAMIC RULES MANAGER */}
      {mainView === "rules" && (
        <div className="space-y-6">
          {/* Header & Save button */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Sliders className="h-5 w-5 text-indigo-600" />
                Dynamic Catalog & Classification Rules
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                These rules are stored in Firestore and automatically applied in real time to live Tally syncs, imports, and catalog normalization.
              </p>
            </div>
            <Button
              onClick={handleSaveRules}
              disabled={savingRules}
              className="bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs h-9 px-4 gap-1.5 self-start sm:self-auto"
            >
              {savingRules ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Saving Rules...
                </>
              ) : rulesSavedSuccess ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-400" /> Saved to Firestore!
                </>
              ) : (
                <>
                  <Save className="h-3.5 w-3.5" /> Save Rules to Cloud
                </>
              )}
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 1. Scrap & Non-Product Filter Keywords */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center justify-between">
                  <span>1. Scrap & Non-Product Filters</span>
                  <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-300 text-[10px]">
                    {rules.scrapKeywords.length} Patterns
                  </Badge>
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Items matching any of these words or phrases are automatically marked as internal/scrap and hidden from the public website.
                </p>
              </div>

              {/* Add Input */}
              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder="e.g. 'scrap', 'service repair', 'demo item'..."
                  value={newScrapKeyword}
                  onChange={(e) => setNewScrapKeyword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddScrapKeyword()}
                  className="h-8 text-xs"
                />
                <Button
                  size="sm"
                  onClick={handleAddScrapKeyword}
                  className="h-8 text-xs bg-amber-700 hover:bg-amber-800 text-white font-medium"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add
                </Button>
              </div>

              {/* Keywords Tag Cloud */}
              <div className="flex flex-wrap gap-1.5 max-h-56 overflow-y-auto p-2 bg-slate-50 rounded-lg border border-slate-200">
                {rules.scrapKeywords.map((kw) => (
                  <span
                    key={kw}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white border border-slate-300 text-slate-700 text-xs font-medium shadow-2xs"
                  >
                    <span>{kw}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveScrapKeyword(kw)}
                      className="text-slate-400 hover:text-red-600"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* 2. Tally StockGroup 1:1 Direct Mappings */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center justify-between">
                  <span>2. Tally StockGroup Direct Mappings</span>
                  <Badge variant="outline" className="bg-indigo-50 text-indigo-800 border-indigo-300 text-[10px]">
                    {Object.keys(rules.tallyGroupMappings).length} Mappings
                  </Badge>
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Direct 1:1 mapping from Tally's Parent Stock Group to a Zorba website category.
                </p>
              </div>

              {/* Add Mapping Input */}
              <div className="flex gap-2 items-center">
                <Input
                  type="text"
                  placeholder="Tally Group Name (e.g. 'CCTV Cameras')"
                  value={newTallyGroup}
                  onChange={(e) => setNewTallyGroup(e.target.value)}
                  className="h-8 text-xs flex-1"
                />
                <select
                  value={newTallyTargetCat}
                  onChange={(e) => setNewTallyTargetCat(e.target.value)}
                  className="h-8 text-xs border border-slate-300 rounded-md px-2 bg-white text-slate-700 font-medium"
                >
                  <option value="processor">Processor</option>
                  <option value="printer">Printer</option>
                  <option value="toner-cartridge">Toner / Cartridge</option>
                  <option value="laptop">Laptop</option>
                  <option value="desktop-pc">Desktop & PC</option>
                  <option value="cctv-security">CCTV & Security</option>
                  <option value="router-networking">Router & Networking</option>
                  <option value="monitor-display">Monitor & Display</option>
                  <option value="ups-inverter">UPS & Inverter</option>
                  <option value="scanner-billing">Scanner & Billing</option>
                  <option value="biometric-attendance">Biometric & Attendance</option>
                  <option value="accessories">Accessories</option>
                </select>
                <Button
                  size="sm"
                  onClick={handleAddTallyGroupMapping}
                  className="h-8 text-xs bg-indigo-700 hover:bg-indigo-800 text-white font-medium"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" /> Map
                </Button>
              </div>

              {/* Mappings List */}
              <div className="max-h-56 overflow-y-auto space-y-1.5 p-2 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                {Object.entries(rules.tallyGroupMappings).map(([grp, catId]) => (
                  <div
                    key={grp}
                    className="flex items-center justify-between p-2 bg-white rounded-md border border-slate-200"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900 capitalize">{grp}</span>
                      <span className="text-slate-400">→</span>
                      <Badge variant="outline" className="bg-indigo-50 text-indigo-800 border-indigo-200 text-[10px]">
                        {catId}
                      </Badge>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveTallyGroupMapping(grp)}
                      className="text-slate-400 hover:text-red-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* 3. Brand Aliases & Patterns */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4 lg:col-span-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center justify-between">
                  <span>3. Brand Recognition & Canonical Mapping</span>
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-300 text-[10px]">
                    {rules.brandRules.length} Brands Registered
                  </Badge>
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  When a product title or ledger contains any of the pattern aliases, it is canonicalized to the official brand name.
                </p>
              </div>

              {/* Add Brand Form */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <Input
                  type="text"
                  placeholder="Official Brand (e.g. 'Hikvision')"
                  value={newBrandName}
                  onChange={(e) => setNewBrandName(e.target.value)}
                  className="h-8 text-xs"
                />
                <Input
                  type="text"
                  placeholder="Aliases (comma-separated, e.g. 'hikvision, hik, ezviz')"
                  value={newBrandPattern}
                  onChange={(e) => setNewBrandPattern(e.target.value)}
                  className="h-8 text-xs sm:col-span-1"
                />
                <Button
                  size="sm"
                  onClick={handleAddBrand}
                  className="h-8 text-xs bg-emerald-700 hover:bg-emerald-800 text-white font-medium self-end"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add Brand Rule
                </Button>
              </div>

              {/* Brands Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-72 overflow-y-auto p-2 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                {rules.brandRules.map((b, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 bg-white rounded-md border border-slate-200 flex items-start justify-between gap-2"
                  >
                    <div>
                      <div className="font-bold text-slate-900">{b.canonical}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                        {b.patterns.join(", ")}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveBrand(idx)}
                      className="text-slate-400 hover:text-red-600 mt-0.5"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sync Run Details Modal */}
      <Dialog open={!!selectedRun} onOpenChange={(open) => !open && setSelectedRun(null)}>
        <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-5 pb-3 border-b border-slate-200 bg-slate-50/50">
            <div className="flex items-center justify-between gap-4">
              <div>
                <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <span>Sync Run Details</span>
                  {selectedRun?.mode === "dry_run" ? (
                    <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300 font-semibold">
                      Dry-Run (0 Writes)
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-emerald-100 text-emerald-800 border-emerald-300 font-semibold">
                      Live Sync
                    </Badge>
                  )}
                  <Badge variant="outline" className="bg-slate-100 text-slate-800 border-slate-300 font-semibold capitalize">
                    Scope: {selectedRun?.syncScope || "All"}
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 mt-1">
                  Run ID: <span className="font-mono text-slate-700 font-medium">{selectedRun?.id}</span> • Executed at:{" "}
                  {selectedRun && formatSyncDate(selectedRun.timestamp)}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {selectedRun && (
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-500 block">Updated Stock</span>
                  <span className="font-bold text-slate-900 text-base">
                    {selectedRun.updatedProducts?.length || selectedRun.updatedProductsCount || 0}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">New Products</span>
                  <span className="font-bold text-indigo-700 text-base">
                    {selectedRun.createdProducts?.length || selectedRun.createdProductsCount || 0}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">New Customers</span>
                  <span className="font-bold text-purple-700 text-base">
                    {selectedRun.createdCustomers?.length || selectedRun.createdCustomersCount || 0}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Scrap / Filtered</span>
                  <span className="font-bold text-slate-700 text-base">
                    {selectedRun.scrapItems?.length || selectedRun.scrapItemsIgnoredCount || 0}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 border-b border-slate-200 pb-1.5">
                <button
                  type="button"
                  onClick={() => setActiveTab("updated")}
                  className={`px-3.5 py-1.5 text-xs font-bold rounded-md transition-all flex items-center gap-1.5 ${
                    activeTab === "updated"
                      ? "bg-slate-900 text-white shadow-xs"
                      : "text-slate-700 bg-slate-100 hover:bg-slate-200"
                  }`}
                >
                  <ArrowUpDown className="h-3.5 w-3.5" />
                  Updated Stock ({selectedRun.updatedProducts?.length || 0})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("created")}
                  className={`px-3.5 py-1.5 text-xs font-bold rounded-md transition-all flex items-center gap-1.5 ${
                    activeTab === "created"
                      ? "bg-indigo-700 text-white shadow-xs"
                      : "text-indigo-800 bg-indigo-50 hover:bg-indigo-100"
                  }`}
                >
                  <PlusCircle className="h-3.5 w-3.5" />
                  New Products ({selectedRun.createdProducts?.length || 0})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("customers")}
                  className={`px-3.5 py-1.5 text-xs font-bold rounded-md transition-all flex items-center gap-1.5 ${
                    activeTab === "customers"
                      ? "bg-purple-700 text-white shadow-xs"
                      : "text-purple-800 bg-purple-50 hover:bg-purple-100"
                  }`}
                >
                  <Users className="h-3.5 w-3.5" />
                  Customers ({selectedRun.createdCustomers?.length || 0})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("scrap")}
                  className={`px-3.5 py-1.5 text-xs font-bold rounded-md transition-all flex items-center gap-1.5 ${
                    activeTab === "scrap"
                      ? "bg-amber-700 text-white shadow-xs"
                      : "text-amber-800 bg-amber-50 hover:bg-amber-100"
                  }`}
                >
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Scrap Filtered ({selectedRun.scrapItems?.length || 0})
                </button>
              </div>

              <div>
                <Input
                  type="text"
                  placeholder="Search items in this tab..."
                  value={modalSearch}
                  onChange={(e) => setModalSearch(e.target.value)}
                  className="h-8 text-xs border-slate-300"
                />
              </div>

              {activeTab === "updated" && (
                <div className="border border-slate-200 rounded-md overflow-hidden max-h-72 overflow-y-auto text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200 sticky top-0">
                      <tr>
                        <th className="p-2.5 pl-3">Product Name</th>
                        <th className="p-2.5">Brand</th>
                        <th className="p-2.5">Category</th>
                        <th className="p-2.5">Stock Delta</th>
                        <th className="p-2.5">Price</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(selectedRun.updatedProducts || [])
                        .filter((p) =>
                          !modalSearch ||
                          p.name.toLowerCase().includes(modalSearch.toLowerCase())
                        )
                        .map((p, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="p-2.5 pl-3 font-medium text-slate-900">
                              {p.name}
                              <div className="text-[10px] font-mono text-slate-400">{p.guid}</div>
                            </td>
                            <td className="p-2.5 text-indigo-700 font-medium">{p.brand || "—"}</td>
                            <td className="p-2.5 text-slate-600">{p.category || "—"}</td>
                            <td className="p-2.5 font-medium">
                              <span className="text-slate-400 line-through mr-1.5">{p.oldStock ?? "—"}</span>
                              <span className="text-emerald-700 font-bold">
                                {p.newStock} {p.uom}
                              </span>
                            </td>
                            <td className="p-2.5">
                              {p.newPrice && p.newPrice > 0 ? `₹${p.newPrice.toLocaleString("en-IN")}` : "—"}
                            </td>
                          </tr>
                        ))}
                      {(selectedRun.updatedProducts || []).length === 0 && (
                        <tr>
                          <td colSpan={5} className="p-6 text-center text-slate-400">
                            No stock updates in this run.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {activeTab === "created" && (
                <div className="border border-slate-200 rounded-md overflow-hidden max-h-72 overflow-y-auto text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200 sticky top-0">
                      <tr>
                        <th className="p-2.5 pl-3">Product Name</th>
                        <th className="p-2.5">Brand</th>
                        <th className="p-2.5">Inferred Category</th>
                        <th className="p-2.5">Stock</th>
                        <th className="p-2.5">Rate</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(selectedRun.createdProducts || [])
                        .filter((p) =>
                          !modalSearch ||
                          p.name.toLowerCase().includes(modalSearch.toLowerCase())
                        )
                        .map((p, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="p-2.5 pl-3 font-medium text-indigo-900">
                              {p.name}
                              <div className="text-[10px] font-mono text-slate-400">{p.guid}</div>
                            </td>
                            <td className="p-2.5 text-indigo-700 font-medium">{p.brand || "—"}</td>
                            <td className="p-2.5">
                              <Badge variant="outline" className="bg-indigo-100 text-indigo-800 border-indigo-300 text-[10px] font-semibold">
                                {p.category}
                              </Badge>
                            </td>
                            <td className="p-2.5 font-semibold text-slate-900">
                              {p.stock} {p.uom}
                            </td>
                            <td className="p-2.5 font-medium">
                              {p.rate && p.rate > 0 ? `₹${p.rate.toLocaleString("en-IN")}` : "—"}
                            </td>
                          </tr>
                        ))}
                      {(selectedRun.createdProducts || []).length === 0 && (
                        <tr>
                          <td colSpan={5} className="p-6 text-center text-slate-400">
                            No new products created in this run.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {activeTab === "customers" && (
                <div className="border border-slate-200 rounded-md overflow-hidden max-h-72 overflow-y-auto text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200 sticky top-0">
                      <tr>
                        <th className="p-2.5 pl-3">Customer / Party Name</th>
                        <th className="p-2.5">Normalized Group</th>
                        <th className="p-2.5">WhatsApp Mobile</th>
                        <th className="p-2.5">City & Locality</th>
                        <th className="p-2.5">GSTIN</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(selectedRun.createdCustomers || [])
                        .filter((c) =>
                          !modalSearch ||
                          c.name.toLowerCase().includes(modalSearch.toLowerCase()) ||
                          (c.phone && c.phone.includes(modalSearch))
                        )
                        .map((c: any, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="p-2.5 pl-3 font-medium text-purple-900">
                              {c.name}
                              {c.rawName && c.rawName !== c.name && (
                                <div className="text-[10px] text-slate-400 font-normal truncate max-w-xs">
                                  Raw: {c.rawName}
                                </div>
                              )}
                            </td>
                            <td className="p-2.5">
                              <Badge variant="outline" className="bg-purple-50 text-purple-800 border-purple-200 text-[10px] font-semibold">
                                {c.group || c.parent || "Sundry Debtors"}
                              </Badge>
                            </td>
                            <td className="p-2.5 font-mono">
                              {c.phone ? (
                                <span className="text-emerald-700 font-semibold">
                                  +{c.phone.startsWith("91") ? c.phone.slice(0, 2) + " " + c.phone.slice(2) : c.phone}
                                </span>
                              ) : (
                                <span className="text-slate-400">—</span>
                              )}
                            </td>
                            <td className="p-2.5 text-slate-600">
                              {c.city || "Neemuch"}
                              {c.address && c.address !== c.city && (
                                <span className="text-slate-400 text-[10px] block">{c.address}</span>
                              )}
                            </td>
                            <td className="p-2.5 font-mono">{c.gstin || "—"}</td>
                          </tr>
                        ))}
                      {(selectedRun.createdCustomers || []).length === 0 && (
                        <tr>
                          <td colSpan={5} className="p-6 text-center text-slate-400">
                            No customer ledgers in this run.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {activeTab === "scrap" && (
                <div className="border border-slate-200 rounded-md overflow-hidden max-h-72 overflow-y-auto text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200 sticky top-0">
                      <tr>
                        <th className="p-2.5 pl-3">Item / Ledger Name</th>
                        <th className="p-2.5">Tally Parent</th>
                        <th className="p-2.5">Filter Reason</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(selectedRun.scrapItems || [])
                        .filter((s) =>
                          !modalSearch ||
                          s.name.toLowerCase().includes(modalSearch.toLowerCase())
                        )
                        .map((s, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="p-2.5 pl-3 font-medium text-slate-700">{s.name}</td>
                            <td className="p-2.5 text-slate-500">{s.parent}</td>
                            <td className="p-2.5 text-amber-800 font-semibold">{s.reason}</td>
                          </tr>
                        ))}
                      {(selectedRun.scrapItems || []).length === 0 && (
                        <tr>
                          <td colSpan={3} className="p-6 text-center text-slate-400">
                            No scrap items filtered in this run.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
