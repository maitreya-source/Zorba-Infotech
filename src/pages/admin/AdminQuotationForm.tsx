import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import {
  FileText,
  Save,
  Plus,
  Trash2,
  Printer,
  MessageSquare,
  Mail,
  LayoutTemplate,
  UserPlus,
  PackagePlus,
  ArrowLeft,
  Calendar,
  Sparkles,
  ShieldAlert,
  Search,
  Check,
  Phone,
  MapPin,
  Tag,
  Edit2,
  RefreshCw,
  Package,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  getQuotation,
  createQuotation,
  updateQuotation,
  peekNextQuotationNumber,
  getCategories,
  getCustomer,
} from "@/lib/firestore";
import { toTitleCase, formatModelNumber } from "@/lib/utils";
import type {
  Quotation,
  QuotationItem,
  QuotationTemplate,
  Customer,
  Category,
  Product,
} from "@/lib/types";
import { useTallyShortcuts } from "@/hooks/useTallyShortcuts";
import CustomerTypeahead from "@/components/admin/CustomerTypeahead";
import ProductTypeahead from "@/components/admin/ProductTypeahead";
import CreateCustomerModal from "@/components/admin/CreateCustomerModal";
import EditCustomerModal from "@/components/admin/EditCustomerModal";
import CreateProductModal from "@/components/admin/CreateProductModal";
import EditProductModal from "@/components/admin/EditProductModal";
import QuotationTemplateModal from "@/components/admin/QuotationTemplateModal";
import QuotationPrintModal from "@/components/admin/QuotationPrintModal";
import QuotationWhatsAppModal from "@/components/admin/QuotationWhatsAppModal";
import QuotationEmailModal from "@/components/admin/QuotationEmailModal";
import LoadingScreen from "@/components/common/LoadingScreen";
import { useStaffProfile } from "@/contexts/StaffProfileContext";
import { formatIndianPhoneNumber } from "@/lib/utils";

const DEFAULT_TERMS = `1. All prices mentioned above are estimated approximate prices based on current market rates and are subject to change at the time of actual purchase/order confirmation based on product availability.
2. This is not an invoice. This is only a quotation and should not be treated as a tax invoice.
3. Final tax invoice and warranty terms will be provided upon confirmation and fulfillment of order.`;

