import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  Upload,
  X,
  Trash2,
  Save,
  Package,
  Star,
  Layers,
} from "lucide-react";
import { toast } from "sonner";
import {
  getProduct,
  getCategories,
  createProduct,
  updateProduct,
  uploadProductPhoto,
  createCategory,
} from "@/lib/firestore";
import { toTitleCase, formatModelNumber } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
import type { Category, CustomField } from "@/lib/types";

interface FormState {
  name: string;
  brand: string;
  model: string;
  itemCode: string;
  warranty: string;
  serviceCenter: string;
  productUrl: string;
  price: string;
  description: string;
  categoryId: string;
  inStock: boolean;
  featured: boolean;
  order: string;
}

const EMPTY_FORM: FormState = {
  name: "",
  brand: "",
  model: "",
  itemCode: "",
  warranty: "",
  serviceCenter: "",
  productUrl: "",
  price: "",
  description: "",
  categoryId: "",
  inStock: true,
  featured: false,
  order: "",
};

export default function AdminProductForm() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>("");
  const [existingPhotoUrl, setExistingPhotoUrl] = useState<string | null>(null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryDesc, setNewCategoryDesc] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const handleSubmitRef = useRef<() => void>(() => {});
  const showCategoryModalRef = useRef(showCategoryModal);
  showCategoryModalRef.current = showCategoryModal;

  const loadData = async () => {
    try {
      const cats = await getCategories();
      setCategories(cats);
      if (isEdit && id) {
        const product = await getProduct(id);
        if (!product) {
          toast.error("Product not found");
          navigate("/admin/products");
          return;
        }
        setForm({
          name: product.name ?? "",
          brand: product.brand ?? "",
          model: product.model ?? id,
          itemCode: product.itemCode ?? "",
          warranty: product.warranty ?? "",
          serviceCenter: product.serviceCenter ?? "",
          productUrl: product.productUrl ?? "",
          price: product.price != null ? String(product.price) : "",
          description: product.description ?? "",
          categoryId: product.categoryId ?? "",
          inStock: product.inStock ?? true,
          featured: product.featured ?? false,
          order: product.order != null ? String(product.order) : "",
        });
        setCustomFields(product.customFields ?? []);
        setExistingPhotoUrl(product.photoUrl ?? null);
        if (product.photoUrl) setPhotoPreview(product.photoUrl);
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Error loading product data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id, isEdit]);

  // Global shortcuts (Ctrl+A to save, Esc to back)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "a") {
        e.preventDefault();
        handleSubmitRef.current();
      } else if (e.key === "Escape" && !showCategoryModalRef.current) {
        navigate("/admin/products");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [navigate]);

  const set = (key: keyof FormState, value: string | boolean) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setRemovePhoto(false);
    const reader = new FileReader();
    reader.onload = (ev) => setPhotoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview("");
    setRemovePhoto(true);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const addCustomField = () =>
    setCustomFields((f) => [...f, { key: "", value: "" }]);

  const updateCustomField = (i: number, field: Partial<CustomField>) =>
    setCustomFields((f) => f.map((cf, idx) => (idx === i ? { ...cf, ...field } : cf)));

  const removeCustomField = (i: number) =>
    setCustomFields((f) => f.filter((_, idx) => idx !== i));

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    try {
      await createCategory({
        name: newCategoryName.trim(),
        description: newCategoryDesc.trim(),
        iconName: "Package",
        color: "from-blue-500/10 to-blue-600/5",
        order: categories.length + 1,
      });
      toast.success("Category added");
      const cats = await getCategories();
      setCategories(cats);
      const created = cats.find((c) => c.name.toLowerCase() === newCategoryName.trim().toLowerCase());
      if (created) set("categoryId", created.id);
      setShowCategoryModal(false);
      setNewCategoryName("");
      setNewCategoryDesc("");
    } catch (err: any) {
      toast.error("Failed to create category");
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Product name is required");
      return;
    }
    if (!form.model.trim()) {
      toast.error("Model Number is required and must be unique");
      return;
    }
    if (!form.categoryId) {
      toast.error("Please select a Product Category");
      return;
    }

    setSaving(true);
    try {
      const cleanModel = formatModelNumber(form.model);
      const productId = isEdit ? id! : cleanModel;

      // Handle photo
      let photoUrl: string | null = existingPhotoUrl;
      if (removePhoto) {
        photoUrl = null;
      } else if (photoFile) {
        photoUrl = await uploadProductPhoto(photoFile, productId);
      }

      const payload = {
        name: toTitleCase(form.name),
        brand: form.brand.trim() ? toTitleCase(form.brand) : "",
        model: cleanModel,
        itemCode: form.itemCode.trim().toUpperCase(),
        warranty: form.warranty.trim() ? toTitleCase(form.warranty) : "",
        serviceCenter: form.serviceCenter.trim() ? toTitleCase(form.serviceCenter) : "",
        productUrl: form.productUrl.trim(),
        price: form.price !== "" ? Number(form.price) : null,
        description: form.description.trim(),
        categoryId: form.categoryId,
        inStock: form.inStock,
        featured: form.featured,
        order: form.order !== "" ? Number(form.order) : null,
        photoUrl,
        customFields: customFields.filter((cf) => cf.key.trim()),
      };

      if (isEdit) {
        await updateProduct(productId, payload);
        toast.success("Product updated successfully");
      } else {
        await createProduct(payload);
        toast.success(`Product created with Model No: ${cleanModel}`);
      }

      navigate("/admin/products");
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Failed to save product");
    } finally {
      setSaving(false);
    }
  };
  handleSubmitRef.current = handleSubmit;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mb-2" />
        <p className="text-xs text-muted-foreground">Loading product details...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-[1440px] mx-auto pb-16 text-xs">
      {/* Top Breadcrumb & Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
          <span>Admin</span>
          <span>/</span>
          <Link to="/admin/products" className="hover:text-slate-900 transition-colors">
            Products
          </Link>
          <span>/</span>
          <span className="font-bold text-slate-900 dark:text-white">
            {isEdit ? "Edit Product" : "New Product"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Link to="/admin/products">
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-3 text-xs font-semibold rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-2xs hover:bg-slate-50 text-slate-700 dark:text-slate-300 gap-1.5"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back to Products
            </Button>
          </Link>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Section 0: Header Voucher Metadata (Reduced title size, aligned cells) */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 md:p-5 shadow-xs space-y-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg md:text-xl font-bold font-display tracking-tight text-slate-900 dark:text-white">
                {isEdit ? "Edit Product Entry" : "New Product Entry"}
              </h1>
              <Badge
                variant="outline"
                className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/50 text-[11px] px-2 py-0.5 rounded-full font-semibold"
              >
                Catalog & Stock Voucher
              </Badge>
              {form.model && (
                <Badge
                  variant="outline"
                  className="bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800/50 font-mono text-[11px] px-2 py-0.5 rounded-full font-bold uppercase"
                >
                  {form.model}
                </Badge>
              )}
            </div>

            {/* Quick Keyboard Hint Bar */}
            <div className="hidden lg:flex items-center gap-2 text-[11px] text-slate-400 font-mono">
              <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-300 font-bold">
                Ctrl+A
              </span>{" "}
              Save
              <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-300 font-bold">
                Esc
              </span>{" "}
              Back
            </div>
          </div>

          {/* Aligned 4-Column Metadata Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 pt-2 border-t border-slate-100 dark:border-slate-800">
            {/* Category Select */}
            <div>
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Category <span className="text-red-500">*</span>
                </Label>
                <button
                  type="button"
                  onClick={() => setShowCategoryModal(true)}
                  className="text-[11px] font-semibold text-[#2563EB] hover:underline"
                >
                  + Add
                </button>
              </div>
              <Select value={form.categoryId} onValueChange={(v) => set("categoryId", v)}>
                <SelectTrigger className="mt-1 h-9 text-xs rounded-xl bg-slate-50/50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 font-semibold">
                  <SelectValue placeholder="Select Category" />
                </SelectTrigger>
                <SelectContent className="max-h-56">
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Display Order */}
            <div>
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Display Order
              </Label>
              <Input
                type="number"
                placeholder="1 (Top Priority)"
                value={form.order}
                onChange={(e) => set("order", e.target.value)}
                className="mt-1 h-9 text-xs rounded-xl bg-slate-50/50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 font-mono"
              />
            </div>

            {/* In Stock Toggle */}
            <div>
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Stock Availability
              </Label>
              <div className="mt-1 flex items-center justify-between h-9 px-3 rounded-xl bg-slate-50/50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  {form.inStock ? "🟢 In Stock" : "🔴 Out of Stock"}
                </span>
                <Switch checked={form.inStock} onCheckedChange={(v) => set("inStock", v)} />
              </div>
            </div>

            {/* Featured Product Toggle */}
            <div>
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Catalog Spotlight
              </Label>
              <div className="mt-1 flex items-center justify-between h-9 px-3 rounded-xl bg-slate-50/50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <Star className={`h-3.5 w-3.5 ${form.featured ? "text-amber-500 fill-amber-500" : "text-slate-400"}`} />
                  {form.featured ? "Featured Product" : "Standard"}
                </span>
                <Switch checked={form.featured} onCheckedChange={(v) => set("featured", v)} />
              </div>
            </div>
          </div>
        </div>

        {/* Section 1: Basic Information & Unique Model Document Key */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 md:p-5 shadow-xs space-y-3.5">
          <div className="flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-950 text-[#2563EB] font-extrabold text-[11px]">
              1
            </span>
            <h2 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Product Identity & Model Key
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5">
            {/* Product Name */}
            <div className="md:col-span-6">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Product Name <span className="text-red-500">*</span>
              </Label>
              <Input
                placeholder="e.g. Hikvision 4MP ColorVu Bullet IP Camera"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                required
                className="mt-1 h-9 text-xs rounded-xl bg-slate-50/50 dark:bg-slate-950 border-slate-200 dark:border-slate-800"
              />
            </div>

            {/* Model Number / Unique Key */}
            <div className="md:col-span-6">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span>
                  Model Number <span className="text-red-500">*</span> (no spaces)
                </span>
                <span className="text-[10px] text-slate-400 font-mono font-normal">Indexed Key</span>
              </Label>
              <Input
                placeholder="e.g. DS-2CD2043G2-I"
                value={form.model}
                onChange={(e) => set("model", e.target.value.replace(/\s+/g, "-").toUpperCase())}
                onKeyDown={(e) => {
                  if (e.key === " ") {
                    e.preventDefault();
                    set("model", form.model ? `${form.model}-` : "");
                  }
                }}
                disabled={isEdit}
                required
                className="mt-1 h-9 text-xs rounded-xl bg-slate-50/50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 font-mono uppercase font-bold text-[#2563EB]"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                {isEdit
                  ? "Unique Firestore document ID for this product."
                  : "Unique identifier linking website catalog URL (/catalog/MODEL) & Service Call model auto-fill."}
              </p>
            </div>

            {/* Brand / Manufacturer */}
            <div className="md:col-span-6">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Brand / Manufacturer
              </Label>
              <Input
                placeholder="e.g. Hikvision / HP / Canon / Dell / D-Link"
                value={form.brand}
                onChange={(e) => set("brand", e.target.value)}
                onBlur={() => set("brand", toTitleCase(form.brand))}
                className="mt-1 h-9 text-xs rounded-xl bg-slate-50/50 dark:bg-slate-950 border-slate-200 dark:border-slate-800"
              />
            </div>

            {/* Item Code / SKU */}
            <div className="md:col-span-6">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Item Code / Internal SKU
              </Label>
              <Input
                placeholder="e.g. HK-4MP-COLORVU-BULLET"
                value={form.itemCode}
                onChange={(e) => set("itemCode", e.target.value)}
                className="mt-1 h-9 text-xs rounded-xl bg-slate-50/50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 font-mono"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Pricing, Warranty & Official Support */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 md:p-5 shadow-xs space-y-3.5">
          <div className="flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-950 text-[#2563EB] font-extrabold text-[11px]">
              2
            </span>
            <h2 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Pricing, Warranty & Support
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* Price */}
            <div>
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Selling Price (₹)
              </Label>
              <Input
                type="number"
                placeholder="Leave blank for Call for Price"
                value={form.price}
                onChange={(e) => set("price", e.target.value)}
                className="mt-1 h-9 text-xs rounded-xl bg-slate-50/50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 font-mono font-bold text-emerald-600 dark:text-emerald-400"
              />
            </div>

            {/* Warranty */}
            <div>
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Warranty Period
              </Label>
              <Input
                placeholder="e.g. 2 Years Manufacturer Warranty"
                value={form.warranty}
                onChange={(e) => set("warranty", e.target.value)}
                className="mt-1 h-9 text-xs rounded-xl bg-slate-50/50 dark:bg-slate-950 border-slate-200 dark:border-slate-800"
              />
            </div>

            {/* Service Center Info */}
            <div>
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Service Center Support
              </Label>
              <Input
                placeholder="e.g. Authorized Hikvision Service Center"
                value={form.serviceCenter}
                onChange={(e) => set("serviceCenter", e.target.value)}
                className="mt-1 h-9 text-xs rounded-xl bg-slate-50/50 dark:bg-slate-950 border-slate-200 dark:border-slate-800"
              />
            </div>

            {/* Datasheet / Product URL */}
            <div>
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Official Product Link / Datasheet
              </Label>
              <Input
                placeholder="https://..."
                value={form.productUrl}
                onChange={(e) => set("productUrl", e.target.value)}
                className="mt-1 h-9 text-xs rounded-xl bg-slate-50/50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 font-mono"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Product Description & Key-Value Specifications */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 md:p-5 shadow-xs space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-950 text-[#2563EB] font-extrabold text-[11px]">
                3
              </span>
              <h2 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Product Description & Technical Specifications
              </h2>
            </div>

            <button
              type="button"
              onClick={addCustomField}
              className="text-xs font-semibold text-[#2563EB] hover:underline"
            >
              + Add Specification
            </button>
          </div>

          <div>
            <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Product Overview & Details
            </Label>
            <Textarea
              placeholder="Enter product description, features, and selling points for website visitors..."
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              rows={3}
              className="mt-1 text-xs rounded-xl bg-slate-50/50 dark:bg-slate-950 border-slate-200 dark:border-slate-800"
            />
          </div>

          {/* Key-Value Technical Specifications */}
          <div className="space-y-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
            {customFields.length > 0 && (
              <div className="grid grid-cols-12 gap-3 text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-1">
                <div className="col-span-5">SPECIFICATION NAME</div>
                <div className="col-span-6">SPECIFICATION VALUE</div>
                <div className="col-span-1 text-right">ACTION</div>
              </div>
            )}

            {customFields.map((cf, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-3 items-center">
                <div className="col-span-5">
                  <Input
                    placeholder="e.g. Resolution / Sensor / Range"
                    value={cf.key}
                    onChange={(e) => updateCustomField(idx, { key: e.target.value })}
                    className="h-9 text-xs rounded-xl bg-slate-50/50 dark:bg-slate-950 border-slate-200 dark:border-slate-800"
                  />
                </div>
                <div className="col-span-6">
                  <Input
                    placeholder="e.g. 4 Megapixel / 1/3 CMOS / 30 Meters IR"
                    value={cf.value}
                    onChange={(e) => updateCustomField(idx, { value: e.target.value })}
                    className="h-9 text-xs rounded-xl bg-slate-50/50 dark:bg-slate-950 border-slate-200 dark:border-slate-800"
                  />
                </div>
                <div className="col-span-1 flex justify-end">
                  <button
                    type="button"
                    onClick={() => removeCustomField(idx)}
                    className="text-slate-400 hover:text-red-500 p-1.5 rounded-lg"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}

            {customFields.length === 0 && (
              <div className="text-xs text-slate-400 p-2.5 bg-slate-50/60 dark:bg-slate-950 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center">
                No technical specifications added yet. Click{" "}
                <button
                  type="button"
                  onClick={addCustomField}
                  className="text-[#2563EB] font-bold underline"
                >
                  + Add Specification
                </button>{" "}
                to list hardware specs.
              </div>
            )}
          </div>
        </div>

        {/* Section 4: Product Image & Media */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 md:p-5 shadow-xs space-y-3.5">
          <div className="flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-950 text-[#2563EB] font-extrabold text-[11px]">
              4
            </span>
            <h2 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Product Photography & Catalog Image
            </h2>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4">
            {photoPreview ? (
              <div className="relative h-28 w-28 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-white p-2 shrink-0 group">
                <img
                  src={photoPreview}
                  alt="Preview"
                  className="h-full w-full object-contain"
                />
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  className="absolute top-1 right-1 h-6 w-6 rounded-full bg-destructive text-white flex items-center justify-center shadow-md hover:bg-destructive/90 transition-all"
                  title="Remove Photo"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <div className="h-28 w-28 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center text-slate-400 shrink-0">
                <Package className="h-8 w-8 text-slate-300" />
                <span className="text-[10px] mt-1">No Image</span>
              </div>
            )}

            <div className="flex-1 space-y-1.5 text-xs">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                className="hidden"
                id="product-photo-upload"
              />
              <label
                htmlFor="product-photo-upload"
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-50 cursor-pointer shadow-2xs transition-all"
              >
                <Upload className="h-4 w-4 text-[#2563EB]" />
                {photoPreview ? "Change Photo" : "Upload Product Photo"}
              </label>
              <p className="text-[11px] text-slate-400">
                Recommended: Clean white background PNG or JPG. Max 5MB.
              </p>
            </div>
          </div>
        </div>

        {/* Section 5: Action Footer Bar */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-xs border border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 mt-4">
          <div className="text-xs text-slate-400 hidden sm:block">
            Press{" "}
            <kbd className="font-mono font-bold bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-300">
              Ctrl+A
            </kbd>{" "}
            to Save Product
          </div>

          <div className="flex items-center gap-2.5 ml-auto">
            <Link to="/admin/products">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 px-4 text-xs font-semibold rounded-xl"
              >
                Cancel
              </Button>
            </Link>

            <Button
              type="submit"
              disabled={saving}
              className="h-9 px-5 text-xs font-bold rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white shadow-sm shadow-blue-600/25 gap-1.5"
            >
              <Save className="h-4 w-4" /> {saving ? "Saving..." : isEdit ? "Update Product (Ctrl+A)" : "Save Product (Ctrl+A)"}
            </Button>
          </div>
        </div>
      </form>

      {/* Inline Quick Category Add Modal */}
      <Dialog open={showCategoryModal} onOpenChange={setShowCategoryModal}>
        <DialogContent className="sm:max-w-md p-6">
          <DialogHeader className="border-b pb-3">
            <DialogTitle className="flex items-center gap-2 font-display text-base text-slate-900 dark:text-white">
              <Layers className="h-5 w-5 text-[#2563EB]" /> Add Category
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateCategory} className="space-y-4 pt-2 text-xs">
            <div>
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Category Name <span className="text-red-500">*</span>
              </Label>
              <Input
                placeholder="e.g. Smart Interactive Displays"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                required
                className="mt-1 h-9 text-xs rounded-xl"
              />
            </div>
            <div>
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Description
              </Label>
              <Input
                placeholder="e.g. Touch Panels & Interactive Whiteboards"
                value={newCategoryDesc}
                onChange={(e) => setNewCategoryDesc(e.target.value)}
                className="mt-1 h-9 text-xs rounded-xl"
              />
            </div>
            <DialogFooter className="border-t pt-3 gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowCategoryModal(false)}
                className="h-9 text-xs rounded-xl"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                className="h-9 text-xs rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white font-bold"
              >
                Add Category
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
