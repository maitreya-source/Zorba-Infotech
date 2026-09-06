import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  Building2,
  Wrench,
  MapPin,
  Send,
  Inbox,
  Clock,
  Package,
  CheckCircle2,
  XCircle,
  Printer,
  MessageSquare,
  Copy,
} from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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
  updateServiceCallPaymentStatus,
} from "@/lib/firestore";
import { LoadingScreen } from "@/components/common";
import {
  toTitleCase,
  formatIndianPhoneNumber,
  generateWhatsAppMessage,
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
  ServiceCall,
  ServiceCallStatus,
  ServiceCallType,
  ServicePart,
  WarrantyStatus,
  WhatsAppTargetModule,
  PaymentStatus,
  PaymentMode,
  Product,
} from "@/lib/types";
import TimelineEventsListModal from "@/components/admin/TimelineEventsListModal";
import AddTimelineEventModal from "@/components/admin/AddTimelineEventModal";
import WhatsAppPreviewModal from "@/components/admin/WhatsAppPreviewModal";
import EmailPreviewModal from "@/components/admin/EmailPreviewModal";
import CreateCustomerModal from "@/components/admin/CreateCustomerModal";
import EditCustomerModal from "@/components/admin/EditCustomerModal";
import CreateProductModal from "@/components/admin/CreateProductModal";
import CreateDeviceCategoryModal from "@/components/admin/CreateDeviceCategoryModal";
import { useResourcePresence } from "@/lib/realtimeSync";
import ResourceCollisionAlert from "@/components/admin/ResourceCollisionAlert";
import CreateServiceCenterModal from "@/components/admin/CreateServiceCenterModal";
import EditServiceCenterModal from "@/components/admin/EditServiceCenterModal";
import AddServiceCenterAddressModal from "@/components/admin/service-call/AddServiceCenterAddressModal";
import CreateCourierModal from "@/components/admin/CreateCourierModal";
import JobCardPrintModal from "@/components/admin/JobCardPrintModal";
import DispatchSlipPrintModal from "@/components/admin/DispatchSlipPrintModal";
import ServiceCallCustomerCard from "@/components/admin/service-call/ServiceCallCustomerCard";
import ServiceCallDeviceDetailsCard from "@/components/admin/service-call/ServiceCallDeviceDetailsCard";
import ServiceCallBillingPartsCard from "@/components/admin/service-call/ServiceCallBillingPartsCard";
import ServiceCallLifecycleRail from "@/components/admin/service-call/ServiceCallLifecycleRail";
import ServiceCallPaymentModal from "@/components/admin/service-call/ServiceCallPaymentModal";
import { useStaffProfile } from "@/contexts/StaffProfileContext";
import { useAuth } from "@/contexts/AuthContext";
import { useTallyShortcuts } from "@/hooks/useTallyShortcuts";
import { useTallyFormNavigation } from "@/hooks/useTallyKeyboard";

const QUICK_TAGS = [
  "Power Dead",
  "Screen Broken",
  "No Display",
  "OS Boot Failure",
  "Slow / Freezing",
  "Keyboard Issue",
  "Printer Paper Jam",
  "Warranty Claim",
];

const STATUS_LIST: {
  value: ServiceCallStatus;
  label: string;
  hindiLabel: string;
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  bgClass: string;
  dotColor: string;
}[] = [
  {
    value: "received",
    label: "Received",
    hindiLabel: "डिवाइस जमा हुआ",
    icon: Inbox,
    iconColor: "text-blue-600 dark:text-blue-400",
    bgClass: "bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/60",
    dotColor: "bg-blue-500",
  },
  {
    value: "sent_to_service_center",
    label: "Sent to Service Center",
    hindiLabel: "सर्विस सेंटर भेजा गया",
    icon: Building2,
    iconColor: "text-indigo-600 dark:text-indigo-400",
    bgClass: "bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/60",
    dotColor: "bg-indigo-500",
  },
  {
    value: "in_progress",
    label: "In Progress",
    hindiLabel: "काम चालू है",
    icon: Clock,
    iconColor: "text-purple-600 dark:text-purple-400",
    bgClass: "bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800/60",
    dotColor: "bg-purple-500",
  },
  {
    value: "waiting_for_parts",
    label: "Waiting for Parts",
    hindiLabel: "पार्ट्स का इंतजार",
    icon: Package,
    iconColor: "text-amber-600 dark:text-amber-400",
    bgClass: "bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/60",
    dotColor: "bg-amber-500",
  },
  {
    value: "completed",
    label: "Completed",
    hindiLabel: "तैयार / ठीक हो गया",
    icon: CheckCircle2,
    iconColor: "text-emerald-600 dark:text-emerald-400",
    bgClass: "bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60",
    dotColor: "bg-emerald-500",
  },
  {
    value: "delivered",
    label: "Delivered",
    hindiLabel: "ग्राहक को सौंप दिया",
    icon: Send,
    iconColor: "text-teal-600 dark:text-teal-400",
    bgClass: "bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800/60",
    dotColor: "bg-teal-500",
  },
  {
    value: "cancelled",
    label: "Cancelled",
    hindiLabel: "रद्द किया गया",
    icon: XCircle,
    iconColor: "text-rose-600 dark:text-rose-400",
    bgClass: "bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800/60",
    dotColor: "bg-rose-500",
  },
];

