import { useEffect, useState, useRef } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  Building2,
  Wrench,
  MapPin,
  Plus,
  Trash2,
  Calendar,
  Save,
  MessageCircle,
  Truck,
  FileText,
  UserCheck,
  Send,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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
  getCouriers,
  getTechnicians,
  getStaffMembers,
  getServiceCall,
  createServiceCall,
  updateServiceCall,
  addTimelineEvent,
} from "@/lib/firestore";
import {
  toTitleCase,
  formatIndianPhoneNumber,
  generateWhatsAppMessage,
  generateCourierFollowUpMessage,
  generateServiceCenterFollowUpMessage,
} from "@/lib/utils";
import type {
  Customer,
  DeviceCategory,
  ServiceCenter,
  Courier,
  Technician,
  StaffMember,
  TimelineEvent,
  ServiceCallStatus,
  ServiceCallType,
  ServicePart,
  WarrantyStatus,
} from "@/lib/types";
import CustomerTypeahead from "@/components/admin/CustomerTypeahead";
import ModelTypeahead from "@/components/admin/ModelTypeahead";
import SparePartTypeahead from "@/components/admin/SparePartTypeahead";
import TimelineCard from "@/components/admin/TimelineCard";
import AddTimelineEventModal from "@/components/admin/AddTimelineEventModal";
import CreateCustomerModal from "@/components/admin/CreateCustomerModal";
import EditCustomerModal from "@/components/admin/EditCustomerModal";
import CreateDeviceCategoryModal from "@/components/admin/CreateDeviceCategoryModal";
import CreateServiceCenterModal from "@/components/admin/CreateServiceCenterModal";
import CreateCourierModal from "@/components/admin/CreateCourierModal";
import CreateTechnicianModal from "@/components/admin/CreateTechnicianModal";
import JobCardPrintModal from "@/components/admin/JobCardPrintModal";
import { useTallyShortcuts } from "@/hooks/useTallyShortcuts";

const QUICK_TAGS = [
  "Power Dead Troubleshooting",
  "Cable Termination & Setup",
  "Display & Output Replacement",
  "Warranty OEM Inspection",
  "Parts Replacement",
  "CCTV General Service",
  "Power Supply Check",
];

