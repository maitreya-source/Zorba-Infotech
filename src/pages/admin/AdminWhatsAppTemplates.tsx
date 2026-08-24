import { useEffect, useState } from "react";
import {
  MessageSquare,
  Plus,
  Pencil,
  Trash2,
  Search,
  RefreshCw,
  Layers,
  FileText,
  Truck,
  Building2,
  Send,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  ConfirmDeleteDialog,
  EmptyState,
  LoadingScreen,
} from "@/components/common";
import {
  getWhatsAppTemplates,
  createWhatsAppTemplate,
  updateWhatsAppTemplate,
  deleteWhatsAppTemplate,
  seedDefaultWhatsAppTemplates,
} from "@/lib/firestore";
import type {
  WhatsAppTemplateDoc,
  WhatsAppTargetModule,
  WhatsAppCategory,
  WhatsAppTemplateVariable,
} from "@/lib/types";
import { isWhatsAppApiConfigured, sendWhatsAppMessage, fetchMetaTemplates } from "@/lib/whatsappApi";

const MODULE_TABS: { key: string; label: string; icon: any }[] = [
  { key: "all", label: "All Service Templates", icon: Layers },
  { key: "service_calls", label: "Customer Service Calls", icon: FileText },
  { key: "service_centers", label: "OEM Service Centers", icon: Building2 },
  { key: "couriers", label: "Courier Logistics", icon: Truck },
];

