import { useState, useEffect } from "react";
import { toast } from "sonner";
import { PackagePlus, Plus, Layers, Globe, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
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
import { getCategories, createProduct, createCategory } from "@/lib/firestore";
import { toTitleCase, formatModelNumber } from "@/lib/utils";
import type { Category, Product } from "@/lib/types";
import { DEFAULT_WARRANTY } from "@/lib/constants";
import WarrantySelector from "@/components/admin/WarrantySelector";
import BrandTypeahead from "@/components/admin/BrandTypeahead";

interface CreateProductModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (product: Product) => void;
  defaultCategoryId?: string;
  defaultCategoryName?: string;
}

export default function CreateProductModal({
  open,
  onOpenChange,
  onCreated,
  defaultCategoryId,
  defaultCategoryName,
}: CreateProductModalProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [categoryId, setCategoryId] = useState(defaultCategoryId || "");
  const [price, setPrice] = useState("");
  const [showPriceOnWebsite, setShowPriceOnWebsite] = useState(true);
  const [warranty, setWarranty] = useState(DEFAULT_WARRANTY);
  const [description, setDescription] = useState("");
  const [showOnWebsite, setShowOnWebsite] = useState(true);
  const [saving, setSaving] = useState(false);

  // Quick category creation
  const [showCatModal, setShowCatModal] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [savingCat, setSavingCat] = useState(false);

  const loadCategories = async () => {
    try {
      const cats = await getCategories();
      setCategories(cats);
      if (!categoryId && defaultCategoryName) {
        const matched = cats.find(
          (c) => c.name.toLowerCase() === defaultCategoryName.toLowerCase()
        );
        if (matched) setCategoryId(matched.id);
      }
    } catch (err) {
      console.error("Failed to load categories:", err);
    }
  };

  useEffect(() => {
    if (open) {
      loadCategories();
      setName("");
      setBrand("");
      setModel("");
      setPrice("");
      setShowPriceOnWebsite(true);
      setWarranty(DEFAULT_WARRANTY);
      setDescription("");
      setShowOnWebsite(true);
      if (defaultCategoryId) setCategoryId(defaultCategoryId);
    }
  }, [open, defaultCategoryId, defaultCategoryName]);

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    setSavingCat(true);
    try {
      await createCategory({
        name: newCatName.trim(),
        iconName: "Package",
        color: "#2563EB",
        description: "",
        order: categories.length + 1,
      });
      toast.success(`Category "${newCatName.trim()}" created`);
      const cats = await getCategories();
      setCategories(cats);
      const matched = cats.find(
        (c) => c.name.toLowerCase() === newCatName.trim().toLowerCase()
      );
      if (matched) setCategoryId(matched.id);
      setShowCatModal(false);
      setNewCatName("");
    } catch (err: any) {
      toast.error(err?.message || "Failed to create category");
    } finally {
      setSavingCat(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Product name is required");
      return;
    }
    if (!categoryId) {
      toast.error("Please select a category");
      return;
    }

    setSaving(true);
    try {
      const priceNum = price.trim() ? parseFloat(price.replace(/,/g, "")) : null;
      const created = await createProduct({
        name: name.trim(),
        brand: brand.trim(),
        model: model.trim(),
        itemCode: "",
        warranty: warranty.trim(),
        serviceCenter: "",
        productUrl: "",
        price: isNaN(priceNum as number) ? null : priceNum,
        showPriceOnWebsite,
        description: description.trim(),
        photoUrl: null,
        categoryId,
        inStock: true,
        featured: false,
        showOnWebsite,
        order: null,
        customFields: [],
      });

      toast.success(`Product "${created.name}" created successfully`);
      onOpenChange(false);
      if (onCreated) {
        onCreated(created);
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to create product");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg rounded-2xl border-slate-200 dark:border-slate-800 p-5 text-xs">
          <DialogHeader className="p-0 mb-3">
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-slate-900 dark:text-white">
              <div className="p-2 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
                <PackagePlus className="h-4 w-4" />
              </div>
              <span>Quick Create Product</span>
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {/* Category selection */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Category <span className="text-rose-500">*</span>
                </Label>
                <button
                  type="button"
                  onClick={() => setShowCatModal(true)}
                  className="text-[11px] font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="h-3 w-3" /> New Category
                </button>
              </div>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger className="h-9 text-xs rounded-xl">
                  <SelectValue placeholder="Select product category..." />
                </SelectTrigger>
                <SelectContent className="max-h-56">
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id} className="text-xs">
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Product Name */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Product Name <span className="text-rose-500">*</span>
              </Label>
              <Input
                placeholder="e.g. Dell Latitude 5420 i5 11th Gen 16GB/512GB"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={() => setName((prev) => toTitleCase(prev))}
                className="h-9 text-xs rounded-xl"
                autoFocus
                required
              />
            </div>

            {/* Brand & Model */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Brand / OEM</Label>
                <BrandTypeahead
                  value={brand}
                  onChange={setBrand}
                  categoryHint={categories.find((c) => c.id === categoryId)?.name || defaultCategoryName}
                  placeholder="e.g. Dell, HP, Lenovo"
                  showChips={false}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Model / Part No. <span className="text-slate-400 font-normal text-[10px]">(no spaces)</span>
                </Label>
                <Input
                  placeholder="e.g. LATITUDE-5420"
                  value={model}
                  onChange={(e) => setModel(e.target.value.replace(/\s+/g, "-").toUpperCase())}
                  onKeyDown={(e) => {
                    if (e.key === " ") {
                      e.preventDefault();
                      setModel((prev) => (prev ? `${prev}-` : ""));
                    }
                  }}
                  className="h-9 text-xs font-mono uppercase rounded-xl"
                />
              </div>
            </div>

            {/* Estimated Price & Website Price Visibility */}
            <div className="space-y-2">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Approx / Estimated Price (₹)
                </Label>
                <Input
                  type="number"
                  placeholder="e.g. 45000"
                  value={price}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => {
                    const raw = e.target.value;
                    setPrice(raw === "" ? "" : raw.replace(/^0+(?=\d)/, ''));
                  }}
                  className="h-9 text-xs font-mono rounded-xl"
                />
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950">
                <span className="text-[11px] font-medium text-slate-700 dark:text-slate-300">
                  {showPriceOnWebsite ? "🌐 Price visible on website" : "📞 Call for Price on website"}
                </span>
                <Switch checked={showPriceOnWebsite} onCheckedChange={setShowPriceOnWebsite} />
              </div>
            </div>

            {/* Standardized 3-Part Warranty Policy */}
            <WarrantySelector
              value={warranty}
              onChange={(val) => setWarranty(val)}
            />

            {/* Description / Key Specs */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Description / Key Specs
              </Label>
              <Textarea
                placeholder="Key specifications, bundled accessories, or estimated pricing notes..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="text-xs rounded-xl resize-none"
              />
            </div>

            {/* Website Visibility Toggle */}
            <div className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950">
              <div>
                <Label className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
                  Website Listing
                </Label>
                <span className="text-[10px] text-muted-foreground">
                  {showOnWebsite ? "Product is visible in public website catalog" : "Internal ERP & quotations only"}
                </span>
              </div>
              <Switch checked={showOnWebsite} onCheckedChange={setShowOnWebsite} />
            </div>

            <DialogFooter className="p-0 pt-2 gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="h-9 text-xs rounded-xl"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={saving}
                className="h-9 text-xs font-bold rounded-xl bg-[#2563EB] hover:bg-blue-600 text-white"
              >
                {saving ? "Saving Product..." : "Create & Select Product"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Quick Category Modal */}
      <Dialog open={showCatModal} onOpenChange={setShowCatModal}>
        <DialogContent className="sm:max-w-sm rounded-2xl p-4 text-xs">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-2">
              <Layers className="h-4 w-4 text-blue-600" />
              <span>Add New Product Category</span>
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateCategory} className="space-y-3 pt-2">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Category Name</Label>
              <Input
                placeholder="e.g. Laptops, CCTV, Inverters, Printers"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                className="h-9 text-xs rounded-xl"
                autoFocus
                required
              />
            </div>
            <DialogFooter className="p-0 gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowCatModal(false)}
                className="h-8 text-xs rounded-xl"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={savingCat}
                className="h-8 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white"
              >
                {savingCat ? "Saving..." : "Save Category"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
