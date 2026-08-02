import { useEffect, useState, useRef } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  Building2,
  Wrench,
  MapPin,
  Plus,
  Trash2,
  UserPlus,
  FolderPlus,
  Save,
  Check,
  UserCheck,
  Calendar,
  Sparkles,
  ShieldCheck,
  Package,
  Receipt,
  User,
  Pencil,
  Printer,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getCustomers,
  getDeviceCategories,
  getServiceCenters,
  getTechnicians,
  getServiceCall,
  createServiceCall,
  updateServiceCall,
} from "@/lib/firestore";
import type {
  Customer,
  DeviceCategory,
  ServiceCenter,
  Technician,
  ServiceCallStatus,
  ServiceCallType,
  ServicePart,
  WarrantyStatus,
  ServiceCall,
} from "@/lib/types";
import CreateCustomerModal from "@/components/admin/CreateCustomerModal";
import EditCustomerModal from "@/components/admin/EditCustomerModal";
import CreateDeviceCategoryModal from "@/components/admin/CreateDeviceCategoryModal";
import CreateServiceCenterModal from "@/components/admin/CreateServiceCenterModal";
import CreateTechnicianModal from "@/components/admin/CreateTechnicianModal";
import JobCardPrintModal from "@/components/admin/JobCardPrintModal";
import { useTallyShortcuts } from "@/hooks/useTallyShortcuts";

const ISSUE_SUGGESTIONS = [
  "Toner Refill & Drum Cleaning",
  "Antivirus Installation & Setup",
  "Display / Screen Replacement",
  "Windows OS Installation",
  "RAM / SSD Upgrade",
  "CCTV Camera & DVR Config",
  "Power Supply Repair",
];

