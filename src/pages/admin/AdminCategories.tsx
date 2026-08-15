import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Layers, Search, RefreshCw } from "lucide-react";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  seedDefaultCategories,
} from "@/lib/firestore";
import { ICON_NAMES, COLOR_OPTIONS, getIcon } from "@/lib/icons";
import type { Category } from "@/lib/types";

interface CategoryForm {
  name: string;
  description: string;
  iconName: string;
  color: string;
  order: string;
}

const EMPTY_FORM: CategoryForm = {
  name: "",
  description: "",
  iconName: "Package",
  color: "from-blue-500/10 to-blue-600/5",
  order: "",
};

export default function AdminCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm] = useState<CategoryForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      setCategories(await getCategories());
    } catch (err: any) {
      console.error("getCategories error:", err);
      toast.error("Failed to load categories");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openAdd = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (cat: Category) => {
    setEditing(cat);
    setForm({
      name: cat.name,
      description: cat.description || "",
      iconName: cat.iconName || "Package",
      color: cat.color || "from-blue-500/10 to-blue-600/5",
      order: String(cat.order || ""),
    });
    setDialogOpen(true);
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Category name is required");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        iconName: form.iconName,
        color: form.color,
        order: Number(form.order) || 0,
      };
      if (editing) {
        await updateCategory(editing.id, payload);
        toast.success("Category updated");
      } else {
        await createCategory(payload);
        toast.success("Category created");
      }
      setDialogOpen(false);
      load();
    } catch (err: any) {
      toast.error(err?.message || "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteCategory(deleteId);
      toast.success("Category deleted");
      setDeleteId(null);
      load();
    } catch {
      toast.error("Delete failed");
    }
  };

  const handleSeed = async () => {
    setSeeding(true);
    try {
      await seedDefaultCategories(true);
      toast.success("11 Master categories populated successfully");
      load();
    } catch (err: any) {
      toast.error(err?.message || "Failed to populate categories");
    } finally {
      setSeeding(false);
    }
  };

  const filtered = categories.filter((c) => {
    const q = search.toLowerCase().trim();
    return (
      !q ||
      c.name.toLowerCase().includes(q) ||
      (c.description && c.description.toLowerCase().includes(q))
    );
  });

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-6xl mx-auto text-xs">
      {/* Integrated Hero Header */}
      <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-4 text-white shadow-md">
        <div className="absolute right-0 top-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-blue-500/20 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="space-y-1">
            <h1 className="text-xl md:text-2xl font-extrabold font-display tracking-tight text-white leading-tight">
              Master Categories Directory
            </h1>
            <p className="text-xs text-slate-300">
              Unified category structure powering Website Stock Catalog, Product Inventory, and Service Call Intakes
            </p>
          </div>

          <Button
            onClick={openAdd}
            size="sm"
            className="gap-1.5 font-bold bg-[#2563EB] hover:bg-blue-700 text-white rounded-xl h-9 text-xs shadow-sm shrink-0"
          >
            <Plus className="h-4 w-4" /> Add Category
          </Button>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search categories or descriptions…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-xs rounded-xl"
          />
        </div>

        <div className="text-xs text-muted-foreground font-semibold">
          Total Categories: <span className="text-foreground font-extrabold">{filtered.length}</span>
        </div>
      </div>

      {/* Main Categories Cards Grid / Table */}
      {loading ? (
        <div className="flex justify-center py-20 bg-card rounded-2xl border">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border bg-card py-16 text-center p-6 space-y-3">
          <Layers className="h-10 w-10 text-muted-foreground/40" />
          <p className="font-bold text-sm text-foreground">No Categories Found</p>
          <p className="text-xs text-muted-foreground max-w-sm">
            {categories.length === 0
              ? "Click Seed Defaults to populate standard categories, or click Add Category."
              : "Try adjusting your search query."}
          </p>
          {categories.length === 0 && (
            <Button onClick={handleSeed} size="sm" className="gap-1 text-xs">
              <RefreshCw className="h-3.5 w-3.5" /> Seed Default Categories
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filtered.map((cat) => {
            const Icon = getIcon(cat.iconName);
            return (
              <div
                key={cat.id}
                className="rounded-2xl border bg-card p-4 flex justify-between items-start hover:border-blue-300 dark:hover:border-blue-700 transition-all shadow-xs group"
              >
                <div className="flex items-start gap-3 min-w-0 flex-1 pr-2">
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${cat.color || "from-blue-500/10 to-blue-600/5"} border border-slate-200 dark:border-slate-800`}
                  >
                    <Icon className="h-4 w-4 text-[#2563EB]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-xs font-display text-foreground truncate">
                      {cat.name}
                    </h3>
                    <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">
                      {cat.description || "Applicable to products & service calls"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-foreground"
                    onClick={() => openEdit(cat)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => setDeleteId(cat.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Category Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md p-6">
          <DialogHeader className="border-b pb-3">
            <DialogTitle className="flex items-center gap-2 font-display text-base text-slate-900 dark:text-white">
              <Layers className="h-5 w-5 text-[#2563EB]" />
              {editing ? "Edit Master Category" : "Add Master Category"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4 pt-2 text-xs">
            <div>
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Category Name <span className="text-red-500">*</span>
              </Label>
              <Input
                placeholder="e.g. CCTV & Security / Printer / Laptop"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                required
                className="mt-1 h-9 text-xs rounded-xl"
              />
            </div>

            <div>
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Description & Notes
              </Label>
              <Input
                placeholder="e.g. DVR, NVR, Cameras & Surveillance hardware"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                className="mt-1 h-9 text-xs rounded-xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Icon</Label>
                <Select
                  value={form.iconName}
                  onValueChange={(v) => setForm((f) => ({ ...f, iconName: v }))}
                >
                  <SelectTrigger className="mt-1 h-9 text-xs rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-56">
                    {ICON_NAMES.map((name) => {
                      const Icon = getIcon(name);
                      return (
                        <SelectItem key={name} value={name}>
                          <span className="flex items-center gap-2 text-xs">
                            <Icon className="h-3.5 w-3.5" /> {name}
                          </span>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Display Order</Label>
                <Input
                  type="number"
                  placeholder="e.g. 1"
                  value={form.order}
                  onChange={(e) => setForm((f) => ({ ...f, order: e.target.value }))}
                  className="mt-1 h-9 text-xs rounded-xl font-mono"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Color Theme</Label>
              <Select
                value={form.color}
                onValueChange={(v) => setForm((f) => ({ ...f, color: v }))}
              >
                <SelectTrigger className="mt-1 h-9 text-xs rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COLOR_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <span className="flex items-center gap-2 text-xs">
                        <span className={`inline-block h-3 w-3 rounded-full bg-gradient-to-br ${opt.value}`} />
                        {opt.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="border-t pt-3 gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setDialogOpen(false)}
                className="h-9 text-xs rounded-xl"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={saving}
                className="h-9 text-xs rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white font-bold"
              >
                {saving ? "Saving…" : editing ? "Save Changes" : "Add Category"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Alert */}
      <AlertDialog open={Boolean(deleteId)} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm">Delete Category?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              Are you sure you want to remove this category? Products and historical service calls using it will retain their text.
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
