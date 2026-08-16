import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useParams, Link } from "react-router-dom";
import {
  History,
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
  UserPlus,
  Send,
  Inbox,
  Clock,
  Package,
  CheckCircle2,
  XCircle,
  MessageSquare,
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
  getFinancialYear,
  peekNextTicketNumber,
} from "@/lib/firestore";
import {
  toTitleCase,
  formatIndianPhoneNumber,
  generateWhatsAppMessage,
  generateCourierFollowUpMessage,
  generateServiceCenterFollowUpMessage,
  generateCourierPickupRequestMessage,
  generateCourierDeliveryInquiryMessage,
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
import TimelineEventsListModal from "@/components/admin/TimelineEventsListModal";
import AddTimelineEventModal from "@/components/admin/AddTimelineEventModal";
import WhatsAppPreviewModal from "@/components/admin/WhatsAppPreviewModal";
import CreateCustomerModal from "@/components/admin/CreateCustomerModal";
import EditCustomerModal from "@/components/admin/EditCustomerModal";
import CreateDeviceCategoryModal from "@/components/admin/CreateDeviceCategoryModal";
import CreateServiceCenterModal from "@/components/admin/CreateServiceCenterModal";
import CreateCourierModal from "@/components/admin/CreateCourierModal";
import JobCardPrintModal from "@/components/admin/JobCardPrintModal";
import AvatarGraphic from "@/components/admin/AvatarGraphic";
import { useStaffProfile } from "@/contexts/StaffProfileContext";
import { useAuth } from "@/contexts/AuthContext";
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

const STATUS_LIST: {
  value: ServiceCallStatus;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  bgClass: string;
  dotColor: string;
}[] = [
  {
    value: "received",
    label: "Received",
    icon: Inbox,
    iconColor: "text-blue-600 dark:text-blue-400",
    bgClass: "bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/60",
    dotColor: "bg-blue-500",
  },
  {
    value: "sent_to_service_center",
    label: "Sent to Service Center",
    icon: Building2,
    iconColor: "text-indigo-600 dark:text-indigo-400",
    bgClass: "bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/60",
    dotColor: "bg-indigo-500",
  },
  {
    value: "in_progress",
    label: "In Progress",
    icon: Clock,
    iconColor: "text-purple-600 dark:text-purple-400",
    bgClass: "bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800/60",
    dotColor: "bg-purple-500",
  },
  {
    value: "waiting_for_parts",
    label: "Waiting for Parts",
    icon: Package,
    iconColor: "text-amber-600 dark:text-amber-400",
    bgClass: "bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/60",
    dotColor: "bg-amber-500",
  },
  {
    value: "completed",
    label: "Completed",
    icon: CheckCircle2,
    iconColor: "text-emerald-600 dark:text-emerald-400",
    bgClass: "bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60",
    dotColor: "bg-emerald-500",
  },
  {
    value: "delivered",
    label: "Delivered",
    icon: Send,
    iconColor: "text-teal-600 dark:text-teal-400",
    bgClass: "bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800/60",
    dotColor: "bg-teal-500",
  },
  {
    value: "cancelled",
    label: "Cancelled",
    icon: XCircle,
    iconColor: "text-rose-600 dark:text-rose-400",
    bgClass: "bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800/60",
    dotColor: "bg-rose-500",
  },
];

export default function AdminServiceCallForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { activeProfile } = useStaffProfile();
  const isEditing = Boolean(id);
  const dateInputRef = useRef<HTMLInputElement>(null);

  // Form State
  const [ticketNo, setTicketNo] = useState<string>("");
  const [type, setType] = useState<ServiceCallType>("company_service_center");
  const [dateTime, setDateTime] = useState<string>(() => {
    return new Date().toISOString().slice(0, 10);
  });
  const [headerCenterEl, setHeaderCenterEl] = useState<HTMLElement | null>(null);
  const [rightRailEl, setRightRailEl] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setHeaderCenterEl(document.getElementById("admin-header-center"));
    setRightRailEl(document.getElementById("admin-right-rail"));
  }, []);

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

  // Back-Office Staff Member (Auto-attributed from active 10h desk profile)
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
  const [discountInput, setDiscountInput] = useState<string>("0");
  const [internalComments, setInternalComments] = useState("");

  // Timeline Lifecycle Subcollection
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [quickTimelineStage, setQuickTimelineStage] = useState<TimelineEvent["stage"] | null>(null);
  const [showQuickTimelineModal, setShowQuickTimelineModal] = useState(false);
  const [showEventsListModal, setShowEventsListModal] = useState(false);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Inline Modals
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showEditCustomerModal, setShowEditCustomerModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showCenterModal, setShowCenterModal] = useState(false);
  const [showCourierModal, setShowCourierModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [whatsAppModal, setWhatsAppModal] = useState<{
    open: boolean;
    title: string;
    recipientName: string;
    recipientRole: string;
    defaultPhone: string;
    defaultMessage: string;
  }>({
    open: false,
    title: "",
    recipientName: "",
    recipientRole: "",
    defaultPhone: "",
    defaultMessage: "",
  });

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

  // Fetch Existing Service Call if editing, or peek upcoming Ticket Number if creating
  useEffect(() => {
    if (id) {
      setLoading(true);
      getServiceCall(id).then((sc) => {
        if (!sc) {
          toast.error("Service Call not found");
          navigate("/admin/service-calls");
          return;
        }
        setTicketNo(sc.ticketNo || sc.id || id || "");
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
        setDiscountInput(String(sc.discount || 0));
        setInternalComments(sc.internalComments || sc.notes || "");
        setTimeline(sc.timeline || []);

        setLoading(false);
      });
    } else {
      const fyMeta = getFinancialYear(dateTime || new Date());
      peekNextTicketNumber(fyMeta.fyId, fyMeta.monthKey)
        .then((nextNo) => {
          setTicketNo(nextNo);
        })
        .catch(() => {
          setTicketNo("SC-NEW");
        });
    }
  }, [id, dateTime, navigate]);

  // Auto-attribute new service calls to active 10h desk profile
  useEffect(() => {
    if (!isEditing && activeProfile && !handledByStaffId) {
      setHandledByStaffId(activeProfile.id);
      setHandledByStaffName(activeProfile.name);
    }
  }, [isEditing, activeProfile, handledByStaffId]);

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
  const discountNum = Math.max(0, Number(discountInput) || 0);
  const subTotal = partsTotal + serviceChargesNum + (type === "company_service_center" ? courierChargesNum : 0);
  const grandTotal = Math.max(0, subTotal - discountNum);

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

    const effectiveStaffId = activeProfile?.id || handledByStaffId || user?.uid || "desk-profile";
    const effectiveStaffName = activeProfile?.name || handledByStaffName || user?.displayName || user?.email || "Desk Staff";

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

        // Backoffice handled staff (Auto-attributed to active desk profile)
        handledByStaffId: effectiveStaffId,
        handledByStaffName: effectiveStaffName,

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
        discount: discountNum > 0 ? discountNum : undefined,
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

  // WhatsApp Message Preview Triggers (Opens editable preview modal with pre-compiled text)
  const handleOpenCustomerWhatsApp = () => {
    if (!customerPhone && !customerName) {
      toast.error("Customer information is missing");
      return;
    }
    const compiled = generateWhatsAppMessage({
      ticketNo: ticketNo || "New Ticket",
      dateTime,
      customerName: toTitleCase(customerName || "Customer"),
      customerPhone: customerPhone || "",
      deviceCategory,
      modelNumber,
      issueDescription,
      status,
      grandTotal,
    });

    setWhatsAppModal({
      open: true,
      title: "WhatsApp Update: Customer Confirmation",
      recipientName: customerName ? toTitleCase(customerName) : "Customer",
      recipientRole: "Customer",
      defaultPhone: customerPhone || "",
      defaultMessage: compiled,
    });
  };

  const handleOpenServiceCenterWhatsApp = () => {
    const selectedSC = serviceCenters.find(
      (sc) => sc.id === selectedServiceCenterId || sc.name.toLowerCase() === serviceCenterName.toLowerCase()
    );
    const phone = selectedSC?.whatsappPhone || selectedSC?.phone || "+91 95891 99738";
    const compiled = generateServiceCenterFollowUpMessage({
      serviceCenterName: serviceCenterName || "Authorized Service Center",
      rmaNumber: rmaNumber || undefined,
      ticketNo: ticketNo || "SC-INTAKE",
      deviceCategory,
      modelNumber,
      serialNumber,
      issueDescription,
      dateSent: dateTime,
    });

    setWhatsAppModal({
      open: true,
      title: "WhatsApp Inquiry: Service Center Follow-up",
      recipientName: serviceCenterName || "Authorized Service Center",
      recipientRole: "Service Center",
      defaultPhone: phone,
      defaultMessage: compiled,
    });
  };

  const handleOpenCourierPickupWhatsApp = () => {
    const selectedCourier = couriers.find((c) => c.name.toLowerCase() === courierName.toLowerCase());
    const phone = selectedCourier?.phone || "+91 98230 44441";
    const compiled = generateCourierPickupRequestMessage({
      courierName: courierName || "Courier Partner",
      ticketNo: ticketNo || "SC-INTAKE",
      serviceCenterName: serviceCenterName || undefined,
      destinationAddress: serviceCenterAddress || undefined,
      dateTime,
      rmaNumber: rmaNumber || undefined,
    });

    setWhatsAppModal({
      open: true,
      title: "WhatsApp Request: Ask Courier for Pickup",
      recipientName: courierName || "Courier Partner",
      recipientRole: "Courier Partner",
      defaultPhone: phone,
      defaultMessage: compiled,
    });
  };

  const handleOpenCourierDeliveryWhatsApp = () => {
    const selectedCourier = couriers.find((c) => c.name.toLowerCase() === courierName.toLowerCase());
    const phone = selectedCourier?.phone || "+91 98230 44441";
    const compiled = generateCourierDeliveryInquiryMessage({
      courierName: courierName || "Courier Partner",
      courierDocketNumber: rmaNumber || undefined,
      ticketNo: ticketNo || "SC-INTAKE",
      serviceCenterName: serviceCenterName || undefined,
      destinationAddress: serviceCenterAddress || undefined,
      dateTime,
    });

    setWhatsAppModal({
      open: true,
      title: "WhatsApp Inquiry: Ask Courier for Delivery",
      recipientName: courierName || "Courier Partner",
      recipientRole: "Courier Partner",
      defaultPhone: phone,
      defaultMessage: compiled,
    });
  };

  return (
    <div className="space-y-4 max-w-[1440px] mx-auto pb-16 text-xs">
      {/* Top Header Center Portal for Service Call Type Chips */}
      {headerCenterEl &&
        createPortal(
          <div className="inline-flex p-1 rounded-xl bg-slate-900/90 border border-slate-700/80 gap-1 shadow-xs">
            <button
              type="button"
              onClick={() => setType("company_service_center")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                type === "company_service_center"
                  ? "bg-[#2563EB] text-white shadow-md shadow-blue-600/30"
                  : "text-slate-300 hover:text-white hover:bg-slate-800/70"
              }`}
            >
              <Building2 className="h-3.5 w-3.5" />
              <span>Company Service Center</span>
            </button>

            <button
              type="button"
              onClick={() => setType("in_house_repair")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                type === "in_house_repair"
                  ? "bg-[#2563EB] text-white shadow-md shadow-blue-600/30"
                  : "text-slate-300 hover:text-white hover:bg-slate-800/70"
              }`}
            >
              <Wrench className="h-3.5 w-3.5" />
              <span>In-House Service / Refill</span>
            </button>

            <button
              type="button"
              onClick={() => setType("onsite_visit")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                type === "onsite_visit"
                  ? "bg-[#2563EB] text-white shadow-md shadow-blue-600/30"
                  : "text-slate-300 hover:text-white hover:bg-slate-800/70"
              }`}
            >
              <MapPin className="h-3.5 w-3.5" />
              <span>Onsite Visit & Install</span>
            </button>
          </div>,
          headerCenterEl
        )}

      <form id="service-call-form" onSubmit={handleSubmit} className="space-y-4 max-w-5xl mx-auto">
        {/* Header Metadata: Overall Ticket Status, Technical Assignee, Date of Call */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 border-l-4 border-l-[#2563EB] p-4 md:p-5 shadow-xs">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
            {/* Overall Ticket Status */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <Label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Overall Ticket Status
                </Label>
                {ticketNo && (
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/50 font-mono text-[10px] px-1.5 py-0 rounded-full font-bold">
                    {ticketNo}
                  </Badge>
                )}
              </div>
              <Select value={status} onValueChange={(val: ServiceCallStatus) => setStatus(val)}>
                <SelectTrigger className="h-9 text-xs rounded-xl bg-slate-50/60 dark:bg-slate-950 border-slate-200 dark:border-slate-800 font-semibold text-slate-900 dark:text-slate-100 focus:bg-white transition-colors">
                  <div className="flex items-center gap-2 truncate">
                    {(() => {
                      const found = STATUS_LIST.find((s) => s.value === status);
                      if (!found) return <SelectValue placeholder="Select Status" />;
                      const Icon = found.icon;
                      return (
                        <>
                          <div className={`h-5 w-5 rounded-md ${found.bgClass} flex items-center justify-center shrink-0`}>
                            <Icon className={`h-3 w-3 ${found.iconColor}`} />
                          </div>
                          <span className="font-semibold text-slate-800 dark:text-slate-100 truncate">{found.label}</span>
                        </>
                      );
                    })()}
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {STATUS_LIST.map((item) => {
                    const Icon = item.icon;
                    return (
                      <SelectItem key={item.value} value={item.value} className="text-xs py-2 cursor-pointer">
                        <div className="flex items-center gap-2.5">
                          <div className={`h-6 w-6 rounded-lg ${item.bgClass} flex items-center justify-center shrink-0`}>
                            <Icon className={`h-3.5 w-3.5 ${item.iconColor}`} />
                          </div>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">{item.label}</span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Assigned Technician */}
            <div>
              <Label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 block">
                Technical Assignee
              </Label>
              <Select
                value={selectedTechnicianId}
                onValueChange={(val) => {
                  setSelectedTechnicianId(val);
                  const found = technicians.find((t) => t.id === val);
                  if (found) setTechnicianName(found.name);
                }}
              >
                <SelectTrigger className="h-9 text-xs rounded-xl bg-slate-50/60 dark:bg-slate-950 border-slate-200 dark:border-slate-800 font-medium text-slate-900 dark:text-slate-100 focus:bg-white transition-colors">
                  <SelectValue placeholder="Assign Tech (from Team Directory)..." />
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

            {/* Date of Call */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <Label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Date of Call
                </Label>
                <span className="text-[10px] text-slate-400 font-mono font-medium">F2</span>
              </div>
              <Input
                ref={dateInputRef}
                type="date"
                value={dateTime}
                onChange={(e) => setDateTime(e.target.value)}
                className="h-9 w-full text-xs rounded-xl bg-slate-50/60 dark:bg-slate-950 border-slate-200 dark:border-slate-800 font-medium text-slate-900 dark:text-slate-100 focus:bg-white transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Section 1: Customer Details with Fast Server-Side Typeahead */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 border-l-4 border-l-[#2563EB] p-4 md:p-5 shadow-xs space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-950/60 text-[#2563EB] dark:text-blue-400 font-extrabold text-[11px] border border-blue-100 dark:border-blue-900 shadow-2xs">
                1
              </span>
              <h2 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
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
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {/* Auto-Fill Customer Profile (Typeahead autocomplete for 5000+ customers) */}
            <div>
              <Label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 block">
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
              <Label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 block">
                Customer Name <span className="text-red-500 font-bold">*</span>
              </Label>
              <Input
                placeholder="e.g. Sharma Rajesh"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                required
                className="h-9 text-xs rounded-xl bg-slate-50/60 dark:bg-slate-950 border-slate-200 dark:border-slate-800 font-medium text-slate-900 dark:text-slate-100 focus:bg-white transition-colors"
              />
            </div>

            {/* Contact / Phone */}
            <div>
              <Label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 block">
                Contact Phone <span className="text-red-500 font-bold">*</span>
              </Label>
              <Input
                placeholder="+91 9876543210"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                required
                className="h-9 text-xs rounded-xl bg-slate-50/60 dark:bg-slate-950 border-slate-200 dark:border-slate-800 font-mono font-medium text-slate-900 dark:text-slate-100 focus:bg-white transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Device & Warranty Details */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 border-l-4 border-l-indigo-500 p-4 md:p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-extrabold text-[11px] border border-indigo-100 dark:border-indigo-900 shadow-2xs">
              2
            </span>
            <h2 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
              Device, Warranty & Purchase Details
            </h2>
          </div>

          {/* Primary Row: Category, Warranty, Model Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
            {/* Device Category */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <Label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Device Category
                </Label>
                <button
                  type="button"
                  onClick={() => setShowCategoryModal(true)}
                  className="text-[10px] font-semibold text-[#2563EB] hover:underline"
                >
                  + Add
                </button>
              </div>
              <Select value={deviceCategory} onValueChange={setDeviceCategory}>
                <SelectTrigger className="h-9 text-xs rounded-xl bg-slate-50/60 dark:bg-slate-950 border-slate-200 dark:border-slate-800 font-medium text-slate-900 dark:text-slate-100 focus:bg-white transition-colors">
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
              <Label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 block">
                Warranty Status
              </Label>
              <Select value={warrantyStatus} onValueChange={(val: WarrantyStatus) => setWarrantyStatus(val)}>
                <SelectTrigger className="h-9 text-xs rounded-xl bg-slate-50/60 dark:bg-slate-950 border-slate-200 dark:border-slate-800 font-medium text-slate-900 dark:text-slate-100 focus:bg-white transition-colors">
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
            <div className="sm:col-span-2">
              <Label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 block">
                Model Number / Name
              </Label>
              <ModelTypeahead
                categoryName={deviceCategory}
                value={modelNumber}
                onChange={setModelNumber}
              />
            </div>
          </div>

          {/* Secondary Metadata Sub-Card (Serial, Qty, DOP, Bill No) */}
          <div className="bg-slate-50/80 dark:bg-slate-950/50 rounded-xl p-3 border border-slate-200/70 dark:border-slate-800/80">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <Label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1 block">
                  Serial Number
                </Label>
                <Input
                  placeholder="e.g. 15082026"
                  value={serialNumber}
                  onChange={(e) => setSerialNumber(e.target.value)}
                  className="h-8 text-xs rounded-lg bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 font-mono text-slate-900 dark:text-slate-100 font-medium"
                />
              </div>

              <div>
                <Label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1 block">
                  Qty
                </Label>
                <Input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="h-8 text-xs rounded-lg bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 font-medium"
                />
              </div>

              <div>
                <Label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1 block">
                  Purchase Date (DOP)
                </Label>
                <Input
                  type="date"
                  value={dateOfPurchase}
                  onChange={(e) => setDateOfPurchase(e.target.value)}
                  className="h-8 text-xs rounded-lg bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 font-medium"
                />
              </div>

              <div>
                <Label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1 block">
                  Invoice / Bill Number
                </Label>
                <Input
                  placeholder="e.g. INV-2024-9981"
                  value={billNumber}
                  onChange={(e) => setBillNumber(e.target.value)}
                  className="h-8 text-xs rounded-lg bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 font-mono text-slate-900 dark:text-slate-100 font-medium"
                />
              </div>
            </div>
          </div>

          {/* Issue / Service Task Description */}
          <div>
            <Label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 block">
              Issue / Service Task Description <span className="text-red-500 font-bold">*</span>
            </Label>
            <Textarea
              placeholder="Describe symptoms, requested repair, or installation tasks..."
              value={issueDescription}
              onChange={(e) => setIssueDescription(e.target.value)}
              rows={2}
              required
              className="text-xs rounded-xl bg-slate-50/60 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 font-medium focus:bg-white transition-colors"
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

        {/* Section 3: Company Service Center Parcel Dispatch (with Courier Selection & WhatsApp follow-ups) */}
        {type === "company_service_center" && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 border-l-4 border-l-amber-500 p-4 md:p-5 shadow-xs space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 font-extrabold text-[11px] border border-amber-100 dark:border-amber-900 shadow-2xs">
                  3
                </span>
                <h2 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                  Company Service Center Parcel & Courier Dispatch
                </h2>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3.5">
              {/* Select Service Center */}
              <div>
                <Label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 block">
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
                  <SelectTrigger className="h-9 text-xs rounded-xl bg-slate-50/60 dark:bg-slate-950 border-slate-200 dark:border-slate-800 font-medium text-slate-900 dark:text-slate-100 focus:bg-white transition-colors">
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
                <Label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 block">
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
                  <SelectTrigger className="h-9 text-xs rounded-xl bg-slate-50/60 dark:bg-slate-950 border-slate-200 dark:border-slate-800 font-medium text-slate-900 dark:text-slate-100 focus:bg-white transition-colors">
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
                <Label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 block">
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
                  <SelectTrigger className="h-9 text-xs rounded-xl bg-slate-50/60 dark:bg-slate-950 border-slate-200 dark:border-slate-800 font-medium text-slate-900 dark:text-slate-100 focus:bg-white transition-colors">
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
                <Label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 block">
                  Docket / RMA Tracking No.
                </Label>
                <Input
                  placeholder="e.g. TRK-9981 / AUG-2026"
                  value={rmaNumber}
                  onChange={(e) => setRmaNumber(e.target.value)}
                  className="h-9 text-xs rounded-xl bg-slate-50/60 dark:bg-slate-950 border-slate-200 dark:border-slate-800 font-mono text-slate-900 dark:text-slate-100 font-medium focus:bg-white transition-colors"
                />
              </div>

              {/* Courier Charges */}
              <div>
                <Label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 block">
                  Courier Charges (₹)
                </Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={courierChargesInput}
                  onChange={(e) => setCourierChargesInput(e.target.value)}
                  className="h-9 text-xs rounded-xl bg-slate-50/60 dark:bg-slate-950 border-slate-200 dark:border-slate-800 font-mono text-slate-900 dark:text-slate-100 font-medium focus:bg-white transition-colors"
                />
              </div>
            </div>
          </div>
        )}

        {/* Section 3 Alternative: Onsite Service Address (if Onsite Visit) */}
        {type === "onsite_visit" && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 border-l-4 border-l-amber-500 p-4 md:p-5 shadow-xs space-y-3">
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 font-extrabold text-[11px] border border-amber-100 dark:border-amber-900 shadow-2xs">
                3
              </span>
              <h2 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                Onsite Service Address
              </h2>
            </div>
            <div>
              <Label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 block">
                Customer Site / Installation Address
              </Label>
              <Input
                placeholder="Enter complete onsite location..."
                value={onsiteAddress}
                onChange={(e) => setOnsiteAddress(e.target.value)}
                className="h-9 text-xs rounded-xl bg-slate-50/60 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 font-medium focus:bg-white transition-colors"
              />
            </div>
          </div>
        )}

        {/* Section 4: Spare Parts & Service Charges (Supports 0 parts without errors) */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 border-l-4 border-l-emerald-500 p-4 md:p-5 shadow-xs space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 font-extrabold text-[11px] border border-emerald-100 dark:border-emerald-900 shadow-2xs">
                4
              </span>
              <h2 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                Spare Parts & Service Charges
              </h2>
            </div>

            <button
              type="button"
              onClick={handleAddPartRow}
              className="text-[10px] font-semibold text-[#2563EB] hover:underline"
            >
              + Add Item
            </button>
          </div>

          <div className="space-y-2.5">
            {parts.length > 0 && (
              <div className="grid grid-cols-12 gap-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-1">
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
                    className="h-9 text-xs rounded-xl bg-slate-50/60 dark:bg-slate-950 border-slate-200 dark:border-slate-800 font-medium text-slate-900 dark:text-slate-100 focus:bg-white transition-colors"
                  />
                </div>
                <div className="col-span-2">
                  <Input
                    type="number"
                    placeholder="0"
                    value={p.unitPrice}
                    onChange={(e) => handleUpdatePart(idx, "unitPrice", e.target.value)}
                    className="h-9 text-xs rounded-xl bg-slate-50/60 dark:bg-slate-950 border-slate-200 dark:border-slate-800 font-mono font-medium text-slate-900 dark:text-slate-100 focus:bg-white transition-colors"
                  />
                </div>
                <div className="col-span-1 flex items-center justify-end gap-1.5">
                  <span className="font-bold text-slate-900 dark:text-white text-xs font-display font-mono">
                    ₹{(p.totalPrice || 0).toLocaleString("en-IN")}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemovePartRow(idx)}
                    className="text-slate-400 hover:text-destructive p-1 rounded-md transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}

            {parts.length === 0 && (
              <div className="text-xs text-slate-400 p-3 bg-slate-50/50 dark:bg-slate-950 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center">
                No spare parts added (Intake without parts is supported). Click <button type="button" onClick={handleAddPartRow} className="text-[#2563EB] font-bold underline">+ Add Item</button> if needed.
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-4 pt-3 border-t border-slate-100 dark:border-slate-800">
            <div>
              <Label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 block">
                Service & Repair Charges (₹)
              </Label>
              <Input
                type="number"
                placeholder="0"
                value={serviceChargesInput}
                onChange={(e) => setServiceChargesInput(e.target.value)}
                className="h-9 text-xs rounded-xl bg-slate-50/60 dark:bg-slate-950 border-slate-200 dark:border-slate-800 w-44 font-mono font-medium text-slate-900 dark:text-slate-100 focus:bg-white transition-colors"
              />
            </div>

            <div>
              <Label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 block">
                Discount (₹)
              </Label>
              <Input
                type="number"
                placeholder="0"
                value={discountInput}
                onChange={(e) => setDiscountInput(e.target.value)}
                className="h-9 text-xs rounded-xl bg-slate-50/60 dark:bg-slate-950 border-slate-200 dark:border-slate-800 w-44 font-mono font-medium text-rose-600 dark:text-rose-400 focus:bg-white transition-colors"
              />
            </div>
          </div>
        </div>
      </form>

      {/* Attached Right Action Sidebar (Portal Target: #admin-right-rail) */}
      {rightRailEl &&
        createPortal(
          <aside className="w-64 h-screen flex flex-col justify-between bg-[#0F172A] border-l border-slate-800/90 text-slate-300 select-none overflow-y-auto print:hidden">
            {/* Top Command & Secondary Operations */}
            <div className="flex-1 flex flex-col min-h-0">
              {/* Header (Aligned with h-14 top bar) */}
              <div className="shrink-0 h-14 px-4 border-b border-slate-800/80 flex items-center justify-between bg-[#0F172A]">
                <div>
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-white">
                    Ticket Actions
                  </h3>
                  <p className="text-[10px] text-slate-400 font-medium mt-0.5">Command & Operations</p>
                </div>
              </div>

              <div className="p-3.5 space-y-4 flex-1 overflow-y-auto">
                {/* Print Job Card (Secondary Option) */}
                {isEditing && (
                  <div>
                    <button
                      type="button"
                      onClick={() => setShowPrintModal(true)}
                      className="w-full flex items-center gap-2.5 rounded-xl py-2 px-3 text-xs font-semibold text-slate-300 hover:bg-slate-800/80 hover:text-white transition-all border border-slate-800 hover:border-slate-700 cursor-pointer"
                    >
                      <FileText className="h-4 w-4 text-slate-400 shrink-0" />
                      <span className="flex-1 text-left">Print Job Card</span>
                    </button>
                  </div>
                )}

                {/* Quick Add Master Records */}
                <div className="space-y-1.5">
                  <div className="px-1.5 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Quick Add Records
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowCustomerModal(true)}
                    className="w-full flex items-center justify-between rounded-xl py-2 px-3 text-xs font-semibold text-slate-300 hover:bg-slate-800/80 hover:text-white transition-all border border-slate-800/80 hover:border-slate-700 bg-slate-900/40 cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <UserPlus className="h-4 w-4 text-blue-400 shrink-0" />
                      <span className="truncate">New Customer</span>
                    </div>
                    <kbd className="text-[10px] font-mono text-slate-400 bg-slate-800 border border-slate-700 px-1.5 py-0.5 rounded font-bold">Alt+C</kbd>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowCenterModal(true)}
                    className="w-full flex items-center gap-2.5 rounded-xl py-2 px-3 text-xs font-semibold text-slate-300 hover:bg-slate-800/80 hover:text-white transition-all border border-slate-800/80 hover:border-slate-700 bg-slate-900/40 cursor-pointer"
                  >
                    <Building2 className="h-4 w-4 text-amber-400 shrink-0" />
                    <span className="flex-1 text-left truncate">Add Service Center</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowCourierModal(true)}
                    className="w-full flex items-center gap-2.5 rounded-xl py-2 px-3 text-xs font-semibold text-slate-300 hover:bg-slate-800/80 hover:text-white transition-all border border-slate-800/80 hover:border-slate-700 bg-slate-900/40 cursor-pointer"
                  >
                    <Truck className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span className="flex-1 text-left truncate">Add Courier</span>
                  </button>
                </div>

                {/* WhatsApp Communications */}
                <div className="space-y-1.5">
                  <div className="px-1.5 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    WhatsApp Updates
                  </div>

                  <button
                    type="button"
                    onClick={handleOpenCustomerWhatsApp}
                    className="group w-full flex items-center gap-2.5 rounded-xl py-2 px-3 text-xs font-semibold text-emerald-400 hover:bg-emerald-950/40 hover:text-emerald-300 transition-all border border-emerald-900/40 bg-emerald-950/20 hover:border-emerald-700/60 cursor-pointer"
                  >
                    <MessageCircle className="h-4 w-4 shrink-0 text-emerald-400" />
                    <span className="flex-1 text-left truncate">Message Customer</span>
                  </button>

                  {type === "company_service_center" && (
                    <>
                      <button
                        type="button"
                        onClick={handleOpenServiceCenterWhatsApp}
                        className="group w-full flex items-center gap-2.5 rounded-xl py-2 px-3 text-xs font-semibold text-slate-300 hover:bg-slate-800/80 hover:text-white transition-all border border-slate-800/80 hover:border-slate-700 bg-slate-900/40 cursor-pointer"
                      >
                        <Building2 className="h-4 w-4 text-slate-400 shrink-0" />
                        <span className="flex-1 text-left truncate">Follow up Service Center</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleOpenCourierPickupWhatsApp}
                        className="group w-full flex items-center gap-2.5 rounded-xl py-2 px-3 text-xs font-semibold text-slate-300 hover:bg-slate-800/80 hover:text-white transition-all border border-slate-800/80 hover:border-slate-700 bg-slate-900/40 cursor-pointer"
                      >
                        <Truck className="h-4 w-4 text-amber-400 shrink-0" />
                        <span className="flex-1 text-left truncate">Ask Courier for Pickup</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleOpenCourierDeliveryWhatsApp}
                        className="group w-full flex items-center gap-2.5 rounded-xl py-2 px-3 text-xs font-semibold text-slate-300 hover:bg-slate-800/80 hover:text-white transition-all border border-slate-800/80 hover:border-slate-700 bg-slate-900/40 cursor-pointer"
                      >
                        <Package className="h-4 w-4 text-purple-400 shrink-0" />
                        <span className="flex-1 text-left truncate">Ask Courier for Delivery</span>
                      </button>
                    </>
                  )}
                </div>

                {/* Audit & Timeline Events */}
                <div className="space-y-1.5">
                  <div className="px-1.5 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Audit & Timeline
                  </div>

                  {/* Show Events Popup Trigger */}
                  <button
                    type="button"
                    onClick={() => setShowEventsListModal(true)}
                    className="w-full flex items-center justify-between rounded-xl py-2 px-3 text-xs font-semibold text-slate-300 hover:bg-slate-800/80 hover:text-white transition-all border border-slate-800/80 hover:border-slate-700 bg-slate-900/40 cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <History className="h-4 w-4 text-blue-400 shrink-0" />
                      <span className="truncate">Show Events</span>
                    </div>
                    <Badge variant="outline" className="text-[10px] font-mono font-bold bg-blue-950/80 text-blue-300 border-blue-800/80 px-1.5 py-0 rounded">
                      {timeline.length}
                    </Badge>
                  </button>

                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => triggerTimelineModal("comment_added")}
                      className="flex items-center justify-center gap-1.5 rounded-xl py-2 px-2 text-xs font-semibold text-slate-300 hover:bg-slate-800/80 hover:text-white transition-all border border-slate-800/80 hover:border-slate-700 bg-slate-900/40 cursor-pointer"
                    >
                      <MessageSquare className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">+ Add Note</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => triggerTimelineModal("status_change")}
                      className="flex items-center justify-center gap-1.5 rounded-xl py-2 px-2 text-xs font-semibold text-slate-300 hover:bg-slate-800/80 hover:text-white transition-all border border-slate-800/80 hover:border-slate-700 bg-slate-900/40 cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">+ Add Event</span>
                    </button>
                  </div>
                </div>

                {/* Milestone Hotkeys */}
                <div className="space-y-1.5">
                  <div className="px-1.5 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Milestone Hotkeys
                  </div>

                  <button
                    type="button"
                    onClick={() => triggerTimelineModal("replacement_sent_service_center")}
                    className="w-full flex items-center justify-between rounded-xl py-2 px-3 text-xs font-semibold text-amber-300 hover:bg-amber-950/40 hover:text-amber-200 transition-all border border-amber-900/40 bg-amber-950/20 hover:border-amber-700/50 cursor-pointer"
                  >
                    <span className="truncate">Sent to SC</span>
                    <kbd className="text-[10px] font-mono text-amber-400 bg-amber-950/80 border border-amber-800 px-1.5 py-0.5 rounded font-bold">F5</kbd>
                  </button>

                  <button
                    type="button"
                    onClick={() => triggerTimelineModal("replacement_received_service_center")}
                    className="w-full flex items-center justify-between rounded-xl py-2 px-3 text-xs font-semibold text-purple-300 hover:bg-purple-950/40 hover:text-purple-200 transition-all border border-purple-900/40 bg-purple-950/20 hover:border-purple-700/50 cursor-pointer"
                  >
                    <span className="truncate">Recv from SC</span>
                    <kbd className="text-[10px] font-mono text-purple-400 bg-purple-950/80 border border-purple-800 px-1.5 py-0.5 rounded font-bold">F6</kbd>
                  </button>

                  <button
                    type="button"
                    onClick={() => triggerTimelineModal("replacement_given_customer")}
                    className="w-full flex items-center justify-between rounded-xl py-2 px-3 text-xs font-semibold text-emerald-300 hover:bg-emerald-950/40 hover:text-emerald-200 transition-all border border-emerald-900/40 bg-emerald-950/20 hover:border-emerald-700/50 cursor-pointer"
                  >
                    <span className="truncate">Given to Cust</span>
                    <kbd className="text-[10px] font-mono text-emerald-400 bg-emerald-950/80 border border-emerald-800 px-1.5 py-0.5 rounded font-bold">F8</kbd>
                  </button>

                  <button
                    type="button"
                    onClick={() => triggerTimelineModal("replacement_received_customer")}
                    className="w-full flex items-center justify-between rounded-xl py-2 px-3 text-xs font-semibold text-blue-300 hover:bg-blue-950/40 hover:text-blue-200 transition-all border border-blue-900/40 bg-blue-950/20 hover:border-blue-700/50 cursor-pointer"
                  >
                    <span className="truncate">Recv from Cust</span>
                    <kbd className="text-[10px] font-mono text-blue-400 bg-blue-950/80 border border-blue-800 px-1.5 py-0.5 rounded font-bold">F9</kbd>
                  </button>
                </div>
              </div>
            </div>

            {/* Bottom Dock: Financial Summary + Primary Save & Accept Button */}
            <div className="shrink-0 p-4 border-t border-slate-800/80 bg-slate-900/90 space-y-3.5">
              {/* Financial Breakdown */}
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between items-center text-[11px] text-slate-400">
                  <span>Spare Parts</span>
                  <span className="font-mono text-slate-300">₹{partsTotal.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between items-center text-[11px] text-slate-400">
                  <span>Service Charge</span>
                  <span className="font-mono text-slate-300">₹{serviceChargesNum.toLocaleString("en-IN")}</span>
                </div>
                {type === "company_service_center" && courierChargesNum > 0 && (
                  <div className="flex justify-between items-center text-[11px] text-slate-400">
                    <span>Courier Charge</span>
                    <span className="font-mono text-slate-300">₹{courierChargesNum.toLocaleString("en-IN")}</span>
                  </div>
                )}
                {discountNum > 0 && (
                  <div className="flex justify-between items-center text-[11px] text-rose-400 font-medium">
                    <span>Discount</span>
                    <span className="font-mono text-rose-400">-₹{discountNum.toLocaleString("en-IN")}</span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-2 border-t border-slate-800 font-bold text-white">
                  <span>Grand Total</span>
                  <span className="font-mono text-sm text-blue-400">₹{grandTotal.toLocaleString("en-IN")}</span>
                </div>
              </div>

              {/* Primary Save & Accept Button placed at the very bottom after grand total */}
              <Button
                type="submit"
                form="service-call-form"
                disabled={saving}
                className="w-full h-10 text-xs font-bold rounded-xl bg-[#2563EB] hover:bg-blue-600 text-white shadow-md shadow-blue-600/30 gap-2 transition-all justify-center cursor-pointer"
              >
                <Save className="h-4 w-4" />
                <span>{saving ? "Saving Ticket..." : "Save & Accept (Ctrl+A)"}</span>
              </Button>
            </div>
          </aside>,
          rightRailEl
        )}

      {/* WhatsApp Message Preview & Dispatch Modal */}
      <WhatsAppPreviewModal
        open={whatsAppModal.open}
        onOpenChange={(open) => setWhatsAppModal((prev) => ({ ...prev, open }))}
        title={whatsAppModal.title}
        recipientName={whatsAppModal.recipientName}
        recipientRole={whatsAppModal.recipientRole}
        defaultPhone={whatsAppModal.defaultPhone}
        defaultMessage={whatsAppModal.defaultMessage}
      />

      {/* Full Timeline Events List Modal */}
      <TimelineEventsListModal
        open={showEventsListModal}
        onOpenChange={setShowEventsListModal}
        timeline={timeline}
        onOpenAddEvent={(stage) => triggerTimelineModal(stage || "status_change")}
      />

      {/* Quick Timeline Modal for Hotkeys F5, F6, F8, F9, Add Note, Add Event */}
      {quickTimelineStage && (
        <AddTimelineEventModal
          open={showQuickTimelineModal}
          onOpenChange={setShowQuickTimelineModal}
          staffList={staffList}
          currentStaffId={handledByStaffId}
          defaultStage={quickTimelineStage}
          defaultCourierName={type === "company_service_center" ? courierName : undefined}
          defaultDocketNumber={type === "company_service_center" ? rmaNumber : undefined}
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
          discount: discountNum > 0 ? discountNum : undefined,
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