export default function AdminWhatsAppTemplates() {
  const [templates, setTemplates] = useState<WhatsAppTemplateDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [syncing, setSyncing] = useState(false);

  // Dialog State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<WhatsAppTemplateDoc | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Test Modal State
  const [testModalOpen, setTestModalOpen] = useState(false);
  const [testTemplate, setTestTemplate] = useState<WhatsAppTemplateDoc | null>(null);
  const [testPhone, setTestPhone] = useState("+91 95891 99730");
  const [testSending, setTestSending] = useState(false);

  // Form State
  const [formName, setFormName] = useState("");
  const [formDisplayName, setFormDisplayName] = useState("");
  const [formCategory, setFormCategory] = useState<WhatsAppCategory>("utility");
  const [formTargetModule, setFormTargetModule] = useState<WhatsAppTargetModule>("service_calls");
  const [formBodyText, setFormBodyText] = useState("");
  const [formVariables, setFormVariables] = useState<WhatsAppTemplateVariable[]>([]);
  const [formActive, setFormActive] = useState(true);
  const [formSaving, setFormSaving] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getWhatsAppTemplates();
      setTemplates(data);
    } catch (err: any) {
      console.error("Failed to load templates:", err);
      toast.error("Failed to load WhatsApp templates");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCreateModal = () => {
    setEditingTemplate(null);
    setFormName("");
    setFormDisplayName("");
    setFormCategory("utility");
    setFormTargetModule("service_calls");
    setFormBodyText("");
    setFormVariables([]);
    setFormActive(true);
    setEditModalOpen(true);
  };

  const openEditModal = (tpl: WhatsAppTemplateDoc) => {
    setEditingTemplate(tpl);
    setFormName(tpl.name);
    setFormDisplayName(tpl.displayName);
    setFormCategory(tpl.category);
    setFormTargetModule(tpl.targetModule);
    setFormBodyText(tpl.bodyText);
    setFormVariables(tpl.variables || []);
    setFormActive(tpl.active !== false);
    setEditModalOpen(true);
  };

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formDisplayName.trim()) {
      toast.error("Template Display Title is required");
      return;
    }
    if (!formName.trim()) {
      toast.error("Meta Template ID is required");
      return;
    }
    if (!formBodyText.trim()) {
      toast.error("Template body text is required");
      return;
    }

    setFormSaving(true);
    try {
      const payload: Omit<WhatsAppTemplateDoc, "id" | "createdAt" | "updatedAt"> = {
        name: formName.trim().toLowerCase().replace(/[^a-z0-9_]+/g, "_"),
        displayName: formDisplayName.trim(),
        category: formCategory,
        targetModule: formTargetModule,
        language: "en_US",
        headerType: "none",
        bodyText: formBodyText.trim(),
        variables: formVariables,
        active: formActive,
        metaStatus: "approved",
      };

      if (editingTemplate) {
        await updateWhatsAppTemplate(editingTemplate.id, payload);
        toast.success("WhatsApp template updated successfully");
      } else {
        await createWhatsAppTemplate(payload);
        toast.success("New WhatsApp template created successfully");
      }

      setEditModalOpen(false);
      loadData();
    } catch (err: any) {
      toast.error(err?.message || "Failed to save template");
    } finally {
      setFormSaving(false);
    }
  };

  const handleDeleteTemplate = async () => {
    if (!deleteId) return;
    try {
      await deleteWhatsAppTemplate(deleteId);
      toast.success("Template removed from library");
      setDeleteId(null);
      loadData();
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete template");
    }
  };

  const handleSyncToMeta = async () => {
    setSyncing(true);
    try {
      await seedDefaultWhatsAppTemplates(true);

      const metaRes = await fetchMetaTemplates();
      if (metaRes.success && metaRes.templates) {
        let updatedCount = 0;
        for (const metaTpl of metaRes.templates) {
          const localMatch = templates.find(
            (t) => t.name.toLowerCase() === metaTpl.name.toLowerCase()
          );
          if (localMatch) {
            const newStatus = metaTpl.status?.toLowerCase() || "approved";
            await updateWhatsAppTemplate(localMatch.id, {
              metaStatus: newStatus as any,
            });
            updatedCount++;
          }
        }
        toast.success(`Synced with Meta WABA! Updated ${updatedCount} template statuses.`);
      } else {
        if (metaRes.error?.includes("VITE_META_WABA_ID")) {
          toast.info("Service templates verified locally. Configure VITE_META_WABA_ID in .env for live Meta status sync.");
        } else {
          toast.info("Service call templates verified.");
        }
      }
      await loadData();
    } catch (err: any) {
      toast.error(err?.message || "Failed to sync templates with Meta");
    } finally {
      setSyncing(false);
    }
  };

  const insertVariableIntoBody = (varNum: number) => {
    const token = `{{${varNum}}}`;
    setFormBodyText((prev) => `${prev} ${token}`);
    if (!formVariables.some((v) => v.index === varNum)) {
      setFormVariables((prev) => [
        ...prev,
        { index: varNum, label: `Variable {{${varNum}}}`, fallbackValue: `Val-${varNum}` },
      ]);
    }
  };

  // Render Template Body from Firestore
  const renderTemplateBody = (body: string, vars: WhatsAppTemplateVariable[]) => {
    let text = body;
    vars.forEach((v) => {
      const label = v.label || v.erpKey || `Variable ${v.index}`;
      const regex = new RegExp(`\\{\\{${v.index}\\}\\}`, "g");
      text = text.replace(regex, `[${label}]`);
    });
    return text;
  };

  const filtered = templates
    .filter((t) => {
      if (activeTab !== "all" && t.targetModule !== activeTab) return false;
      const q = search.toLowerCase().trim();
      if (!q) return true;
      return (
        t.displayName.toLowerCase().includes(q) ||
        t.name.toLowerCase().includes(q) ||
        t.bodyText.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => a.displayName.localeCompare(b.displayName));

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-7xl mx-auto text-xs">
      {/* 1. Top Integrated Hero Header */}
      <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-4 md:p-5 text-white shadow-md">
        <div className="absolute right-0 top-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-emerald-500/20 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-xl md:text-2xl font-extrabold font-display tracking-tight text-white leading-tight">
              Service Calls WhatsApp Templates
            </h1>
            <p className="text-xs text-slate-300 max-w-2xl">
              Pre-approved Meta templates for Customer Service Call Job Cards, OEM Service Center Inquiries & Courier Dispatches
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0">
            <Button
              onClick={handleSyncToMeta}
              disabled={syncing}
              variant="outline"
              size="sm"
              className="gap-1.5 font-bold h-9 text-xs rounded-xl bg-white/10 hover:bg-white/20 border-white/20 text-white cursor-pointer shadow-xs"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : "text-emerald-400"}`} />
              <span>{syncing ? "Syncing..." : "Sync with Meta"}</span>
            </Button>

            <Button
              onClick={openCreateModal}
              size="sm"
              className="gap-1.5 font-bold bg-[#2563EB] hover:bg-blue-600 text-white shrink-0 rounded-xl h-9 text-xs shadow-glow-sm cursor-pointer"
            >
              <Plus className="h-4 w-4" /> Create Template
            </Button>
          </div>
        </div>
      </div>

      {/* 2. Module Filter Tabs & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="overflow-x-auto no-scrollbar max-w-full pb-0.5">
          <div className="inline-flex items-center gap-1 p-1 bg-slate-200/60 dark:bg-slate-800/60 rounded-xl border border-slate-200/70 dark:border-slate-800 shrink-0">
            {MODULE_TABS.map((tab) => {
              const Icon = tab.icon;
              const count =
                tab.key === "all"
                  ? templates.length
                  : templates.filter((t) => t.targetModule === tab.key).length;

              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    activeTab === tab.key
                      ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                      : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{tab.label}</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Search */}
        <div className="relative min-w-[220px] w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <Input
            placeholder="Search service templates…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-xs rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-2xs w-full"
          />
        </div>
      </div>

      {/* 3. Templates Grid */}
      {loading ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border p-6">
          <LoadingScreen fullScreen={false} title="WhatsApp Templates" subtitle="Loading template registry..." />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title="No Service Templates Found"
          description={
            templates.length === 0
              ? "No WhatsApp templates exist yet. Click the sync button to populate all standard master templates."
              : "No templates match your search query."
          }
          actionLabel={templates.length === 0 ? "Sync Service Call Templates" : undefined}
          actionIcon={templates.length === 0 ? RefreshCw : undefined}
          onAction={templates.length === 0 ? handleSyncToMeta : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
          {filtered.map((tpl) => (
            <div
              key={tpl.id}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-4 shadow-xs flex flex-col justify-between space-y-3.5 hover:border-emerald-300 dark:hover:border-emerald-700 transition-all group"
            >
              <div className="space-y-2.5">
                {/* Top Badges & Meta ID */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-extrabold text-slate-900 dark:text-white text-xs leading-snug group-hover:text-emerald-600 transition-colors">
                      {tpl.displayName}
                    </h3>
                    <p className="font-mono text-[10px] text-slate-400 mt-0.5">
                      ID: <code className="text-slate-600 dark:text-slate-300 font-bold">{tpl.name}</code>
                    </p>
                  </div>

                  <Badge variant="outline" className="text-[9px] uppercase font-bold shrink-0 bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800">
                    {tpl.targetModule.replace(/_/g, " ")}
                  </Badge>
                </div>

                {/* Template Message Preview Area */}
                <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-200/70 dark:border-slate-800 text-slate-800 dark:text-slate-200 text-xs shadow-inner space-y-2">
                  <p className="font-mono whitespace-pre-wrap leading-relaxed text-[11px]">
                    {renderTemplateBody(tpl.bodyText, tpl.variables || [])}
                  </p>
                </div>

                {/* Variables Pills */}
                {tpl.variables && tpl.variables.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {tpl.variables.map((v) => (
                      <span
                        key={v.index}
                        className="inline-flex items-center gap-1 font-mono text-[9px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700"
                      >
                        <code className="text-emerald-600 dark:text-emerald-400 font-bold">{`{{${v.index}}}`}</code>
                        <span>{v.label}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setTestTemplate(tpl);
                    setTestPhone("+91 ");
                    setTestModalOpen(true);
                  }}
                  className="text-xs h-8 gap-1.5 rounded-xl border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold cursor-pointer"
                >
                  <Send className="h-3 w-3 text-emerald-600" />
                  <span>Test API</span>
                </Button>

                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => openEditModal(tpl)}
                    className="h-8 w-8 p-0 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                    title="Edit Template"
                  >
                    <Pencil className="h-3.5 w-3.5 text-slate-500" />
                  </Button>

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setDeleteId(tpl.id)}
                    className="h-8 w-8 p-0 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/50 text-slate-500 hover:text-red-600 cursor-pointer"
                    title="Delete Template"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 4. Edit / Create Dialog */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="max-w-2xl max-h-[92vh] flex flex-col p-0 overflow-hidden rounded-2xl border-slate-200 dark:border-slate-800">
          <DialogHeader className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 shrink-0">
            <DialogTitle className="text-sm font-bold flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-emerald-600" />
              <span>{editingTemplate ? "Edit WhatsApp Template" : "Create Service Call Template"}</span>
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveTemplate} className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[11px] font-semibold">Display Title *</Label>
                <Input
                  placeholder="e.g. Job Card Completed Notice"
                  value={formDisplayName}
                  onChange={(e) => setFormDisplayName(e.target.value)}
                  className="h-8 text-xs rounded-xl"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] font-semibold">Meta Template ID * (lowercase_slug)</Label>
                <Input
                  placeholder="e.g. zorba_service_completed"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="h-8 text-xs font-mono rounded-xl"
                  disabled={Boolean(editingTemplate)}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[11px] font-semibold">Target Module</Label>
                <Select value={formTargetModule} onValueChange={(v: any) => setFormTargetModule(v)}>
                  <SelectTrigger className="h-8 text-xs rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="service_calls">Customer Service Calls</SelectItem>
                    <SelectItem value="service_centers">OEM Service Centers</SelectItem>
                    <SelectItem value="couriers">Courier Logistics</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] font-semibold">Meta Category</Label>
                <Select value={formCategory} onValueChange={(v: any) => setFormCategory(v)}>
                  <SelectTrigger className="h-8 text-xs rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="utility">Utility (Transactional Updates)</SelectItem>
                    <SelectItem value="service">Service / Support</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Variable Inserter Toolbar */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label className="text-[11px] font-semibold">Message Body Text *</Label>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-slate-400">Insert Variable:</span>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => insertVariableIntoBody(num)}
                      className="px-1.5 py-0.5 rounded bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900 text-emerald-700 dark:text-emerald-300 font-mono text-[10px] font-bold cursor-pointer border border-emerald-200 dark:border-emerald-800 transition-colors"
                    >
                      {`{{${num}}}`}
                    </button>
                  ))}
                </div>
              </div>

              <Textarea
                placeholder="Enter WhatsApp template message with {{1}}, {{2}} placeholders..."
                value={formBodyText}
                onChange={(e) => setFormBodyText(e.target.value)}
                rows={10}
                className="font-mono text-xs rounded-xl p-3 leading-relaxed"
                required
              />
            </div>
          </form>

          <DialogFooter className="px-5 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 shrink-0 flex items-center justify-between sm:justify-between">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setEditModalOpen(false)}
              className="text-xs rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSaveTemplate}
              disabled={formSaving}
              size="sm"
              className="text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer px-4"
            >
              {formSaving ? "Saving..." : editingTemplate ? "Update Template" : "Save Template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 5. Delete Confirmation Dialog */}
      <ConfirmDeleteDialog
        open={Boolean(deleteId)}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Delete WhatsApp Template?"
        description="Are you sure you want to remove this template from your registry?"
        confirmLabel="Delete Template"
        onConfirm={handleDeleteTemplate}
      />

      {/* 6. Test WhatsApp API Dialog */}
      <Dialog open={testModalOpen} onOpenChange={setTestModalOpen}>
        <DialogContent className="max-w-md rounded-2xl border-slate-200 dark:border-slate-800 p-5 text-xs">
          <DialogHeader className="p-0 mb-3">
            <DialogTitle className="text-sm font-bold flex items-center gap-2">
              <Send className="h-4 w-4 text-emerald-600" />
              <span>Test Template: {testTemplate?.displayName}</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-[11px] font-semibold">Test Mobile Number</Label>
              <Input
                placeholder="+91 98765 43210"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                className="h-8 text-xs font-mono rounded-xl"
              />
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border text-slate-700 dark:text-slate-300 font-mono text-[10px] max-h-48 overflow-y-auto leading-relaxed">
              {testTemplate?.bodyText}
            </div>
          </div>

          <DialogFooter className="p-0 mt-4 flex items-center justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setTestModalOpen(false)} className="text-xs rounded-xl">
              Close
            </Button>
            <Button
              size="sm"
              disabled={testSending}
              onClick={async () => {
                if (!isWhatsAppApiConfigured()) {
                  toast.error("VITE_META_WHATSAPP_TOKEN is not set in .env");
                  return;
                }
                setTestSending(true);
                try {
                  const res = await sendWhatsAppMessage({
                    to: testPhone,
                    message: testTemplate?.bodyText || "",
                  });
                  if (res.success) {
                    toast.success("Test message dispatched successfully via Meta API!");
                    setTestModalOpen(false);
                  } else {
                    toast.error(`Send error: ${res.error}`);
                  }
                } catch (err: any) {
                  toast.error(err.message);
                } finally {
                  setTestSending(false);
                }
              }}
              className="text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
            >
              {testSending ? "Sending..." : "Send Test WhatsApp"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