export default function AdminServiceCallForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = Boolean(id);

  // Form State
  const dateInputRef = useRef<HTMLInputElement>(null);
  const [ticketNo, setTicketNo] = useState<string>("");
  const [type, setType] = useState<ServiceCallType>("in_house_repair");
  const [dateTime, setDateTime] = useState<string>(() => {
    return new Date().toISOString().slice(0, 10);
  });

  const handleOpenDatePicker = () => {
    if (dateInputRef.current) {
      if (typeof dateInputRef.current.showPicker === "function") {
        dateInputRef.current.showPicker();
      } else {
        dateInputRef.current.focus();
      }
    }
  };

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");

  const [categories, setCategories] = useState<DeviceCategory[]>([]);
  const [deviceCategory, setDeviceCategory] = useState("");
  const [modelNumber, setModelNumber] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [quantity, setQuantity] = useState<number | string>(1);
  const [issueDescription, setIssueDescription] = useState("");

  const [warrantyStatus, setWarrantyStatus] = useState<WarrantyStatus>("not_applicable");
  const [status, setStatus] = useState<ServiceCallStatus>("received");

  // Service Centers State
  const [serviceCenters, setServiceCenters] = useState<ServiceCenter[]>([]);
  const [selectedServiceCenterId, setSelectedServiceCenterId] = useState<string>("");
  const [serviceCenterName, setServiceCenterName] = useState("");
  const [selectedAddressId, setSelectedAddressId] = useState<string>("");
  const [serviceCenterAddress, setServiceCenterAddress] = useState("");
  const [rmaNumber, setRmaNumber] = useState("");
  const [courierChargesInput, setCourierChargesInput] = useState<string>("0");

  // Technicians State
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [selectedTechnicianId, setSelectedTechnicianId] = useState<string>("");
  const [technicianName, setTechnicianName] = useState("");

  // Onsite Details & Edit Lock State
  const [onsiteAddress, setOnsiteAddress] = useState("");
  const [isEditingOnsiteAddress, setIsEditingOnsiteAddress] = useState(false);

  // Billing (Using string state to allow erasing '0')
  const [parts, setParts] = useState<ServicePart[]>([]);
  const [serviceChargesInput, setServiceChargesInput] = useState<string>("0");
  const [notes, setNotes] = useState("");

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Modals
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showEditCustomerModal, setShowEditCustomerModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showCenterModal, setShowCenterModal] = useState(false);
  const [showTechModal, setShowTechModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);

  const loadMasterData = async () => {
    try {
      const custs = await getCustomers().catch(() => []);
      const cats = await getDeviceCategories().catch(() => []);
      const centers = await getServiceCenters().catch(() => []);
      const techs = await getTechnicians().catch(() => []);

      setCustomers(custs);
      
      const fallbackCats = cats.length > 0 ? cats : [
        { id: "cat-1", name: "Printer", description: "Printers" },
        { id: "cat-2", name: "Toner / Cartridge", description: "Refill" },
        { id: "cat-3", name: "Laptop", description: "Laptops" },
        { id: "cat-4", name: "Desktop & PC", description: "Desktops" },
        { id: "cat-5", name: "CCTV & Security", description: "Cameras" },
        { id: "cat-6", name: "Router & Networking", description: "Routers" },
        { id: "cat-7", name: "UPS & Inverter", description: "Power" },
        { id: "cat-8", name: "Scanner & Billing", description: "Scanners" },
        { id: "cat-9", name: "Biometric & Attendance", description: "Biometrics" },
        { id: "cat-10", name: "Monitor & Display", description: "Monitors" },
      ];
      setCategories(fallbackCats);

      if (!deviceCategory && fallbackCats.length > 0) {
        setDeviceCategory(fallbackCats[0].name);
      }

      setServiceCenters(centers);
      setTechnicians(techs);
    } catch (err) {
      console.error("Error loading master data:", err);
    }
  };

  useEffect(() => {
    loadMasterData();
  }, []);

  // Fetch Existing Service Call if editing
  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getServiceCall(id).then((sc) => {
      if (!sc) {
        toast.error("Service Call not found");
        navigate("/admin/service-calls");
        return;
      }
      setTicketNo(sc.ticketNo || "");
      setType(sc.type);
      setDateTime(sc.dateTime);
      setSelectedCustomerId(sc.customerId || "");
      setCustomerName(sc.customerName);
      setCustomerPhone(sc.customerPhone);
      setCustomerEmail(sc.customerEmail || "");
      setCustomerAddress(sc.customerAddress || "");

      setDeviceCategory(sc.deviceCategory);
      setModelNumber(sc.modelNumber || "");
      setSerialNumber(sc.serialNumber || "");
      setQuantity(sc.quantity || 1);
      setIssueDescription(sc.issueDescription);

      setWarrantyStatus(sc.warrantyStatus);
      setStatus(sc.status);

      // Service center
      setSelectedServiceCenterId(sc.serviceCenterId || "");
      setServiceCenterName(sc.serviceCenterName || "");
      setSelectedAddressId(sc.serviceCenterAddressId || "");
      setServiceCenterAddress(sc.serviceCenterAddress || "");
      setRmaNumber(sc.rmaNumber || "");
      setCourierChargesInput(String(sc.courierCharges || 0));

      // Technician
      setSelectedTechnicianId(sc.technicianId || "");
      setTechnicianName(sc.technicianName || "");

      setOnsiteAddress(sc.onsiteAddress || "");

      setParts(sc.parts || []);
      setServiceChargesInput(String(sc.serviceCharges || 0));
      setNotes(sc.notes || "");
      setLoading(false);
    });
  }, [id, navigate]);

  // Handle Customer Selection
  const handleSelectCustomer = (custVal: string) => {
    setSelectedCustomerId(custVal);
    const found = customers.find((c) => c.id === custVal);
    if (found) {
      setCustomerName(found.name);
      setCustomerPhone(found.phone);
      setCustomerEmail(found.email || "");
      setCustomerAddress(found.address || "");
      if (found.address) {
        setOnsiteAddress(found.address);
      }
    }
  };

  // Handle Service Center Selection
  const handleSelectServiceCenter = (scId: string) => {
    setSelectedServiceCenterId(scId);
    const found = serviceCenters.find((c) => c.id === scId);
    if (found) {
      setServiceCenterName(found.name);
      const defaultAddr = found.addresses.find((a) => a.isDefault) || found.addresses[0];
      if (defaultAddr) {
        setSelectedAddressId(defaultAddr.id);
        setServiceCenterAddress(defaultAddr.address);
      }
    }
  };

  // Handle Service Center Address Selection
  const handleSelectCenterAddress = (addrId: string) => {
    setSelectedAddressId(addrId);
    const foundSC = serviceCenters.find((c) => c.id === selectedServiceCenterId);
    if (foundSC) {
      const addrObj = foundSC.addresses.find((a) => a.id === addrId);
      if (addrObj) setServiceCenterAddress(addrObj.address);
    }
  };

  // Handle Technician Selection
  const handleSelectTechnician = (techId: string) => {
    setSelectedTechnicianId(techId);
    const found = technicians.find((t) => t.id === techId);
    if (found) setTechnicianName(found.name);
  };

  // Add Part Row
  const handleAddPart = () => {
    const newPart: ServicePart = {
      id: `part-${Date.now()}`,
      name: "",
      quantity: 1,
      unitPrice: 0,
      totalPrice: 0,
    };
    setParts((prev) => [...prev, newPart]);
  };

  // Update Part Row
  const handleUpdatePart = (
    partId: string,
    field: keyof ServicePart,
    value: string | number
  ) => {
    setParts((prev) =>
      prev.map((p) => {
        if (p.id !== partId) return p;
        const updated = { ...p, [field]: value };
        const qty = Number(updated.quantity) || 0;
        const price = Number(updated.unitPrice) || 0;
        updated.totalPrice = qty * price;
        return updated;
      })
    );
  };

  // Remove Part Row
  const handleRemovePart = (partId: string) => {
    setParts((prev) => prev.filter((p) => p.id !== partId));
  };

  // Calculations
  const courierChargesNum = type === "company_service_center" ? (Number(courierChargesInput) || 0) : 0;
  const serviceChargesNum = Number(serviceChargesInput) || 0;
  const partsTotal = parts.reduce((acc, p) => acc + (p.totalPrice || 0), 0);
  const grandTotal = partsTotal + serviceChargesNum + courierChargesNum;

  // Submit Handler
  const handleSubmit = async (
    e?: React.FormEvent,
    options?: { autoPrint?: boolean; navigateBack?: boolean }
  ) => {
    if (e) e.preventDefault();
    if (!customerName.trim() || !customerPhone.trim()) {
      toast.error("Please enter Customer Name and Phone Number");
      return;
    }
    if (!issueDescription.trim()) {
      toast.error("Please describe the Issue / Task");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        type,
        dateTime,
        customerId: selectedCustomerId || `cust-${Date.now()}`,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerEmail: customerEmail.trim() || undefined,
        customerAddress: customerAddress.trim() || undefined,
        deviceCategory,
        modelNumber: modelNumber.trim() || undefined,
        serialNumber: serialNumber.trim() || undefined,
        quantity: Number(quantity) || 1,
        issueDescription: issueDescription.trim(),
        warrantyStatus,
        status,

        // Service center
        serviceCenterId: selectedServiceCenterId || undefined,
        serviceCenterName: serviceCenterName.trim() || undefined,
        serviceCenterAddressId: selectedAddressId || undefined,
        serviceCenterAddress: serviceCenterAddress.trim() || undefined,
        rmaNumber: rmaNumber.trim() || undefined,
        courierCharges: type === "company_service_center" ? courierChargesNum : undefined,

        // Technician
        technicianId: selectedTechnicianId || undefined,
        technicianName: technicianName.trim() || undefined,

        // Onsite
        onsiteAddress: type === "onsite_visit" ? onsiteAddress.trim() : undefined,

        parts,
        partsTotal,
        serviceCharges: serviceChargesNum,
        grandTotal,
        notes: notes.trim() || undefined,
      };

      let currentTicket = ticketNo;
      if (isEditing && id) {
        await updateServiceCall(id, payload);
        toast.success("Service Call ticket updated successfully");
      } else {
        const createdCall = await createServiceCall(payload);
        if (createdCall?.ticketNo) {
          currentTicket = createdCall.ticketNo;
          setTicketNo(createdCall.ticketNo);
        }
        toast.success("Service Call ticket created successfully");
      }

      // Save does NOT mean close - Auto open print modal and stay on page
      if (options?.autoPrint !== false) {
        setShowPrintModal(true);
      }

      if (options?.navigateBack === true) {
        navigate("/admin/service-calls");
      }
    } catch (err: any) {
      console.error("Error saving service call:", err);
      toast.error("Failed to save service call ticket");
    } finally {
      setSaving(false);
    }
  };

  useTallyShortcuts({
    onAltC: () => setShowCustomerModal(true),
    onCtrlA: () => handleSubmit(),
    onEsc: () => navigate("/admin/service-calls"),
  });

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const selectedSC = serviceCenters.find((sc) => sc.id === selectedServiceCenterId);

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-5 text-xs">
      {/* Sleek Dark Executive Hero Header */}
      <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-4 text-white shadow-xl space-y-3">
        <div className="absolute right-0 top-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-primary/20 blur-3xl pointer-events-none" />

        {/* Row 1: Title, Ticket # Badge & Primary Action Buttons */}
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-white/10 pb-3">
          <div className="flex items-center gap-3">
            <Link to="/admin/service-calls">
              <Button variant="secondary" size="sm" className="gap-1.5 h-8.5 text-xs bg-white/10 hover:bg-white/20 text-white border-white/10 backdrop-blur-md">
                <ArrowLeft className="h-4 w-4" /> Back to List
              </Button>
            </Link>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-0.5 text-[10px] font-semibold backdrop-blur-md border border-white/10 text-amber-300">
                  <Sparkles className="h-3 w-3" /> Service Intake Voucher
                </div>
                {ticketNo && (
                  <span className="font-mono text-xs font-extrabold bg-blue-500/20 text-blue-300 border border-blue-400/30 px-2.5 py-0.5 rounded-full">
                    Ticket #{ticketNo}
                  </span>
                )}
              </div>
              <h1 className="text-lg md:text-xl font-extrabold font-display leading-tight text-white mt-0.5">
                {isEditing ? "Edit Service Call Ticket" : "New Service Call Intake"}
              </h1>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleSubmit(undefined, { autoPrint: false, navigateBack: true })}
              disabled={saving}
              className="gap-1.5 font-semibold h-9 text-xs border-slate-700 bg-slate-800/90 hover:bg-slate-700 text-slate-100 shadow-sm"
            >
              <Check className="h-4 w-4 text-emerald-400" />
              Save & Exit
            </Button>

            <Button
              type="button"
              onClick={() => handleSubmit(undefined, { autoPrint: true, navigateBack: false })}
              disabled={saving}
              size="sm"
              className="gap-1.5 font-extrabold h-9 bg-primary hover:bg-primary/90 text-primary-foreground text-xs px-4 shadow-md"
            >
              <Printer className="h-4 w-4 text-amber-300" />
              {saving ? "Saving…" : "Save & Print"}
            </Button>
          </div>
        </div>

        {/* Row 2: Dark Glassmorphism Settings Bar (Date, Status & Technician Selector) */}
        <div className="relative z-10 grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white/5 p-2.5 rounded-xl border border-white/10 backdrop-blur-md">
          <div
            onClick={handleOpenDatePicker}
            className="flex items-center gap-2 cursor-pointer bg-white/10 hover:bg-white/20 px-2.5 py-1 rounded-xl border border-white/10 transition-all select-none"
            title="Click to select intake date"
          >
            <Calendar className="h-4 w-4 text-amber-300 shrink-0" />
            <Label className="text-xs font-semibold shrink-0 text-white cursor-pointer">Date:</Label>
            <input
              ref={dateInputRef}
              type="date"
              value={dateTime ? dateTime.slice(0, 10) : ""}
              onChange={(e) => setDateTime(e.target.value)}
              className="h-7 text-xs border-0 bg-transparent p-0 w-full text-white font-medium focus:outline-none cursor-pointer [color-scheme:dark]"
              required
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold shrink-0 text-white">Status:</span>
            <Select value={status} onValueChange={(val: ServiceCallStatus) => setStatus(val)}>
              <SelectTrigger className="h-8 text-xs bg-white/10 text-white border-white/10 font-medium">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="received">Received / Logged</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="sent_to_service_center">Sent to Service Center</SelectItem>
                <SelectItem value="waiting_for_parts">Waiting for Parts</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <UserCheck className="h-4 w-4 text-blue-400 shrink-0" />
            <Label className="text-xs font-semibold shrink-0 text-white">Tech:</Label>
            <Select value={selectedTechnicianId} onValueChange={handleSelectTechnician}>
              <SelectTrigger className="h-8 text-xs bg-blue-500/20 text-blue-200 border-blue-400/30 font-semibold flex-1">
                <SelectValue placeholder="Assign Tech…" />
              </SelectTrigger>
              <SelectContent>
                {technicians.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    👤 {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Step 1: Service Call Type Selector Row */}
        <div className="rounded-2xl border bg-card p-4 space-y-2.5 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-extrabold text-xs text-foreground">
              <Badge variant="secondary" className="bg-primary/10 text-primary font-mono text-[11px] px-2">1</Badge>
              Service Call Type *
            </div>
            <span className="text-[11px] text-muted-foreground font-medium">Select intake workflow category</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
            {/* Type 1: Service Center */}
            <div
              onClick={() => setType("company_service_center")}
              className={`cursor-pointer rounded-xl border p-3 transition-all flex items-center justify-between gap-2 ${
                type === "company_service_center"
                  ? "border-purple-500 bg-purple-500/10 ring-2 ring-purple-500/30 shadow-sm"
                  : "bg-card hover:bg-purple-500/5 hover:border-purple-300"
              }`}
            >
              <div className="flex items-center gap-2.5 font-bold text-xs text-purple-700 dark:text-purple-300">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-500/20 text-purple-600">
                  <Building2 className="h-4 w-4" />
                </div>
                <span>Service Center Return</span>
              </div>
              <div className={`h-4 w-4 rounded-full border flex items-center justify-center ${type === "company_service_center" ? "border-purple-600 bg-purple-600 text-white" : "border-muted"}`}>
                {type === "company_service_center" && <Check className="h-3 w-3" />}
              </div>
            </div>

            {/* Type 2: In-House Repair */}
            <div
              onClick={() => setType("in_house_repair")}
              className={`cursor-pointer rounded-xl border p-3 transition-all flex items-center justify-between gap-2 ${
                type === "in_house_repair"
                  ? "border-blue-500 bg-blue-500/10 ring-2 ring-blue-500/30 shadow-sm"
                  : "bg-card hover:bg-blue-500/5 hover:border-blue-300"
              }`}
            >
              <div className="flex items-center gap-2.5 font-bold text-xs text-blue-700 dark:text-blue-300">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/20 text-blue-600">
                  <Wrench className="h-4 w-4" />
                </div>
                <span>In-House Service / Refill</span>
              </div>
              <div className={`h-4 w-4 rounded-full border flex items-center justify-center ${type === "in_house_repair" ? "border-blue-600 bg-blue-600 text-white" : "border-muted"}`}>
                {type === "in_house_repair" && <Check className="h-3 w-3" />}
              </div>
            </div>

            {/* Type 3: Onsite Visit */}
            <div
              onClick={() => setType("onsite_visit")}
              className={`cursor-pointer rounded-xl border p-3 transition-all flex items-center justify-between gap-2 ${
                type === "onsite_visit"
                  ? "border-emerald-500 bg-emerald-500/10 ring-2 ring-emerald-500/30 shadow-sm"
                  : "bg-card hover:bg-emerald-500/5 hover:border-emerald-300"
              }`}
            >
              <div className="flex items-center gap-2.5 font-bold text-xs text-emerald-700 dark:text-emerald-300">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-600">
                  <MapPin className="h-4 w-4" />
                </div>
                <span>Onsite Visit & Install</span>
              </div>
              <div className={`h-4 w-4 rounded-full border flex items-center justify-center ${type === "onsite_visit" ? "border-emerald-600 bg-emerald-600 text-white" : "border-muted"}`}>
                {type === "onsite_visit" && <Check className="h-3 w-3" />}
              </div>
            </div>
          </div>
        </div>

        {/* Vertical Sequential Layout (One Section After Another) */}

        {/* Step 2: Customer Details Section */}
        <div className="rounded-2xl border bg-card p-4 space-y-3 shadow-xs">
          <div className="flex items-center justify-between border-b pb-2">
            <div className="flex items-center gap-2 font-extrabold text-xs text-foreground">
              <Badge variant="secondary" className="bg-primary/10 text-primary font-mono text-[11px] px-2">2</Badge>
              <User className="h-4 w-4 text-primary" /> Customer Details
            </div>
            <div className="flex items-center gap-2">
              {(selectedCustomerId || customerName) && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowEditCustomerModal(true)}
                  className="h-7 text-[11px] gap-1 font-bold border-primary/30 text-primary hover:bg-primary/10"
                >
                  <Pencil className="h-3 w-3" /> Edit Customer Profile
                </Button>
              )}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowCustomerModal(true)}
                className="h-7 text-[11px] gap-1 text-primary hover:bg-primary/10"
              >
                <UserPlus className="h-3.5 w-3.5" /> + New Customer
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Label htmlFor="cust-select" className="text-[11px] font-semibold">Auto-fill Customer Profile</Label>
              <Select value={selectedCustomerId} onValueChange={handleSelectCustomer}>
                <SelectTrigger className="mt-1 h-9 text-xs rounded-xl">
                  <SelectValue placeholder="Choose registered customer…" />
                </SelectTrigger>
                <SelectContent>
                  {customers.length === 0 ? (
                    <SelectItem value="empty-cust-hint" disabled>
                      No saved customers (Click + New Customer to add)
                    </SelectItem>
                  ) : (
                    customers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name} ({c.phone})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="cust-name" className="text-[11px] font-semibold">Customer Name (LastName FirstName) *</Label>
              <Input
                id="cust-name"
                placeholder="Selected Customer Name"
                value={customerName}
                readOnly
                className="mt-1 h-9 text-xs rounded-xl bg-muted/40 cursor-not-allowed font-semibold text-foreground"
                required
              />
            </div>

            <div>
              <Label htmlFor="cust-phone" className="text-[11px] font-semibold">Contact Phone Number *</Label>
              <div className="flex items-center gap-1.5 mt-1">
                <Input
                  id="cust-phone"
                  placeholder="Selected Customer Phone"
                  value={customerPhone}
                  readOnly
                  className="h-9 text-xs flex-1 font-mono rounded-xl bg-muted/40 cursor-not-allowed font-bold"
                  required
                />
              </div>
            </div>
          </div>
        </div>

        {/* Step 3: Device & Warranty Details Section */}
        <div className="rounded-2xl border bg-card p-4 space-y-3.5 shadow-xs">
          <div className="flex items-center justify-between border-b pb-2">
            <div className="flex items-center gap-2 font-extrabold text-xs text-foreground">
              <Badge variant="secondary" className="bg-primary/10 text-primary font-mono text-[11px] px-2">3</Badge>
              <Package className="h-4 w-4 text-primary" /> Device & Warranty Details
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowCategoryModal(true)}
              className="h-7 text-[11px] gap-1 text-primary hover:bg-primary/10"
            >
              <FolderPlus className="h-3.5 w-3.5" /> + Category
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            {/* Device Category (3 cols) */}
            <div className="md:col-span-3">
              <Label className="text-[11px] font-semibold">Device Category *</Label>
              <Select value={deviceCategory} onValueChange={setDeviceCategory}>
                <SelectTrigger className="mt-1 h-9 text-xs rounded-xl">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.name}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Warranty Status (3 cols) */}
            <div className="md:col-span-3">
              <Label htmlFor="warranty" className="text-[11px] font-semibold">Warranty Status *</Label>
              <Select value={warrantyStatus} onValueChange={(val: WarrantyStatus) => setWarrantyStatus(val)}>
                <SelectTrigger className="mt-1 h-9 text-xs font-bold rounded-xl border-amber-300 dark:border-amber-700 bg-amber-500/5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="in_warranty">In Warranty</SelectItem>
                  <SelectItem value="out_of_warranty">Out of Warranty</SelectItem>
                  <SelectItem value="not_applicable">N/A (General Service)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Model Number (3 cols) */}
            <div className="md:col-span-3">
              <Label htmlFor="model" className="text-[11px] font-semibold">Model Number</Label>
              <Input
                id="model"
                placeholder="e.g. HP LaserJet M404dn"
                value={modelNumber}
                onChange={(e) => setModelNumber(e.target.value)}
                className="mt-1 h-9 text-xs rounded-xl"
              />
            </div>

            {/* Serial Number (2 cols) */}
            <div className="md:col-span-2">
              <Label htmlFor="serial" className="text-[11px] font-semibold">Serial Number</Label>
              <Input
                id="serial"
                placeholder="e.g. S/N 98210"
                value={serialNumber}
                onChange={(e) => setSerialNumber(e.target.value)}
                className="mt-1 h-9 text-xs rounded-xl font-mono"
              />
            </div>

            {/* Quantity (1 col - Max 4 digits) */}
            <div className="md:col-span-1">
              <Label htmlFor="quantity" className="text-[11px] font-semibold text-center block">Qty</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                max="9999"
                placeholder="1"
                value={quantity}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val.length <= 4) {
                    setQuantity(val === "" ? "" : Number(val));
                  }
                }}
                className="mt-1 h-9 text-xs rounded-xl text-center font-bold px-1"
              />
            </div>
          </div>

          {/* Issue Description & Quick Suggestions */}
          <div>
            <Label htmlFor="issue" className="text-[11px] font-semibold">Issue / Service Task Description *</Label>
            <Input
              id="issue"
              placeholder="e.g. Toner refill, roller cleaning, motherboard repair, antivirus setup…"
              value={issueDescription}
              onChange={(e) => setIssueDescription(e.target.value)}
              className="mt-1 h-9 text-xs rounded-xl"
              required
            />
            <div className="flex flex-wrap gap-1 mt-2">
              <span className="text-[10px] text-muted-foreground font-semibold mr-1">Quick Suggestions:</span>
              {ISSUE_SUGGESTIONS.map((sug) => (
                <button
                  key={sug}
                  type="button"
                  onClick={() => setIssueDescription(sug)}
                  className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors font-medium"
                >
                  + {sug}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Step 4: Type-Specific Dispatch Section (If Applicable) */}
        {type === "company_service_center" && (
          <div className="rounded-2xl border border-purple-200 bg-purple-50/50 dark:bg-purple-950/20 p-4 space-y-3 shadow-xs">
            <div className="flex items-center justify-between border-b border-purple-200/60 pb-2">
              <div className="flex items-center gap-2 font-extrabold text-xs text-purple-700 dark:text-purple-300">
                <Badge variant="secondary" className="bg-purple-600 text-white font-mono text-[11px] px-2">4</Badge>
                <Building2 className="h-4 w-4" /> Company Service Center Parcel Dispatch
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowCenterModal(true)}
                className="h-7 text-[11px] gap-1 text-purple-700 dark:text-purple-300 hover:bg-purple-100"
              >
                <Plus className="h-3.5 w-3.5" /> + New Service Center
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <Label className="text-[11px] font-semibold text-purple-900 dark:text-purple-200">Select Service Center</Label>
                <Select value={selectedServiceCenterId} onValueChange={handleSelectServiceCenter}>
                  <SelectTrigger className="mt-1 h-9 text-xs bg-card rounded-xl">
                    <SelectValue placeholder="Choose service center…" />
                  </SelectTrigger>
                  <SelectContent>
                    {serviceCenters.map((sc) => (
                      <SelectItem key={sc.id} value={sc.id}>
                        {sc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedSC && selectedSC.addresses.length > 0 && (
                <div>
                  <Label className="text-[11px] font-semibold text-purple-900 dark:text-purple-200">Dispatch Parcel Address</Label>
                  <Select value={selectedAddressId} onValueChange={handleSelectCenterAddress}>
                    <SelectTrigger className="mt-1 h-9 text-xs bg-card rounded-xl">
                      <SelectValue placeholder="Select address…" />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedSC.addresses.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.isDefault ? "⭐ [DEFAULT] " : ""}{a.address} {a.city ? `(${a.city})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div>
                <Label className="text-[11px] font-semibold text-purple-900 dark:text-purple-200">RMA / Ticket Number</Label>
                <Input
                  placeholder="e.g. RMA-98210"
                  value={rmaNumber}
                  onChange={(e) => setRmaNumber(e.target.value)}
                  className="mt-1 h-9 text-xs bg-card rounded-xl"
                />
              </div>

              <div>
                <Label className="text-[11px] font-semibold text-purple-900 dark:text-purple-200">Courier / Transport Charges (₹)</Label>
                <Input
                  type="text"
                  placeholder="e.g. 150"
                  value={courierChargesInput}
                  onChange={(e) => setCourierChargesInput(e.target.value)}
                  className="mt-1 h-9 text-xs font-bold bg-card rounded-xl border-purple-300 dark:border-purple-700 text-purple-900 dark:text-purple-100"
                />
              </div>
            </div>
          </div>
        )}

        {type === "onsite_visit" && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/20 p-4 space-y-3 shadow-xs">
            <div className="flex items-center justify-between border-b border-emerald-200/60 pb-2">
              <div className="flex items-center gap-2 font-extrabold text-xs text-emerald-700 dark:text-emerald-300">
                <Badge variant="secondary" className="bg-emerald-600 text-white font-mono text-[11px] px-2">4</Badge>
                <MapPin className="h-4 w-4" /> Onsite Technician Visit Details
              </div>
              <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 font-semibold">
                Auto-filled from Customer Profile
              </Badge>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <Label className="text-[11px] font-semibold text-emerald-900 dark:text-emerald-200">
                  Onsite Service Address *
                </Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditingOnsiteAddress(!isEditingOnsiteAddress)}
                  className="h-6 text-[11px] gap-1 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 font-bold"
                >
                  <Pencil className="h-3 w-3" />
                  {isEditingOnsiteAddress ? "Lock Address" : "Edit Address"}
                </Button>
              </div>

              <Input
                placeholder="Full address for technician visit & troubleshooting"
                value={onsiteAddress}
                readOnly={!isEditingOnsiteAddress}
                onChange={(e) => setOnsiteAddress(e.target.value)}
                className={`h-9 text-xs rounded-xl transition-all ${
                  !isEditingOnsiteAddress
                    ? "bg-card/70 font-medium cursor-default border-emerald-200"
                    : "bg-card font-semibold ring-2 ring-emerald-500/40"
                }`}
                required
              />
              <p className="text-[10px] text-emerald-800/70 dark:text-emerald-400 mt-1">
                {isEditingOnsiteAddress
                  ? "Editing custom address for this specific technician visit."
                  : "Auto-synced with customer primary location. Click 'Edit Address' to modify for this call."}
              </p>
            </div>
          </div>
        )}

        {/* Step 5: Spare Parts & Service Charges Section */}
        <div className="rounded-2xl border bg-card p-4 space-y-3.5 shadow-xs">
          <div className="flex items-center justify-between border-b pb-2">
            <div className="flex items-center gap-2 font-extrabold text-xs text-foreground">
              <Badge variant="secondary" className="bg-primary/10 text-primary font-mono text-[11px] px-2">
                {type === "in_house_repair" ? "4" : "5"}
              </Badge>
              <Receipt className="h-4 w-4 text-primary" /> Spare Parts & Service Charges
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddPart}
              className="h-7 text-[11px] gap-1 rounded-xl"
            >
              <Plus className="h-3.5 w-3.5" /> + Add Part
            </Button>
          </div>

          {/* Parts Purchased List */}
          {parts.length > 0 && (
            <div className="space-y-2">
              <div className="grid grid-cols-12 gap-2 text-[10px] uppercase font-bold text-muted-foreground px-2">
                <span className="col-span-6">Part / Item Name</span>
                <span className="col-span-2 text-center">Qty</span>
                <span className="col-span-3 text-right">Unit Price (₹)</span>
                <span className="col-span-1"></span>
              </div>
              {parts.map((part) => (
                <div key={part.id} className="grid grid-cols-12 gap-2 items-center bg-muted/40 p-2 rounded-xl border">
                  <div className="col-span-6">
                    <Input
                      placeholder="e.g. Laser Drum, 8GB DDR4 RAM, Cartridge Powder"
                      value={part.name}
                      onChange={(e) => handleUpdatePart(part.id, "name", e.target.value)}
                      className="h-8 text-xs bg-card rounded-lg"
                    />
                  </div>
                  <div className="col-span-2">
                    <Input
                      type="number"
                      min="1"
                      placeholder="Qty"
                      value={part.quantity === 0 ? "" : part.quantity}
                      onChange={(e) => handleUpdatePart(part.id, "quantity", e.target.value === "" ? 0 : Number(e.target.value))}
                      className="h-8 text-xs text-center bg-card rounded-lg font-bold"
                    />
                  </div>
                  <div className="col-span-3">
                    <Input
                      type="number"
                      min="0"
                      placeholder="Price"
                      value={part.unitPrice === 0 ? "" : part.unitPrice}
                      onChange={(e) => handleUpdatePart(part.id, "unitPrice", e.target.value === "" ? 0 : Number(e.target.value))}
                      className="h-8 text-xs text-right bg-card rounded-lg font-bold"
                    />
                  </div>
                  <div className="col-span-1 flex justify-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemovePart(part.id)}
                      className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10 rounded-lg"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Service Fee & Total Calculation Card */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t">
            <div>
              <Label htmlFor="service-charge" className="text-xs font-semibold">Service / Repair Charges (₹)</Label>
              <Input
                id="service-charge"
                type="text"
                placeholder="400"
                value={serviceChargesInput}
                onChange={(e) => setServiceChargesInput(e.target.value)}
                className="mt-1 h-9 text-xs font-bold rounded-xl"
              />
            </div>

            {/* Glowing Executive Grand Total Box */}
            <div className="rounded-2xl border bg-gradient-to-r from-slate-900 to-slate-800 p-4 text-right text-white shadow-md flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Billing Breakdown</span>
                <span className="text-xs text-slate-300 font-medium">
                  Parts ₹{partsTotal} + Service ₹{serviceChargesNum} {courierChargesNum > 0 ? `+ Courier ₹${courierChargesNum}` : ""}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-amber-300 block tracking-wider">Grand Total</span>
                <span className="text-2xl font-extrabold font-display text-white">₹{grandTotal.toLocaleString("en-IN")}</span>
              </div>
            </div>
          </div>
        </div>
      </form>

      {/* Inline Modals */}
      <CreateCustomerModal open={showCustomerModal} onOpenChange={setShowCustomerModal} />
      <EditCustomerModal
        customer={
          customers.find((c) => c.id === selectedCustomerId) ||
          (customerName
            ? {
                id: selectedCustomerId || `cust-${Date.now()}`,
                name: customerName,
                phone: customerPhone,
                email: customerEmail,
                address: customerAddress,
                createdAt: Date.now(),
              }
            : null)
        }
        open={showEditCustomerModal}
        onOpenChange={setShowEditCustomerModal}
        onUpdated={() => {
          loadMasterData();
        }}
      />
      <CreateDeviceCategoryModal open={showCategoryModal} onOpenChange={setShowCategoryModal} />
      <CreateServiceCenterModal
        open={showCenterModal}
        onOpenChange={setShowCenterModal}
        onCreated={(sc) => {
          setServiceCenters((prev) => [...prev, sc]);
          setSelectedServiceCenterId(sc.id);
          setServiceCenterName(sc.name);
          if (sc.addresses.length > 0) {
            setSelectedAddressId(sc.addresses[0].id);
            setServiceCenterAddress(sc.addresses[0].address);
          }
        }}
      />
      <CreateTechnicianModal
        open={showTechModal}
        onOpenChange={setShowTechModal}
        onCreated={(t) => {
          setTechnicians((prev) => [...prev, t]);
          setSelectedTechnicianId(t.id);
          setTechnicianName(t.name);
        }}
      />
      <JobCardPrintModal
        serviceCall={{
          id: id || "preview",
          ticketNo: ticketNo || "VOUCHER-PREVIEW",
          dateTime,
          type,
          customerId: selectedCustomerId,
          customerName,
          customerPhone,
          customerEmail,
          customerAddress,
          deviceCategory,
          modelNumber,
          serialNumber,
          quantity: Number(quantity) || 1,
          issueDescription,
          warrantyStatus,
          status,
          serviceCenterId: selectedServiceCenterId,
          serviceCenterName,
          serviceCenterAddressId: selectedAddressId,
          serviceCenterAddress,
          rmaNumber,
          technicianId: selectedTechnicianId,
          technicianName,
          onsiteAddress,
          parts,
          partsTotal,
          serviceCharges: serviceChargesNum,
          grandTotal,
          notes,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        }}
        open={showPrintModal}
        onOpenChange={setShowPrintModal}
      />
    </div>
  );
}
