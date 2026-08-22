import { useState, useEffect } from "react";
import { Copy, Plus, Trash2, LayoutTemplate, Check, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  getQuotationTemplates,
  createQuotationTemplate,
  deleteQuotationTemplate,
} from "@/lib/firestore";
import type { QuotationItem, QuotationTemplate } from "@/lib/types";

interface QuotationTemplateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentItems?: QuotationItem[];
  onSelectTemplate?: (template: QuotationTemplate) => void;
}

export default function QuotationTemplateModal({
  open,
  onOpenChange,
  currentItems = [],
  onSelectTemplate,
}: QuotationTemplateModalProps) {
  const [templates, setTemplates] = useState<QuotationTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [templateCategory, setTemplateCategory] = useState("Laptops");
  const [templateDescription, setTemplateDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const data = await getQuotationTemplates();
      setTemplates(data);
    } catch (err: any) {
      console.error("Error loading quotation templates:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadTemplates();
      setShowSaveForm(false);
    }
  }, [open]);

  const handleSaveAsTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateName.trim()) {
      toast.error("Template name is required");
      return;
    }
    if (currentItems.length === 0) {
      toast.error("Add at least 1 product item to create a template");
      return;
    }

    setSaving(true);
    try {
      const cleanItems = currentItems.map((it) => ({
        id: it.id || `item-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        productId: it.productId,
        productName: it.productName,
        category: it.category || "General",
        modelNumber: it.modelNumber || "",
        description: it.description || "",
        quantity: Number(it.quantity) || 1,
        estimatedPrice: Number(it.estimatedPrice) || 0,
        totalPrice: (Number(it.quantity) || 1) * (Number(it.estimatedPrice) || 0),
      }));

      const estimatedGrandTotal = cleanItems.reduce((acc, it) => acc + it.totalPrice, 0);

      await createQuotationTemplate({
        name: templateName.trim(),
        category: templateCategory.trim() || undefined,
        description: templateDescription.trim() || undefined,
        items: cleanItems,
        estimatedGrandTotal,
      });

      toast.success(`Template "${templateName.trim()}" saved successfully!`);
      setShowSaveForm(false);
      setTemplateName("");
      setTemplateDescription("");
      loadTemplates();
    } catch (err: any) {
      toast.error(err?.message || "Failed to save quotation template");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (templateId: string, name: string) => {
    if (!confirm(`Are you sure you want to delete template "${name}"?`)) return;
    try {
      await deleteQuotationTemplate(templateId);
      toast.success(`Template "${name}" deleted`);
      loadTemplates();
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete template");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto rounded-3xl p-6 border-slate-200 dark:border-slate-800 text-xs">
        <DialogHeader className="p-0 mb-4 pb-3 border-b border-slate-200 dark:border-slate-800 flex flex-row items-center justify-between">
          <DialogTitle className="text-base font-bold flex items-center gap-2 text-slate-900 dark:text-white">
            <div className="p-2 rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400">
              <LayoutTemplate className="h-4 w-4" />
            </div>
            <span>Quotation Templates Library</span>
          </DialogTitle>
          {currentItems.length > 0 && !showSaveForm && (
            <Button
              size="sm"
              onClick={() => setShowSaveForm(true)}
              className="h-8 text-xs font-bold rounded-xl bg-purple-600 hover:bg-purple-700 text-white gap-1.5 cursor-pointer shadow-xs"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Save Current as Template</span>
            </Button>
          )}
        </DialogHeader>

        {showSaveForm ? (
          <form onSubmit={handleSaveAsTemplate} className="space-y-4 p-4 rounded-2xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900/40">
            <div className="flex items-center justify-between pb-2 border-b border-purple-200 dark:border-purple-900/50">
              <span className="font-bold text-xs text-purple-900 dark:text-purple-200 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-purple-600" />
                <span>Save {currentItems.length} items as Reusable Template</span>
              </span>
              <button
                type="button"
                onClick={() => setShowSaveForm(false)}
                className="text-xs text-purple-700 dark:text-purple-300 hover:underline cursor-pointer"
              >
                Cancel
              </button>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Template Name <span className="text-rose-500">*</span>
              </Label>
              <Input
                placeholder="e.g. Standard Business Laptop Package"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                className="h-9 text-xs rounded-xl bg-white dark:bg-slate-900"
                autoFocus
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Category Tag
                </Label>
                <Input
                  placeholder="e.g. Laptops / CCTV / Desktop"
                  value={templateCategory}
                  onChange={(e) => setTemplateCategory(e.target.value)}
                  className="h-9 text-xs rounded-xl bg-white dark:bg-slate-900"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Description / Note
                </Label>
                <Input
                  placeholder="e.g. For corporate offices"
                  value={templateDescription}
                  onChange={(e) => setTemplateDescription(e.target.value)}
                  className="h-9 text-xs rounded-xl bg-white dark:bg-slate-900"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowSaveForm(false)}
                className="h-8 text-xs rounded-xl"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={saving}
                size="sm"
                className="h-8 text-xs font-bold rounded-xl bg-purple-600 hover:bg-purple-700 text-white"
              >
                {saving ? "Saving Template..." : "Save Template"}
              </Button>
            </div>
          </form>
        ) : null}

        {/* Existing Templates List */}
        <div className="space-y-3 mt-2">
          {loading ? (
            <div className="p-8 text-center text-slate-400">Loading templates library...</div>
          ) : templates.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-400">
              No saved templates yet. Create your first template from any quotation!
            </div>
          ) : (
            <div className="space-y-2.5">
              {templates.map((tpl) => (
                <div
                  key={tpl.id}
                  className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-purple-300 dark:hover:border-purple-800 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-slate-900 dark:text-white">
                        {tpl.name}
                      </span>
                      {tpl.category && (
                        <span className="text-[10px] font-bold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 px-2 py-0.5 rounded-md border border-purple-200 dark:border-purple-800">
                          {tpl.category}
                        </span>
                      )}
                      <span className="text-[11px] text-slate-400 font-mono">
                        ({tpl.items?.length || 0} items)
                      </span>
                    </div>

                    {tpl.description && (
                      <p className="text-[11px] text-slate-500">{tpl.description}</p>
                    )}

                    <div className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">
                      Items:{" "}
                      {tpl.items?.slice(0, 3).map((it) => `${it.productName} (${it.quantity})`).join(", ")}
                      {(tpl.items?.length || 0) > 3 ? "..." : ""}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {onSelectTemplate && (
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => {
                          onSelectTemplate(tpl);
                          onOpenChange(false);
                          toast.success(`Applied template "${tpl.name}"`);
                        }}
                        className="h-8 text-xs font-bold rounded-xl bg-purple-600 hover:bg-purple-700 text-white gap-1"
                      >
                        <Check className="h-3.5 w-3.5" />
                        <span>Apply Template</span>
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(tpl.id, tpl.name)}
                      className="h-8 w-8 text-slate-400 hover:text-rose-600 cursor-pointer"
                      title="Delete Template"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter className="p-0 pt-4 mt-2 border-t border-slate-200 dark:border-slate-800">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="h-9 text-xs rounded-xl"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
