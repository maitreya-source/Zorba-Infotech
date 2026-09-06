import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import {
  Building2,
  Clock,
  FileText,
  Plus,
  MessageSquare,
  Mail,
  RefreshCw,
  ArrowUp,
  ArrowDown,
  ArrowRight,
  Printer,
  Trash2,
  UserPlus,
  Home,
  Truck,
  Save,
  CheckCircle2,
  CreditCard,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type {
  ServiceCallStatus,
  ServiceCallType,
  TimelineEvent,
  TimelineStage,
  PaymentStatus,
  PaymentMode,
} from "@/lib/types";

interface ServiceCallLifecycleRailProps {
  rightRailEl: HTMLElement | null;
  isEditing: boolean;
  saving: boolean;
  timeline: TimelineEvent[];
  status: ServiceCallStatus;
  type: ServiceCallType;
  serviceCenterName: string;
  selectedCourierId: string;
  partsTotal: number;
  serviceChargesNum: number;
  courierChargesNum: number;
  discountNum: number;
  grandTotal: number;
  paymentStatus?: PaymentStatus;
  paymentMode?: PaymentMode;
  onOpenPaymentModal: () => void;
  onShowEventsListModal: () => void;
  onTriggerTimelineModal: (stageOrType: TimelineStage | "comment_added" | "status_change") => void;
  onOpenCustomerWhatsApp: () => void;
  onOpenCustomerEmail: () => void;
  onOpenServiceCenterWhatsApp: () => void;
  onOpenCourierPickupWhatsApp: () => void;
  onOpenCourierDeliveryWhatsApp: () => void;
  onOpenPrintModal: () => void;
  onOpenDispatchPrintModal?: () => void;
  onOpenDeleteModal: () => void;
  onOpenCustomerModal: () => void;
  onOpenCenterModal: () => void;
  onOpenCourierModal: () => void;
  onSave?: () => void;
}

export default function ServiceCallLifecycleRail({
  rightRailEl,
  isEditing,
  saving,
  timeline,
  status,
  type,
  serviceCenterName,
  selectedCourierId,
  partsTotal,
  serviceChargesNum,
  courierChargesNum,
  discountNum,
  grandTotal,
  paymentStatus = "due",
  paymentMode,
  onOpenPaymentModal,
  onShowEventsListModal,
  onTriggerTimelineModal,
  onOpenCustomerWhatsApp,
  onOpenCustomerEmail,
  onOpenServiceCenterWhatsApp,
  onOpenCourierPickupWhatsApp,
  onOpenCourierDeliveryWhatsApp,
  onOpenPrintModal,
  onOpenDispatchPrintModal,
  onOpenDeleteModal,
  onOpenCustomerModal,
  onOpenCenterModal,
  onOpenCourierModal,
  onSave,
}: ServiceCallLifecycleRailProps) {
  const handleMilestoneClick = (stage: TimelineStage) => {
    onTriggerTimelineModal(stage);
    if (stage === "replacement_given_customer") {
      onOpenPaymentModal();
    }
  };
  const isCompanyRMA = type === "company_service_center";

  const MILESTONES = isCompanyRMA
    ? [
        {
          index: 1,
          stage: "replacement_received_customer" as const,
          label: "Recv from Customer",
          subLabel: "Intake logged at counter",
          hotkey: "Alt+1",
        },
        {
          index: 2,
          stage: "replacement_sent_service_center" as const,
          label: "Sent to Service Center",
          subLabel: "Dispatched to Brand OEM",
          hotkey: "Alt+2",
        },
        {
          index: 3,
          stage: "replacement_received_service_center" as const,
          label: "Recv from Service Center",
          subLabel: "Returned to Zorba shop",
          hotkey: "Alt+3",
        },
        {
          index: 4,
          stage: "replacement_given_customer" as const,
          label: "Given to Customer",
          subLabel: "Handed over & settled",
          hotkey: "Alt+4",
        },
      ]
    : type === "onsite_visit"
    ? [
        {
          index: 1,
          stage: "replacement_received_customer" as const,
          label: "Visit Scheduled",
          subLabel: "Logged for technician visit",
          hotkey: "Alt+1",
        },
        {
          index: 2,
          stage: "replacement_given_customer" as const,
          label: "Service Completed",
          subLabel: "Work completed & settled",
          hotkey: "Alt+2",
        },
      ]
    : [
        // in_house_repair (Workshop)
        {
          index: 1,
          stage: "replacement_received_customer" as const,
          label: "Recv at Workshop",
          subLabel: "Intake logged for repair",
          hotkey: "Alt+1",
        },
        {
          index: 2,
          stage: "replacement_given_customer" as const,
          label: "Given to Customer",
          subLabel: "Repaired & handed over",
          hotkey: "Alt+2",
        },
      ];

  // Determine active milestone stage
  let activeIndex = 1;
  if (timeline && timeline.length > 0) {
    for (let i = timeline.length - 1; i >= 0; i--) {
      const s = timeline[i]?.stage;
      if (s === "replacement_given_customer") {
        activeIndex = isCompanyRMA ? 4 : 2;
        break;
      }
      if (isCompanyRMA && s === "replacement_received_service_center") {
        activeIndex = 3;
        break;
      }
      if (isCompanyRMA && s === "replacement_sent_service_center") {
        activeIndex = 2;
        break;
      }
      if (s === "replacement_received_customer" || s === "intake_created") {
        activeIndex = 1;
        break;
      }
    }
  } else {
    if (status === "delivered" || status === "completed") activeIndex = isCompanyRMA ? 4 : 2;
    else if (isCompanyRMA && status === "sent_to_service_center") activeIndex = 2;
    else if (status === "received" || status === "in_progress") activeIndex = 1;
  }

  return (
    <>
      {/* Tablet/Mobile-Only (< lg) Ticket Operations & Actions Card */}
      <div className="lg:hidden bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-4 shadow-xs space-y-4">
        <div className="border-b pb-2.5">
          <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Ticket Actions & Operations</h3>
          <p className="text-[11px] text-slate-400">Print job cards, WhatsApp updates & milestone progression</p>
        </div>

        {/* 1. Print & Challan (Mobile Top Priority) */}
        <div className="space-y-1.5 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Print & Challan
          </div>
          <div className={type === "company_service_center" && onOpenDispatchPrintModal ? "grid grid-cols-2 gap-2" : "grid grid-cols-1 gap-2"}>
            <Button
              type="button"
              onClick={onOpenPrintModal}
              className="h-11 text-xs font-bold rounded-xl gap-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs cursor-pointer active:scale-95 transition-transform"
              title="Print Customer Repair Job Card"
            >
              <Printer className="h-4 w-4 shrink-0" />
              <span>Print Job Card</span>
            </Button>

            {type === "company_service_center" && onOpenDispatchPrintModal && (
              <Button
                type="button"
                onClick={onOpenDispatchPrintModal}
                className="h-11 text-xs font-bold rounded-xl gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-xs cursor-pointer active:scale-95 transition-transform"
                title="Print Service Center Dispatch Slip"
              >
                <Truck className="h-4 w-4 shrink-0" />
                <span>Dispatch Slip</span>
              </Button>
            )}
          </div>
        </div>

        {/* 2. Customer & Partner Communications */}
        <div className="space-y-2">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            WhatsApp & Updates
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onOpenCustomerWhatsApp}
              className="h-10 text-xs font-bold rounded-xl gap-2 justify-start cursor-pointer border-emerald-300 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 active:scale-98"
            >
              <MessageSquare className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>WhatsApp Customer</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onOpenCustomerEmail}
              className="h-10 text-xs font-bold rounded-xl gap-2 justify-start cursor-pointer border-blue-300 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/30 text-blue-800 dark:text-blue-300 active:scale-98"
            >
              <Mail className="h-4 w-4 text-blue-600 shrink-0" />
              <span>Email Customer</span>
            </Button>

            {type === "company_service_center" && serviceCenterName && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onOpenServiceCenterWhatsApp}
                className="h-10 text-xs font-bold rounded-xl gap-2 justify-start cursor-pointer active:scale-98"
              >
                <RefreshCw className="h-4 w-4 text-slate-500 shrink-0" />
                <span>Follow-up Center</span>
              </Button>
            )}

            {selectedCourierId && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onOpenCourierPickupWhatsApp}
                  className="h-10 text-xs font-bold rounded-xl gap-2 justify-start cursor-pointer active:scale-98"
                >
                  <ArrowUp className="h-4 w-4 text-slate-500 shrink-0" />
                  <span>Courier Pickup</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onOpenCourierDeliveryWhatsApp}
                  className="h-10 text-xs font-bold rounded-xl gap-2 justify-start cursor-pointer active:scale-98"
                >
                  <ArrowDown className="h-4 w-4 text-slate-500 shrink-0" />
                  <span>Courier Delivery</span>
                </Button>
              </>
            )}
          </div>
        </div>

        {/* 3. Payment Status */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Payment Status
            </span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
              paymentStatus === "paid"
                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300"
                : "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300"
            }`}>
              {paymentStatus === "paid" ? "PAID" : "DUE (Task)"}
            </span>
          </div>
          <button
            type="button"
            onClick={onOpenPaymentModal}
            className="w-full flex items-center justify-between p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-all cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-amber-500 shrink-0" />
              <span>{paymentStatus === "paid" ? "Payment Received" : "Confirm Payment Received"}</span>
            </div>
            <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400">Update ➔</span>
          </button>
        </div>

        {/* 4. Milestone Progression */}
        <div className="space-y-2">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Milestone Progression
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {MILESTONES.map((m) => {
              const isActive = activeIndex === m.index;
              return (
                <button
                  key={m.stage}
                  type="button"
                  onClick={() => handleMilestoneClick(m.stage)}
                  className={`flex items-center justify-between rounded-xl py-2.5 px-3 text-xs transition-all cursor-pointer border ${
                    isActive
                      ? "bg-blue-50 dark:bg-blue-950/60 border-blue-400 dark:border-blue-700 text-blue-700 dark:text-blue-300 font-bold shadow-2xs"
                      : "bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 font-medium"
                  }`}
                >
                  <div className="flex flex-col text-left min-w-0">
                    <span className="font-bold text-xs truncate">{m.label}</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{m.subLabel}</span>
                  </div>
                  {isActive && <CheckCircle2 className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0 ml-1.5" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* 5. Audit & Timeline Events (Moved down below Milestones) */}
        <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Audit & Timeline Events
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onShowEventsListModal}
              className="h-9 text-xs font-semibold rounded-xl gap-1.5 bg-slate-50 dark:bg-slate-800/60 cursor-pointer"
            >
              <Clock className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
              <span>Events ({timeline.length})</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onTriggerTimelineModal("comment_added")}
              className="h-9 text-xs font-semibold rounded-xl gap-1.5 bg-slate-50 dark:bg-slate-800/60 cursor-pointer"
            >
              <FileText className="h-3.5 w-3.5 text-slate-500 shrink-0" />
              <span>Add Note</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onTriggerTimelineModal("status_change")}
              className="h-9 text-xs font-semibold rounded-xl gap-1.5 bg-slate-50 dark:bg-slate-800/60 cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5 text-slate-500 shrink-0" />
              <span>Add Event</span>
            </Button>
          </div>
        </div>

        {/* 4. Quick Master Records */}
        <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Quick Master Records
          </div>
          <div className={`grid gap-2 ${isCompanyRMA ? "grid-cols-3" : "grid-cols-1"}`}>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onOpenCustomerModal}
              className="h-8 text-xs font-semibold rounded-lg gap-1.5 cursor-pointer py-1 px-2.5"
            >
              <UserPlus className="h-3.5 w-3.5 text-slate-400" />
              <span>+ Customer</span>
            </Button>
            {isCompanyRMA && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onOpenCenterModal}
                  className="h-8 text-xs font-semibold rounded-lg gap-1.5 cursor-pointer py-1 px-2.5"
                >
                  <Home className="h-3.5 w-3.5 text-slate-400" />
                  <span>+ Center</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onOpenCourierModal}
                  className="h-8 text-xs font-semibold rounded-lg gap-1.5 cursor-pointer py-1 px-2.5"
                >
                  <Truck className="h-3.5 w-3.5 text-slate-400" />
                  <span>+ Courier</span>
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Delete Button on Mobile */}
        {isEditing && (
          <div className="pt-2 border-t">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onOpenDeleteModal}
              className="w-full h-9 text-xs text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl gap-2 cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Delete Ticket</span>
            </Button>
          </div>
        )}
      </div>

      {/* Mobile/Tablet Sticky Bottom Action Bar (< lg) */}
      <div className="lg:hidden sticky bottom-0 z-30 -mx-2 sm:-mx-4 -mb-2 sm:-mb-4 p-3.5 bg-white/95 dark:bg-slate-900/95 border-t border-slate-200 dark:border-slate-800 shadow-xl backdrop-blur-md flex items-center justify-between gap-3">
        <div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 uppercase font-bold block">
            Grand Total
          </span>
          <span className="font-mono text-lg font-extrabold text-slate-900 dark:text-white">
            ₹{grandTotal.toLocaleString("en-IN")}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Link to="/admin/service-calls">
            <Button type="button" variant="outline" size="sm" className="h-12 px-4 text-xs font-bold rounded-2xl cursor-pointer border-slate-300 dark:border-slate-700">
              Cancel
            </Button>
          </Link>

          <Button
            type={onSave ? "button" : "submit"}
            onClick={onSave}
            disabled={saving}
            className="h-12 px-6 text-sm font-extrabold bg-[#2563EB] hover:bg-blue-600 text-white rounded-2xl shadow-md shadow-blue-500/25 active:scale-98 transition-all cursor-pointer"
          >
            {saving ? "Saving..." : isEditing ? "Update Ticket" : "Save Ticket"}
          </Button>
        </div>
      </div>

      {/* Desktop Attached Right Action Sidebar (Portal Target: #admin-right-rail) */}
      {rightRailEl &&
        createPortal(
          <aside className="w-72 h-full flex flex-col justify-between bg-[#0F172A] border-l border-slate-800/90 text-slate-300 select-none overflow-hidden print:hidden">
            {/* Header */}
            <div className="shrink-0 px-4 pt-4 pb-3 border-b border-slate-800/80 bg-[#0F172A]">
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-white">
                TICKET ACTIONS
              </h3>
              <p className="text-xs text-slate-400 font-normal mt-0.5">Operations & Lifecycle Controls</p>
            </div>

            {/* Scrollable Action Groups */}
            <div className="flex-1 p-3.5 space-y-4 overflow-y-auto min-h-0">
              {/* 1. Top Priority: Print Job Card & Dispatch Slip */}
              <div className="space-y-1.5 pb-3 border-b border-slate-800/80">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  PRINT & CHALLAN
                </div>
                <div className={type === "company_service_center" && onOpenDispatchPrintModal ? "grid grid-cols-2 gap-2" : "grid grid-cols-1 gap-2"}>
                  <button
                    type="button"
                    onClick={onOpenPrintModal}
                    className="flex items-center justify-center gap-2 rounded-xl py-2.5 px-3 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-sm transition-all cursor-pointer group active:scale-95"
                    title="Print Customer Repair Job Card"
                  >
                    <Printer className="h-4 w-4 shrink-0" />
                    <span>Job Card</span>
                  </button>

                  {type === "company_service_center" && onOpenDispatchPrintModal && (
                    <button
                      type="button"
                      onClick={onOpenDispatchPrintModal}
                      className="flex items-center justify-center gap-2 rounded-xl py-2.5 px-3 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 shadow-sm transition-all cursor-pointer group active:scale-95"
                      title="Print Service Center Dispatch Challan"
                    >
                      <Truck className="h-4 w-4 shrink-0" />
                      <span>Dispatch</span>
                    </button>
                  )}
                </div>
              </div>

              {/* 2. WhatsApp Communications */}
              <div className="space-y-2">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  WHATSAPP & UPDATES
                </div>

                <div className="space-y-1.5">
                  <button
                    type="button"
                    onClick={onOpenCustomerWhatsApp}
                    className="w-full flex items-center justify-between rounded-xl py-2.5 px-3 text-xs font-semibold text-white hover:bg-slate-800 transition-all border border-slate-800 hover:border-slate-700 bg-[#141e30] cursor-pointer group"
                  >
                    <div className="flex items-center gap-2.5">
                      <MessageSquare className="h-4 w-4 shrink-0 text-emerald-400" />
                      <span>WhatsApp Customer</span>
                    </div>
                    <ArrowRight className="h-4 w-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                  </button>

                  <button
                    type="button"
                    onClick={onOpenCustomerEmail}
                    className="w-full flex items-center justify-between rounded-xl py-2.5 px-3 text-xs font-semibold text-white hover:bg-slate-800 transition-all border border-slate-800 hover:border-slate-700 bg-[#141e30] cursor-pointer group"
                  >
                    <div className="flex items-center gap-2.5">
                      <Mail className="h-4 w-4 shrink-0 text-blue-400" />
                      <span>Email Customer</span>
                    </div>
                    <ArrowRight className="h-4 w-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                  </button>

                  {type === "company_service_center" && serviceCenterName && (
                    <button
                      type="button"
                      onClick={onOpenServiceCenterWhatsApp}
                      className="w-full flex items-center justify-between rounded-xl py-2.5 px-3 text-xs font-semibold text-slate-200 hover:text-white hover:bg-slate-800 transition-all border border-slate-800 hover:border-slate-700 bg-[#141e30] cursor-pointer group"
                    >
                      <div className="flex items-center gap-2.5">
                        <Building2 className="h-4 w-4 shrink-0 text-slate-400" />
                        <span>Follow-up Center</span>
                      </div>
                      <ArrowRight className="h-4 w-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  )}

                  {selectedCourierId && (
                    <>
                      <button
                        type="button"
                        onClick={onOpenCourierPickupWhatsApp}
                        className="w-full flex items-center justify-between rounded-xl py-2.5 px-3 text-xs font-semibold text-slate-200 hover:text-white hover:bg-slate-800 transition-all border border-slate-800 hover:border-slate-700 bg-[#141e30] cursor-pointer group"
                      >
                        <div className="flex items-center gap-2.5">
                          <ArrowUp className="h-4 w-4 shrink-0 text-slate-400" />
                          <span>Ask Courier for Pickup</span>
                        </div>
                        <ArrowRight className="h-4 w-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                      </button>

                      <button
                        type="button"
                        onClick={onOpenCourierDeliveryWhatsApp}
                        className="w-full flex items-center justify-between rounded-xl py-2.5 px-3 text-xs font-semibold text-slate-200 hover:text-white hover:bg-slate-800 transition-all border border-slate-800 hover:border-slate-700 bg-[#141e30] cursor-pointer group"
                      >
                        <div className="flex items-center gap-2.5">
                          <ArrowDown className="h-4 w-4 shrink-0 text-slate-400" />
                          <span>Ask Courier for Delivery</span>
                        </div>
                        <ArrowRight className="h-4 w-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* 3. Payment Collection Task / Status Widget */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    PAYMENT STATUS
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                    paymentStatus === "paid"
                      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                      : "bg-amber-500/20 text-amber-300 border-amber-500/40"
                  }`}>
                    {paymentStatus === "paid" ? "PAID" : "DUE (Task)"}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={onOpenPaymentModal}
                  className={`w-full flex items-center justify-between rounded-xl py-2.5 px-3 text-xs font-semibold transition-all border cursor-pointer group ${
                    paymentStatus === "paid"
                      ? "bg-[#141e30] border-emerald-500/30 text-emerald-300 hover:bg-emerald-950/40"
                      : "bg-[#141e30] border-amber-500/30 text-amber-200 hover:bg-amber-950/40"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <CreditCard className={`h-4 w-4 shrink-0 ${paymentStatus === "paid" ? "text-emerald-400" : "text-amber-400"}`} />
                    <span>{paymentStatus === "paid" ? "Payment Received" : "Confirm Payment Received"}</span>
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>

              {/* 4. Milestone Progression */}
              <div className="space-y-2">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  MILESTONE PROGRESSION
                </div>

                <div className="space-y-1">
                  {MILESTONES.map((m) => {
                    const isActive = activeIndex === m.index;
                    return (
                      <button
                        key={m.stage}
                        type="button"
                        onClick={() => handleMilestoneClick(m.stage)}
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
                          <div className="flex flex-col text-left min-w-0">
                            <span className="font-semibold text-xs leading-tight truncate">{m.label}</span>
                            <span className="text-[10px] text-slate-400 font-normal truncate">{m.subLabel}</span>
                          </div>
                        </div>
                        <span className="text-[10px] font-mono text-slate-400 font-bold shrink-0">{m.hotkey}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 5. Audit History & Quick Note / Event (Moved down) */}
              <div className="space-y-2 pt-2 border-t border-slate-800/80">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  AUDIT & EVENTS
                </div>

                <button
                  type="button"
                  onClick={onShowEventsListModal}
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
                    onClick={() => onTriggerTimelineModal("comment_added")}
                    className="flex items-center justify-center gap-2 rounded-xl py-2 px-2 text-xs font-semibold text-slate-200 hover:bg-slate-800 hover:text-white transition-all border border-slate-800 hover:border-slate-700 bg-[#141e30] cursor-pointer"
                  >
                    <FileText className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span>Add Note</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onTriggerTimelineModal("status_change")}
                    className="flex items-center justify-center gap-2 rounded-xl py-2 px-2 text-xs font-semibold text-slate-200 hover:bg-slate-800 hover:text-white transition-all border border-slate-800 hover:border-slate-700 bg-[#141e30] cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span>Add Event</span>
                  </button>
                </div>
              </div>

              {/* 6. Ticket Management (Delete Ticket) */}
              {isEditing && (
                <div className="pt-2 border-t border-slate-800/80">
                  <button
                    type="button"
                    onClick={onOpenDeleteModal}
                    className="w-full flex items-center justify-between rounded-xl py-2.5 px-3 text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 transition-all border border-rose-900/40 bg-[#141e30] cursor-pointer group"
                  >
                    <div className="flex items-center gap-2.5">
                      <Trash2 className="h-4 w-4 shrink-0 text-rose-400" />
                      <span>Move Ticket to Trash</span>
                    </div>
                    <ArrowRight className="h-4 w-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </div>
              )}

              {/* Master Record Quick Adds */}
              <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  QUICK MASTER RECORDS
                </div>

                <div className={`grid gap-1.5 ${isCompanyRMA ? "grid-cols-3" : "grid-cols-1"}`}>
                  <button
                    type="button"
                    onClick={onOpenCustomerModal}
                    className="flex items-center justify-center gap-1.5 rounded-lg py-1.5 px-2 text-[11px] font-semibold text-slate-200 hover:bg-slate-800 hover:text-white transition-all border border-slate-800 hover:border-slate-700 bg-[#141e30] cursor-pointer"
                  >
                    <UserPlus className="h-3 w-3 text-slate-400 shrink-0" />
                    <span>+ Customer</span>
                  </button>

                  {isCompanyRMA && (
                    <>
                      <button
                        type="button"
                        onClick={onOpenCenterModal}
                        className="flex items-center justify-center gap-1.5 rounded-lg py-1.5 px-2 text-[11px] font-semibold text-slate-200 hover:bg-slate-800 hover:text-white transition-all border border-slate-800 hover:border-slate-700 bg-[#141e30] cursor-pointer"
                      >
                        <Home className="h-3 w-3 text-slate-400 shrink-0" />
                        <span>+ Center</span>
                      </button>

                      <button
                        type="button"
                        onClick={onOpenCourierModal}
                        className="flex items-center justify-center gap-1.5 rounded-lg py-1.5 px-2 text-[11px] font-semibold text-slate-200 hover:bg-slate-800 hover:text-white transition-all border border-slate-800 hover:border-slate-700 bg-[#141e30] cursor-pointer"
                      >
                        <Truck className="h-3 w-3 text-slate-400 shrink-0" />
                        <span>+ Courier</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Pinned Sticky Bottom Action Bar */}
            <div className="shrink-0 p-3.5 border-t border-slate-800/80 bg-slate-900/95 space-y-3">
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

              <Button
                type={onSave ? "button" : "submit"}
                form="service-call-form"
                onClick={onSave}
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
    </>
  );
}