export default function AdminServiceCallForm() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const customerIdParam = searchParams.get("customerId");
  const navigate = useNavigate();
  const { user } = useAuth();
  const { activeProfile, setShowSelectorModal } = useStaffProfile();
  const [createdTicketId, setCreatedTicketId] = useState<string>("");
  const effectiveId = id || createdTicketId;
  const isEditing = Boolean(effectiveId);
  const { activeEditors } = useResourcePresence("service_call", effectiveId, activeProfile);
  const dateInputRef = useRef<HTMLInputElement>(null);
  const initialSnapshotRef = useRef<string>("");
  const [showEscQuitPrompt, setShowEscQuitPrompt] = useState(false);
  const [invalidFields, setInvalidFields] = useState<{
    customerName?: string;
    customerPhone?: string;
    issueDescription?: string;
  }>({});

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

  // Payment Status Tracking
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("due");
  const [paymentMode, setPaymentMode] = useState<PaymentMode>("upi");
  const [amountPaid, setAmountPaid] = useState<number>(0);
  const [paymentDate, setPaymentDate] = useState<string>("");
  const [paymentNotes, setPaymentNotes] = useState<string>("");

  // Timeline Lifecycle Subcollection
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [quickTimelineStage, setQuickTimelineStage] = useState<TimelineEvent["stage"] | null>(null);
  const [showQuickTimelineModal, setShowQuickTimelineModal] = useState(false);

  // Post-Save Success Modal State for Counter / Mobile Staff
  const [saveSuccessInfo, setSaveSuccessInfo] = useState<{
    ticketNo: string;
    customerName: string;
    customerPhone: string;
    grandTotal: number;
    id: string;
  } | null>(null);
  const [showEventsListModal, setShowEventsListModal] = useState(false);

  const [dataLoading, setDataLoading] = useState<boolean>(Boolean(id));
  const [saving, setSaving] = useState(false);
  const [paymentSaving, setPaymentSaving] = useState(false);

  // Inline Modals
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showEditCustomerModal, setShowEditCustomerModal] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showCenterModal, setShowCenterModal] = useState(false);
  const [showEditCenterModal, setShowEditCenterModal] = useState(false);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [showCourierModal, setShowCourierModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [showDispatchPrintModal, setShowDispatchPrintModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [whatsAppModal, setWhatsAppModal] = useState<{
    open: boolean;
    title: string;
    recipientName: string;
    recipientRole: string;
    defaultPhone: string;
    defaultMessage: string;
    targetModule?: WhatsAppTargetModule;
    templateName?: string;
  }>({
    open: false,
    title: "",
    recipientName: "",
    recipientRole: "",
    defaultPhone: "",
    defaultMessage: "",
  });
  const [emailModal, setEmailModal] = useState<{
    open: boolean;
    title: string;
    recipientName: string;
    recipientRole: string;
    defaultEmail: string;
    ticketId?: string;
  }>({
    open: false,
    title: "",
    recipientName: "",
    recipientRole: "Customer",
    defaultEmail: "",
    ticketId: undefined,
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

      // Prefill customer if opened with ?customerId=...
      if (!id && customerIdParam && custs.length > 0) {
        const targetCust = custs.find((c) => c.id === customerIdParam);
        if (targetCust) {
          setSelectedCustomerId(targetCust.id);
          setCustomerName(targetCust.name);
          setCustomerPhone(targetCust.phone);
          setCustomerEmail(targetCust.email || "");
          setCustomerAddress(targetCust.address || "");
        }
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
      setDataLoading(true);
      getServiceCall(id)
        .then((sc) => {
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

          setPaymentStatus(sc.paymentStatus || "due");
          if (sc.paymentMode) setPaymentMode(sc.paymentMode);
          if (sc.amountPaid !== undefined) setAmountPaid(sc.amountPaid);
          if (sc.paymentDate) setPaymentDate(sc.paymentDate);
          if (sc.paymentNotes) setPaymentNotes(sc.paymentNotes);

          initialSnapshotRef.current = JSON.stringify({
            type: sc.type,
            dateTime: sc.dateTime,
            selectedCustomerId: sc.customerId || "",
            customerName: (sc.customerName || "").trim(),
            customerPhone: (sc.customerPhone || "").trim(),
            customerEmail: (sc.customerEmail || "").trim(),
            customerAddress: (sc.customerAddress || "").trim(),
            deviceCategory: sc.deviceCategory,
            modelNumber: (sc.modelNumber || "").trim(),
            serialNumber: (sc.serialNumber || "").trim(),
            quantity: Number(sc.quantity) || 1,
            issueDescription: (sc.issueDescription || "").trim(),
            warrantyStatus: sc.warrantyStatus,
            status: sc.status,
            dateOfPurchase: (sc.dateOfPurchase || "").trim(),
            billNumber: (sc.billNumber || "").trim(),
            selectedServiceCenterId: sc.serviceCenterId || "",
            selectedAddressId: sc.serviceCenterAddressId || "",
            courierName: sc.courierName || "Trackon Courier",
            courierChargesInput: String(sc.courierCharges || 0),
            selectedTechnicianId: sc.technicianId || "",
            onsiteAddress: (sc.onsiteAddress || "").trim(),
            parts: sc.parts || [],
            serviceChargesInput: String(sc.serviceCharges || 0),
            discountInput: String(sc.discount || 0),
            internalComments: (sc.internalComments || sc.notes || "").trim(),
            paymentStatus: sc.paymentStatus || "due",
          });
        })
        .catch((err) => {
          console.error("Error loading service call:", err);
          toast.error("Failed to load service call details");
        })
        .finally(() => {
          setDataLoading(false);
        });
    } else {
      setDataLoading(false);
      // Clean reset for new ticket creation so no discarded/previous state leaks
      setTimeline([]);
      setSelectedCustomerId("");
      setCustomerName("");
      setCustomerPhone("");
      setCustomerEmail("");
      setCustomerAddress("");
      setDeviceCategory("Laptop");
      setModelNumber("");
      setSerialNumber("");
      setQuantity(1);
      setIssueDescription("");
      setDateOfPurchase("");
      setBillNumber("");
      setSelectedServiceCenterId("");
      setServiceCenterName("");
      setSelectedAddressId("");
      setServiceCenterAddress("");
      setRmaNumber("");
      setCourierName("Trackon Courier");
      setCourierChargesInput("0");
      setSelectedTechnicianId("");
      setTechnicianName("");
      setOnsiteAddress("");
      setParts([]);
      setServiceChargesInput("0");
      setDiscountInput("0");
      setInternalComments("");
      setPaymentStatus("due");
      setAmountPaid(0);
      setPaymentNotes("");

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

  // Auto-reset unsaved Esc confirmation after 7 seconds
  useEffect(() => {
    if (!showEscQuitPrompt) return;
    const timer = setTimeout(() => {
      setShowEscQuitPrompt(false);
    }, 7000);
    return () => clearTimeout(timer);
  }, [showEscQuitPrompt]);

  // Check if current form has unsaved modifications
  const hasUnsavedChanges = (): boolean => {
    if (saving) return false;
    if (!isEditing) {
      return Boolean(
        customerName.trim() ||
        customerPhone.trim() ||
        customerEmail.trim() ||
        customerAddress.trim() ||
        modelNumber.trim() ||
        serialNumber.trim() ||
        issueDescription.trim() ||
        billNumber.trim() ||
        dateOfPurchase.trim() ||
        selectedCustomerId ||
        selectedServiceCenterId ||
        selectedTechnicianId ||
        parts.length > 0 ||
        (serviceChargesInput && serviceChargesInput !== "0") ||
        (discountInput && discountInput !== "0") ||
        internalComments.trim()
      );
    }
    if (!initialSnapshotRef.current) return false;
    const currentSnapshot = JSON.stringify({
      type,
      dateTime,
      selectedCustomerId,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      customerEmail: customerEmail.trim(),
      customerAddress: customerAddress.trim(),
      deviceCategory,
      modelNumber: modelNumber.trim(),
      serialNumber: serialNumber.trim(),
      quantity: Number(quantity) || 1,
      issueDescription: issueDescription.trim(),
      warrantyStatus,
      status,
      dateOfPurchase: dateOfPurchase.trim(),
      billNumber: billNumber.trim(),
      selectedServiceCenterId,
      selectedAddressId,
      courierName,
      courierChargesInput,
      selectedTechnicianId,
      onsiteAddress: onsiteAddress.trim(),
      parts,
      serviceChargesInput,
      discountInput,
      internalComments: internalComments.trim(),
    });
    return currentSnapshot !== initialSnapshotRef.current;
  };

  // Safe alias so both hasUnsavedChanges and isFormDirty are callable
  const isFormDirty = hasUnsavedChanges;

  // Browser navigation and tab close protection
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges()) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [customerName, customerPhone, issueDescription, parts, serviceChargesInput, discountInput, saving]);

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

    // Seamless keyboard handoff: focus device category / model next
    setTimeout(() => {
      const nextInput = formContainerRef.current?.querySelector(
        '[data-section="device"] button[role="combobox"], [data-section="device"] input'
      ) as HTMLElement | null;
      nextInput?.focus();
    }, 60);
  };

  // Safe Escape handler: closes modals without exiting, warns on unsaved service call
  const handleEsc = () => {
    // 1. If any modal / popup is open in DOM or React state, close modal only and DO NOT exit service call
    const hasOpenDialog = Boolean(document.querySelector('[role="dialog"], [role="alertdialog"]'));
    const isAnyModalOpen =
      showCustomerModal ||
      showEditCustomerModal ||
      showProductModal ||
      showPaymentModal ||
      showCategoryModal ||
      showCenterModal ||
      showCourierModal ||
      showQuickTimelineModal ||
      showEventsListModal ||
      showPrintModal ||
      showDispatchPrintModal ||
      showDeleteModal ||
      whatsAppModal.open ||
      emailModal.open ||
      hasOpenDialog;

    if (isAnyModalOpen) {
      if (showCustomerModal) setShowCustomerModal(false);
      if (showEditCustomerModal) setShowEditCustomerModal(false);
      if (showProductModal) setShowProductModal(false);
      if (showPaymentModal) setShowPaymentModal(false);
      if (showCategoryModal) setShowCategoryModal(false);
      if (showCenterModal) setShowCenterModal(false);
      if (showCourierModal) setShowCourierModal(false);
      if (showQuickTimelineModal) setShowQuickTimelineModal(false);
      if (showEventsListModal) setShowEventsListModal(false);
      if (showPrintModal) setShowPrintModal(false);
      if (showDispatchPrintModal) setShowDispatchPrintModal(false);
      if (showDeleteModal) setShowDeleteModal(false);
      if (whatsAppModal.open) setWhatsAppModal((prev) => ({ ...prev, open: false }));
      if (emailModal.open) setEmailModal((prev) => ({ ...prev, open: false }));
      setShowEscQuitPrompt(false);
      return;
    }

    // 2. If unsaved prompt is already active, second Esc confirms exit
    if (showEscQuitPrompt) {
      setShowEscQuitPrompt(false);
      navigate("/admin/service-calls");
      return;
    }

    // 3. If service call has unsaved changes, warn and prompt
    if (hasUnsavedChanges()) {
      setShowEscQuitPrompt(true);
      return;
    }

    // 4. No unsaved changes -> exit cleanly
    navigate("/admin/service-calls");
  };

  const triggerTimelineModal = (stage: TimelineEvent["stage"]) => {
    setQuickTimelineStage(stage);
    setShowQuickTimelineModal(true);
    if (stage === "replacement_given_customer") {
      setShowPaymentModal(true);
    }
  };

  const handleConfirmPayment = async (data: {
    paymentStatus: PaymentStatus;
    paymentMode?: PaymentMode;
    amountPaid?: number;
    paymentDate?: string;
    paymentNotes?: string;
  }) => {
    setPaymentStatus(data.paymentStatus);
    if (data.paymentMode) setPaymentMode(data.paymentMode);
    if (data.amountPaid !== undefined) setAmountPaid(data.amountPaid);
    if (data.paymentDate) setPaymentDate(data.paymentDate);
    if (data.paymentNotes !== undefined) setPaymentNotes(data.paymentNotes);
    setShowPaymentModal(false);

    if (!activeProfile) {
      toast.error("Please select your staff profile with 5-digit PIN before recording payment.");
      setShowSelectorModal(true);
      return;
    }

    if (id) {
      setPaymentSaving(true);
      try {
        await updateServiceCallPaymentStatus(id, data);
        if (data.paymentStatus === "paid") {
          const paymentEvt: TimelineEvent = {
            id: `evt-${Date.now()}`,
            timestamp: Date.now(),
            stage: "payment_received",
            title: `Payment Received (₹${data.amountPaid ?? grandTotal} via ${(data.paymentMode || "UPI").toUpperCase()})`,
            staffId: activeProfile.id,
            staffName: toTitleCase(activeProfile.name),
            status: status,
            comments: data.paymentNotes || undefined,
          };
          setTimeline((prev) => [...prev, paymentEvt]);
          await addTimelineEvent(id, paymentEvt).catch(() => {});
        }
        toast.success(
          data.paymentStatus === "paid"
            ? "Payment marked as Paid & Event Logged!"
            : "Payment status set to Due (Task)"
        );
      } catch (err: any) {
        toast.error(err?.message || "Failed to update payment status");
      } finally {
        setPaymentSaving(false);
      }
    } else {
      if (data.paymentStatus === "paid") {
        const paymentEvt: TimelineEvent = {
          id: `evt-${Date.now()}`,
          timestamp: Date.now(),
          stage: "payment_received",
          title: `Payment Received (₹${data.amountPaid ?? grandTotal} via ${(data.paymentMode || "UPI").toUpperCase()})`,
          staffId: activeProfile.id,
          staffName: toTitleCase(activeProfile.name),
          status: status,
          comments: data.paymentNotes || undefined,
        };
        setTimeline((prev) => [...prev, paymentEvt]);
      }
      toast.info(`Payment set to ${data.paymentStatus.toUpperCase()}`);
    }
  };

  const handleProductCreated = (newProd: Product) => {
    setParts((prev) => [
      ...prev,
      {
        id: `part-${Date.now()}`,
        name: newProd.name + (newProd.model ? ` (${newProd.model})` : ""),
        quantity: 1,
        unitPrice: newProd.price || 0,
        totalPrice: newProd.price || 0,
      },
    ]);
    toast.success(`Created & added "${newProd.name}" to parts billing`);
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

    if (id && isEditing) {
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
  const cleanParts = (parts || []).filter((p) => (p?.name || "").trim().length > 0);
  const partsTotal = cleanParts.reduce((sum, p) => sum + (p.totalPrice || 0), 0);
  const serviceChargesNum = Number(serviceChargesInput) || 0;
  const courierChargesNum = Number(courierChargesInput) || 0;
  const discountNum = Math.max(0, Number(discountInput) || 0);
  const subTotal = partsTotal + serviceChargesNum + (type === "company_service_center" ? courierChargesNum : 0);
  const grandTotal = Math.max(0, subTotal - discountNum);

  const buildPayload = (cName: string, cPhone: string, issueDesc: string) => {
    const effectiveStaffId = activeProfile?.id || "";
    const effectiveStaffName = activeProfile ? toTitleCase(activeProfile.name) : "";

    return {
      type,
      dateTime,
      customerId: selectedCustomerId || `cust-${Date.now()}`,
      customerName: toTitleCase(cName),
      customerPhone: formatIndianPhoneNumber(cPhone),
      customerEmail: (customerEmail || "").trim() || undefined,
      customerAddress: (customerAddress || "").trim() || undefined,
      deviceCategory,
      modelNumber: (modelNumber || "").trim() || undefined,
      serialNumber: (serialNumber || "").trim() || undefined,
      quantity: Number(quantity) || 1,
      issueDescription: issueDesc,
      warrantyStatus,
      status,

      // Purchase details
      dateOfPurchase: (dateOfPurchase || "").trim() || undefined,
      billNumber: (billNumber || "").trim() || undefined,

      // Backoffice handled staff (Auto-attributed to active desk profile)
      handledByStaffId: effectiveStaffId,
      handledByStaffName: effectiveStaffName,

      // Service center
      serviceCenterId: selectedServiceCenterId || undefined,
      serviceCenterName: (serviceCenterName || "").trim() || undefined,
      serviceCenterAddressId: selectedAddressId || undefined,
      serviceCenterAddress: (serviceCenterAddress || "").trim() || undefined,
      rmaNumber: (rmaNumber || "").trim() || undefined,
      courierName: (courierName || "").trim() || undefined,
      courierCharges: type === "company_service_center" ? courierChargesNum : undefined,

      // Technician
      technicianId: selectedTechnicianId || undefined,
      technicianName: (technicianName || "").trim() || undefined,

      // Onsite
      onsiteAddress: type === "onsite_visit" ? (onsiteAddress || "").trim() : undefined,

      parts: cleanParts,
      partsTotal,
      serviceCharges: serviceChargesNum,
      discount: discountNum > 0 ? discountNum : undefined,
      grandTotal,
      internalComments: (internalComments || "").trim() || undefined,
      notes: (internalComments || "").trim() || undefined,
      timeline,

      // Payment status
      paymentStatus,
      paymentMode: paymentStatus === "paid" || paymentStatus === "partial" ? paymentMode : undefined,
      amountPaid: paymentStatus === "paid" || paymentStatus === "partial" ? (amountPaid || grandTotal) : 0,
      paymentDate: paymentStatus === "paid" || paymentStatus === "partial" ? (paymentDate || dateTime) : undefined,
      paymentNotes: (paymentNotes || "").trim() || undefined,
    };
  };

  // Container-scoped scroll to input inside <main> to prevent document/window displacement
  const safeScrollToField = (fieldId: string) => {
    const el = document.getElementById(fieldId);
    if (!el) return;
    const mainContainer = el.closest("main");
    if (mainContainer) {
      const elRect = el.getBoundingClientRect();
      const containerRect = mainContainer.getBoundingClientRect();
      const relativeTop = elRect.top - containerRect.top;
      mainContainer.scrollBy({
        top: relativeTop - 80,
        behavior: "smooth",
      });
    }
    if (typeof el.focus === "function") {
      el.focus({ preventScroll: true });
    }
  };

  // Helper to ensure ticket is created/saved before opening Print or WhatsApp without booting user to list
  const ensureSavedTicket = async (): Promise<ServiceCall | null> => {
    const cName = (customerName || "").trim();
    const cPhone = (customerPhone || "").trim();
    const issueDesc = (issueDescription || "").trim();

    const errors: { customerName?: string; customerPhone?: string; issueDescription?: string } = {};
    if (!cName) errors.customerName = "Customer Name is required";
    if (!cPhone) errors.customerPhone = "Customer Phone Number is required";
    if (!issueDesc) errors.issueDescription = "Issue / Task Description is required";

    if (Object.keys(errors).length > 0) {
      setInvalidFields(errors);
      const firstId = !cName || !cPhone ? "cust-name-typeahead" : "issue-description-input";
      safeScrollToField(firstId);
      toast.error("Please fill in required fields highlighted in red.");
      return null;
    }

    if (!activeProfile) {
      toast.error("Please select your staff profile with 5-digit PIN before proceeding.");
      setShowSelectorModal(true);
      return null;
    }

    // If already saved/editing, update ticket in background and return updated object
    if (isEditing && effectiveId) {
      const payload = buildPayload(cName, cPhone, issueDesc);
      await updateServiceCall(effectiveId, payload).catch((err) => console.warn("Background update:", err));
      return {
        id: effectiveId,
        ticketNo: ticketNo || "SC-ACTIVE",
        ...payload,
      } as ServiceCall;
    }

    // If new ticket, auto-save in background
    setSaving(true);
    try {
      const payload = buildPayload(cName, cPhone, issueDesc);
      const created = await createServiceCall(payload);
      setCreatedTicketId(created.id);
      setTicketNo(created.ticketNo);
      setInvalidFields({});
      toast.success(`Service Ticket auto-saved: ${created.ticketNo}`);

      // Smoothly update URL to edit route without leaving the screen
      window.history.replaceState(null, "", `/admin/service-calls/${created.id}/edit`);

      return created;
    } catch (err: any) {
      console.error("Auto-save error:", err);
      toast.error(err?.message || "Failed to auto-save ticket");
      return null;
    } finally {
      setSaving(false);
    }
  };

  // Submit Handler (Standard Save Ticket Button - navigates to list)
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cName = (customerName || "").trim();
    const cPhone = (customerPhone || "").trim();
    const issueDesc = (issueDescription || "").trim();

    const errors: { customerName?: string; customerPhone?: string; issueDescription?: string } = {};
    if (!cName) errors.customerName = "Customer Name is required";
    if (!cPhone) errors.customerPhone = "Customer Phone Number is required";
    if (!issueDesc) errors.issueDescription = "Issue / Task Description is required";

    if (Object.keys(errors).length > 0) {
      setInvalidFields(errors);
      const firstId = !cName || !cPhone ? "cust-name-typeahead" : "issue-description-input";
      safeScrollToField(firstId);
      toast.error("Please fill in required fields highlighted in red.");
      return;
    }

    if (!activeProfile) {
      toast.error("Please select your staff profile with 5-digit PIN before saving a service ticket.");
      setShowSelectorModal(true);
      return;
    }

    setSaving(true);
    try {
      const payload = buildPayload(cName, cPhone, issueDesc);

      if (isEditing && effectiveId) {
        await updateServiceCall(effectiveId, payload);
        toast.success("Service Call ticket updated successfully!");
        navigate("/admin/service-calls");
      } else {
        const created = await createServiceCall(payload);
        setCreatedTicketId(created.id);
        setTicketNo(created.ticketNo);
        toast.success(`Service Call created: ${created.ticketNo}`);
        setSaveSuccessInfo({
          ticketNo: created.ticketNo,
          customerName: cName,
          customerPhone: cPhone,
          grandTotal: grandTotal,
          id: created.id,
        });
      }
    } catch (err: any) {
      console.error("Save error:", err);
      toast.error(err?.message || "Failed to save service call");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTicket = async () => {
    if (!effectiveId) return;
    try {
      await deleteServiceCall(effectiveId);
      toast.success("Ticket moved to Trash. It can be restored anytime.");
      navigate("/admin/service-calls");
    } catch (err: any) {
      console.error("Error deleting ticket:", err);
      toast.error(err?.message || "Failed to delete ticket");
    }
  };

  // Print & WhatsApp Triggers (Auto-saves ticket without booting user to list)
  const handleOpenPrintModal = async () => {
    const saved = await ensureSavedTicket();
    if (!saved) return;
    setShowPrintModal(true);
  };

  const handleOpenDispatchPrintModal = () => {
    if (!serviceCenterName && !selectedServiceCenterId) {
      toast.info("Tip: Select a Service Center to pre-fill the delivery address on the dispatch slip.");
    }
    setShowDispatchPrintModal(true);
  };

  // WhatsApp Message Preview Triggers (Opens editable preview modal with pre-compiled text)
  const handleOpenCustomerWhatsApp = async () => {
    const saved = await ensureSavedTicket();
    if (!saved) return;

    const compiled = generateWhatsAppMessage({
      ticketNo: saved.ticketNo || ticketNo || "New Ticket",
      dateTime: saved.dateTime || dateTime,
      customerName: toTitleCase(saved.customerName || customerName || "Customer"),
      customerPhone: saved.customerPhone || customerPhone || "",
      deviceCategory: saved.deviceCategory || deviceCategory,
      modelNumber: saved.modelNumber || modelNumber,
      issueDescription: saved.issueDescription || issueDescription,
      status: saved.status || status,
      grandTotal: saved.grandTotal || grandTotal,
    });

    setWhatsAppModal({
      open: true,
      title: "WhatsApp Update: Customer Confirmation",
      recipientName: saved.customerName ? toTitleCase(saved.customerName) : "Customer",
      recipientRole: "Customer",
      defaultPhone: saved.customerPhone || customerPhone || "",
      defaultMessage: compiled,
      targetModule: "service_calls",
      templateName: "11",
    });
  };

  const handleOpenCustomerEmail = () => {
    setEmailModal({
      open: true,
      title: `Email Update: ${ticketNo || "Service Intake"}`,
      recipientName: customerName ? toTitleCase(customerName) : "Customer",
      recipientRole: "Customer",
      defaultEmail: customerEmail || "",
      ticketId: ticketNo,
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
      targetModule: "service_centers",
      templateName: "zorba_service_center_followup",
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
      targetModule: "couriers",
      templateName: "zorba_courier_pickup_request",
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
      targetModule: "couriers",
      templateName: "zorba_courier_delivery_inquiry",
    });
  };

  // Keyboard Shortcuts Hook
  useTallyShortcuts({
    onCtrlA: () => handleSubmit(),
    onEsc: handleEsc,
    onC: showEscQuitPrompt
      ? () => {
          setShowEscQuitPrompt(false);
        }
      : undefined,
    onAltC: (context) => {
      if (context?.isProductSection) {
        setShowProductModal(true);
      } else {
        setShowCustomerModal(true);
      }
    },
    onAltA: () => handleAddPartRow(),
    onAltP: () => handleOpenPrintModal(),
    onAltW: () => handleOpenCustomerWhatsApp(),
    onCtrlF2: () => {
      if (dateInputRef.current) {
        dateInputRef.current.focus({ preventScroll: true });
        if (typeof dateInputRef.current.showPicker === "function") {
          dateInputRef.current.showPicker();
        }
      }
    },
    onF5: () => triggerTimelineModal("replacement_received_customer"),
    onF6: () => triggerTimelineModal("replacement_sent_service_center"),
    onF8: () => triggerTimelineModal("replacement_received_service_center"),
    onF9: () => {
      triggerTimelineModal("replacement_given_customer");
    },
  });

  const formContainerRef = useRef<HTMLFormElement>(null);

  // Tally Voucher Navigation (Enter-to-advance through fields, Ctrl+A to save, Alt+Arrow to toggle mode)
  useTallyFormNavigation({
    formRef: formContainerRef,
    isDirty: hasUnsavedChanges(),
    onSave: () => handleSubmit(),
    onEsc: handleEsc,
    onConfirmExit: () => navigate("/admin/service-calls"),
    onAddRow: () => handleAddPartRow(),
    onWorkflowModeChange: (dir) => {
      const modes: ServiceCallType[] = ["company_service_center", "in_house_repair", "onsite_visit"];
      const curIdx = modes.indexOf(type);
      const nextIdx = dir === "next" ? (curIdx + 1) % modes.length : (curIdx - 1 + modes.length) % modes.length;
      setType(modes[nextIdx]);
    },
  });

  if (dataLoading) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-8 max-w-5xl mx-auto shadow-xs my-6">
        <LoadingScreen
          fullScreen={false}
          title="Loading Service Call..."
          subtitle="Retrieving ticket record from database..."
        />
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-[1440px] mx-auto pb-20 lg:pb-0 text-xs">
      <form ref={formContainerRef} id="service-call-form" onSubmit={handleSubmit} className="space-y-4 max-w-5xl mx-auto">
        {/* Real-time Concurrent Editing Collision Warning */}
        <ResourceCollisionAlert activeEditors={activeEditors} resourceLabel="service call ticket" />

        {/* Card 0: Service Workflow Mode Switcher + Header Metadata (Status, Tech Assignee, Date) */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs p-4 md:p-5 space-y-4">
          {/* Header Title & Ticket No Badge with Large Legible Font & Copy Button */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800/80">
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white tracking-tight">
                {isEditing ? "Edit Service Call Ticket" : "New Service Call Ticket"}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Counter intake, workshop diagnostics, and customer delivery
              </p>
            </div>
            {ticketNo && (
              <div className="inline-flex items-center gap-2.5 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/80 px-3.5 py-1.5 rounded-xl shadow-2xs">
                <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                  Ticket #
                </span>
                <span className="text-base sm:text-lg font-extrabold font-mono text-blue-700 dark:text-blue-300 tracking-wider">
                  {ticketNo}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(ticketNo);
                    toast.success(`Copied ticket number: ${ticketNo}`);
                  }}
                  className="p-1 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-600 dark:text-blue-400 transition-colors cursor-pointer"
                  title="Copy Ticket Number"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
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
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  type === "company_service_center"
                    ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs border border-slate-200/60 dark:border-slate-700"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <Building2 className="h-4 w-4 shrink-0" />
                <span>Service Center (Company RMA)</span>
              </button>

              <button
                type="button"
                onClick={() => setType("in_house_repair")}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  type === "in_house_repair"
                    ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs border border-slate-200/60 dark:border-slate-700"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <Wrench className="h-4 w-4 shrink-0" />
                <span>In-House Repair (Workshop)</span>
              </button>

              <button
                type="button"
                onClick={() => setType("onsite_visit")}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  type === "onsite_visit"
                    ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs border border-slate-200/60 dark:border-slate-700"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <MapPin className="h-4 w-4 shrink-0" />
                <span>Onsite Visit (Customer Location)</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end pt-3 border-t border-slate-100 dark:border-slate-800/80">
            {/* Overall Ticket Status */}
            <div>
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 block">
                Overall Ticket Status
              </Label>
              <Select value={status} onValueChange={(val: ServiceCallStatus) => setStatus(val)}>
                <SelectTrigger className="h-11 sm:h-9 text-base sm:text-xs rounded-xl bg-slate-50/60 dark:bg-slate-950 border-slate-200 dark:border-slate-800 font-semibold text-slate-900 dark:text-slate-100 focus:bg-white transition-colors">
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
                          <span className="font-bold text-slate-800 dark:text-slate-100 truncate">
                            {found.label}
                          </span>
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
                          <div className="flex flex-col text-left">
                            <span className="font-bold text-slate-800 dark:text-slate-200">{item.label}</span>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">{item.hindiLabel}</span>
                          </div>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Assigned Technician */}
            <div>
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 block">
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
                <SelectTrigger className="h-11 sm:h-9 text-base sm:text-xs rounded-xl bg-slate-50/60 dark:bg-slate-950 border-slate-200 dark:border-slate-800 font-medium text-slate-900 dark:text-slate-100 focus:bg-white transition-colors">
                  <SelectValue placeholder="Select Technician..." />
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
        <ServiceCallCustomerCard
          selectedCustomerId={selectedCustomerId}
          customerName={customerName}
          customerPhone={customerPhone}
          customerEmail={customerEmail}
          customerAddress={customerAddress}
          nameError={invalidFields.customerName}
          phoneError={invalidFields.customerPhone}
          onCustomerNameChange={(val) => {
            setCustomerName(val);
            if (invalidFields.customerName) {
              setInvalidFields((prev) => ({ ...prev, customerName: undefined }));
            }
          }}
          onSelectCustomer={(cust) => {
            handleSelectCustomer(cust);
            setInvalidFields((prev) => ({ ...prev, customerName: undefined, customerPhone: undefined }));
          }}
          onOpenNewCustomerModal={() => setShowCustomerModal(true)}
          onOpenEditCustomerModal={() => setShowEditCustomerModal(true)}
        />

        {/* Section 2 & 3: Device Details & Logistics */}
        <ServiceCallDeviceDetailsCard
          deviceCategory={deviceCategory}
          onDeviceCategoryChange={setDeviceCategory}
          categories={categories}
          onOpenAddCategoryModal={() => setShowCategoryModal(true)}
          warrantyStatus={warrantyStatus}
          onWarrantyStatusChange={setWarrantyStatus}
          modelNumber={modelNumber}
          onModelNumberChange={setModelNumber}
          serialNumber={serialNumber}
          onSerialNumberChange={setSerialNumber}
          quantity={quantity}
          onQuantityChange={setQuantity}
          dateOfPurchase={dateOfPurchase}
          onDateOfPurchaseChange={setDateOfPurchase}
          billNumber={billNumber}
          onBillNumberChange={setBillNumber}
          issueDescription={issueDescription}
          issueError={invalidFields.issueDescription}
          onIssueDescriptionChange={(val) => {
            setIssueDescription(val);
            if (invalidFields.issueDescription) {
              setInvalidFields((prev) => ({ ...prev, issueDescription: undefined }));
            }
          }}
          type={type}
          serviceCenters={serviceCenters}
          selectedServiceCenterId={selectedServiceCenterId}
          onSelectServiceCenter={(val) => {
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
          onOpenAddCenterModal={() => setShowCenterModal(true)}
          onOpenEditCenterModal={() => setShowEditCenterModal(true)}
          selectedAddressId={selectedAddressId}
          onSelectAddress={(val) => {
            setSelectedAddressId(val);
            const currentCenter = serviceCenters.find((sc) => sc.id === selectedServiceCenterId);
            const addr = currentCenter?.addresses.find((a) => a.id === val);
            if (addr) setServiceCenterAddress(addr.address);
          }}
          onOpenAddAddressModal={() => {
            if (!selectedServiceCenterId) {
              toast.info("Please select an Authorized Service Center first to add a dispatch address");
              return;
            }
            setShowAddressModal(true);
          }}
          couriers={couriers}
          courierName={courierName}
          onSelectCourier={(val) => {
            setCourierName(val);
            const found = couriers.find((c) => c.name === val);
            if (found) setSelectedCourierId(found.id);
          }}
          onOpenAddCourierModal={() => setShowCourierModal(true)}
          rmaNumber={rmaNumber}
          onRmaNumberChange={setRmaNumber}
          courierChargesInput={courierChargesInput}
          onCourierChargesInputChange={setCourierChargesInput}
          onsiteAddress={onsiteAddress}
          onOnsiteAddressChange={setOnsiteAddress}
          quickTags={QUICK_TAGS}
          onOpenDispatchPrint={handleOpenDispatchPrintModal}
        />

        {/* Section 4: Spare Parts & Service Charges */}
        <ServiceCallBillingPartsCard
          parts={parts}
          onAddPartRow={handleAddPartRow}
          onUpdatePart={handleUpdatePart}
          onRemovePartRow={handleRemovePartRow}
          serviceChargesInput={serviceChargesInput}
          onServiceChargesInputChange={setServiceChargesInput}
          discountInput={discountInput}
          onDiscountInputChange={setDiscountInput}
          onOpenProductModal={() => setShowProductModal(true)}
        />

      </form>

      {/* Lifecycle Actions Rail (Both Mobile Card & Desktop Portal) */}
      <ServiceCallLifecycleRail
        rightRailEl={rightRailEl}
        isEditing={isEditing}
        saving={saving}
        timeline={timeline}
        status={status}
        type={type}
        serviceCenterName={serviceCenterName}
        selectedCourierId={selectedCourierId}
        partsTotal={partsTotal}
        serviceChargesNum={serviceChargesNum}
        courierChargesNum={courierChargesNum}
        discountNum={discountNum}
        grandTotal={grandTotal}
        paymentStatus={paymentStatus}
        paymentMode={paymentMode}
        onOpenPaymentModal={() => setShowPaymentModal(true)}
        onShowEventsListModal={() => setShowEventsListModal(true)}
        onTriggerTimelineModal={triggerTimelineModal}
        onOpenCustomerWhatsApp={handleOpenCustomerWhatsApp}
        onOpenCustomerEmail={handleOpenCustomerEmail}
        onOpenServiceCenterWhatsApp={handleOpenServiceCenterWhatsApp}
        onOpenCourierPickupWhatsApp={handleOpenCourierPickupWhatsApp}
        onOpenCourierDeliveryWhatsApp={handleOpenCourierDeliveryWhatsApp}
        onOpenPrintModal={handleOpenPrintModal}
        onOpenDispatchPrintModal={handleOpenDispatchPrintModal}
        onOpenDeleteModal={() => setShowDeleteModal(true)}
        onOpenCustomerModal={() => setShowCustomerModal(true)}
        onOpenCenterModal={() => setShowCenterModal(true)}
        onOpenCourierModal={() => setShowCourierModal(true)}
        onSave={() => handleSubmit()}
      />

      {/* WhatsApp Message Preview & Dispatch Modal */}
      <WhatsAppPreviewModal
        open={whatsAppModal.open}
        onOpenChange={(open) => setWhatsAppModal((prev) => ({ ...prev, open }))}
        title={whatsAppModal.title}
        recipientName={whatsAppModal.recipientName}
        recipientRole={whatsAppModal.recipientRole}
        defaultPhone={whatsAppModal.defaultPhone}
        defaultMessage={whatsAppModal.defaultMessage}
        ticketId={ticketNo}
        targetModule={whatsAppModal.targetModule}
        templateName={whatsAppModal.templateName}
        serviceCall={{
          id: id || "NEW",
          ticketNo: ticketNo || "SC-INTAKE",
          customerName,
          customerPhone,
          customerEmail,
          deviceCategory,
          modelNumber,
          serialNumber,
          issueDescription,
          status,
          grandTotal,
          dateTime,
          warrantyStatus,
          type,
          serviceCenterName,
          serviceCenterAddress,
          courierName,
          rmaNumber,
          timeline,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        } as ServiceCall}
      />

      {/* Email Message Preview & Dispatch Modal */}
      <EmailPreviewModal
        open={emailModal.open}
        onOpenChange={(open) => setEmailModal((prev) => ({ ...prev, open }))}
        title={emailModal.title}
        recipientName={emailModal.recipientName}
        recipientRole={emailModal.recipientRole}
        defaultEmail={emailModal.defaultEmail}
        ticketId={emailModal.ticketId}
        serviceCall={{
          id: id || "NEW",
          ticketNo: ticketNo || "SC-INTAKE",
          customerName,
          customerPhone,
          customerEmail,
          deviceCategory,
          modelNumber,
          serialNumber,
          issueDescription,
          status,
          grandTotal,
          dateTime,
          warrantyStatus,
          type,
          timeline,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        } as ServiceCall}
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
      <AddServiceCenterAddressModal
        open={showAddressModal}
        onOpenChange={setShowAddressModal}
        serviceCenter={serviceCenters.find((sc) => sc.id === selectedServiceCenterId) || null}
        onOpenEditCenterModal={() => setShowEditCenterModal(true)}
        onAddressAdded={(newAddr, scId) => {
          setServiceCenters((prev) =>
            prev.map((sc) =>
              sc.id === scId
                ? { ...sc, addresses: [...(sc.addresses || []), newAddr] }
                : sc
            )
          );
          setSelectedAddressId(newAddr.id);
          setServiceCenterAddress(newAddr.address);
        }}
      />
      {selectedServiceCenterId && (
        <EditServiceCenterModal
          center={serviceCenters.find((sc) => sc.id === selectedServiceCenterId) || null}
          open={showEditCenterModal}
          onOpenChange={setShowEditCenterModal}
          onUpdated={async () => {
            const scList = await getServiceCenters();
            setServiceCenters(scList);
            const updatedSc = scList.find((s) => s.id === selectedServiceCenterId);
            if (updatedSc && updatedSc.addresses && updatedSc.addresses.length > 0) {
              if (!updatedSc.addresses.some((a) => a.id === selectedAddressId)) {
                setSelectedAddressId(updatedSc.addresses[0].id);
                setServiceCenterAddress(updatedSc.addresses[0].address);
              }
            }
          }}
        />
      )}
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
          courierName,
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
          dateOfPurchase,
          billNumber,
          handledByStaffName,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        }}
        open={showPrintModal}
        onOpenChange={setShowPrintModal}
        onOpenDispatchSlip={() => {
          setShowPrintModal(false);
          setShowDispatchPrintModal(true);
        }}
      />
      <DispatchSlipPrintModal
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
          courierName,
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
          dateOfPurchase,
          billNumber,
          handledByStaffName,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        }}
        open={showDispatchPrintModal}
        onOpenChange={setShowDispatchPrintModal}
        serviceCenters={serviceCenters}
        onSwitchToJobCard={() => {
          setShowDispatchPrintModal(false);
          setShowPrintModal(true);
        }}
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

      {/* Quick Create Product Modal (triggered by Alt+C in parts section or button) */}
      <CreateProductModal
        open={showProductModal}
        onOpenChange={setShowProductModal}
        onCreated={handleProductCreated}
      />

      {/* Payment Status Confirmation Modal (default Due task vs Paid) */}
      <ServiceCallPaymentModal
        open={showPaymentModal}
        onOpenChange={setShowPaymentModal}
        ticketNo={ticketNo || "NEW"}
        customerName={customerName}
        grandTotal={grandTotal}
        currentPaymentStatus={paymentStatus}
        currentPaymentMode={paymentMode}
        currentAmountPaid={amountPaid}
        currentPaymentDate={paymentDate}
        currentPaymentNotes={paymentNotes}
        onConfirm={handleConfirmPayment}
        saving={paymentSaving}
      />

      {/* Post-Save Success Modal ("PhonePe Green Tick" confirmation for Counter Staff) */}
      <Dialog open={!!saveSuccessInfo} onOpenChange={(open) => !open && setSaveSuccessInfo(null)}>
        <DialogContent className="max-w-md p-6 rounded-3xl text-center space-y-5">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800 shadow-sm animate-in zoom-in-95 duration-200">
            <CheckCircle2 className="h-9 w-9" />
          </div>

          <div className="space-y-1.5">
            <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">
              रिपेयर पर्ची बन गई! ✓
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Ticket #{saveSuccessInfo?.ticketNo} successfully saved
            </p>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4 text-left border border-slate-100 dark:border-slate-800 text-xs space-y-1.5">
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">Customer:</span>
              <span className="font-bold text-slate-900 dark:text-white">{saveSuccessInfo?.customerName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">Phone:</span>
              <span className="font-bold font-mono text-blue-600 dark:text-blue-400">{saveSuccessInfo?.customerPhone}</span>
            </div>
            <div className="flex justify-between pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
              <span className="text-slate-500 font-medium">Estimated Total:</span>
              <span className="font-extrabold font-mono text-sm text-slate-900 dark:text-white">
                ₹{saveSuccessInfo?.grandTotal?.toLocaleString("en-IN")}
              </span>
            </div>
          </div>

          <div className="space-y-2.5 pt-1">
            {/* 1-Tap WhatsApp Receipt */}
            <Button
              type="button"
              onClick={() => {
                const info = saveSuccessInfo;
                setSaveSuccessInfo(null);
                if (info) {
                  handleOpenCustomerWhatsApp();
                }
              }}
              className="w-full h-14 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 active:scale-98 transition-all cursor-pointer"
            >
              <MessageSquare className="h-5 w-5" />
              <span>WhatsApp पर रसीद भेजें (Send Slip)</span>
            </Button>

            {/* Print Job Card */}
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setSaveSuccessInfo(null);
                handleOpenPrintModal();
              }}
              className="w-full h-12 rounded-2xl border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer"
            >
              <Printer className="h-4 w-4 text-blue-600" />
              <span>काउंटर पर्ची प्रिंट करें (Print Job Card)</span>
            </Button>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setSaveSuccessInfo(null);
                  navigate("/admin/service-calls");
                }}
                className="h-11 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 cursor-pointer"
              >
                📋 लिस्ट देखें (Back)
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setSaveSuccessInfo(null);
                  navigate("/admin/service-calls/new");
                  window.location.reload();
                }}
                className="h-11 rounded-xl text-xs font-bold text-blue-600 dark:text-blue-400 cursor-pointer"
              >
                ➕ नया टिकट (Next)
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Top Header Breadcrumb Ticket Number Portal with High-Legibility Font & Copy */}
      {breadcrumbTicketEl && ticketNo &&
        createPortal(
          <div className="flex items-center gap-1.5 sm:gap-2 ml-1 sm:ml-2">
            <span className="text-slate-600 hidden sm:inline">/</span>
            <div className="inline-flex items-center gap-1.5 sm:gap-2 bg-slate-800/90 border border-slate-700/80 px-2.5 py-0.5 sm:py-1 rounded-xl shadow-xs">
              <span className="text-xs sm:text-sm font-extrabold text-blue-300 font-mono tracking-wider">
                {ticketNo}
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  navigator.clipboard.writeText(ticketNo);
                  toast.success(`Copied ticket number: ${ticketNo}`);
                }}
                className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer"
                title="Copy Ticket Number"
                aria-label="Copy Ticket Number"
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>,
          breadcrumbTicketEl
        )}

      {/* Unsaved Changes Esc Confirmation Floating Bar */}
      {showEscQuitPrompt && (
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
                onClick={() => setShowEscQuitPrompt(false)}
                className="px-3 py-1 text-xs font-bold rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 transition-all cursor-pointer shadow-sm"
              >
                Continue (C)
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowEscQuitPrompt(false);
                  navigate("/admin/service-calls");
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
