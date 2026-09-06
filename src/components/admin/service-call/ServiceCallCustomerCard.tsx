import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Phone, Mail, MapPin } from "lucide-react";
import CustomerTypeahead from "@/components/admin/CustomerTypeahead";
import { formatIndianPhoneNumber } from "@/lib/utils";
import type { Customer } from "@/lib/types";

interface ServiceCallCustomerCardProps {
  selectedCustomerId: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  customerAddress: string;
  nameError?: string;
  phoneError?: string;
  onCustomerNameChange: (val: string) => void;
  onSelectCustomer: (cust: Customer) => void;
  onOpenNewCustomerModal: () => void;
  onOpenEditCustomerModal: () => void;
}

export default function ServiceCallCustomerCard({
  selectedCustomerId,
  customerName,
  customerPhone,
  customerEmail,
  customerAddress,
  nameError,
  phoneError,
  onCustomerNameChange,
  onSelectCustomer,
  onOpenNewCustomerModal,
  onOpenEditCustomerModal,
}: ServiceCallCustomerCardProps) {
  const hasError = Boolean(nameError || phoneError);

  return (
    <div
      data-shortcut-section="customer"
      data-section="customer"
      className={`bg-white dark:bg-slate-900 rounded-2xl border p-4 md:p-5 shadow-xs space-y-4 transition-all ${
        hasError
          ? "border-rose-400 dark:border-rose-800 bg-rose-50/10"
          : "border-slate-200/90 dark:border-slate-800"
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-extrabold text-xs">
            1
          </span>
          <h2 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
            Customer & Contact Details
          </h2>
        </div>

        <div className="flex items-center gap-2">
          {selectedCustomerId && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={onOpenEditCustomerModal}
              className="h-8 text-xs font-bold text-blue-600 dark:text-blue-400 cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-950/50"
            >
              Edit Profile
            </Button>
          )}
        </div>
      </div>

      {/* Unified Customer Name & Search */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <Label htmlFor="cust-name-typeahead" className="text-sm font-bold text-slate-800 dark:text-slate-200">
            Customer Name / Mobile Number <span className="text-rose-600 font-bold">*</span>
          </Label>
        </div>
        <CustomerTypeahead
          id="cust-name-typeahead"
          hasError={Boolean(nameError || phoneError)}
          selectedCustomerId={selectedCustomerId}
          value={customerName}
          onChange={onCustomerNameChange}
          onSelectCustomer={onSelectCustomer}
          onAddNewCustomer={onOpenNewCustomerModal}
          placeholder="Search customer by name or 10-digit mobile (e.g. 95891 99738)..."
        />
        {nameError && (
          <p className="text-xs font-bold text-rose-600 dark:text-rose-400 mt-1.5 flex items-center gap-1">
            ⚠️ {nameError}
          </p>
        )}
        {phoneError && !nameError && (
          <p className="text-xs font-bold text-rose-600 dark:text-rose-400 mt-1.5 flex items-center gap-1">
            ⚠️ {phoneError}
          </p>
        )}
      </div>

      {/* Populated Read-Only Customer Info Display */}
      {customerPhone || customerAddress || customerEmail || selectedCustomerId ? (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-950/80 p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-sm">
            {/* Phone */}
            <div className="flex items-center gap-2">
              <span className="text-slate-600 dark:text-slate-400 font-bold shrink-0 flex items-center gap-1.5">
                <Phone className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                Phone:
              </span>
              <span className="font-mono font-bold text-slate-950 dark:text-white">
                {customerPhone ? formatIndianPhoneNumber(customerPhone) : <span className="text-slate-400 font-normal italic">Not provided</span>}
              </span>
            </div>

            {/* Email */}
            <div className="flex items-center gap-2">
              <span className="text-slate-600 dark:text-slate-400 font-bold shrink-0 flex items-center gap-1.5">
                <Mail className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                Email:
              </span>
              <span className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                {customerEmail || <span className="text-slate-400 font-normal italic">Not provided</span>}
              </span>
            </div>
          </div>

          {/* Address */}
          <div className="flex items-start gap-2 pt-3 border-t border-slate-200 dark:border-slate-800 text-sm">
            <span className="text-slate-600 dark:text-slate-400 font-bold shrink-0 flex items-center gap-1.5 mt-0.5">
              <MapPin className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              Address:
            </span>
            <span className="text-slate-900 dark:text-slate-100 font-medium leading-relaxed">
              {customerAddress || <span className="text-slate-400 font-normal italic">No address on file</span>}
            </span>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-800 p-3 bg-slate-50/40 dark:bg-slate-950/40 text-center">
          <p className="text-xs text-slate-400">
            Select a customer above to view contact details, or click{" "}
            <button
              type="button"
              onClick={onOpenNewCustomerModal}
              className="text-blue-600 dark:text-blue-400 font-semibold underline cursor-pointer"
            >
              New Customer
            </button>{" "}
            to create a profile.
          </p>
        </div>
      )}
    </div>
  );
}
