import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Upload, X, Plus } from "lucide-react";
import { toast } from "sonner";
import { doc, collection, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  getProduct,
  getCategories,
  createProduct,
  updateProduct,
  uploadProductPhoto,
} from "@/lib/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  const isEdit = !!id;
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const init = async () => {
      const cats = await getCategories();
      setCategories(cats);
      if (isEdit && id) {
        const product = await getProduct(id);
        if (!product) { navigate("/admin/products"); return; }
        setForm({
          name: product.name ?? "",
          brand: product.brand ?? "",
          model: product.model ?? "",
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
      setLoading(false);
    };
    init();
  }, [id, isEdit, navigate]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error("Product name is required"); return; }

    setSaving(true);
    try {
      // Determine final productId
      const productId = isEdit ? id! : doc(collection(db, "products")).id;

      // Handle photo
      let photoUrl: string | null = existingPhotoUrl;
      if (removePhoto) {
        photoUrl = null;
      } else if (photoFile) {
        photoUrl = await uploadProductPhoto(photoFile, productId);
      }

      const payload = {
        name: form.name.trim(),
        brand: form.brand.trim(),
        model: form.model.trim(),
        itemCode: form.itemCode.trim(),
        warranty: form.warranty.trim(),
        serviceCenter: form.serviceCenter.trim(),
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
        toast.success("Product updated");
      } else {
        await setDoc(doc(db, "products", productId), {
          ...payload,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        toast.success("Product created");
      }

      navigate("/admin/products");
    } catch (err) {
      console.error(err);
      toast.error("Failed to save product");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate("/admin/products")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold font-display">
            {isEdit ? "Edit Product" : "Add Product"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isEdit ? "Update product details" : "Fill in the details for a new product"}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Info */}
        <section className="rounded-xl border bg-card p-6 space-y-4">
          <h2 className="font-semibold text-base">Basic Information</h2>
          <div className="space-y-1.5">
            <Label>Name *</Label>
            <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Product name" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Brand</Label>
              <Input value={form.brand} onChange={(e) => set("brand", e.target.value)} placeholder="e.g. D-Link" />
            </div>
            <div className="space-y-1.5">
              <Label>Model</Label>
              <Input value={form.model} onChange={(e) => set("model", e.target.value)} placeholder="e.g. AX18U" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Item Code</Label>
              <Input value={form.itemCode} onChange={(e) => set("itemCode", e.target.value)} placeholder="e.g. JCBXUU" />
            </div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={form.categoryId} onValueChange={(v) => set("categoryId", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </section>

        {/* Pricing & Status */}
        <section className="rounded-xl border bg-card p-6 space-y-4">
          <h2 className="font-semibold text-base">Pricing & Status</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Price (₹)</Label>
              <Input
                type="number"
                value={form.price}
                onChange={(e) => set("price", e.target.value)}
                placeholder="Leave blank = Contact for price"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Display Order</Label>
              <Input
                type="number"
                value={form.order}
                onChange={(e) => set("order", e.target.value)}
                placeholder="Leave blank = auto (newest first)"
              />
            </div>
          </div>
          <div className="flex items-center gap-8 pt-1">
            <div className="flex items-center gap-3">
              <Switch
                id="inStock"
                checked={form.inStock}
                onCheckedChange={(v) => set("inStock", v)}
              />
              <Label htmlFor="inStock">In Stock</Label>
            </div>
            <div className="flex items-center gap-3">
              <Switch
                id="featured"
                checked={form.featured}
                onCheckedChange={(v) => set("featured", v)}
              />
              <Label htmlFor="featured">Featured</Label>
            </div>
          </div>
        </section>

        {/* Details */}
        <section className="rounded-xl border bg-card p-6 space-y-4">
          <h2 className="font-semibold text-base">Product Details</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Warranty</Label>
              <Input value={form.warranty} onChange={(e) => set("warranty", e.target.value)} placeholder="e.g. 1 Year From D-Link Service Center" />
            </div>
            <div className="space-y-1.5">
              <Label>Service Center</Label>
              <Input value={form.serviceCenter} onChange={(e) => set("serviceCenter", e.target.value)} placeholder="e.g. D-Link" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Product URL</Label>
            <Input
              type="url"
              value={form.productUrl}
              onChange={(e) => set("productUrl", e.target.value)}
              placeholder="https://manufacturer.com/product"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Product description…"
              rows={4}
            />
          </div>
        </section>

        {/* Photo */}
        <section className="rounded-xl border bg-card p-6 space-y-4">
          <h2 className="font-semibold text-base">Product Photo</h2>
          {photoPreview && !removePhoto ? (
            <div className="relative w-40">
              <img
                src={photoPreview}
                alt="Preview"
                className="h-40 w-40 rounded-xl object-cover border"
              />
              <button
                type="button"
                onClick={handleRemovePhoto}
                className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex h-40 w-40 flex-col items-center justify-center rounded-xl border-2 border-dashed text-muted-foreground hover:border-primary hover:text-primary transition-colors"
            >
              <Upload className="h-8 w-8 mb-2" />
              <span className="text-xs">Upload photo</span>
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handlePhotoChange}
          />
          {(!photoPreview || removePhoto) && (
            <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
              <Upload className="h-4 w-4 mr-2" /> Choose Image
            </Button>
          )}
        </section>

        {/* Custom Fields */}
        <section className="rounded-xl border bg-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-base">Specifications</h2>
            <Button type="button" variant="outline" size="sm" onClick={addCustomField} className="gap-1.5">
              <Plus className="h-3.5 w-3.5" /> Add Field
            </Button>
          </div>
          {customFields.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No custom fields yet. Add specs like RAM, Storage, Capacity, etc.
            </p>
          ) : (
            <div className="space-y-2">
              {customFields.map((cf, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <Input
                    value={cf.key}
                    onChange={(e) => updateCustomField(i, { key: e.target.value })}
                    placeholder="Field name (e.g. RAM)"
                    className="flex-1"
                  />
                  <Input
                    value={cf.value}
                    onChange={(e) => updateCustomField(i, { value: e.target.value })}
                    placeholder="Value (e.g. 16 GB)"
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeCustomField(i)}
                    className="shrink-0 text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Submit */}
        <div className="flex gap-3">
          <Button type="submit" disabled={saving} size="lg">
            {saving ? "Saving…" : isEdit ? "Save Changes" : "Create Product"}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={() => navigate("/admin/products")}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