export default function AdminQuotationForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { activeProfile } = useStaffProfile();
  const isEditing = Boolean(id);

  // Core Form State
  const [quotationNo, setQuotationNo] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);

  // Customer State (Non-editable once picked, with search by typing)
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [selectedCustomerObj, setSelectedCustomerObj] = useState<Customer | null>(null);

  // Template State
  const [templateId, setTemplateId] = useState<string | undefined>();
  const [templateName, setTemplateName] = useState<string | undefined>();

  // Line Items State
  const [items, setItems] = useState<QuotationItem[]>([
    {
      id: `item-${Date.now()}`,
      productName: "",
      category: "",
      modelNumber: "",
      description: "",
      quantity: 1,
      estimatedPrice: 0,
      totalPrice: 0,
    },
  ]);

  const [discountInput, setDiscountInput] = useState("0");
  const [notes, setNotes] = useState("");
  const [termsAndConditions, setTermsAndConditions] = useState(DEFAULT_TERMS);

  // Auxiliary data
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Active item index for editing product in catalog
  const [editProductCatalogId, setEditProductCatalogId] = useState<string | undefined>();

  // Modals State
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showEditCustomerModal, setShowEditCustomerModal] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [showEditProductModal, setShowEditProductModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showEscPrompt, setShowEscPrompt] = useState(false);

  // Change tracking snapshot
  const initialSnapshotRef = useRef<string>("");

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        const cats = await getCategories();
        setCategories(cats);

        if (id) {
          const q = await getQuotation(id);
          if (q) {
            setQuotationNo(q.quotationNo);
            setDate(q.date || new Date().toISOString().split("T")[0]);
            setSelectedCustomerId(q.customerId || "");
            setCustomerName(q.customerName || "");
            setCustomerPhone(q.customerPhone || "");
            setCustomerEmail(q.customerEmail || "");
            setCustomerAddress(q.customerAddress || "");
            setTemplateId(q.templateId);
            setTemplateName(q.templateName);
            setItems(q.items && q.items.length > 0 ? q.items : [
              {
                id: `item-${Date.now()}`,
                productName: "",
                category: "",
                modelNumber: "",
                description: "",
                quantity: 1,
                estimatedPrice: 0,
                totalPrice: 0,
              }
            ]);
            setDiscountInput(String(q.discount || 0));
            setNotes(q.notes || "");
            setTermsAndConditions(q.termsAndConditions || DEFAULT_TERMS);

            if (q.customerId) {
              const custObj = await getCustomer(q.customerId);
              if (custObj) setSelectedCustomerObj(custObj);
            }

            initialSnapshotRef.current = JSON.stringify({
              customerId: q.customerId,
              customerName: q.customerName,
              items: q.items,
              discount: q.discount,
              terms: q.termsAndConditions,
            });
          }
        } else {
          const nextNo = await peekNextQuotationNumber(date);
          setQuotationNo(nextNo);
          initialSnapshotRef.current = JSON.stringify({
            customerId: "",
            customerName: "",
            items,
            discount: 0,
            terms: DEFAULT_TERMS,
          });
        }
      } catch (err: any) {
        console.error("Error loading quotation form data:", err);
        toast.error("Failed to load quotation details");
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [id]);

  // Calculations
  const subtotal = items.reduce((sum, it) => {
    const q = Number(it.quantity) || 0;
    const p = Number(it.estimatedPrice) || 0;
    return sum + (it.totalPrice !== undefined ? it.totalPrice : q * p);
  }, 0);

  const discountNum = Math.max(0, Number(discountInput) || 0);
  const grandTotal = Math.max(0, subtotal - discountNum);

  const hasUnsavedChanges = () => {
    const current = JSON.stringify({
      customerId: selectedCustomerId,
      customerName,
      items,
      discount: discountNum,
      terms: termsAndConditions,
    });
    return current !== initialSnapshotRef.current;
  };

  // Keyboard Shortcuts Hook
  useTallyShortcuts({
    onCtrlA: () => handleSubmit(),
    onEsc: () => {
      const isAnyModalOpen =
        showCustomerModal ||
        showEditCustomerModal ||
        showProductModal ||
        showEditProductModal ||
        showTemplateModal ||
        showPrintModal ||
        showWhatsAppModal ||
        showEmailModal;

      if (isAnyModalOpen) {
        setShowCustomerModal(false);
        setShowEditCustomerModal(false);
        setShowProductModal(false);
        setShowEditProductModal(false);
        setShowTemplateModal(false);
        setShowPrintModal(false);
        setShowWhatsAppModal(false);
        setShowEmailModal(false);
        setShowEscPrompt(false);
        return;
      }

      if (showEscPrompt) {
        setShowEscPrompt(false);
        navigate("/admin/quotations");
        return;
      }

      if (hasUnsavedChanges()) {
        setShowEscPrompt(true);
        return;
      }

      navigate("/admin/quotations");
    },
    onC: showEscPrompt ? () => setShowEscPrompt(false) : undefined,
    onAltA: () => handleAddItemRow(),
    onAltP: () => handleOpenPrintModal(),
    onAltW: () => handleOpenWhatsAppModal(),
    onAltC: (context) => {
      if (context?.isProductSection) {
        setShowProductModal(true);
      } else {
        setShowCustomerModal(true);
      }
    },
  });

  const handleOpenPrintModal = () => {
    if (!isEditing) {
      if (!(customerName || "").trim() || !(customerPhone || "").trim()) {
        toast.error("Please select a customer and save the quotation before printing.");
        return;
      }
      toast.info("Please save the quotation before printing.");
      return;
    }
    setShowPrintModal(true);
  };

  const handleOpenWhatsAppModal = () => {
    if (!(customerPhone || "").trim()) {
      toast.error("Customer phone number is required to send quotation via WhatsApp.");
      return;
    }
    if (!isEditing) {
      toast.info("Please save the quotation first before sending via WhatsApp.");
      return;
    }
    setShowWhatsAppModal(true);
  };

  // Customer Select Handler
  const handleSelectCustomer = (cust: Customer) => {
    setSelectedCustomerId(cust.id);
    setSelectedCustomerObj(cust);
    setCustomerName(cust.name);
    setCustomerPhone(cust.phone || "");
    setCustomerEmail(cust.email || "");
    setCustomerAddress(cust.address || "");
    toast.info(`Selected customer: ${cust.name}`);
  };

  const handleClearCustomer = () => {
    setSelectedCustomerId("");
    setSelectedCustomerObj(null);
    setCustomerName("");
    setCustomerPhone("");
    setCustomerEmail("");
    setCustomerAddress("");
  };

  const handleCustomerCreated = (newCust: Customer) => {
    handleSelectCustomer(newCust);
    toast.success(`Created & selected customer: ${newCust.name}`);
  };

  const handleCustomerUpdated = (updatedCust: Customer) => {
    setSelectedCustomerObj(updatedCust);
    setCustomerName(updatedCust.name);
    setCustomerPhone(updatedCust.phone || "");
    setCustomerEmail(updatedCust.email || "");
    setCustomerAddress(updatedCust.address || "");
    toast.success("Customer details updated!");
  };

  // Line Item Handlers
  const handleAddItemRow = () => {
    setItems((prev) => [
      ...prev,
      {
        id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        productName: "",
        category: "",
        modelNumber: "",
        description: "",
        quantity: 1,
        estimatedPrice: 0,
        totalPrice: 0,
      },
    ]);
  };

  const handleSelectProductForRow = (index: number, prod: Product) => {
    const matchedCat = categories.find((c) => c.id === prod.categoryId);
    const catName = matchedCat ? matchedCat.name : prod.categoryId || "General";
    const price = prod.price || 0;

    setItems((prev) => {
      const copy = [...prev];
      const q = Number(copy[index].quantity) || 1;
      copy[index] = {
        ...copy[index],
        productId: prod.id,
        productName: prod.name,
        category: catName,
        modelNumber: prod.model || "",
        description: prod.description || "",
        estimatedPrice: price,
        totalPrice: q * price,
      };
      return copy;
    });
  };

  const handleUpdateItem = (index: number, field: keyof QuotationItem, value: any) => {
    setItems((prev) => {
      const copy = [...prev];
      const row = { ...copy[index], [field]: value };
      if (field === "quantity" || field === "estimatedPrice") {
        const q = Number(row.quantity) || 0;
        const p = Number(row.estimatedPrice) || 0;
        row.totalPrice = q * p;
      }
      copy[index] = row;
      return copy;
    });
  };

  const handleRemoveItem = (index: number) => {
    if (items.length === 1) {
      toast.error("Quotation must have at least one product row");
      return;
    }
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleProductCreated = (newProd: Product) => {
    const matchedCat = categories.find((c) => c.id === newProd.categoryId);
    const catName = matchedCat ? matchedCat.name : newProd.categoryId || "General";
    const price = newProd.price || 0;

    setItems((prev) => [
      ...prev,
      {
        id: `item-${Date.now()}`,
        productId: newProd.id,
        productName: newProd.name,
        category: catName,
        modelNumber: newProd.model || "",
        description: newProd.description || "",
        quantity: 1,
        estimatedPrice: price,
        totalPrice: price,
      },
    ]);
    toast.success(`Created & added "${newProd.name}" to quotation!`);
  };

  const handleProductUpdatedInCatalog = (updatedProd: Product) => {
    // Update any rows referencing this product
    setItems((prev) =>
      prev.map((it) => {
        if (it.productId === updatedProd.id) {
          const matchedCat = categories.find((c) => c.id === updatedProd.categoryId);
          const catName = matchedCat ? matchedCat.name : updatedProd.categoryId || it.category;
          const q = Number(it.quantity) || 1;
          const p = updatedProd.price !== null && updatedProd.price !== undefined ? updatedProd.price : it.estimatedPrice;
          return {
            ...it,
            productName: updatedProd.name,
            modelNumber: updatedProd.model || "",
            category: catName,
            estimatedPrice: p,
            totalPrice: q * p,
          };
        }
        return it;
      })
    );
  };

  // Apply Template
  const handleApplyTemplate = (tpl: QuotationTemplate) => {
    setTemplateId(tpl.id);
    setTemplateName(tpl.name);
    if (tpl.items && tpl.items.length > 0) {
      setItems(
        tpl.items.map((it) => ({
          ...it,
          id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
          totalPrice: (Number(it.quantity) || 1) * (Number(it.estimatedPrice) || 0),
        }))
      );
      toast.success(`Loaded ${tpl.items.length} items from template "${tpl.name}"`);
    }
  };

  // Save / Submit Quotation
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cName = (customerName || "").trim();
    const cPhone = (customerPhone || "").trim();
    if (!cName || !cPhone) {
      toast.error("Please search and select a Customer with Name and Phone number");
      return;
    }

    const cleanItems = (items || [])
      .filter((it) => (it?.productName || "").trim())
      .map((it) => {
        const q = Math.max(1, Number(it.quantity) || 1);
        const p = Number(it.estimatedPrice) || 0;
        return {
          id: it.id || `item-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
          productId: it.productId,
          productName: toTitleCase(it.productName || ""),
          category: it.category ? toTitleCase(it.category) : "General",
          modelNumber: it.modelNumber ? formatModelNumber(it.modelNumber) : undefined,
          description: typeof it.description === "string" && it.description.trim() ? it.description.trim() : undefined,
          quantity: q,
          estimatedPrice: p,
          totalPrice: q * p,
        };
      });

    if (cleanItems.length === 0) {
      toast.error("Please add at least 1 product item from catalog");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        date,
        customerId: selectedCustomerId || `cust-${Date.now()}`,
        customerName: toTitleCase(customerName || ""),
        customerPhone: (customerPhone || "").trim(),
        customerEmail: (customerEmail || "").trim().toLowerCase() || undefined,
        customerAddress: (customerAddress || "").trim() ? toTitleCase(customerAddress) : undefined,
        templateId: templateId || undefined,
        templateName: (templateName || "").trim() ? toTitleCase(templateName) : undefined,
        items: cleanItems,
        subtotal,
        discount: discountNum > 0 ? discountNum : undefined,
        grandTotal,
        termsAndConditions: (termsAndConditions || "").trim() || DEFAULT_TERMS,
        notes: (notes || "").trim() || undefined,
        createdByStaffId: activeProfile?.id,
        createdByStaffName: activeProfile?.name ? toTitleCase(activeProfile.name) : undefined,
      };

      if (isEditing && id) {
        await updateQuotation(id, payload);
        toast.success("Quotation updated successfully!");
      } else {
        const created = await createQuotation(payload);
        setQuotationNo(created.quotationNo);
        toast.success(`Quotation #${created.quotationNo} created!`);
        navigate(`/admin/quotations/${created.id}/edit`, { replace: true });
      }

      initialSnapshotRef.current = JSON.stringify({
        customerId: selectedCustomerId,
        customerName,
        items: cleanItems,
        discount: discountNum,
        terms: termsAndConditions,
      });
    } catch (err: any) {
      toast.error(err?.message || "Failed to save quotation");
    } finally {
      setSaving(false);
    }
  };

  // Preview Object for modals
  const currentQuotationObject: Quotation = {
    id: id || "NEW",
    quotationNo: quotationNo || "QUOT-DRAFT",
    date,
    customerId: selectedCustomerId,
    customerName,
    customerPhone,
    customerEmail,
    customerAddress,
    templateId,
    templateName,
    items,
    subtotal,
    discount: discountNum,
    grandTotal,
    termsAndConditions,
    notes,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  if (loading) {
    return <LoadingScreen fullScreen={false} title="Quotation Generator" subtitle="Loading customer & pricing configurations..." />;
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto text-slate-900 dark:text-slate-100 text-xs">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/admin/quotations")}
            className="h-8 w-8 rounded-xl text-slate-500 hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-extrabold font-display tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-600" />
                <span>{isEditing ? `Edit Quotation #${quotationNo}` : "Create Price Estimate Quotation"}</span>
              </h1>
              {quotationNo && (
                <Badge className="bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 font-mono font-bold border-blue-200">
                  #{quotationNo}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Generate approximate price estimates for laptops, CCTV, printers & parts. Supports reusable templates & instant export.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowTemplateModal(true)}
            className="h-8 text-xs font-bold rounded-xl border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/50 gap-1.5 cursor-pointer shadow-2xs"
          >
            <LayoutTemplate className="h-3.5 w-3.5" />
            <span>Templates Library</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleOpenPrintModal}
            className="h-8 text-xs font-bold rounded-xl border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 gap-1.5 cursor-pointer shadow-2xs"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Print (Alt+P)</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleOpenWhatsAppModal}
            className="h-8 text-xs font-bold rounded-xl border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 gap-1.5 cursor-pointer shadow-2xs"
          >
            <MessageSquare className="h-3.5 w-3.5" />
            <span>WhatsApp (Alt+W)</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowEmailModal(true)}
            className="h-8 text-xs font-bold rounded-xl border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/50 gap-1.5 cursor-pointer shadow-2xs"
          >
            <Mail className="h-3.5 w-3.5" />
            <span>Email</span>
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={() => handleSubmit()}
            disabled={saving}
            className="h-8 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white gap-1.5 cursor-pointer shadow-xs"
          >
            <Save className="h-3.5 w-3.5" />
            <span>{saving ? "Saving..." : isEditing ? "Update (Ctrl+A)" : "Save Quotation (Ctrl+A)"}</span>
          </Button>
        </div>
      </div>

      {/* Main Quotation Form Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Customer & Line Items */}
        <div className="lg:col-span-2 space-y-6">
          {/* Section 1: Customer Details (Search by typing across 5000+ records) */}
          <div
            data-shortcut-section="customer"
            className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
                  <UserPlus className="h-4 w-4" />
                </div>
                <span className="font-extrabold text-sm text-slate-900 dark:text-white font-display">
                  1. Customer Information
                </span>
              </div>

              <div className="flex items-center gap-2">
                {selectedCustomerId && (
                  <>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowEditCustomerModal(true)}
                      className="h-7 text-xs text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 font-bold"
                    >
                      <Edit2 className="h-3 w-3 mr-1" />
                      <span>Edit Profile</span>
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleClearCustomer}
                      className="h-7 text-xs text-slate-500 hover:text-slate-800"
                    >
                      <RefreshCw className="h-3 w-3 mr-1" />
                      <span>Change Customer</span>
                    </Button>
                  </>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCustomerModal(true)}
                  className="h-7 text-xs font-bold rounded-xl border-blue-200 text-blue-600 hover:bg-blue-50 gap-1 cursor-pointer"
                  title="Create New Customer (Alt + C)"
                >
                  <Plus className="h-3 w-3" />
                  <span>New Customer (Alt+C)</span>
                </Button>
              </div>
            </div>

            {/* Typeahead Search Input */}
            <div>
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 block">
                Search Customer by Name, Mobile, or Company <span className="text-red-500 font-bold">*</span>
              </Label>
              <CustomerTypeahead
                selectedCustomerId={selectedCustomerId}
                value={customerName}
                onChange={setCustomerName}
                onSelectCustomer={handleSelectCustomer}
                onAddNewCustomer={() => setShowCustomerModal(true)}
                placeholder="Type customer name, phone number, or company name..."
              />
            </div>

            {/* Non-Editable Populated Customer Card */}
            {(customerName || customerPhone || selectedCustomerId) && (
              <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 p-4 space-y-2.5 animate-in fade-in duration-150">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {/* Customer Name */}
                  <div>
                    <span className="text-slate-400 font-semibold block text-[10px] uppercase">
                      Customer Name
                    </span>
                    <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                      {customerName || "—"}
                    </span>
                  </div>

                  {/* Phone */}
                  <div>
                    <span className="text-slate-400 font-semibold block text-[10px] uppercase">
                      Phone Number
                    </span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 mt-0.5">
                      <Phone className="h-3.5 w-3.5 text-blue-500" />
                      {customerPhone ? formatIndianPhoneNumber(customerPhone) : <span className="text-slate-400 font-normal italic">Not provided</span>}
                    </span>
                  </div>

                  {/* Email */}
                  <div>
                    <span className="text-slate-400 font-semibold block text-[10px] uppercase">
                      Email Address (Non-Editable)
                    </span>
                    <span className="font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5 mt-0.5">
                      <Mail className="h-3.5 w-3.5 text-blue-500" />
                      {customerEmail || <span className="text-slate-400 font-normal italic">Not provided</span>}
                    </span>
                  </div>

                  {/* Address */}
                  <div>
                    <span className="text-slate-400 font-semibold block text-[10px] uppercase">
                      Address
                    </span>
                    <span className="font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5 mt-0.5">
                      <MapPin className="h-3.5 w-3.5 text-blue-500" />
                      {customerAddress || <span className="text-slate-400 font-normal italic">Over Counter / Neemuch</span>}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Section 2: Quotation Line Items Table (Async Search across 4000+ catalog products) */}
          <div
            data-shortcut-section="product"
            className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400">
                  <PackagePlus className="h-4 w-4" />
                </div>
                <div>
                  <span className="font-extrabold text-sm text-slate-900 dark:text-white font-display">
                    2. Quotation Products & Estimated Pricing
                  </span>
                  {templateName && (
                    <span className="ml-2 text-[11px] text-purple-600 dark:text-purple-400 font-bold bg-purple-50 dark:bg-purple-950/50 px-2 py-0.5 rounded-md border border-purple-200">
                      Template: {templateName}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowProductModal(true)}
                  className="h-8 text-xs font-bold rounded-xl border-purple-200 text-purple-700 dark:text-purple-300 hover:bg-purple-50 gap-1 cursor-pointer"
                  title="Quick Create Product in Catalog (Alt + C)"
                >
                  <Plus className="h-3 w-3" />
                  <span>New Product (Alt+C)</span>
                </Button>

                <Button
                  type="button"
                  size="sm"
                  onClick={handleAddItemRow}
                  className="h-8 text-xs font-bold rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:hover:bg-white dark:text-slate-900 gap-1 cursor-pointer"
                  title="Add Line Item (Alt + A)"
                >
                  <Plus className="h-3 w-3" />
                  <span>Add Row (Alt+A)</span>
                </Button>
              </div>
            </div>

            {/* Line Items Table */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xs">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-500">
                    <th className="py-3 px-3 w-10 text-center">#</th>
                    <th className="py-3 px-3">Product Name & Specifications</th>
                    <th className="py-3 px-3 w-20 text-center">Qty</th>
                    <th className="py-3 px-3 w-32 text-right">Est. Price (₹)</th>
                    <th className="py-3 px-3 w-32 text-right">Total (₹)</th>
                    <th className="py-3 px-2 w-10 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                  {items.map((it, idx) => {
                    const hasSelectedProduct = Boolean(it.productId);

                    return (
                      <tr key={it.id || idx} className="hover:bg-slate-50/60 dark:hover:bg-slate-900/40">
                        {/* Index */}
                        <td className="py-3.5 px-3 text-center font-mono text-slate-400 align-top">
                          {idx + 1}
                        </td>

                        {/* Product Name & Specifications Column (Expanded) */}
                        <td className="py-3.5 px-3 relative">
                          {hasSelectedProduct ? (
                            <div className="space-y-1.5">
                              {/* Line 1: Product Name and Catalog Edit Button */}
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-extrabold text-sm text-slate-900 dark:text-white leading-snug">
                                  {it.productName}
                                </span>
                                <div className="flex items-center gap-1 shrink-0">
                                  {it.productId && (
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        setEditProductCatalogId(it.productId);
                                        setShowEditProductModal(true);
                                      }}
                                      className="h-6 px-1.5 text-[10px] font-bold text-purple-600 dark:text-purple-400 hover:bg-purple-50"
                                      title="Edit Product Details in Catalog"
                                    >
                                      <Edit2 className="h-3 w-3 mr-0.5" />
                                      <span>Edit in Catalog</span>
                                    </Button>
                                  )}
                                </div>
                              </div>

                              {/* Line 2: Category first, then Model after Category */}
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge className="bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 text-[10px] font-bold px-2 py-0.5">
                                  {it.category || "General"}
                                </Badge>
                                {it.modelNumber && (
                                  <span className="font-mono text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700 flex items-center gap-1">
                                    <Tag className="h-3 w-3 text-purple-500" />
                                    <span>Model: {it.modelNumber}</span>
                                  </span>
                                )}
                              </div>

                              {/* Line 3: Optional Custom Description / Specs */}
                              <Input
                                placeholder="Additional notes, warranty, or config specs..."
                                value={it.description || ""}
                                onChange={(e) => handleUpdateItem(idx, "description", e.target.value)}
                                className="h-7 text-[11px] rounded-lg mt-1 text-slate-600 dark:text-slate-400"
                              />
                            </div>
                          ) : (
                            <ProductTypeahead
                              value={it.productName}
                              onSelectProduct={(prod) => handleSelectProductForRow(idx, prod)}
                              onAddNewProduct={() => setShowProductModal(true)}
                              placeholder="Type to search 4000+ products by name, model, brand..."
                            />
                          )}
                        </td>

                        {/* Quantity (Editable) */}
                        <td className="py-3.5 px-2 text-center align-top">
                          <Input
                            type="number"
                            min="1"
                            placeholder="1"
                            value={it.quantity === 0 ? "" : it.quantity}
                            onFocus={(e) => e.target.select()}
                            onChange={(e) => {
                              const raw = e.target.value;
                              const clean = raw === "" ? 1 : Math.max(1, Number(raw.replace(/^0+(?=\d)/, '')) || 1);
                              handleUpdateItem(idx, "quantity", clean);
                            }}
                            className="h-8 text-xs font-mono font-bold text-center rounded-xl w-16 mx-auto"
                          />
                        </td>

                        {/* Approx Unit Price (Editable) */}
                        <td className="py-3.5 px-2 text-right align-top">
                          <Input
                            type="number"
                            min="0"
                            placeholder="0"
                            value={it.estimatedPrice === 0 ? "" : it.estimatedPrice}
                            onFocus={(e) => e.target.select()}
                            onChange={(e) => {
                              const raw = e.target.value;
                              const clean = raw === "" ? 0 : Number(raw.replace(/^0+(?=\d)/, ''));
                              handleUpdateItem(idx, "estimatedPrice", clean);
                            }}
                            className="h-8 text-xs font-mono text-right rounded-xl w-28 ml-auto font-bold"
                          />
                        </td>

                        {/* Line Total */}
                        <td className="py-3.5 px-3 text-right font-mono font-extrabold text-slate-900 dark:text-white align-top pt-5">
                          ₹{((Number(it.quantity) || 1) * (Number(it.estimatedPrice) || 0)).toLocaleString("en-IN")}
                        </td>

                        {/* Delete Action */}
                        <td className="py-3.5 px-1 text-center align-top pt-4">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer transition-colors"
                            title="Remove Row"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Quick Template Saving CTA */}
            <div className="flex items-center justify-between pt-2">
              <span className="text-[11px] text-slate-500">
                Tip: Common laptop/CCTV configurations can be saved as reusable templates.
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowTemplateModal(true)}
                className="h-7 text-xs font-bold text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/40 gap-1.5"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>Save this Item List as Template</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Right 1 Col: Metadata, Pricing & Terms */}
        <div className="space-y-6">
          {/* Metadata Card */}
          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4">
            <h2 className="font-extrabold text-sm text-slate-900 dark:text-white font-display border-b border-slate-100 dark:border-slate-800 pb-2">
              Quotation Date
            </h2>

            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Date of Issuance
                </Label>
                <Input
                  type="date"
                  value={date}
                  onChange={async (e) => {
                    const newDate = e.target.value;
                    setDate(newDate);
                    if (!id) {
                      const nextNo = await peekNextQuotationNumber(newDate);
                      setQuotationNo(nextNo);
                    }
                  }}
                  className="h-9 text-xs rounded-xl"
                />
              </div>
            </div>
          </div>

          {/* Pricing & Totals Card */}
          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4">
            <h2 className="font-extrabold text-sm text-slate-900 dark:text-white font-display border-b border-slate-100 dark:border-slate-800 pb-2">
              Estimated Pricing Breakdown
            </h2>

            <div className="space-y-2.5">
              <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                <span>Items Subtotal:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">
                  ₹{subtotal.toLocaleString("en-IN")}
                </span>
              </div>

              <div className="flex justify-between items-center gap-4">
                <span className="text-slate-600 dark:text-slate-400">Special Discount (₹):</span>
                <Input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={discountInput === "0" ? "" : discountInput}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => {
                    const raw = e.target.value;
                    setDiscountInput(raw === "" ? "" : raw.replace(/^0+(?=\d)/, ''));
                  }}
                  className="h-8 text-xs font-mono text-right w-28 rounded-xl"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center">
                <span className="text-sm font-extrabold text-slate-900 dark:text-white">
                  Estimated Grand Total:
                </span>
                <span className="text-xl font-black font-mono text-blue-600 dark:text-blue-400">
                  ₹{grandTotal.toLocaleString("en-IN")}
                </span>
              </div>
            </div>
          </div>

          {/* Mandatory Estimation Terms & Conditions */}
          <div className="p-5 rounded-3xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 shadow-2xs space-y-3">
            <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200 font-extrabold text-xs">
              <ShieldAlert className="h-4 w-4 text-amber-600" />
              <span>Terms & Conditions / Estimate Notice</span>
            </div>
            <Textarea
              rows={5}
              value={termsAndConditions}
              onChange={(e) => setTermsAndConditions(e.target.value)}
              className="text-xs rounded-xl bg-white dark:bg-slate-900 border-amber-200 dark:border-amber-900/60 leading-relaxed font-sans"
            />
            <p className="text-[10px] text-amber-700/80 dark:text-amber-400/80">
              Clearly stated on printed, emailed, and WhatsApp quotation copies for customer transparency.
            </p>
          </div>

          {/* Internal Notes */}
          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-2">
            <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Internal Staff Remarks (Not shown to customer)
            </Label>
            <Textarea
              placeholder="e.g. Customer promised response by Monday"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="text-xs rounded-xl"
            />
          </div>
        </div>
      </div>

      {/* Bottom Actions Bar */}
      <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-900 text-white border border-slate-800 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <span className="text-[11px] text-slate-400">Total Estimated Price:</span>
            <span className="text-lg font-mono font-black text-blue-400">
              ₹{grandTotal.toLocaleString("en-IN")}
            </span>
          </div>
          <span className="text-slate-600 hidden sm:inline">|</span>
          <span className="text-xs text-slate-300 hidden sm:inline">
            {items.length} product item{items.length === 1 ? "" : "s"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => navigate("/admin/quotations")}
            className="h-8 text-xs rounded-xl bg-slate-800 border-slate-700 text-slate-300 hover:text-white"
          >
            Back (Esc)
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => handleSubmit()}
            disabled={saving}
            className="h-8 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-500 text-white gap-1.5 shadow-sm cursor-pointer"
          >
            <Save className="h-3.5 w-3.5" />
            <span>{saving ? "Saving..." : "Save Quotation (Ctrl+A)"}</span>
          </Button>
        </div>
      </div>

      {/* Modals */}
      <CreateCustomerModal
        open={showCustomerModal}
        onOpenChange={setShowCustomerModal}
        onCreated={handleCustomerCreated}
      />

      {selectedCustomerObj && (
        <EditCustomerModal
          customer={selectedCustomerObj}
          open={showEditCustomerModal}
          onOpenChange={setShowEditCustomerModal}
          onUpdated={handleCustomerUpdated}
        />
      )}

      <CreateProductModal
        open={showProductModal}
        onOpenChange={setShowProductModal}
        onCreated={handleProductCreated}
      />

      <EditProductModal
        productId={editProductCatalogId}
        open={showEditProductModal}
        onOpenChange={setShowEditProductModal}
        onUpdated={handleProductUpdatedInCatalog}
      />

      <QuotationTemplateModal
        open={showTemplateModal}
        onOpenChange={setShowTemplateModal}
        currentItems={items}
        onSelectTemplate={handleApplyTemplate}
      />

      <QuotationPrintModal
        open={showPrintModal}
        onOpenChange={setShowPrintModal}
        quotation={currentQuotationObject}
      />

      <QuotationWhatsAppModal
        open={showWhatsAppModal}
        onOpenChange={setShowWhatsAppModal}
        quotation={currentQuotationObject}
      />

      <QuotationEmailModal
        open={showEmailModal}
        onOpenChange={setShowEmailModal}
        quotation={currentQuotationObject}
      />

      {/* Unsaved Changes Esc Confirmation Bar */}
      {showEscPrompt && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-3 duration-150">
          <div className="flex items-center gap-3.5 bg-slate-900/95 text-slate-100 border border-amber-500/60 shadow-2xl shadow-black/60 rounded-2xl px-5 py-3 backdrop-blur-md">
            <div className="flex items-center gap-2.5">
              <span className="flex h-2 w-2 rounded-full bg-amber-400 animate-ping" />
              <span className="text-xs font-semibold tracking-wide text-slate-200">
                Unsaved changes! Press <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-[11px] text-amber-400 font-bold">Esc</kbd> again to exit, or press <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-[11px] text-amber-400 font-bold">C</kbd> to continue
              </span>
            </div>
            <div className="flex items-center gap-2 pl-3 border-l border-slate-800">
              <button
                type="button"
                onClick={() => setShowEscPrompt(false)}
                className="px-3 py-1 text-xs font-bold rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 transition-all cursor-pointer shadow-sm"
              >
                Continue (C)
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowEscPrompt(false);
                  navigate("/admin/quotations");
                }}
                className="px-3 py-1 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-all cursor-pointer"
              >
                Discard & Exit (Esc)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
