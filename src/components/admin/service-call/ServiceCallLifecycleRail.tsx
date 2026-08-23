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
  // Determine active milestone stage
  let activeIndex = 1;
  if (timeline && timeline.length > 0) {
    for (let i = timeline.length - 1; i >= 0; i--) {
      const s = timeline[i]?.stage;
      if (s === "replacement_given_customer") {
        activeIndex = 4;
        break;
      }
      if (s === "replacement_received_service_center") {
        activeIndex = 3;
        break;
      }
      if (s === "replacement_sent_service_center") {
        activeIndex = 2;
        break;
      }
      if (s === "replacement_received_customer" || s === "intake_created") {
        activeIndex = 1;
        break;
      }
    }
  } else {
    if (status === "delivered" || status === "completed") activeIndex = 4;
    else if (status === "sent_to_service_center") activeIndex = 2;
    else if (status === "received" || status === "in_progress") activeIndex = 1;
  }

  const MILESTONES = [
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
  ];

  return (
    <>
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
              onClick={onOpenPrintModal}
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

        {/* 2. Customer & Partner Communications */}
        <div className="space-y-2">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Customer Notifications & Dispatch
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onOpenCustomerWhatsApp}
              className="h-9 text-xs font-semibold rounded-xl gap-2 justify-start cursor-pointer border-emerald-300 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300"
            >
              <MessageSquare className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
              <span>WhatsApp Customer</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onOpenCustomerEmail}
              className="h-9 text-xs font-semibold rounded-xl gap-2 justify-start cursor-pointer border-blue-300 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/30 text-blue-800 dark:text-blue-300"
            >
              <Mail className="h-3.5 w-3.5 text-blue-600 shrink-0" />
              <span>Email Customer</span>
            </Button>

            {type === "company_service_center" && serviceCenterName && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onOpenServiceCenterWhatsApp}
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
                  onClick={onOpenCourierPickupWhatsApp}
                  className="h-9 text-xs font-semibold rounded-xl gap-2 justify-start cursor-pointer"
                >
                  <ArrowUp className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                  <span>Courier Pickup</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onOpenCourierDeliveryWhatsApp}
                  className="h-9 text-xs font-semibold rounded-xl gap-2 justify-start cursor-pointer"
                >
                  <ArrowDown className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                  <span>Courier Delivery</span>
                </Button>
              </>
            )}
          </div>
        </div>

        {/* 3. Payment Status & Milestone Progression */}
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

        {/* Milestone Progression */}
        <div className="space-y-2">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Milestone Progression
          </div>
          <div className="grid grid-cols-2 gap-2">
            {MILESTONES.map((m) => {
              const isActive = activeIndex === m.index;
              return (
                <button
                  key={m.stage}
                  type="button"
                  onClick={() => handleMilestoneClick(m.stage)}
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
              onClick={onOpenCustomerModal}
              className="h-8.5 text-xs font-semibold rounded-xl gap-1.5 cursor-pointer"
            >
              <UserPlus className="h-3.5 w-3.5 text-slate-400" />
              <span>Customer</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onOpenCenterModal}
              className="h-8.5 text-xs font-semibold rounded-xl gap-1.5 cursor-pointer"
            >
              <Home className="h-3.5 w-3.5 text-slate-400" />
              <span>Center</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onOpenCourierModal}
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
              onClick={onOpenDeleteModal}
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
            type={onSave ? "button" : "submit"}
            onClick={onSave}
            disabled={saving}
            className="h-10 px-5 text-xs font-bold bg-[#2563EB] hover:bg-blue-600 text-white rounded-xl shadow-glow-sm cursor-pointer"
          >
            {saving ? "Saving..." : isEditing ? "Update Ticket" : "Save Ticket"}
          </Button>
        </div>
      </div>

      {/* Desktop Attached Right Action Sidebar (Portal Target: #admin-right-rail) */}
      {rightRailEl &&
        createPortal(
          <aside className="w-72 h-screen flex flex-col justify-between bg-[#0F172A] border-l border-slate-800/90 text-slate-300 select-none overflow-hidden print:hidden">
            {/* Header */}
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
                    className="flex items-center justify-center gap-2 rounded-xl py-2.5 px-2 text-xs font-semibold text-slate-200 hover:bg-slate-800 hover:text-white transition-all border border-slate-800 hover:border-slate-700 bg-[#141e30] cursor-pointer"
                  >
                    <FileText className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span>Add Note</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onTriggerTimelineModal("status_change")}
                    className="flex items-center justify-center gap-2 rounded-xl py-2.5 px-2 text-xs font-semibold text-slate-200 hover:bg-slate-800 hover:text-white transition-all border border-slate-800 hover:border-slate-700 bg-[#141e30] cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span>Add Event</span>
                  </button>
                </div>
              </div>

              {/* WhatsApp Communications */}
              <div className="space-y-2">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  WHATSAPP UPDATES
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

              {/* Payment Collection Task / Status Widget */}
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

              {/* Milestone Progression */}
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
                          <span className="truncate">{m.label}</span>
                        </div>
                        <span className="text-[10px] font-mono text-slate-400 font-bold shrink-0">{m.hotkey}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Ticket Controls */}
              {isEditing && (
                <div className="space-y-2">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    TICKET CONTROLS
                  </div>

                  <div className="space-y-1.5">
                    <button
                      type="button"
                      onClick={onOpenPrintModal}
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
                      onClick={onOpenDeleteModal}
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
                    onClick={onOpenCustomerModal}
                    className="flex items-center justify-center gap-1.5 rounded-xl py-2.5 px-2 text-xs font-semibold text-slate-200 hover:bg-slate-800 hover:text-white transition-all border border-slate-800 hover:border-slate-700 bg-[#141e30] cursor-pointer"
                  >
                    <UserPlus className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span>Customer</span>
                  </button>

                  <button
                    type="button"
                    onClick={onOpenCenterModal}
                    className="flex items-center justify-center gap-1.5 rounded-xl py-2.5 px-2 text-xs font-semibold text-slate-200 hover:bg-slate-800 hover:text-white transition-all border border-slate-800 hover:border-slate-700 bg-[#141e30] cursor-pointer"
                  >
                    <Home className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span>Center</span>
                  </button>

                  <button
                    type="button"
                    onClick={onOpenCourierModal}
                    className="flex items-center justify-center gap-1.5 rounded-xl py-2.5 px-2 text-xs font-semibold text-slate-200 hover:bg-slate-800 hover:text-white transition-all border border-slate-800 hover:border-slate-700 bg-[#141e30] cursor-pointer"
                  >
                    <Truck className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span>Courier</span>
                  </button>
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