export default function AdminServiceCallForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = Boolean(id);
  const dateInputRef = useRef<HTMLInputElement>(null);

  // Form State
  const [ticketNo, setTicketNo] = useState<string>("");
  const [type, setType] = useState<ServiceCallType>("company_service_center");
  const [dateTime, setDateTime] = useState<string>(() => {
    return new Date().toISOString().slice(0, 10);
  });

  // Customer State
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");

  // Device Details State
  const [categories, setCategories] = useState<DeviceCategory[]>([]);
  const [deviceCategory, setDeviceCategory] = useState("CCTV & Security");
  const [modelNumber, setModelNumber] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [quantity, setQuantity] = useState<number | string>(1);
  const [issueDescription, setIssueDescription] = useState("");
  const [warrantyStatus, setWarrantyStatus] = useState<WarrantyStatus>("not_applicable");
  const [status, setStatus] = useState<ServiceCallStatus>("received");

  // Purchase Details (Clean optional inputs, excluded from WhatsApp/print)
  const [dateOfPurchase, setDateOfPurchase] = useState("");
  const [billNumber, setBillNumber] = useState("");

  // Mandatory Back-Office Staff Member (No auto-pick since login is shared)
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [handledByStaffId, setHandledByStaffId] = useState("");
  const [handledByStaffName, setHandledByStaffName] = useState("");

  // Service Centers State
  const [serviceCenters, setServiceCenters] = useState<ServiceCenter[]>([]);
  const [selectedServiceCenterId, setSelectedServiceCenterId] = useState<string>("");
  const [serviceCenterName, setServiceCenterName] = useState("");
  const [selectedAddressId, setSelectedAddressId] = useState<string>("");
  const [serviceCenterAddress, setServiceCenterAddress] = useState("");
  const [rmaNumber, setRmaNumber] = useState("");

  // Couriers State
  const [couriers, setCouriers] = useState<Courier[]>([]);
  const [selectedCourierId, setSelectedCourierId] = useState<string>("");
  const [courierName, setCourierName] = useState("Trackon Courier");
  const [courierChargesInput, setCourierChargesInput] = useState<string>("0");

  // Technicians State (Technical Repair Assignee)
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [selectedTechnicianId, setSelectedTechnicianId] = useState<string>("");
  const [technicianName, setTechnicianName] = useState("");

  // Onsite Details
  const [onsiteAddress, setOnsiteAddress] = useState("");

  // Billing (Supports 0 parts without errors)
  const [parts, setParts] = useState<ServicePart[]>([]);
  const [serviceChargesInput, setServiceChargesInput] = useState<string>("0");
  const [internalComments, setInternalComments] = useState("");

  // Timeline Lifecycle Subcollection
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [quickTimelineStage, setQuickTimelineStage] = useState<TimelineEvent["stage"] | null>(null);
  const [showQuickTimelineModal, setShowQuickTimelineModal] = useState(false);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Inline Modals
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showEditCustomerModal, setShowEditCustomerModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showCenterModal, setShowCenterModal] = useState(false);
  const [showCourierModal, setShowCourierModal] = useState(false);
  const [showTechModal, setShowTechModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);

  const loadMasterData = async () => {
    try {
      const [custs, cats, centers, crs, techs, staff] = await Promise.all([
        getCustomers().catch(() => []),
        getDeviceCategories().catch(() => []),
        getServiceCenters().catch(() => []),
        getCouriers().catch(() => []),
        getTechnicians().catch(() => []),
        getStaffMembers().catch(() => []),
      ]);

      setCustomers(custs);
      setStaffList(staff);
      setCouriers(crs);
      setServiceCenters(centers);
      setTechnicians(techs);

      const fallbackCats = cats.length > 0 ? cats : [
        { id: "cat-1", name: "CCTV & Security", description: "Cameras & Surveillance" },
        { id: "cat-2", name: "Printer", description: "Printers" },
        { id: "cat-3", name: "Toner / Cartridge", description: "Refill" },
        { id: "cat-4", name: "Laptop", description: "Laptops" },
        { id: "cat-5", name: "Desktop & PC", description: "Desktops" },
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
      setCustomerName(sc.customerName || "");
      setCustomerPhone(sc.customerPhone || "");
      setCustomerEmail(sc.customerEmail || "");
      setCustomerAddress(sc.customerAddress || "");

      setDeviceCategory(sc.deviceCategory);
      setModelNumber(sc.modelNumber || "");
      setSerialNumber(sc.serialNumber || "");
      setQuantity(sc.quantity || 1);
      setIssueDescription(sc.issueDescription);

      setDateOfPurchase(sc.dateOfPurchase || "");
      setBillNumber(sc.billNumber || "");

      if (sc.handledByStaffId) {
        setHandledByStaffId(sc.handledByStaffId);
        setHandledByStaffName(sc.handledByStaffName || "");
      }

      setWarrantyStatus(sc.warrantyStatus);
      setStatus(sc.status);

      // Service center
      setSelectedServiceCenterId(sc.serviceCenterId || "");
      setServiceCenterName(sc.serviceCenterName || "");
      setSelectedAddressId(sc.serviceCenterAddressId || "");
      setServiceCenterAddress(sc.serviceCenterAddress || "");
      setRmaNumber(sc.rmaNumber || "");
      setCourierName(sc.courierName || "Trackon Courier");
      setCourierChargesInput(String(sc.courierCharges || 0));

      // Technician
      setSelectedTechnicianId(sc.technicianId || "");
      setTechnicianName(sc.technicianName || "");

      setOnsiteAddress(sc.onsiteAddress || "");

      setParts(sc.parts || []);
      setServiceChargesInput(String(sc.serviceCharges || 0));
      setInternalComments(sc.internalComments || sc.notes || "");
      setTimeline(sc.timeline || []);

      setLoading(false);
    });
  }, [id, navigate]);

  // Handle Customer Selection from Typeahead
  const handleSelectCustomer = (cust: Customer) => {
    setSelectedCustomerId(cust.id);
    setCustomerName(cust.name);
    setCustomerPhone(cust.phone);
    setCustomerEmail(cust.email || "");
    setCustomerAddress(cust.address || "");
    if (cust.address) {
      setOnsiteAddress(cust.address);
    }
  };

  // Keyboard Shortcuts Hook
  useTallyShortcuts({
    onCtrlA: () => handleSubmit(),
    onEsc: () => {
      if (showCustomerModal) setShowCustomerModal(false);
      else if (showEditCustomerModal) setShowEditCustomerModal(false);
      else if (showCategoryModal) setShowCategoryModal(false);
      else if (showCenterModal) setShowCenterModal(false);
      else if (showCourierModal) setShowCourierModal(false);
      else if (showTechModal) setShowTechModal(false);
      else if (showQuickTimelineModal) setShowQuickTimelineModal(false);
      else if (showPrintModal) setShowPrintModal(false);
      else navigate("/admin/service-calls");
    },
    onCtrlF2: () => {
      if (dateInputRef.current) {
        dateInputRef.current.focus();
        if (typeof dateInputRef.current.showPicker === "function") {
          dateInputRef.current.showPicker();
        }
      }
    },
    onF5: () => triggerTimelineModal("replacement_sent_service_center"),
    onF6: () => triggerTimelineModal("replacement_received_service_center"),
    onF8: () => triggerTimelineModal("replacement_given_customer"),
    onF9: () => triggerTimelineModal("replacement_received_customer"),
  });

  const triggerTimelineModal = (stage: TimelineEvent["stage"]) => {
    setQuickTimelineStage(stage);
    setShowQuickTimelineModal(true);
  };

  const handleAddTimelineEvent = async (eventData: Omit<TimelineEvent, "id" | "timestamp">) => {
    const now = Date.now();
    const newEvent: TimelineEvent = {
      id: `evt-${now}`,
      timestamp: now,
      ...eventData,
    };
    setTimeline((prev) => [...prev, newEvent]);
    setStatus(eventData.status);

    if (id) {
      await addTimelineEvent(id, newEvent).catch(() => {});
    }
  };

  // Spare Parts Row handlers
  const handleAddPartRow = () => {
    setParts((prev) => [...prev, { id: `part-${Date.now()}`, name: "", quantity: 1, unitPrice: 0, totalPrice: 0 }]);
  };

  const handleUpdatePart = (index: number, field: keyof ServicePart, value: any) => {
    setParts((prev) => {
      const copy = [...prev];
      const row = { ...copy[index], [field]: value };
      if (field === "quantity" || field === "unitPrice") {
        const q = Number(row.quantity) || 0;
        const p = Number(row.unitPrice) || 0;
        row.totalPrice = q * p;
      }
      copy[index] = row;
      return copy;
    });
  };

  const handleRemovePartRow = (index: number) => {
    setParts((prev) => prev.filter((_, i) => i !== index));
  };

  // Calculation (0 parts is valid)
  const cleanParts = parts.filter((p) => p.name.trim().length > 0);
  const partsTotal = cleanParts.reduce((sum, p) => sum + (p.totalPrice || 0), 0);
  const serviceChargesNum = Number(serviceChargesInput) || 0;
  const courierChargesNum = Number(courierChargesInput) || 0;
  const grandTotal = partsTotal + serviceChargesNum + (type === "company_service_center" ? courierChargesNum : 0);

  // Submit Handler
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!customerName.trim() || !customerPhone.trim()) {
      toast.error("Please enter Customer Name and Phone Number");
      return;
    }
    if (!issueDescription.trim()) {
      toast.error("Please describe the Issue / Task");
      return;
    }
    if (!handledByStaffId) {
      toast.error("Mandatory Field: Please select the Back-Office Staff Member handling this call");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        type,
        dateTime,
        customerId: selectedCustomerId || `cust-${Date.now()}`,
        customerName: toTitleCase(customerName),
        customerPhone: formatIndianPhoneNumber(customerPhone),
        customerEmail: customerEmail.trim() || undefined,
        customerAddress: customerAddress.trim() || undefined,
        deviceCategory,
        modelNumber: modelNumber.trim() || undefined,
        serialNumber: serialNumber.trim() || undefined,
        quantity: Number(quantity) || 1,
        issueDescription: issueDescription.trim(),
        warrantyStatus,
        status,

        // Purchase details
        dateOfPurchase: dateOfPurchase.trim() || undefined,
        billNumber: billNumber.trim() || undefined,

        // Backoffice handled staff
        handledByStaffId,
        handledByStaffName,

        // Service center
        serviceCenterId: selectedServiceCenterId || undefined,
        serviceCenterName: serviceCenterName.trim() || undefined,
        serviceCenterAddressId: selectedAddressId || undefined,
        serviceCenterAddress: serviceCenterAddress.trim() || undefined,
        rmaNumber: rmaNumber.trim() || undefined,
        courierName: courierName.trim() || undefined,
        courierCharges: type === "company_service_center" ? courierChargesNum : undefined,

        // Technician
        technicianId: selectedTechnicianId || undefined,
        technicianName: technicianName.trim() || undefined,

        // Onsite
        onsiteAddress: type === "onsite_visit" ? onsiteAddress.trim() : undefined,

        parts: cleanParts,
        partsTotal,
        serviceCharges: serviceChargesNum,
        grandTotal,
        internalComments: internalComments.trim() || undefined,
        notes: internalComments.trim() || undefined,
        timeline,
      };

      if (isEditing && id) {
        await updateServiceCall(id, payload);
        toast.success("Service Call ticket updated successfully!");
      } else {
        const created = await createServiceCall(payload);
        setTicketNo(created.ticketNo);
        toast.success(`Service Call created: ${created.ticketNo}`);
      }

      navigate("/admin/service-calls");
    } catch (err: any) {
      console.error("Save error:", err);
      toast.error(err?.message || "Failed to save service call");
    } finally {
      setSaving(false);
    }
  };

  // WhatsApp Message Sender (Customer confirmation)
  const handleSendWhatsApp = () => {
    if (!customerPhone) {
      toast.error("Customer phone number is missing");
      return;
    }
    const cleanPhone = customerPhone.replace(/\D/g, "");
    const waPhone = cleanPhone.startsWith("91") ? cleanPhone : `91${cleanPhone}`;

    const text = encodeURIComponent(
      generateWhatsAppMessage({
        ticketNo: ticketNo || "New Ticket",
        dateTime,
        customerName: toTitleCase(customerName),
        customerPhone,
        deviceCategory,
        modelNumber,
        issueDescription,
        status,
        grandTotal,
        courierName: type === "company_service_center" ? courierName : undefined,
        courierDocketNumber: type === "company_service_center" ? rmaNumber : undefined,
      })
    );

    window.open(`https://wa.me/${waPhone}?text=${text}`, "_blank", "noopener,noreferrer");
  };

  // Follow-up with Courier Partner WhatsApp
  const handleCourierWhatsAppFollowUp = () => {
    const selectedCourier = couriers.find((c) => c.name.toLowerCase() === courierName.toLowerCase());
    const phone = selectedCourier?.phone || "+919823044441";
    const cleanPhone = phone.replace(/\D/g, "");
    const waPhone = cleanPhone.startsWith("91") ? cleanPhone : `91${cleanPhone}`;

    const text = encodeURIComponent(
      generateCourierFollowUpMessage({
        courierName: courierName || "Courier Partner",
        courierDocketNumber: rmaNumber || "Pending Docket",
        ticketNo: ticketNo || "SC-INTAKE",
        customerName: customerName ? toTitleCase(customerName) : undefined,
        destination: serviceCenterName || "Authorized Service Center",
        dateTime,
      })
    );

    window.open(`https://wa.me/${waPhone}?text=${text}`, "_blank", "noopener,noreferrer");
  };

  // Follow-up with Service Center WhatsApp
  const handleServiceCenterWhatsAppFollowUp = () => {
    const selectedSC = serviceCenters.find((sc) => sc.id === selectedServiceCenterId || sc.name.toLowerCase() === serviceCenterName.toLowerCase());
    const phone = selectedSC?.whatsappPhone || selectedSC?.phone || "+919589199738";
    const cleanPhone = phone.replace(/\D/g, "");
    const waPhone = cleanPhone.startsWith("91") ? cleanPhone : `91${cleanPhone}`;

    const text = encodeURIComponent(
      generateServiceCenterFollowUpMessage({
        serviceCenterName: serviceCenterName || "Authorized Service Center",
        rmaNumber: rmaNumber || undefined,
        ticketNo: ticketNo || "SC-INTAKE",
        deviceCategory,
        modelNumber,
        serialNumber,
        issueDescription,
        dateSent: dateTime,
      })
    );

    window.open(`https://wa.me/${waPhone}?text=${text}`, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="space-y-4 max-w-[1440px] mx-auto pb-16 text-xs">
      {/* Top Breadcrumb & Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
          <span>Admin</span>
          <span>/</span>
          <Link to="/admin/service-calls" className="hover:text-slate-900 transition-colors">
            Service Calls
          </Link>
          <span>/</span>
          <span className="font-bold text-slate-900 dark:text-white">
            {isEditing ? "Edit Ticket" : "New Service Call"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Link to="/admin/service-calls">
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-3 text-xs font-semibold rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-2xs hover:bg-slate-50 text-slate-700 dark:text-slate-300 gap-1.5"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back to List
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
                {isEditing ? "Edit Service Call Ticket" : "New Service Call Ticket"}
              </h1>
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/50 text-[11px] px-2 py-0.5 rounded-full font-semibold">
                Service Intake Voucher
              </Badge>
              {ticketNo && (
                <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800/50 font-mono text-[11px] px-2 py-0.5 rounded-full font-bold">
                  {ticketNo}
                </Badge>
              )}
            </div>

            {/* Quick Keyboard Hint Bar */}
            <div className="hidden lg:flex items-center gap-2 text-[11px] text-slate-400 font-mono">
              <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-300 font-bold">Ctrl+A</span> Save
              <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-300 font-bold">Esc</span> Cancel
              <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-300 font-bold">F5-F9</span> Milestones
            </div>
          </div>

          {/* Aligned 4-Column Header Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 pt-2 border-t border-slate-100 dark:border-slate-800">
            {/* Date of Call */}
            <div>
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span>Date of Call</span>
                <span className="text-[10px] text-slate-400 font-mono font-normal">F2</span>
              </Label>
              <Input
                ref={dateInputRef}
                type="date"
                value={dateTime}
                onChange={(e) => setDateTime(e.target.value)}
                className="mt-1 h-9 text-xs rounded-xl bg-slate-50/50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 font-medium"
              />
            </div>

            {/* Overall Ticket Status */}
            <div>
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Overall Ticket Status
              </Label>
              <Select value={status} onValueChange={(val: ServiceCallStatus) => setStatus(val)}>
                <SelectTrigger className="mt-1 h-9 text-xs rounded-xl bg-slate-50/50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 font-semibold">
                  <SelectValue placeholder="Select Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="received">● Received</SelectItem>
                  <SelectItem value="sent_to_service_center">● Sent to Service Center</SelectItem>
                  <SelectItem value="in_progress">● In Progress</SelectItem>
                  <SelectItem value="waiting_for_parts">● Waiting for Parts</SelectItem>
                  <SelectItem value="completed">● Completed</SelectItem>
                  <SelectItem value="delivered">● Delivered</SelectItem>
                  <SelectItem value="cancelled">● Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Mandatory Back-Office Staff (Handled By - Explicit dropdown selection) */}
            <div>
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <span>Handled By (Backoffice)</span>
                <span className="text-red-500">*</span>
              </Label>
              <Select
                value={handledByStaffId}
                onValueChange={(val) => {
                  setHandledByStaffId(val);
                  const found = staffList.find((s) => s.id === val);
                  if (found) setHandledByStaffName(found.name);
                }}
              >
                <SelectTrigger className="mt-1 h-9 text-xs rounded-xl bg-slate-50/50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 font-semibold text-[#2563EB]">
                  <SelectValue placeholder="Select Staff Member..." />
                </SelectTrigger>
                <SelectContent>
                  {staffList.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} {s.role ? `(${s.role})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Assigned Technician */}
            <div>
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Technical Assignee
                </Label>
                <button
                  type="button"
                  onClick={() => setShowTechModal(true)}
                  className="text-[11px] font-semibold text-[#2563EB] hover:underline"
                >
                  + Add
                </button>
              </div>
              <Select
                value={selectedTechnicianId}
                onValueChange={(val) => {
                  setSelectedTechnicianId(val);
                  const found = technicians.find((t) => t.id === val);
                  if (found) setTechnicianName(found.name);
                }}
              >
                <SelectTrigger className="mt-1 h-9 text-xs rounded-xl bg-slate-50/50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 font-medium">
                  <SelectValue placeholder="Assign Tech..." />
                </SelectTrigger>
                <SelectContent>
                  {technicians.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name} {t.specialization ? `(${t.specialization})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Section 1: Sleek 36px Segmented Pill Control for Service Call Type */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-950 text-[#2563EB] font-extrabold text-[11px]">
              1
            </span>
            <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Service Call Type
            </span>
          </div>

          {/* 36px Segmented Pill Control */}
          <div className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 gap-1">
            <button
              type="button"
              onClick={() => setType("company_service_center")}
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                type === "company_service_center"
                  ? "bg-[#2563EB] text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Building2 className="h-3.5 w-3.5" /> Company Service Center
            </button>

            <button
              type="button"
              onClick={() => setType("in_house_repair")}
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                type === "in_house_repair"
                  ? "bg-[#2563EB] text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Wrench className="h-3.5 w-3.5" /> In-House Service / Refill
            </button>

            <button
              type="button"
              onClick={() => setType("onsite_visit")}
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                type === "onsite_visit"
                  ? "bg-[#2563EB] text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <MapPin className="h-3.5 w-3.5" /> Onsite Visit & Install
            </button>
          </div>
        </div>

        {/* Section 2: Customer Details with Fast Server-Side Typeahead */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 md:p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-950 text-[#2563EB] font-extrabold text-[11px]">
                2
              </span>
              <h2 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Customer Details
              </h2>
            </div>

            <div className="flex items-center gap-3 text-xs">
              {selectedCustomerId && (
                <button
                  type="button"
                  onClick={() => setShowEditCustomerModal(true)}
                  className="font-semibold text-[#2563EB] hover:underline"
                >
                  Edit Profile
                </button>
              )}
              <span className="text-slate-300">|</span>
              <button
                type="button"
                onClick={() => setShowCustomerModal(true)}
                className="font-semibold text-[#2563EB] hover:underline"
              >
                + New Customer (Alt+C)
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {/* Auto-Fill Customer Profile (Typeahead autocomplete for 5000+ customers) */}
            <div>
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Auto-Fill Customer (Search Name / Phone)
              </Label>
              <CustomerTypeahead
                selectedCustomerId={selectedCustomerId}
                onSelectCustomer={handleSelectCustomer}
                onAddNewCustomer={() => setShowCustomerModal(true)}
                initialName={customerName ? `${customerName} (${customerPhone})` : ""}
                className="mt-1"
              />
            </div>

            {/* Customer Name */}
            <div>
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Customer Name <span className="text-red-500">*</span>
              </Label>
              <Input
                placeholder="e.g. Sharma Rajesh"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                required
                className="mt-1 h-9 text-xs rounded-xl bg-slate-50/50 dark:bg-slate-950 border-slate-200 dark:border-slate-800"
              />
            </div>

            {/* Contact / Phone */}
            <div>
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Contact Phone <span className="text-red-500">*</span>
              </Label>
              <Input
                placeholder="+91 9876543210"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                required
                className="mt-1 h-9 text-xs rounded-xl bg-slate-50/50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 font-mono"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Device & Warranty Details (DOP & Bill No directly integrated in grid) */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 md:p-5 shadow-xs space-y-3.5">
          <div className="flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-950 text-[#2563EB] font-extrabold text-[11px]">
              3
            </span>
            <h2 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Device, Warranty & Purchase Details
            </h2>
          </div>

          {/* Row 1: Category, Warranty, Model, Serial, Qty */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
            {/* Device Category */}
            <div>
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Device Category
                </Label>
                <button
                  type="button"
                  onClick={() => setShowCategoryModal(true)}
                  className="text-[11px] font-semibold text-[#2563EB] hover:underline"
                >
                  + Add
                </button>
              </div>
              <Select value={deviceCategory} onValueChange={setDeviceCategory}>
                <SelectTrigger className="mt-1 h-9 text-xs rounded-xl bg-slate-50/50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 font-medium">
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

            {/* Warranty Status */}
            <div>
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Warranty Status
              </Label>
              <Select value={warrantyStatus} onValueChange={(val: WarrantyStatus) => setWarrantyStatus(val)}>
                <SelectTrigger className="mt-1 h-9 text-xs rounded-xl bg-slate-50/50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 font-medium">
                  <SelectValue placeholder="Warranty" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="not_applicable">N/A General Service</SelectItem>
                  <SelectItem value="in_warranty">In Warranty (OEM)</SelectItem>
                  <SelectItem value="out_of_warranty">Out of Warranty</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Model Number / Name (Hierarchical typeahead auto-fill) */}
            <div>
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Model Number / Name
              </Label>
              <ModelTypeahead
                categoryName={deviceCategory}
                value={modelNumber}
                onChange={setModelNumber}
                className="mt-1"
              />
            </div>

            {/* Serial Number */}
            <div>
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Serial Number
              </Label>
              <Input
                placeholder="e.g. 15082026"
                value={serialNumber}
                onChange={(e) => setSerialNumber(e.target.value)}
                className="mt-1 h-9 text-xs rounded-xl bg-slate-50/50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 font-mono"
              />
            </div>

            {/* Qty */}
            <div>
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Qty
              </Label>
              <Input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="mt-1 h-9 text-xs rounded-xl bg-slate-50/50 dark:bg-slate-950 border-slate-200 dark:border-slate-800"
              />
            </div>
          </div>

          {/* Row 2: Date of Purchase & Purchase Invoice (Seamlessly aligned, no box) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
            <div>
              <Label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Date of Purchase (DOP)
              </Label>
              <Input
                type="date"
                value={dateOfPurchase}
                onChange={(e) => setDateOfPurchase(e.target.value)}
                className="mt-1 h-9 text-xs rounded-xl bg-slate-50/50 dark:bg-slate-950 border-slate-200 dark:border-slate-800"
              />
            </div>

            <div>
              <Label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Purchase Invoice / Bill Number
              </Label>
              <Input
                placeholder="e.g. INV-2024-9981"
                value={billNumber}
                onChange={(e) => setBillNumber(e.target.value)}
                className="mt-1 h-9 text-xs rounded-xl bg-slate-50/50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 font-mono"
              />
            </div>
          </div>

          {/* Issue / Service Task Description */}
          <div className="pt-1">
            <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Issue / Service Task Description <span className="text-red-500">*</span>
            </Label>
            <Textarea
              placeholder="Describe symptoms, requested repair, or installation tasks..."
              value={issueDescription}
              onChange={(e) => setIssueDescription(e.target.value)}
              rows={2}
              required
              className="mt-1 text-xs rounded-xl bg-slate-50/50 dark:bg-slate-950 border-slate-200 dark:border-slate-800"
            />

            {/* Quick Suggestion Tags */}
            <div className="flex flex-wrap gap-1.5 pt-2">
              <span className="text-[10px] text-slate-400 font-medium self-center mr-1">Quick Suggestions:</span>
              {QUICK_TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => {
                    setIssueDescription((prev) => (prev ? `${prev}, ${tag}` : tag));
                  }}
                  className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:text-slate-300 hover:border-blue-400 hover:text-blue-600 transition-colors"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Section 4: Company Service Center Parcel Dispatch (with Courier Selection & WhatsApp follow-ups) */}
        {type === "company_service_center" && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 md:p-5 shadow-xs space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-950 text-[#2563EB] font-extrabold text-[11px]">
                  4
                </span>
                <h2 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Company Service Center Parcel & Courier Dispatch
                </h2>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowCourierModal(true)}
                  className="text-xs font-semibold text-[#2563EB] hover:underline"
                >
                  + Add Courier
                </button>
                <span className="text-slate-300">|</span>
                <button
                  type="button"
                  onClick={() => setShowCenterModal(true)}
                  className="text-xs font-semibold text-[#2563EB] hover:underline"
                >
                  + Add Service Center
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3.5">
              {/* Select Service Center */}
              <div>
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Select Service Center
                </Label>
                <Select
                  value={selectedServiceCenterId}
                  onValueChange={(val) => {
                    setSelectedServiceCenterId(val);
                    const found = serviceCenters.find((sc) => sc.id === val);
                    if (found) {
                      setServiceCenterName(found.name);
                      if (found.addresses.length > 0) {
                        setSelectedAddressId(found.addresses[0].id);
                        setServiceCenterAddress(found.addresses[0].address);
                      }
                    }
                  }}
                >
                  <SelectTrigger className="mt-1 h-9 text-xs rounded-xl bg-slate-50/50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 font-medium">
                    <SelectValue placeholder="Select Service Center" />
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

              {/* Dispatch Parcel Address */}
              <div>
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Dispatch Parcel Address
                </Label>
                <Select
                  value={selectedAddressId}
                  onValueChange={(val) => {
                    setSelectedAddressId(val);
                    const currentCenter = serviceCenters.find((sc) => sc.id === selectedServiceCenterId);
                    const addr = currentCenter?.addresses.find((a) => a.id === val);
                    if (addr) setServiceCenterAddress(addr.address);
                  }}
                >
                  <SelectTrigger className="mt-1 h-9 text-xs rounded-xl bg-slate-50/50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 font-medium">
                    <SelectValue placeholder="Dispatch Address" />
                  </SelectTrigger>
                  <SelectContent>
                    {serviceCenters
                      .find((sc) => sc.id === selectedServiceCenterId)
                      ?.addresses.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.city}: {a.address}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Courier Partner Selection */}
              <div>
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Courier Partner
                </Label>
                <Select
                  value={courierName}
                  onValueChange={(val) => {
                    setCourierName(val);
                    const found = couriers.find((c) => c.name === val);
                    if (found) setSelectedCourierId(found.id);
                  }}
                >
                  <SelectTrigger className="mt-1 h-9 text-xs rounded-xl bg-slate-50/50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 font-medium">
                    <SelectValue placeholder="Select Courier Partner" />
                  </SelectTrigger>
                  <SelectContent>
                    {couriers.map((c) => (
                      <SelectItem key={c.id} value={c.name}>
                        {c.name} {c.phone ? `(${c.phone})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Courier Tracking RMA / Docket No */}
              <div>
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Docket / RMA Tracking No.
                </Label>
                <Input
                  placeholder="e.g. TRK-9981 / AUG-2026"
                  value={rmaNumber}
                  onChange={(e) => setRmaNumber(e.target.value)}
                  className="mt-1 h-9 text-xs rounded-xl bg-slate-50/50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 font-mono"
                />
              </div>
            </div>

            {/* Logistics Actions & One-Click WhatsApp Follow-ups */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div>
                  <span className="text-xs text-slate-500 font-medium">Courier Charges: </span>
                  <Input
                    type="number"
                    placeholder="0"
                    value={courierChargesInput}
                    onChange={(e) => setCourierChargesInput(e.target.value)}
                    className="inline-block w-24 h-8 text-xs rounded-lg bg-slate-50/50 ml-1 font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Follow up with Courier WhatsApp */}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCourierWhatsAppFollowUp}
                  className="h-8 px-2.5 text-[11px] font-bold rounded-lg border-blue-300 text-blue-700 dark:text-blue-300 bg-blue-50/50 hover:bg-blue-100 gap-1.5"
                >
                  <Truck className="h-3.5 w-3.5 text-blue-600" /> Follow up with Courier (WhatsApp)
                </Button>

                {/* Follow up with Service Center WhatsApp */}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleServiceCenterWhatsAppFollowUp}
                  className="h-8 px-2.5 text-[11px] font-bold rounded-lg border-emerald-300 text-emerald-700 dark:text-emerald-300 bg-emerald-50/50 hover:bg-emerald-100 gap-1.5"
                >
                  <Building2 className="h-3.5 w-3.5 text-emerald-600" /> Follow up with Service Center (WhatsApp)
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Section 4 Alternative: Onsite Service Address (if Onsite Visit) */}
        {type === "onsite_visit" && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 md:p-5 shadow-xs space-y-3">
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-950 text-[#2563EB] font-extrabold text-[11px]">
                4
              </span>
              <h2 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Onsite Service Address
              </h2>
            </div>
            <div>
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Customer Site / Installation Address
              </Label>
              <Input
                placeholder="Enter complete onsite location..."
                value={onsiteAddress}
                onChange={(e) => setOnsiteAddress(e.target.value)}
                className="mt-1 h-9 text-xs rounded-xl bg-slate-50/50 dark:bg-slate-950 border-slate-200 dark:border-slate-800"
              />
            </div>
          </div>
        )}

        {/* Section 5: Spare Parts & Service Charges (Supports 0 parts without errors) */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 md:p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-950 text-[#2563EB] font-extrabold text-[11px]">
                5
              </span>
              <h2 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Spare Parts & Service Charges
              </h2>
            </div>

            <button
              type="button"
              onClick={handleAddPartRow}
              className="text-xs font-semibold text-[#2563EB] hover:underline"
            >
              + Add Item
            </button>
          </div>

          <div className="space-y-2.5">
            {parts.length > 0 && (
              <div className="grid grid-cols-12 gap-3 text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-1">
                <div className="col-span-7">PART / ITEM NAME (Auto-saved to Catalog)</div>
                <div className="col-span-2">QTY</div>
                <div className="col-span-2">UNIT PRICE (₹)</div>
                <div className="col-span-1 text-right">TOTAL</div>
              </div>
            )}

            {parts.map((p, idx) => (
              <div key={p.id || idx} className="grid grid-cols-12 gap-3 items-center">
                <div className="col-span-7">
                  <SparePartTypeahead
                    value={p.name}
                    onChangeName={(name) => handleUpdatePart(idx, "name", name)}
                    onSelectCatalogItem={(item) => {
                      if (item.unitPrice > 0) {
                        handleUpdatePart(idx, "unitPrice", item.unitPrice);
                      }
                    }}
                  />
                </div>
                <div className="col-span-2">
                  <Input
                    type="number"
                    min="1"
                    value={p.quantity}
                    onChange={(e) => handleUpdatePart(idx, "quantity", e.target.value)}
                    className="h-9 text-xs rounded-xl bg-slate-50/50 dark:bg-slate-950 border-slate-200 dark:border-slate-800"
                  />
                </div>
                <div className="col-span-2">
                  <Input
                    type="number"
                    placeholder="0"
                    value={p.unitPrice}
                    onChange={(e) => handleUpdatePart(idx, "unitPrice", e.target.value)}
                    className="h-9 text-xs rounded-xl bg-slate-50/50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 font-mono"
                  />
                </div>
                <div className="col-span-1 flex items-center justify-end gap-1.5">
                  <span className="font-bold text-slate-900 dark:text-white text-xs font-display font-mono">
                    ₹{(p.totalPrice || 0).toLocaleString("en-IN")}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemovePartRow(idx)}
                    className="text-slate-400 hover:text-destructive p-1 rounded-md"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}

            {parts.length === 0 && (
              <div className="text-xs text-slate-400 p-2.5 bg-slate-50/60 dark:bg-slate-950 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center">
                No spare parts added (Intake without parts is supported). Click <button type="button" onClick={handleAddPartRow} className="text-[#2563EB] font-bold underline">+ Add Item</button> if needed.
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-slate-100 dark:border-slate-800 items-center">
            <div>
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Service & Repair Charges (₹)
              </Label>
              <Input
                type="number"
                placeholder="0"
                value={serviceChargesInput}
                onChange={(e) => setServiceChargesInput(e.target.value)}
                className="mt-1 h-9 text-xs rounded-xl bg-slate-50/50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 md:w-56 font-mono"
              />
            </div>

            {/* Billing Summary Box */}
            <div className="bg-slate-50 dark:bg-slate-950/60 rounded-xl p-3.5 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  BILLING BREAKDOWN
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-300 font-medium mt-0.5">
                  Parts ₹{partsTotal} + Service ₹{serviceChargesNum}
                  {type === "company_service_center" && courierChargesNum > 0 ? ` + Courier ₹${courierChargesNum}` : ""}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  GRAND TOTAL
                </p>
                <p className="text-xl md:text-2xl font-extrabold text-[#2563EB] font-display font-mono">
                  ₹{grandTotal.toLocaleString("en-IN")}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Section 6: Miscellaneous Internal Comments */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-xs space-y-2">
          <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <FileText className="h-4 w-4 text-[#2563EB]" /> Internal Miscellaneous Comments / Audit Notes
          </Label>
          <Textarea
            placeholder="Enter any internal office notes, customer communication history, technician instructions..."
            value={internalComments}
            onChange={(e) => setInternalComments(e.target.value)}
            rows={2}
            className="text-xs rounded-xl bg-slate-50/50 dark:bg-slate-950 border-slate-200 dark:border-slate-800"
          />
        </div>

        {/* Section 7: Audit Timeline Component */}
        <TimelineCard
          timeline={timeline}
          staffList={staffList}
          currentStaffId={handledByStaffId}
          onAddTimelineEvent={handleAddTimelineEvent}
        />

        {/* Section 8: Action Footer Bar (Save / WhatsApp / Cancel) */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-xs border border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 mt-4">
          <div className="text-xs text-slate-400 hidden sm:block">
            Press <kbd className="font-mono font-bold bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-300">Ctrl+A</kbd> to Save
          </div>

          <div className="flex items-center gap-2.5 ml-auto">
            <Button
              type="button"
              variant="outline"
              onClick={handleSendWhatsApp}
              className="h-9 px-3.5 text-xs font-bold rounded-xl border-emerald-500 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 gap-1.5"
            >
              <MessageCircle className="h-4 w-4 text-emerald-500" /> Send via WhatsApp
            </Button>

            <Button
              type="submit"
              disabled={saving}
              className="h-9 px-5 text-xs font-bold rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white shadow-sm shadow-blue-600/25 gap-1.5"
            >
              <Save className="h-4 w-4" /> {saving ? "Saving..." : "Save / Accept (Ctrl+A)"}
            </Button>
          </div>
        </div>
      </form>

      {/* Quick Timeline Modal for Hotkeys F5, F6, F8, F9 */}
      {quickTimelineStage && (
        <AddTimelineEventModal
          open={showQuickTimelineModal}
          onOpenChange={setShowQuickTimelineModal}
          staffList={staffList}
          currentStaffId={handledByStaffId}
          defaultStage={quickTimelineStage}
          onAddEvent={handleAddTimelineEvent}
        />
      )}

      {/* Inline Modals */}
      <CreateCustomerModal
        open={showCustomerModal}
        onOpenChange={setShowCustomerModal}
        onCreated={(newCust) => {
          setCustomers((prev) => [newCust, ...prev]);
          handleSelectCustomer(newCust);
          toast.success(`Customer "${newCust.name}" created and loaded`);
        }}
      />
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
      <CreateDeviceCategoryModal
        open={showCategoryModal}
        onOpenChange={setShowCategoryModal}
        onCreated={(cat) => {
          setCategories((prev) => [...prev, cat]);
          setDeviceCategory(cat.name);
        }}
      />
      <CreateCourierModal
        open={showCourierModal}
        onOpenChange={setShowCourierModal}
        onCreated={(cr) => {
          setCouriers((prev) => [...prev, cr]);
          setCourierName(cr.name);
          setSelectedCourierId(cr.id);
        }}
      />
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
          ticketNo: ticketNo || "SC-PREVIEW",
          type,
          dateTime,
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
          serviceCenterAddress,
          rmaNumber,
          courierCharges: courierChargesNum,
          technicianId: selectedTechnicianId,
          technicianName,
          onsiteAddress,
          parts: cleanParts,
          partsTotal,
          serviceCharges: serviceChargesNum,
          grandTotal,
          notes: internalComments,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        }}
        open={showPrintModal}
        onOpenChange={setShowPrintModal}
      />
    </div>
  );
}
