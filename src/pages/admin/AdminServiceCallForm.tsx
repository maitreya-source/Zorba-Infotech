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
  Phone,
  Mail,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  Home,
  Printer,
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
  getCustomers,
  getDeviceCategories,
  getServiceCenters,
  getCouriers,
  getTechnicians,
  getStaffMembers,
  getServiceCall,
  createServiceCall,
  updateServiceCall,
  deleteServiceCall,
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
  const [rightRailEl, setRightRailEl] = useState<HTMLElement | null>(null);
  const [breadcrumbTicketEl, setBreadcrumbTicketEl] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setRightRailEl(document.getElementById("admin-right-rail"));
    setBreadcrumbTicketEl(document.getElementById("admin-breadcrumb-ticket"));
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
  const [showDeleteModal, setShowDeleteModal] = useState(false);
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
    setCustomerName(toTitleCase(cust.name || ""));
    setCustomerPhone(cust.phone || "");
    setCustomerEmail((cust.email || "").toLowerCase());
    setCustomerAddress(toTitleCase(cust.address || ""));
    if (cust.address) {
      setOnsiteAddress(toTitleCase(cust.address));
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
    onF5: () => triggerTimelineModal("replacement_received_customer"),
    onF6: () => triggerTimelineModal("replacement_sent_service_center"),
    onF8: () => triggerTimelineModal("replacement_received_service_center"),
    onF9: () => triggerTimelineModal("replacement_given_customer"),
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

  const handleDeleteTicket = async () => {
    if (!id) return;
    try {
      await deleteServiceCall(id);
      toast.success("Ticket moved to Trash. It can be restored anytime.");
      navigate("/admin/service-calls");
    } catch (err: any) {
      console.error("Error deleting ticket:", err);
      toast.error(err?.message || "Failed to delete ticket");
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
      <form id="service-call-form" onSubmit={handleSubmit} className="space-y-4 max-w-5xl mx-auto">
        {/* Card 0: Service Workflow Mode Switcher + Header Metadata (Status, Tech Assignee, Date) */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs p-4 md:p-5 space-y-4">
          {/* Top Service Type Mode Switcher Integrated into Header Card */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Service Workflow Mode
              </Label>
              <span className="text-[11px] text-slate-400 font-medium">Select workflow to adjust required fields</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-slate-100/80 dark:bg-slate-950 p-1.5 rounded-xl border border-slate-200/70 dark:border-slate-800/80">
              <button
                type="button"
                onClick={() => setType("company_service_center")}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  type === "company_service_center"
                    ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs border border-slate-200/60 dark:border-slate-700"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <Building2 className="h-4 w-4 shrink-0" />
                <span>Company Service Center</span>
              </button>

              <button
                type="button"
                onClick={() => setType("in_house_repair")}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  type === "in_house_repair"
                    ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs border border-slate-200/60 dark:border-slate-700"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <Wrench className="h-4 w-4 shrink-0" />
                <span>In-House Service / Refill</span>
              </button>

              <button
                type="button"
                onClick={() => setType("onsite_visit")}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  type === "onsite_visit"
                    ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs border border-slate-200/60 dark:border-slate-700"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <MapPin className="h-4 w-4 shrink-0" />
                <span>Onsite Visit & Install</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end pt-3 border-t border-slate-100 dark:border-slate-800/80">
            {/* Overall Ticket Status */}
            <div>
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 block">
                Overall Ticket Status
              </Label>
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
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 block">
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
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
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

        {/* Section 1: Customer Details */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-4 md:p-5 shadow-xs space-y-3.5">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs">
                1
              </span>
              <h2 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Customer & Contact Details
              </h2>
            </div>

            <div className="flex items-center gap-2">
              {selectedCustomerId && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowEditCustomerModal(true)}
                  className="h-8 text-xs font-semibold text-blue-600 dark:text-blue-400 cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-950/50"
                >
                  Edit Profile
                </Button>
              )}
            </div>
          </div>

          {/* Unified Customer Name & Search */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Customer Name / Search <span className="text-red-500 font-bold">*</span>
              </Label>
            </div>
            <CustomerTypeahead
              selectedCustomerId={selectedCustomerId}
              value={customerName}
              onChange={setCustomerName}
              onSelectCustomer={handleSelectCustomer}
              onAddNewCustomer={() => setShowCustomerModal(true)}
              placeholder="Type name or search existing customer..."
            />
          </div>

          {/* Populated Read-Only Customer Info Display */}
          {customerPhone || customerAddress || customerEmail || selectedCustomerId ? (
            <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 p-3.5 space-y-2.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {/* Phone */}
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 dark:text-slate-500 font-medium shrink-0 flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 text-blue-500" />
                    Phone:
                  </span>
                  <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                    {customerPhone ? formatIndianPhoneNumber(customerPhone) : <span className="text-slate-400 font-normal italic">Not provided</span>}
                  </span>
                </div>

                {/* Email */}
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 dark:text-slate-500 font-medium shrink-0 flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-blue-500" />
                    Email:
                  </span>
                  <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
                    {customerEmail || <span className="text-slate-400 font-normal italic">Not provided</span>}
                  </span>
                </div>
              </div>

              {/* Address */}
              <div className="flex items-start gap-2 pt-2.5 border-t border-slate-200/60 dark:border-slate-800/60 text-xs">
                <span className="text-slate-400 dark:text-slate-500 font-medium shrink-0 flex items-center gap-1.5 mt-0.5">
                  <MapPin className="h-3.5 w-3.5 text-blue-500" />
                  Address:
                </span>
                <span className="text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
                  {customerAddress || <span className="text-slate-400 font-normal italic">No address on file</span>}
                </span>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-800 p-3 bg-slate-50/40 dark:bg-slate-950/40 text-center">
              <p className="text-xs text-slate-400">
                Select a customer above to view contact details, or click <button type="button" onClick={() => setShowCustomerModal(true)} className="text-blue-600 dark:text-blue-400 font-semibold underline cursor-pointer">New Customer</button> to create a profile.
              </p>
            </div>
          )}
        </div>

        {/* Section 2: Device & Warranty Details */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-4 md:p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs">
              2
            </span>
            <h2 className="text-xs font-bold text-slate-800 dark:text-slate-200">
              Device & Issue Details
            </h2>
          </div>

          {/* Primary Row: Category, Warranty, Model Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
            {/* Device Category */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Device Category
                </Label>
                <button
                  type="button"
                  onClick={() => setShowCategoryModal(true)}
                  className="text-[10px] font-semibold text-[#2563EB] hover:underline cursor-pointer"
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
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 block">
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
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 block">
                Model Number / Name
              </Label>
              <ModelTypeahead
                categoryName={deviceCategory}
                value={modelNumber}
                onChange={setModelNumber}
              />
            </div>
          </div>

          {/* Secondary Metadata Sub-Grid (Serial, Qty, DOP, Bill No) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 block">
                Serial Number / IMEI
              </Label>
              <Input
                placeholder="e.g. 15082026"
                value={serialNumber}
                onChange={(e) => setSerialNumber(e.target.value)}
                className="h-9 text-xs rounded-xl bg-slate-50/60 dark:bg-slate-950 border-slate-200 dark:border-slate-800 font-mono text-slate-900 dark:text-slate-100 font-medium placeholder:text-slate-400 focus:bg-white transition-colors"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 block">
                Quantity
              </Label>
              <Input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="h-9 text-xs rounded-xl bg-slate-50/60 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 font-medium focus:bg-white transition-colors"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 block">
                Purchase Date (DOP)
              </Label>
              <Input
                type="date"
                value={dateOfPurchase}
                onChange={(e) => setDateOfPurchase(e.target.value)}
                className="h-9 text-xs rounded-xl bg-slate-50/60 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 font-medium focus:bg-white transition-colors"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 block">
                Invoice / Bill Number
              </Label>
              <Input
                placeholder="e.g. INV-2024-9981"
                value={billNumber}
                onChange={(e) => setBillNumber(e.target.value)}
                className="h-9 text-xs rounded-xl bg-slate-50/60 dark:bg-slate-950 border-slate-200 dark:border-slate-800 font-mono text-slate-900 dark:text-slate-100 font-medium placeholder:text-slate-400 focus:bg-white transition-colors"
              />
            </div>
          </div>

          {/* Issue / Service Task Description with Horizontal Scrollable Chip Group */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
              Issue / Service Task Description <span className="text-red-500 font-bold">*</span>
            </Label>
            <Textarea
              placeholder="Describe symptoms, requested repair, or installation tasks..."
              value={issueDescription}
              onChange={(e) => setIssueDescription(e.target.value)}
              rows={2}
              required
              className="text-xs rounded-xl bg-slate-50/60 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 font-medium placeholder:text-slate-400 focus:bg-white transition-colors"
            />

            {/* Sleek Horizontally Scrollable Chip Group */}
            <div className="flex items-center gap-1.5 overflow-x-auto py-1.5 no-scrollbar text-xs">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold shrink-0">Suggestions:</span>
              {QUICK_TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => {
                    setIssueDescription((prev) => (prev ? `${prev}, ${tag}` : tag));
                  }}
                  className="shrink-0 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-300 hover:border-blue-400 hover:text-blue-600 transition-colors cursor-pointer whitespace-nowrap"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Section 3: Company Service Center Parcel Dispatch (with Courier Selection & WhatsApp follow-ups) */}
        {type === "company_service_center" && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-4 md:p-5 shadow-xs space-y-3.5">
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs">
                3
              </span>
              <h2 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Service Center & Courier Dispatch
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3.5">
              {/* Select Service Center */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Service Center
                  </Label>
                  <button
                    type="button"
                    onClick={() => setShowCenterModal(true)}
                    className="text-[10px] font-semibold text-[#2563EB] hover:underline cursor-pointer"
                  >
                    + Add
                  </button>
                </div>
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
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 block">
                  Dispatch Address
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
                <div className="flex items-center justify-between mb-1.5">
                  <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Courier Partner
                  </Label>
                  <button
                    type="button"
                    onClick={() => setShowCourierModal(true)}
                    className="text-[10px] font-semibold text-[#2563EB] hover:underline cursor-pointer"
                  >
                    + Add
                  </button>
                </div>
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
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 block">
                  Docket / RMA Tracking No.
                </Label>
                <Input
                  placeholder="e.g. TRK-9981 / AUG-2026"
                  value={rmaNumber}
                  onChange={(e) => setRmaNumber(e.target.value)}
                  className="h-9 text-xs rounded-xl bg-slate-50/60 dark:bg-slate-950 border-slate-200 dark:border-slate-800 font-mono text-slate-900 dark:text-slate-100 font-medium placeholder:text-slate-400 focus:bg-white transition-colors"
                />
              </div>

              {/* Courier Charges */}
              <div>
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 block">
                  Courier Charges (₹)
                </Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={courierChargesInput}
                  onChange={(e) => setCourierChargesInput(e.target.value)}
                  className="h-9 text-xs rounded-xl bg-slate-50/60 dark:bg-slate-950 border-slate-200 dark:border-slate-800 font-mono text-slate-900 dark:text-slate-100 font-medium placeholder:text-slate-400 focus:bg-white transition-colors"
                />
              </div>
            </div>
          </div>
        )}

        {/* Section 3 Alternative: Onsite Service Address (if Onsite Visit) */}
        {type === "onsite_visit" && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-4 md:p-5 shadow-xs space-y-3">
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs">
                3
              </span>
              <h2 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Onsite Service Address
              </h2>
            </div>
            <div>
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 block">
                Customer Site / Installation Address
              </Label>
              <Input
                placeholder="Enter complete onsite location..."
                value={onsiteAddress}
                onChange={(e) => setOnsiteAddress(e.target.value)}
                className="h-9 text-xs rounded-xl bg-slate-50/60 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 font-medium placeholder:text-slate-400 focus:bg-white transition-colors"
              />
            </div>
          </div>
        )}

        {/* Section 4: Spare Parts & Service Charges */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-4 md:p-5 shadow-xs space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs">
                4
              </span>
              <h2 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Spare Parts & Service Charges
              </h2>
            </div>

            <button
              type="button"
              onClick={handleAddPartRow}
              className="text-[10px] font-semibold text-[#2563EB] hover:underline cursor-pointer"
            >
              Add Item
            </button>
          </div>

          <div className="space-y-2.5">
            {parts.length > 0 && (
              <div className="grid grid-cols-12 gap-3 text-xs font-semibold text-slate-500 dark:text-slate-400 px-1">
                <div className="col-span-7">Part / Item Name (Auto-saved to Catalog)</div>
                <div className="col-span-2">Qty</div>
                <div className="col-span-2">Unit Price (₹)</div>
                <div className="col-span-1 text-right">Total</div>
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
                    className="h-9 text-xs rounded-xl bg-slate-50/60 dark:bg-slate-950 border-slate-200 dark:border-slate-800 font-mono font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:bg-white transition-colors"
                  />
                </div>
                <div className="col-span-1 flex items-center justify-end gap-1.5">
                  <span className="font-bold text-slate-900 dark:text-white text-xs font-display font-mono">
                    ₹{(p.totalPrice || 0).toLocaleString("en-IN")}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemovePartRow(idx)}
                    className="text-slate-400 hover:text-destructive p-1 rounded-md transition-colors cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}

            {parts.length === 0 && (
              <div className="text-xs text-slate-400 p-3 bg-slate-50/50 dark:bg-slate-950 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center">
                No spare parts added. Click <button type="button" onClick={handleAddPartRow} className="text-[#2563EB] font-bold underline cursor-pointer">Add Item</button> if replacement hardware is required.
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-4 pt-3 border-t border-slate-100 dark:border-slate-800">
            <div>
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 block">
                Service & Repair Charges (₹)
              </Label>
              <Input
                type="number"
                placeholder="0"
                value={serviceChargesInput}
                onChange={(e) => setServiceChargesInput(e.target.value)}
                className="h-9 text-xs rounded-xl bg-slate-50/60 dark:bg-slate-950 border-slate-200 dark:border-slate-800 w-44 font-mono font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:bg-white transition-colors"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 block">
                Discount (₹)
              </Label>
              <Input
                type="number"
                placeholder="0"
                value={discountInput}
                onChange={(e) => setDiscountInput(e.target.value)}
                className="h-9 text-xs rounded-xl bg-slate-50/60 dark:bg-slate-950 border-slate-200 dark:border-slate-800 w-44 font-mono font-medium text-rose-600 dark:text-rose-400 placeholder:text-slate-400 focus:bg-white transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Mobile-Only (< xl) Ticket Operations & Actions Card */}
        <div className="xl:hidden bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-4 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b pb-2.5">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Ticket Actions & Operations</h3>
              <p className="text-[11px] text-slate-400">Audits, WhatsApp updates & milestone progression</p>
            </div>
            {isEditing && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowPrintModal(true)}
                className="h-8 text-xs font-semibold rounded-lg gap-1.5 cursor-pointer"
              >
                <Printer className="h-3.5 w-3.5" />
                <span>Print</span>
              </Button>
            )}
          </div>

          {/* 1. Audit & Events */}
          <div className="space-y-2">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Audit & Timeline Events
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowEventsListModal(true)}
                className="h-9 text-xs font-semibold rounded-xl gap-1.5 bg-slate-50 dark:bg-slate-800/60 cursor-pointer"
              >
                <Clock className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                <span>Events ({timeline.length})</span>
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => triggerTimelineModal("comment_added")}
                className="h-9 text-xs font-semibold rounded-xl gap-1.5 bg-slate-50 dark:bg-slate-800/60 cursor-pointer"
              >
                <FileText className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                <span>Add Note</span>
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => triggerTimelineModal("status_change")}
                className="h-9 text-xs font-semibold rounded-xl gap-1.5 bg-slate-50 dark:bg-slate-800/60 cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                <span>Add Event</span>
              </Button>
            </div>
          </div>

          {/* 2. WhatsApp Communications */}
          <div className="space-y-2">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              WhatsApp Communications
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleOpenCustomerWhatsApp}
                className="h-9 text-xs font-semibold rounded-xl gap-2 justify-start cursor-pointer border-emerald-300 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300"
              >
                <MessageSquare className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                <span>Message Customer</span>
              </Button>

              {type === "company_service_center" && serviceCenterName && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleOpenServiceCenterWhatsApp}
                  className="h-9 text-xs font-semibold rounded-xl gap-2 justify-start cursor-pointer"
                >
                  <RefreshCw className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                  <span>Follow-up Center</span>
                </Button>
              )}

              {selectedCourierId && (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleOpenCourierPickupWhatsApp}
                    className="h-9 text-xs font-semibold rounded-xl gap-2 justify-start cursor-pointer"
                  >
                    <ArrowUp className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                    <span>Courier Pickup</span>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleOpenCourierDeliveryWhatsApp}
                    className="h-9 text-xs font-semibold rounded-xl gap-2 justify-start cursor-pointer"
                  >
                    <ArrowDown className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                    <span>Courier Delivery</span>
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* 3. Milestone Progression */}
          <div className="space-y-2">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Milestone Progression
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { index: 1, stage: "replacement_received_customer" as const, label: "1. Recv from Customer" },
                { index: 2, stage: "replacement_sent_service_center" as const, label: "2. Sent to Center" },
                { index: 3, stage: "replacement_received_service_center" as const, label: "3. Recv from Center" },
                { index: 4, stage: "replacement_given_customer" as const, label: "4. Given to Customer" },
              ].map((m) => {
                let activeIndex = 1;
                if (timeline && timeline.length > 0) {
                  for (let i = timeline.length - 1; i >= 0; i--) {
                    const s = timeline[i]?.stage;
                    if (s === "replacement_given_customer") { activeIndex = 4; break; }
                    if (s === "replacement_received_service_center") { activeIndex = 3; break; }
                    if (s === "replacement_sent_service_center") { activeIndex = 2; break; }
                    if (s === "replacement_received_customer" || s === "intake_created") { activeIndex = 1; break; }
                  }
                } else {
                  if (status === "delivered" || status === "completed") activeIndex = 4;
                  else if (status === "sent_to_service_center") activeIndex = 2;
                  else if (status === "received" || status === "in_progress") activeIndex = 1;
                }
                const isActive = activeIndex === m.index;

                return (
                  <button
                    key={m.stage}
                    type="button"
                    onClick={() => triggerTimelineModal(m.stage)}
                    className={`flex items-center justify-between rounded-xl py-2 px-2.5 text-xs transition-all cursor-pointer border ${
                      isActive
                        ? "bg-blue-50 dark:bg-blue-950/60 border-blue-400 dark:border-blue-700 text-blue-700 dark:text-blue-300 font-bold shadow-2xs"
                        : "bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 font-medium"
                    }`}
                  >
                    <span className="truncate">{m.label}</span>
                    {isActive && <CheckCircle2 className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 shrink-0 ml-1" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. Quick Master Records */}
          <div className="space-y-2">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Quick Master Records
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowCustomerModal(true)}
                className="h-8.5 text-xs font-semibold rounded-xl gap-1.5 cursor-pointer"
              >
                <UserPlus className="h-3.5 w-3.5 text-slate-400" />
                <span>Customer</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowCenterModal(true)}
                className="h-8.5 text-xs font-semibold rounded-xl gap-1.5 cursor-pointer"
              >
                <Home className="h-3.5 w-3.5 text-slate-400" />
                <span>Center</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowCourierModal(true)}
                className="h-8.5 text-xs font-semibold rounded-xl gap-1.5 cursor-pointer"
              >
                <Truck className="h-3.5 w-3.5 text-slate-400" />
                <span>Courier</span>
              </Button>
            </div>
          </div>

          {/* Delete Button on Mobile */}
          {isEditing && (
            <div className="pt-2 border-t">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowDeleteModal(true)}
                className="w-full h-9 text-xs text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl gap-2 cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Delete Ticket</span>
              </Button>
            </div>
          )}
        </div>

        {/* Mobile Sticky Bottom Action Bar (< xl) */}
        <div className="xl:hidden sticky bottom-0 z-30 -mx-2 sm:-mx-4 -mb-2 sm:-mb-4 p-3 bg-white/95 dark:bg-slate-900/95 border-t border-slate-200 dark:border-slate-800 shadow-lg backdrop-blur-md flex items-center justify-between gap-3">
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-bold block">Grand Total</span>
            <span className="font-mono text-base font-extrabold text-slate-900 dark:text-white">
              ₹{grandTotal.toLocaleString("en-IN")}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Link to="/admin/service-calls">
              <Button type="button" variant="outline" size="sm" className="h-10 text-xs rounded-xl cursor-pointer">
                Cancel
              </Button>
            </Link>

            <Button
              type="submit"
              disabled={saving}
              className="h-10 px-5 text-xs font-bold bg-[#2563EB] hover:bg-blue-600 text-white rounded-xl shadow-glow-sm cursor-pointer"
            >
              {saving ? "Saving..." : isEditing ? "Update Ticket" : "Save Ticket"}
            </Button>
          </div>
        </div>
      </form>

      {/* Attached Right Action Sidebar (Portal Target: #admin-right-rail) */}
      {rightRailEl &&
        createPortal(
          <aside className="w-72 h-screen flex flex-col justify-between bg-[#0F172A] border-l border-slate-800/90 text-slate-300 select-none overflow-hidden print:hidden">
            {/* Header (Aligned with top bar) */}
            <div className="shrink-0 px-4 pt-4 pb-3 border-b border-slate-800/80 bg-[#0F172A]">
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-white">
                TICKET ACTIONS
              </h3>
              <p className="text-xs text-slate-400 font-normal mt-0.5">Operations & Lifecycle Controls</p>
            </div>

            {/* Scrollable Action Groups */}
            <div className="flex-1 p-3.5 space-y-4 overflow-y-auto min-h-0">
              {/* Audit History & Quick Note / Event */}
              <div className="space-y-2">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  AUDIT & EVENTS
                </div>

                <button
                  type="button"
                  onClick={() => setShowEventsListModal(true)}
                  className="w-full flex items-center justify-between rounded-xl py-2.5 px-3 text-xs font-semibold text-white hover:bg-slate-800 transition-all border border-slate-800 hover:border-slate-700 bg-[#141e30] cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <Clock className="h-4 w-4 text-indigo-400 shrink-0" />
                    <span>Show Events</span>
                  </div>
                  <span className="text-xs font-bold bg-[#4F46E5] text-white h-5 w-5 rounded-full flex items-center justify-center">
                    {timeline.length}
                  </span>
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => triggerTimelineModal("comment_added")}
                    className="flex items-center justify-center gap-2 rounded-xl py-2.5 px-2 text-xs font-semibold text-slate-200 hover:bg-slate-800 hover:text-white transition-all border border-slate-800 hover:border-slate-700 bg-[#141e30] cursor-pointer"
                  >
                    <FileText className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span>Add Note</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => triggerTimelineModal("status_change")}
                    className="flex items-center justify-center gap-2 rounded-xl py-2.5 px-2 text-xs font-semibold text-slate-200 hover:bg-slate-800 hover:text-white transition-all border border-slate-800 hover:border-slate-700 bg-[#141e30] cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span>Add Event</span>
                  </button>
                </div>
              </div>

              {/* WhatsApp Communications & Follow-ups */}
              <div className="space-y-2">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  WHATSAPP UPDATES
                </div>

                <div className="space-y-1.5">
                  <button
                    type="button"
                    onClick={handleOpenCustomerWhatsApp}
                    className="w-full flex items-center justify-between rounded-xl py-2.5 px-3 text-xs font-semibold text-white hover:bg-slate-800 transition-all border border-slate-800 hover:border-slate-700 bg-[#141e30] cursor-pointer group"
                  >
                    <div className="flex items-center gap-2.5">
                      <MessageSquare className="h-4 w-4 shrink-0 text-indigo-400" />
                      <span>Message Customer</span>
                    </div>
                    <ArrowRight className="h-4 w-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                  </button>

                  <button
                    type="button"
                    onClick={handleOpenServiceCenterWhatsApp}
                    className="w-full flex items-center justify-between rounded-xl py-2.5 px-3 text-xs font-semibold text-slate-200 hover:bg-slate-800 hover:text-white transition-all border border-slate-800 hover:border-slate-700 bg-[#141e30] cursor-pointer group"
                  >
                    <div className="flex items-center gap-2.5">
                      <RefreshCw className="h-4 w-4 shrink-0 text-slate-400" />
                      <span>Follow-up Service Center</span>
                    </div>
                    <ArrowRight className="h-4 w-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                  </button>

                  <button
                    type="button"
                    onClick={handleOpenCourierPickupWhatsApp}
                    className="w-full flex items-center justify-between rounded-xl py-2.5 px-3 text-xs font-semibold text-slate-200 hover:bg-slate-800 hover:text-white transition-all border border-slate-800 hover:border-slate-700 bg-[#141e30] cursor-pointer group"
                  >
                    <div className="flex items-center gap-2.5">
                      <ArrowUp className="h-4 w-4 shrink-0 text-slate-400" />
                      <span>Ask Courier for Pickup</span>
                    </div>
                    <ArrowRight className="h-4 w-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                  </button>

                  <button
                    type="button"
                    onClick={handleOpenCourierDeliveryWhatsApp}
                    className="w-full flex items-center justify-between rounded-xl py-2.5 px-3 text-xs font-semibold text-slate-200 hover:bg-slate-800 hover:text-white transition-all border border-slate-800 hover:border-slate-700 bg-[#141e30] cursor-pointer group"
                  >
                    <div className="flex items-center gap-2.5">
                      <ArrowDown className="h-4 w-4 shrink-0 text-slate-400" />
                      <span>Ask Courier for Delivery</span>
                    </div>
                    <ArrowRight className="h-4 w-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </div>
              </div>

              {/* Milestone Progression */}
              <div className="space-y-2">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  MILESTONE PROGRESSION
                </div>

                <div className="space-y-1">
                  {[
                    {
                      index: 1,
                      stage: "replacement_received_customer" as const,
                      label: "Recv from Customer",
                      hotkey: "F5",
                    },
                    {
                      index: 2,
                      stage: "replacement_sent_service_center" as const,
                      label: "Sent to Service Center",
                      hotkey: "F6",
                    },
                    {
                      index: 3,
                      stage: "replacement_received_service_center" as const,
                      label: "Recv from Service Cent...",
                      hotkey: "F8",
                    },
                    {
                      index: 4,
                      stage: "replacement_given_customer" as const,
                      label: "Given to Customer",
                      hotkey: "F9",
                    },
                  ].map((m) => {
                    // Determine if this milestone is the current active milestone
                    let activeIndex = 1;
                    if (timeline && timeline.length > 0) {
                      for (let i = timeline.length - 1; i >= 0; i--) {
                        const s = timeline[i]?.stage;
                        if (s === "replacement_given_customer") { activeIndex = 4; break; }
                        if (s === "replacement_received_service_center") { activeIndex = 3; break; }
                        if (s === "replacement_sent_service_center") { activeIndex = 2; break; }
                        if (s === "replacement_received_customer" || s === "intake_created") { activeIndex = 1; break; }
                      }
                    } else {
                      if (status === "delivered" || status === "completed") activeIndex = 4;
                      else if (status === "sent_to_service_center") activeIndex = 2;
                      else if (status === "received" || status === "in_progress") activeIndex = 1;
                    }

                    const isActive = activeIndex === m.index;

                    return (
                      <button
                        key={m.stage}
                        type="button"
                        onClick={() => triggerTimelineModal(m.stage)}
                        className={`w-full flex items-center justify-between rounded-xl py-2 px-2.5 text-xs transition-all cursor-pointer group ${
                          isActive
                            ? "font-semibold text-white bg-[#141e30] border border-slate-700/80 shadow-xs"
                            : "font-medium text-slate-300 hover:bg-slate-800/80 hover:text-white border border-transparent"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span
                            className={`h-5 w-5 rounded-full font-bold flex items-center justify-center text-[10px] shrink-0 ${
                              isActive
                                ? "bg-[#4F46E5] text-white"
                                : "bg-slate-800 border border-slate-700 text-slate-300"
                            }`}
                          >
                            {m.index}
                          </span>
                          <span className="truncate">{m.label}</span>
                        </div>
                        <span className="text-[10px] font-mono text-slate-400 font-bold shrink-0">{m.hotkey}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Ticket Controls / Operations (Print & Delete) */}
              {isEditing && (
                <div className="space-y-2">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    TICKET CONTROLS
                  </div>

                  <div className="space-y-1.5">
                    <button
                      type="button"
                      onClick={() => setShowPrintModal(true)}
                      className="w-full flex items-center justify-between rounded-xl py-2.5 px-3 text-xs font-semibold text-white hover:bg-slate-800 transition-all border border-slate-800 hover:border-slate-700 bg-[#141e30] cursor-pointer group"
                    >
                      <div className="flex items-center gap-2.5">
                        <Printer className="h-4 w-4 shrink-0 text-indigo-400" />
                        <span>Print Job Card</span>
                      </div>
                      <ArrowRight className="h-4 w-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowDeleteModal(true)}
                      className="w-full flex items-center justify-between rounded-xl py-2.5 px-3 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition-all border border-slate-800 hover:border-slate-700 bg-[#141e30] cursor-pointer group"
                    >
                      <div className="flex items-center gap-2.5">
                        <Trash2 className="h-4 w-4 shrink-0 text-slate-400" />
                        <span>Delete Ticket</span>
                      </div>
                      <ArrowRight className="h-4 w-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  </div>
                </div>
              )}

              {/* Master Record Quick Adds */}
              <div className="space-y-2">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  QUICK MASTER RECORDS
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setShowCustomerModal(true)}
                    className="flex items-center justify-center gap-1.5 rounded-xl py-2.5 px-2 text-xs font-semibold text-slate-200 hover:bg-slate-800 hover:text-white transition-all border border-slate-800 hover:border-slate-700 bg-[#141e30] cursor-pointer"
                  >
                    <UserPlus className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span>Customer</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowCenterModal(true)}
                    className="flex items-center justify-center gap-1.5 rounded-xl py-2.5 px-2 text-xs font-semibold text-slate-200 hover:bg-slate-800 hover:text-white transition-all border border-slate-800 hover:border-slate-700 bg-[#141e30] cursor-pointer"
                  >
                    <Home className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span>Center</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowCourierModal(true)}
                    className="flex items-center justify-center gap-1.5 rounded-xl py-2.5 px-2 text-xs font-semibold text-slate-200 hover:bg-slate-800 hover:text-white transition-all border border-slate-800 hover:border-slate-700 bg-[#141e30] cursor-pointer"
                  >
                    <Truck className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span>Courier</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Pinned Sticky Bottom Action Bar: Financial Summary + Primary Save CTA */}
            <div className="shrink-0 p-3.5 border-t border-slate-800/80 bg-slate-900/95 space-y-3">
              {/* Financial Breakdown */}
              <div className="space-y-1 text-xs">
                <div className="flex justify-between items-center text-[11px] text-slate-300">
                  <span>Spare Parts</span>
                  <span className="font-mono text-slate-200 font-semibold">₹{partsTotal.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between items-center text-[11px] text-slate-300">
                  <span>Service Charge</span>
                  <span className="font-mono text-slate-200 font-semibold">₹{serviceChargesNum.toLocaleString("en-IN")}</span>
                </div>
                {type === "company_service_center" && courierChargesNum > 0 && (
                  <div className="flex justify-between items-center text-[11px] text-slate-300">
                    <span>Courier Charge</span>
                    <span className="font-mono text-slate-200 font-semibold">₹{courierChargesNum.toLocaleString("en-IN")}</span>
                  </div>
                )}
                {discountNum > 0 && (
                  <div className="flex justify-between items-center text-[11px] text-rose-400 font-medium">
                    <span>Discount</span>
                    <span className="font-mono text-rose-400 font-semibold">-₹{discountNum.toLocaleString("en-IN")}</span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-2 border-t border-slate-800 font-bold text-white">
                  <span>Grand Total</span>
                  <span className="font-mono text-sm text-blue-400">₹{grandTotal.toLocaleString("en-IN")}</span>
                </div>
              </div>

              {/* Primary Save & Accept Button pinned in sticky footer */}
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
        onUpdated={(updated) => {
          if (updated) {
            if (updated.name) setCustomerName(toTitleCase(updated.name));
            if (updated.phone) setCustomerPhone(updated.phone);
            if (updated.email !== undefined) setCustomerEmail((updated.email || "").toLowerCase());
            if (updated.address !== undefined) setCustomerAddress(toTitleCase(updated.address || ""));
          }
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

      {/* Delete Ticket Confirmation Dialog */}
      <AlertDialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Move Ticket {ticketNo} to Trash?</AlertDialogTitle>
            <AlertDialogDescription>
              This ticket will be moved to the <strong>Trash / Archived</strong> tab and hidden from active lists. You can restore it back anytime from the Service Calls dashboard.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTicket}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 font-bold"
            >
              Move to Trash
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Top Header Breadcrumb Ticket Number Portal */}
      {breadcrumbTicketEl && ticketNo &&
        createPortal(
          <div className="flex items-center gap-2 ml-2">
            <span className="text-slate-600">/</span>
            <span className="font-bold text-white tracking-wide font-mono">
              {ticketNo}
            </span>
          </div>,
          breadcrumbTicketEl
        )}
    </div>
  );
}
